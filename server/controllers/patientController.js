const Hospital = require('../models/Hospital');
const OPBooking = require('../models/OPBooking');
const BedRequest = require('../models/BedRequest');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const Ambulance = require('../models/Ambulance');
const { generateOPToken } = require('../utils/tokenGenerator');

const bookOP = async (req, res, next) => {
  try {
    const { hospitalId } = req.body;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const booked = await OPBooking.countDocuments({
      hospitalId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    if (booked >= hospital.dailyOPCapacity) {
      return res.status(400).json({ message: 'Fully Booked for Today' });
    }

    const tokenNumber = await generateOPToken(hospitalId, today);
    const booking = await OPBooking.create({
      patientId: req.user.id,
      hospitalId,
      date: today,
      tokenNumber,
    });

    res.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
};

const createBedRequest = async (req, res, next) => {
  try {
    const { hospitalId, patientName, patientAge, problemDescription, bedType } = req.body;

    const hospital = await Hospital.findOne({ _id: hospitalId, approvalStatus: 'approved' });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found or not approved' });

    const isEmergency = ['icu', 'emergency', 'ventilator'].includes(bedType);
    const priority = isEmergency ? 'emergency' : 'normal';

    const request = await BedRequest.create({
      patientId: req.user.id,
      hospitalId,
      patientName,
      patientAge,
      problemDescription,
      bedType,
      priority,
    });

    const io = req.app.get('io');
    const payload = { ...request.toObject(), priority };

    io.to(`hospital:${hospitalId}`).emit('bedRequest:new', payload);

    if (isEmergency) {
      io.to(`hospital:${hospitalId}`).emit('ambulance:priorityAlert', {
        requestId: request._id,
        patientName,
        bedType,
        message: `Emergency ${bedType} bed request — priority handling required`,
      });

      const drivers = await require('../models/Driver').find({
        hospitalId,
        status: 'available',
      });
      drivers.forEach((d) => {
        io.to(`driver:${d._id}`).emit('ambulance:priorityAlert', {
          requestId: request._id,
          patientName,
          bedType,
          message: 'Emergency bed request at your hospital — standby for ambulance dispatch',
        });
      });
    }

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const getMyBedRequests = async (req, res, next) => {
  try {
    const requests = await BedRequest.find({ patientId: req.user.id })
      .populate('hospitalId', 'name')
      .populate('assignedBedId', 'bedNumber wardName')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

const getAvailableAmbulances = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const ambulances = await Ambulance.find({
      status: 'available',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 30000,
        },
      },
    }).populate('hospitalId', 'name');

    const results = ambulances.map((a) => {
      const coords = a.location.coordinates;
      const dLat = (coords[1] - parseFloat(lat)) * Math.PI / 180;
      const dLng = (coords[0] - parseFloat(lng)) * Math.PI / 180;
      const dist =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(parseFloat(lat) * Math.PI / 180) *
        Math.cos(coords[1] * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = 6371 * 2 * Math.atan2(Math.sqrt(dist), Math.sqrt(1 - dist));

      return {
        _id: a._id,
        vehicleNumber: a.vehicleNumber,
        driverName: a.driverName,
        driverId: a.driverId,
        hospitalId: a.hospitalId,
        distance: Math.round(distance * 10) / 10,
        latitude: coords[1],
        longitude: coords[0],
      };
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const createAmbulanceRequest = async (req, res, next) => {
  try {
    const { ambulanceId, driverId, hospitalId, lat, lng } = req.body;

    const request = await AmbulanceRequest.create({
      patientId: req.user.id,
      ambulanceId,
      driverId,
      hospitalId,
      patientLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    });

    const io = req.app.get('io');
    io.to(`driver:${driverId}`).emit('ambulance:request', {
      requestId: request._id,
      patientId: req.user.id,
      patientLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
};

const getActiveAmbulanceRequest = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findOne({
      patientId: req.user.id,
      status: { $in: ['requested', 'accepted', 'in_progress'] },
    })
      .populate('driverId', 'name phone')
      .populate('ambulanceId', 'vehicleNumber location')
      .populate('hospitalId', 'name location');

    res.json(request);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bookOP,
  createBedRequest,
  getMyBedRequests,
  getAvailableAmbulances,
  createAmbulanceRequest,
  getActiveAmbulanceRequest,
};

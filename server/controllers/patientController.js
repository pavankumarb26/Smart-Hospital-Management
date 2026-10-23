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
    const { lat, lng, hospitalId } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);

    const query = { status: 'available' };
    if (hospitalId) {
      query.hospitalId = hospitalId;
    }

    // 1. Try to find ambulances within 50km
    let ambulances = [];
    try {
      ambulances = await Ambulance.find({
        ...query,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [pLng, pLat] },
            $maxDistance: 50000,
          },
        },
      }).populate('hospitalId', 'name');
    } catch {
      ambulances = [];
    }

    // 2. If none within 50km, expand search up to 250km
    if (!ambulances.length) {
      try {
        ambulances = await Ambulance.find({
          ...query,
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [pLng, pLat] },
              $maxDistance: 250000,
            },
          },
        }).populate('hospitalId', 'name');
      } catch {
        ambulances = [];
      }
    }

    // 3. Fallback: return any available ambulances (so patient is never stranded)
    if (!ambulances.length) {
      ambulances = await Ambulance.find(query).populate('hospitalId', 'name');
    }

    const results = ambulances.map((a) => {
      const coords = a.location?.coordinates || [0, 0];
      const dLat = (coords[1] - pLat) * Math.PI / 180;
      const dLng = (coords[0] - pLng) * Math.PI / 180;
      const dist =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(pLat * Math.PI / 180) *
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

    results.sort((a, b) => a.distance - b.distance);

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const createAmbulanceRequest = async (req, res, next) => {
  try {
    const { ambulanceId, driverId, hospitalId, lat, lng } = req.body;

    const existing = await AmbulanceRequest.findOne({
      patientId: req.user.id,
      status: { $in: ['requested', 'accepted', 'in_progress'] },
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have an active ambulance request' });
    }

    const patientUser = await require('../models/User').findById(req.user.id);

    const request = await AmbulanceRequest.create({
      patientId: req.user.id,
      ambulanceId,
      driverId,
      hospitalId,
      patientLocation: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
    });

    const populatedRequest = await AmbulanceRequest.findById(request._id)
      .populate('driverId', 'name phone')
      .populate('ambulanceId', 'vehicleNumber location')
      .populate('hospitalId', 'name location');

    const io = req.app.get('io');
    if (driverId) {
      io.to(`driver:${driverId}`).emit('ambulance:request', {
        requestId: request._id,
        patientId: req.user.id,
        patientName: patientUser?.name || 'Emergency Patient',
        patientPhone: patientUser?.phone || '',
        patientLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
      });
    }

    res.status(201).json({ request: populatedRequest });
  } catch (error) {
    next(error);
  }
};

const cancelAmbulanceRequest = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findOne({
      _id: req.params.id,
      patientId: req.user.id,
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (['completed', 'cancelled', 'rejected'].includes(request.status)) {
      return res.status(400).json({ message: 'Request is already closed' });
    }

    request.status = 'cancelled';
    await request.save();

    if (request.driverId) {
      await Driver.findByIdAndUpdate(request.driverId, { status: 'available' });
      if (request.ambulanceId) {
        await Ambulance.findByIdAndUpdate(request.ambulanceId, { status: 'available' });
      }
      const io = req.app.get('io');
      io.to(`driver:${request.driverId}`).emit('ambulance:cancelled', {
        requestId: request._id,
        message: 'Patient has cancelled the ambulance request',
      });
    }

    res.json({ message: 'Request cancelled successfully', request });
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
      .sort({ createdAt: -1 })
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
  cancelAmbulanceRequest,
  getActiveAmbulanceRequest,
};

const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const BedRequest = require('../models/BedRequest');
const OPBooking = require('../models/OPBooking');
const Ambulance = require('../models/Ambulance');
const { getBedStats } = require('../utils/bedHelpers');
const { generateBedQR } = require('../utils/qrGenerator');

const getDashboard = async (req, res, next) => {
  try {
    const hospitalId = req.user.id;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const stats = await getBedStats(hospitalId);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const opBookingsToday = await OPBooking.countDocuments({
      hospitalId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    res.json({
      ...stats,
      opBookingsToday,
      opCapacity: hospital.dailyOPCapacity,
      opFull: opBookingsToday >= hospital.dailyOPCapacity,
    });
  } catch (error) {
    next(error);
  }
};

const getBeds = async (req, res, next) => {
  try {
    const beds = await Bed.find({ hospitalId: req.user.id }).sort({ wardName: 1, bedNumber: 1 });
    res.json(beds);
  } catch (error) {
    next(error);
  }
};

const createBed = async (req, res, next) => {
  try {
    const { wardName, bedNumber, type } = req.body;
    const hospitalId = req.user.id;

    const qrCode = await generateBedQR('temp', hospitalId);
    const bed = await Bed.create({ hospitalId, wardName, bedNumber, type, qrCode });

    const finalQR = await generateBedQR(bed._id, hospitalId);
    bed.qrCode = finalQR;
    await bed.save();

    const hospital = await Hospital.findById(hospitalId);
    if (type === 'normal') hospital.totalBeds += 1;
    else if (type === 'icu') hospital.totalICU += 1;
    else if (type === 'emergency') hospital.totalEmergency += 1;
    else if (type === 'ventilator') hospital.totalVentilators += 1;
    await hospital.save();

    res.status(201).json(bed);
  } catch (error) {
    next(error);
  }
};

const updateBedStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    if (bed.hospitalId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized for this bed' });
    }

    bed.status = status;
    if (status !== 'reserved') {
      bed.reservedUntil = null;
      bed.patientId = null;
    }
    await bed.save();

    const io = req.app.get('io');
    io.to(`hospital:${bed.hospitalId}`).emit('bed:statusChanged', {
      bedId: bed._id,
      newStatus: status,
    });

    res.json(bed);
  } catch (error) {
    next(error);
  }
};

const getBedRequests = async (req, res, next) => {
  try {
    const requests = await BedRequest.find({ hospitalId: req.user.id })
      .populate('patientId', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(requests);
  } catch (error) {
    next(error);
  }
};

const approveBedRequest = async (req, res, next) => {
  try {
    const request = await BedRequest.findById(req.params.id);
    if (!request || request.hospitalId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const bed = await Bed.findOneAndUpdate(
      { hospitalId: req.user.id, type: request.bedType, status: 'available' },
      {
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 15 * 60 * 1000),
        patientId: request.patientId,
      },
      { new: true }
    );

    if (!bed) {
      return res.status(400).json({ message: 'No available bed of requested type' });
    }

    request.status = 'approved';
    request.assignedBedId = bed._id;
    await request.save();

    const io = req.app.get('io');
    io.to(`patient:${request.patientId}`).emit('bedRequest:statusChanged', {
      requestId: request._id,
      status: 'approved',
      bedNumber: bed.bedNumber,
      wardName: bed.wardName,
    });
    io.to(`hospital:${req.user.id}`).emit('bed:statusChanged', {
      bedId: bed._id,
      newStatus: 'reserved',
    });

    res.json({ request, bed });
  } catch (error) {
    next(error);
  }
};

const rejectBedRequest = async (req, res, next) => {
  try {
    const request = await BedRequest.findById(req.params.id);
    if (!request || request.hospitalId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();

    const io = req.app.get('io');
    io.to(`patient:${request.patientId}`).emit('bedRequest:statusChanged', {
      requestId: request._id,
      status: 'rejected',
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

const getAmbulances = async (req, res, next) => {
  try {
    const ambulances = await Ambulance.find({ hospitalId: req.user.id });
    res.json(ambulances);
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { dailyOPCapacity } = req.body;
    const hospital = await Hospital.findByIdAndUpdate(
      req.user.id,
      { dailyOPCapacity },
      { new: true }
    );
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getBeds,
  createBed,
  updateBedStatus,
  getBedRequests,
  approveBedRequest,
  rejectBedRequest,
  getAmbulances,
  updateSettings,
};

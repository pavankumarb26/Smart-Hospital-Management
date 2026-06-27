const bcrypt = require('bcryptjs');
const Hospital = require('../models/Hospital');
const Bed = require('../models/Bed');
const BedRequest = require('../models/BedRequest');
const OPBooking = require('../models/OPBooking');
const Ambulance = require('../models/Ambulance');
const AmbulanceRequest = require('../models/AmbulanceRequest');
const Driver = require('../models/Driver');
const { getBedStats } = require('../utils/bedHelpers');
const { generateBedQR } = require('../utils/qrGenerator');
const { addBedsToHospital } = require('../utils/bedFactory');

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
      approvalStatus: hospital.approvalStatus,
      hospitalName: hospital.name,
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
    const allowed = ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid bed status' });
    }

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

    console.log('[qr-scan] bed status updated:', bed.bedNumber, '→', status);
    res.json(bed);
  } catch (error) {
    next(error);
  }
};

const scanBed = async (req, res, next) => {
  try {
    const { bedId, hospitalId: qrHospitalId } = req.body;
    if (!bedId) return res.status(400).json({ message: 'bedId is required in QR payload' });

    if (qrHospitalId && qrHospitalId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'This QR code belongs to another hospital' });
    }

    const bed = await Bed.findOne({ _id: bedId, hospitalId: req.user.id });
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found. QR may be invalid or from another hospital.' });
    }

    console.log('[qr-scan] lookup success:', { bedId: bed._id, bedNumber: bed.bedNumber, ward: bed.wardName });
    res.json(bed);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid bed ID format in QR code' });
    }
    next(error);
  }
};

const getBedRequests = async (req, res, next) => {
  try {
    const requests = await BedRequest.find({ hospitalId: req.user.id })
      .populate('patientId', 'name email phone')
      .sort({ priority: -1, createdAt: -1 })
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
    const { dailyOPCapacity, description, phone, address, city, specialties } = req.body;
    const updates = {};
    if (dailyOPCapacity != null) updates.dailyOPCapacity = dailyOPCapacity;
    if (description != null) updates.description = description;
    if (phone != null) updates.phone = phone;
    if (address != null) updates.address = address;
    if (city != null) updates.city = city;
    if (specialties != null) updates.specialties = specialties;

    const hospital = await Hospital.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.user.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const addMoreBeds = async (req, res, next) => {
  try {
    const { type, wardName, count } = req.body;
    if (!type || !wardName || !count) {
      return res.status(400).json({ message: 'type, wardName, and count are required' });
    }
    const hospital = await addBedsToHospital(req.user.id, type, wardName, Number(count));
    const beds = await Bed.find({ hospitalId: req.user.id }).sort({ createdAt: -1 }).limit(Number(count));
    res.status(201).json({ hospital, beds });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = req.body.data ? JSON.parse(req.body.data) : req.body;
    const hospital = await Hospital.findById(req.user.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const fields = ['name', 'type', 'description', 'phone', 'address', 'city', 'dailyOPCapacity'];
    fields.forEach((f) => {
      if (data[f] != null) hospital[f] = data[f];
    });
    if (data.specialties) {
      hospital.specialties = Array.isArray(data.specialties)
        ? data.specialties
        : data.specialties.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const newImages = (req.files || []).map((f) => `/uploads/hospitals/${f.filename}`);
    if (newImages.length) hospital.images = [...(hospital.images || []), ...newImages];

    await hospital.save();
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const resubmitForApproval = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.user.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    if (hospital.approvalStatus !== 'rejected') {
      return res.status(400).json({ message: 'Only rejected hospitals can resubmit' });
    }
    hospital.approvalStatus = 'pending';
    await hospital.save();
    res.json({ message: 'Profile resubmitted for Super-Admin approval', hospital });
  } catch (error) {
    next(error);
  }
};

const createFleet = async (req, res, next) => {
  try {
    const { vehicleNumber, driverName, driverEmail, driverPassword, driverPhone } = req.body;
    if (!vehicleNumber || !driverName || !driverEmail || !driverPassword) {
      return res.status(400).json({ message: 'vehicleNumber, driverName, driverEmail, driverPassword required' });
    }

    const existing = await Driver.findOne({ email: driverEmail });
    if (existing) return res.status(400).json({ message: 'Driver email already in use' });

    const hospital = await Hospital.findById(req.user.id);
    const passwordHash = await bcrypt.hash(driverPassword, 10);

    const driver = await Driver.create({
      hospitalId: hospital._id,
      name: driverName,
      email: driverEmail,
      passwordHash,
      phone: driverPhone || '',
      status: 'offline',
    });

    const ambulance = await Ambulance.create({
      hospitalId: hospital._id,
      vehicleNumber,
      driverName: driver.name,
      driverId: driver._id,
      status: 'offline',
      location: hospital.location,
    });

    driver.ambulanceId = ambulance._id;
    await driver.save();

    res.status(201).json({ ambulance, driver });
  } catch (error) {
    next(error);
  }
};

const deleteHospital = async (req, res, next) => {
  try {
    console.log("User:", req.user);
    console.log("Role:", req.user?.role);

    const { confirmText } = req.body;
    if (confirmText !== 'DELETE') {
      return res.status(400).json({ message: 'Type DELETE to confirm hospital deletion' });
    }

    const hospitalId = req.user.id;
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    await Promise.all([
      BedRequest.deleteMany({ hospitalId }),
      OPBooking.deleteMany({ hospitalId }),
      AmbulanceRequest.deleteMany({ hospitalId }),
      Bed.deleteMany({ hospitalId }),
      Driver.deleteMany({ hospitalId }),
      Ambulance.deleteMany({ hospitalId }),
    ]);

    await Hospital.findByIdAndDelete(hospitalId);

    console.log('[hospital-delete] deleted hospital:', hospital.name, hospitalId);
    res.json({ message: 'Hospital and all related data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getBeds,
  createBed,
  updateBedStatus,
  scanBed,
  getBedRequests,
  approveBedRequest,
  rejectBedRequest,
  getAmbulances,
  updateSettings,
  getProfile,
  addMoreBeds,
  updateProfile,
  resubmitForApproval,
  createFleet,
  deleteHospital,
};

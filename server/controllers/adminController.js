const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SuperAdmin = require('../models/SuperAdmin');
const Hospital = require('../models/Hospital');
const Driver = require('../models/Driver');
const Ambulance = require('../models/Ambulance');
const { createBedsForHospital } = require('../utils/bedFactory');

const loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' },
    });
  } catch (error) {
    next(error);
  }
};

const getPendingHospitals = async (_req, res, next) => {
  try {
    const hospitals = await Hospital.find({ approvalStatus: 'pending' }).sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (error) {
    next(error);
  }
};

const getAllHospitals = async (_req, res, next) => {
  try {
    const hospitals = await Hospital.find().sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (error) {
    next(error);
  }
};

const approveHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved' },
      { new: true }
    );
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const rejectHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected' },
      { new: true }
    );
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const registerHospital = async (req, res, next) => {
  try {
    const data = JSON.parse(req.body.data || '{}');
    const {
      name, type, description, specialties, city, address, phone,
      adminEmail, password, lat, lng, dailyOPCapacity, bedConfig, ambulance,
      website,
    } = data;

    if (!name || !type || !city || !adminEmail || !password || !lat || !lng) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingByEmail = await Hospital.findOne({ adminEmail });
    if (existingByEmail) {
      if (existingByEmail.approvalStatus === 'rejected') {
        return res.status(400).json({
          message: 'This email was rejected. Please login and resubmit your profile from Settings.',
        });
      }
      return res.status(400).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const imagePaths = (req.files || []).map(
      (f) => `/uploads/hospitals/${f.filename}`
    );

    const hospital = await Hospital.create({
      name,
      type,
      description: description || '',
      specialties: specialties || [],
      city,
      address: address || '',
      phone: phone || '',
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
      website: website || '',
      images: imagePaths,
      adminEmail,
      passwordHash,
      dailyOPCapacity: dailyOPCapacity || 50,
      approvalStatus: 'pending',
      bedConfig: bedConfig || {},
    });

    if (bedConfig) {
      await createBedsForHospital(hospital._id, bedConfig);
    }

    if (ambulance?.vehicleNumber && ambulance?.driverName && ambulance?.driverEmail && ambulance?.driverPassword) {
      const driverHash = await bcrypt.hash(ambulance.driverPassword, 10);
      const driver = await Driver.create({
        hospitalId: hospital._id,
        name: ambulance.driverName,
        email: ambulance.driverEmail,
        passwordHash: driverHash,
        phone: ambulance.driverPhone || phone || '',
        status: 'offline',
      });
      const amb = await Ambulance.create({
        hospitalId: hospital._id,
        vehicleNumber: ambulance.vehicleNumber,
        driverName: driver.name,
        driverId: driver._id,
        status: 'offline',
        location: hospital.location,
      });
      driver.ambulanceId = amb._id;
      await driver.save();
    }

    res.status(201).json({
      message: 'Registration submitted. Awaiting Super-Admin approval before appearing on Patient Portal.',
      hospitalId: hospital._id,
      approvalStatus: 'pending',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loginAdmin,
  getPendingHospitals,
  getAllHospitals,
  approveHospital,
  rejectHospital,
  registerHospital,
};

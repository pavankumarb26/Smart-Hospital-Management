const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Driver = require('../models/Driver');

const registerPatient = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, phone });

    const token = jwt.sign(
      { id: user._id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: 'patient' },
    });
  } catch (error) {
    next(error);
  }
};

const loginPatient = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: 'patient' },
    });
  } catch (error) {
    next(error);
  }
};

const loginHospital = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const hospital = await Hospital.findOne({ adminEmail: email });
    if (!hospital) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, hospital.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: hospital._id, role: 'hospital' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.adminEmail,
        role: 'hospital',
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginDriver = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, driver.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: driver._id, role: 'driver', hospitalId: driver.hospitalId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        role: 'driver',
        hospitalId: driver.hospitalId,
        ambulanceId: driver.ambulanceId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerPatient, loginPatient, loginHospital, loginDriver };

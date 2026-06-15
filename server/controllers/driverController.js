const Driver = require('../models/Driver');
const Ambulance = require('../models/Ambulance');
const AmbulanceRequest = require('../models/AmbulanceRequest');

const getProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.user.id).populate('ambulanceId');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.user.id, { status }, { new: true });

    if (driver.ambulanceId) {
      await Ambulance.findByIdAndUpdate(driver.ambulanceId, { status });
    }

    const io = req.app.get('io');
    io.to(`hospital:${driver.hospitalId}`).emit('ambulance:statusChanged', {
      driverId: driver._id,
      ambulanceId: driver.ambulanceId,
      status,
    });

    res.json(driver);
  } catch (error) {
    next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findById(req.params.id);
    if (!request || request.driverId?.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { status: 'busy' },
      { new: true }
    );
    await Ambulance.findByIdAndUpdate(driver.ambulanceId, { status: 'busy' });

    request.status = 'accepted';
    await request.save();

    const io = req.app.get('io');
    io.to(`patient:${request.patientId}`).emit('ambulance:accepted', {
      requestId: request._id,
      driverId: driver._id,
      ambulanceId: driver.ambulanceId,
    });
    io.to(`hospital:${driver.hospitalId}`).emit('ambulance:statusChanged', {
      driverId: driver._id,
      ambulanceId: driver.ambulanceId,
      status: 'busy',
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

const rejectRequest = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.driverId = null;
    await request.save();

    res.json({ message: 'Request rejected' });
  } catch (error) {
    next(error);
  }
};

const markPickup = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'in_progress' },
      { new: true }
    ).populate('hospitalId', 'name location');

    res.json(request);
  } catch (error) {
    next(error);
  }
};

const markComplete = async (req, res, next) => {
  try {
    const request = await AmbulanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'completed';
    await request.save();

    const driver = await Driver.findByIdAndUpdate(
      req.user.id,
      { status: 'available' },
      { new: true }
    );
    await Ambulance.findByIdAndUpdate(driver.ambulanceId, { status: 'available' });

    const io = req.app.get('io');
    io.to(`hospital:${driver.hospitalId}`).emit('ambulance:statusChanged', {
      driverId: driver._id,
      ambulanceId: driver.ambulanceId,
      status: 'available',
    });

    res.json(request);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateStatus,
  acceptRequest,
  rejectRequest,
  markPickup,
  markComplete,
};

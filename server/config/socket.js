const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Ambulance = require('../models/Ambulance');

const initSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { role, id, hospitalId } = socket.user;

    if (role === 'hospital') {
      socket.join(`hospital:${id}`);
    } else if (role === 'patient') {
      socket.join(`patient:${id}`);
    } else if (role === 'driver') {
      socket.join(`driver:${id}`);
      if (hospitalId) socket.join(`hospital:${hospitalId}`);
    }

    socket.on('driver:locationUpdate', async ({ driverId, ambulanceId, lat, lng }) => {
      if (role !== 'driver' || id !== driverId) return;

      await Ambulance.findByIdAndUpdate(ambulanceId, {
        location: { type: 'Point', coordinates: [lng, lat] },
        lastSeen: new Date(),
      });

      const driver = await Driver.findById(driverId);
      if (driver) {
        const payload = { driverId, ambulanceId, lat, lng };
        io.to(`hospital:${driver.hospitalId}`).emit('ambulance:locationUpdate', payload);

        const AmbulanceRequest = require('../models/AmbulanceRequest');
        const activeReq = await AmbulanceRequest.findOne({
          driverId,
          status: { $in: ['accepted', 'in_progress'] },
        });
        if (activeReq) {
          io.to(`patient:${activeReq.patientId}`).emit('ambulance:locationUpdate', payload);
        }
      }
    });

    socket.on('driver:statusChange', async ({ status }) => {
      if (role !== 'driver') return;

      const driver = await Driver.findByIdAndUpdate(id, { status }, { new: true });
      if (driver?.ambulanceId) {
        await Ambulance.findByIdAndUpdate(driver.ambulanceId, { status });
      }

      io.to(`hospital:${driver.hospitalId}`).emit('ambulance:statusChanged', {
        driverId: id,
        ambulanceId: driver.ambulanceId,
        status,
      });
    });

    socket.on('disconnect', async () => {
      if (role === 'driver') {
        const driver = await Driver.findByIdAndUpdate(id, { status: 'offline' }, { new: true });
        if (driver?.ambulanceId) {
          await Ambulance.findByIdAndUpdate(driver.ambulanceId, { status: 'offline' });
          io.to(`hospital:${driver.hospitalId}`).emit('ambulance:statusChanged', {
            driverId: id,
            ambulanceId: driver.ambulanceId,
            status: 'offline',
          });
        }
      }
    });
  });
};

module.exports = { initSocket };

const Bed = require('../models/Bed');

const startReservationExpiryJob = (io) => {
  setInterval(async () => {
    try {
      const expiredBeds = await Bed.find({
        status: 'reserved',
        reservedUntil: { $lt: new Date() },
      });

      for (const bed of expiredBeds) {
        bed.status = 'available';
        bed.reservedUntil = null;
        bed.patientId = null;
        await bed.save();

        io.to(`hospital:${bed.hospitalId}`).emit('bed:statusChanged', {
          bedId: bed._id,
          newStatus: 'available',
        });
      }
    } catch (error) {
      console.error('Reservation expiry job error:', error.message);
    }
  }, 60000);
};

module.exports = { startReservationExpiryJob };

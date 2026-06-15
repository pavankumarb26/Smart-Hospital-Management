const mongoose = require('mongoose');

const opBookingSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  date: { type: Date, required: true },
  tokenNumber: { type: String, required: true },
  status: { type: String, enum: ['booked', 'visited', 'cancelled'], default: 'booked' },
  createdAt: { type: Date, default: Date.now },
});

opBookingSchema.index({ hospitalId: 1, date: 1 });

module.exports = mongoose.model('OPBooking', opBookingSchema);

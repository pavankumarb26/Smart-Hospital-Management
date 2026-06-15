const mongoose = require('mongoose');

const ambulanceRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  patientLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'in_progress', 'completed', 'rejected'],
    default: 'requested',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AmbulanceRequest', ambulanceRequestSchema);

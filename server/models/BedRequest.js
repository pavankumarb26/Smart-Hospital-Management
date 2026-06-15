const mongoose = require('mongoose');

const bedRequestSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  patientName: { type: String, required: true },
  patientAge: { type: Number, required: true },
  problemDescription: { type: String, required: true },
  bedType: { type: String, enum: ['normal', 'icu', 'emergency', 'ventilator'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  assignedBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', default: null },
}, { timestamps: true });

module.exports = mongoose.model('BedRequest', bedRequestSchema);

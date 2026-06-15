const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  wardName: { type: String, required: true },
  bedNumber: { type: String, required: true },
  type: { type: String, enum: ['normal', 'icu', 'emergency', 'ventilator'], required: true },
  status: {
    type: String,
    enum: ['available', 'occupied', 'cleaning', 'maintenance', 'reserved'],
    default: 'available',
  },
  qrCode: { type: String },
  reservedUntil: { type: Date, default: null },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

bedSchema.index({ hospitalId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Bed', bedSchema);

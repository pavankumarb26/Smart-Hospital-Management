const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['government', 'private'], required: true },
  description: { type: String, default: '' },
  specialties: [{ type: String }],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  images: [{ type: String }],
  adminEmail: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  totalBeds: { type: Number, default: 0 },
  totalICU: { type: Number, default: 0 },
  totalEmergency: { type: Number, default: 0 },
  totalVentilators: { type: Number, default: 0 },
  dailyOPCapacity: { type: Number, default: 50 },
});

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);

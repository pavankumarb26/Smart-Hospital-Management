const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['government', 'private'], required: true },
  description: { type: String, default: '' },
  specialties: [{ type: String }],
  city: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  googlePlaceId: { type: String, sparse: true },
  website: { type: String, default: '' },
  images: [{ type: String }],
  adminEmail: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  totalBeds: { type: Number, default: 0 },
  totalICU: { type: Number, default: 0 },
  totalEmergency: { type: Number, default: 0 },
  totalVentilators: { type: Number, default: 0 },
  dailyOPCapacity: { type: Number, default: 50 },
  bedConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ city: 1 });
hospitalSchema.index({ approvalStatus: 1 });
hospitalSchema.index({ googlePlaceId: 1 }, { sparse: true });
hospitalSchema.index({ name: 'text' });

module.exports = mongoose.model('Hospital', hospitalSchema);

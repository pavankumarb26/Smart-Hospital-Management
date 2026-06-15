const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, required: true },
  ambulanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'offline' },
});

module.exports = mongoose.model('Driver', driverSchema);

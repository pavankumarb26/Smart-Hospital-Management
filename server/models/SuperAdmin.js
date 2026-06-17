const mongoose = require('mongoose');

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);

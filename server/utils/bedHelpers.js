const Bed = require('../models/Bed');

const mongoose = require('mongoose');

const getAvailableBedCounts = async (hospitalId) => {
  const hid = new mongoose.Types.ObjectId(hospitalId);
  const counts = await Bed.aggregate([
    { $match: { hospitalId: hid, status: 'available' } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  const result = { normal: 0, icu: 0, emergency: 0, ventilator: 0 };
  counts.forEach((c) => {
    result[c._id] = c.count;
  });
  return result;
};

const getBedStats = async (hospitalId) => {
  const [total, occupied, available, icuAvailable, ventilatorAvailable] = await Promise.all([
    Bed.countDocuments({ hospitalId }),
    Bed.countDocuments({ hospitalId, status: 'occupied' }),
    Bed.countDocuments({ hospitalId, status: 'available' }),
    Bed.countDocuments({ hospitalId, type: 'icu', status: 'available' }),
    Bed.countDocuments({ hospitalId, type: 'ventilator', status: 'available' }),
  ]);

  return { total, occupied, available, icuAvailable, ventilatorAvailable };
};

module.exports = { getAvailableBedCounts, getBedStats };

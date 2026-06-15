const OPBooking = require('../models/OPBooking');

const generateOPToken = async (hospitalId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await OPBooking.countDocuments({
    hospitalId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  const nextNum = count + 1;
  return `OP-${String(nextNum).padStart(3, '0')}`;
};

module.exports = { generateOPToken };

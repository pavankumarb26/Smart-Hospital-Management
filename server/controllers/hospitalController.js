const Hospital = require('../models/Hospital');
const OPBooking = require('../models/OPBooking');
const { getAvailableBedCounts } = require('../utils/bedHelpers');

const getNearbyHospitals = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const hospitals = await Hospital.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 50000,
        },
      },
    });

    const results = await Promise.all(
      hospitals.map(async (h) => {
        const counts = await getAvailableBedCounts(h._id);
        const coords = h.location.coordinates;
        const dLat = (coords[1] - parseFloat(lat)) * Math.PI / 180;
        const dLng = (coords[0] - parseFloat(lng)) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(parseFloat(lat) * Math.PI / 180) *
          Math.cos(coords[1] * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        const distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          _id: h._id,
          name: h.name,
          type: h.type,
          description: h.description,
          specialties: h.specialties,
          images: h.images,
          distance: Math.round(distance * 10) / 10,
          available: counts,
          totalBeds: h.totalBeds,
          totalICU: h.totalICU,
          totalVentilators: h.totalVentilators,
        };
      })
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    res.json(hospital);
  } catch (error) {
    next(error);
  }
};

const getHospitalResources = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const available = await getAvailableBedCounts(hospital._id);
    res.json({
      total: {
        normal: hospital.totalBeds,
        icu: hospital.totalICU,
        emergency: hospital.totalEmergency,
        ventilator: hospital.totalVentilators,
      },
      available,
    });
  } catch (error) {
    next(error);
  }
};

const getOPStatus = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const booked = await OPBooking.countDocuments({
      hospitalId: hospital._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
    });

    res.json({
      capacity: hospital.dailyOPCapacity,
      booked,
      remaining: Math.max(0, hospital.dailyOPCapacity - booked),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearbyHospitals,
  getHospitalById,
  getHospitalResources,
  getOPStatus,
};

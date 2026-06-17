const Hospital = require('../models/Hospital');
const OPBooking = require('../models/OPBooking');
const { getAvailableBedCounts } = require('../utils/bedHelpers');
const { calculateDistance, parseHospitalCoords } = require('../utils/distance');

const formatHospital = async (h, userLat, userLng) => {
  const counts = await getAvailableBedCounts(h._id);
  const { latitude, longitude } = parseHospitalCoords(h.location);

  const distance = userLat && userLng && latitude != null
    ? Math.round(calculateDistance(
        parseFloat(userLat),
        parseFloat(userLng),
        latitude,
        longitude
      ) * 10) / 10
    : null;

  const debug = {
    hospitalName: h.name,
    city: h.city,
    latitude,
    longitude,
    distance,
    storedGeoJSON: h.location?.coordinates,
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[distance-debug]', debug);
  }

  return {
    _id: h._id,
    name: h.name,
    type: h.type,
    description: h.description,
    specialties: h.specialties,
    city: h.city,
    images: h.images,
    latitude,
    longitude,
    distance,
    available: counts,
    totalBeds: h.totalBeds,
    totalICU: h.totalICU,
    totalEmergency: h.totalEmergency,
    totalVentilators: h.totalVentilators,
  };
};

const getNearbyHospitals = async (req, res, next) => {
  try {
    const { lat, lng, city } = req.query;
    const baseFilter = { approvalStatus: 'approved' };

    if (city) {
      baseFilter.city = new RegExp(city.trim(), 'i');
    }

    if (lat && lng) {
      console.log('[distance-debug] patient coordinates:', {
        userLatitude: parseFloat(lat),
        userLongitude: parseFloat(lng),
      });
    }

    let hospitals;

    if (lat && lng) {
      hospitals = await Hospital.find({
        ...baseFilter,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          },
        },
      });
    } else {
      hospitals = await Hospital.find(baseFilter);
    }

    const results = await Promise.all(
      hospitals.map((h) => formatHospital(h, lat, lng))
    );

    if (lat && lng) {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
};

const getCities = async (_req, res, next) => {
  try {
    const cities = await Hospital.distinct('city', { approvalStatus: 'approved' });
    res.json(cities.sort());
  } catch (error) {
    next(error);
  }
};

const getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      approvalStatus: 'approved',
    });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    const { latitude, longitude } = parseHospitalCoords(hospital.location);
    res.json({ ...hospital.toObject(), latitude, longitude });
  } catch (error) {
    next(error);
  }
};

const getHospitalResources = async (req, res, next) => {
  try {
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      approvalStatus: 'approved',
    });
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
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      approvalStatus: 'approved',
    });
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
  getCities,
  getHospitalById,
  getHospitalResources,
  getOPStatus,
};

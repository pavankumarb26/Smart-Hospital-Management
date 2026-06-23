const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const { calculateDistance, formatDistanceKm } = require('../utils/distance');

/**
 * Fix Ragolu/GEMS coordinates that were incorrectly set to same point as Amadalavalasa.
 * Run: node scripts/fix-ragolu-coordinates.js
 */
require('dotenv').config();

const USER_TEST = { lat: 18.4059, lng: 83.9086 };

// Ragolu village (~12 km from Amadalavalasa / user test point)
const RAGOLU_COORDS = { lat: 18.3150, lng: 83.8450 };
const AMADALAVALASA_COORDS = { lat: 18.4108, lng: 83.9028 };

const fix = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected\n');
  console.log('Patient reference:', USER_TEST);

  const hospitals = await Hospital.find({});
  for (const h of hospitals) {
    const [lng, lat] = h.location?.coordinates || [];
    const city = (h.city || '').toLowerCase();
    const isRagolu = city.includes('ragolu') || /gems/i.test(h.name);

    if (isRagolu) {
      const oldDist = formatDistanceKm(calculateDistance(USER_TEST.lat, USER_TEST.lng, lat, lng));
      h.location = { type: 'Point', coordinates: [RAGOLU_COORDS.lng, RAGOLU_COORDS.lat] };
      await h.save();
      await Ambulance.updateMany(
        { hospitalId: h._id },
        { location: { type: 'Point', coordinates: [RAGOLU_COORDS.lng, RAGOLU_COORDS.lat] } }
      );
      const newDist = formatDistanceKm(
        calculateDistance(USER_TEST.lat, USER_TEST.lng, RAGOLU_COORDS.lat, RAGOLU_COORDS.lng)
      );
      console.log(`UPDATED ${h.name} (${h.city})`);
      console.log(`  Old: lat=${lat}, lng=${lng}, distance=${oldDist} km`);
      console.log(`  New: lat=${RAGOLU_COORDS.lat}, lng=${RAGOLU_COORDS.lng}, distance=${newDist} km`);
    } else if (city.includes('amadalavalasa') || h.name.toLowerCase() === 'xyz') {
      console.log(`OK ${h.name} (${h.city}): lat=${lat}, lng=${lng}, distance=${
        formatDistanceKm(calculateDistance(USER_TEST.lat, USER_TEST.lng, lat, lng))
      } km`);
    } else {
      console.log(`${h.name} (${h.city}): lat=${lat}, lng=${lng}`);
    }
  }

  process.exit(0);
};

fix().catch((e) => { console.error(e); process.exit(1); });

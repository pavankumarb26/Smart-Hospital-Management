require('dotenv').config();
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');

const haversineKm = (userLat, userLng, hospLat, hospLng) => {
  const dLat = (hospLat - userLat) * Math.PI / 180;
  const dLng = (hospLng - userLng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(userLat * Math.PI / 180) * Math.cos(hospLat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const USER_LAT = 18.4059;
const USER_LNG = 83.9086;

const audit = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  console.log(`Patient test coordinates: lat=${USER_LAT}, lng=${USER_LNG} (Ragolu/Srikakulam area)\n`);
  console.log('='.repeat(80));

  const hospitals = await Hospital.find({}).sort({ name: 1 });

  if (!hospitals.length) {
    console.log('No hospitals found.');
    process.exit(0);
  }

  for (const h of hospitals) {
    const [lng, lat] = h.location?.coordinates || [null, null];
    const distance = lat != null ? haversineKm(USER_LAT, USER_LNG, lat, lng) : null;

    const isBangalore = lat > 12 && lat < 13.5 && lng > 77 && lng < 78;
    const isRagoluArea = lat > 18 && lat < 19 && lng > 83 && lng < 84;

    console.log({
      hospitalName: h.name,
      city: h.city,
      approvalStatus: h.approvalStatus,
      storedGeoJSON: h.location?.coordinates,
      parsedLatitude: lat,
      parsedLongitude: lng,
      distanceKm: distance != null ? Math.round(distance * 10) / 10 : null,
      flag: isBangalore ? '⚠️  BANGALORE COORDS (wrong if hospital is in AP)' :
            isRagoluArea ? '✅ Ragolu/Srikakulam area' : '❓ Other region',
    });
    console.log('-'.repeat(80));
  }

  const gems = hospitals.filter((h) => /gems/i.test(h.name));
  if (gems.length) {
    console.log('\nGEMS hospital detail:');
    gems.forEach((h) => {
      const [lng, lat] = h.location.coordinates;
      console.log(`  MongoDB coordinates [lng, lat]: [${lng}, ${lat}]`);
      console.log(`  Expected for Ragolu ~: [83.9086, 18.4059] (lng, lat)`);
      console.log(`  Bangalore seed was:    [77.5946, 12.9716]`);
    });
  }

  process.exit(0);
};

audit().catch((e) => {
  console.error(e);
  process.exit(1);
});

const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const { isBangaloreCoords } = require('../utils/distance');

/**
 * Fix hospitals that have AP/Srikakulam city names but Bangalore seed coordinates.
 * Run: node scripts/migrate-fix-hospital-locations.js
 */
require('dotenv').config();

const CITY_COORDS = {
  ragolu: { lng: 83.8450, lat: 18.3150 },
  amadalavalasa: { lng: 83.9028, lat: 18.4108 },
  srikakulam: { lng: 83.8965, lat: 18.2949 },
};

const RAGOLU_AREA = {
  lng: 83.8450,
  lat: 18.3150,
  label: 'Ragolu village area',
};

const resolveCoords = (hospital) => {
  const cityKey = (hospital.city || '').trim().toLowerCase();
  if (CITY_COORDS[cityKey]) return CITY_COORDS[cityKey];
  if (/gems/i.test(hospital.name)) return RAGOLU_AREA;
  return RAGOLU_AREA;
};

const migrate = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const hospitals = await Hospital.find({});
  let fixed = 0;

  for (const h of hospitals) {
    const [lng, lat] = h.location?.coordinates || [];
    if (lat == null) continue;

    const cityLower = (h.city || '').toLowerCase();
    const isApCity = Object.keys(CITY_COORDS).some((c) => cityLower.includes(c)) ||
      /gems/i.test(h.name);

    if (isApCity && isBangaloreCoords(lat, lng)) {
      const target = resolveCoords(h);
      const old = { lat, lng };
      h.location = { type: 'Point', coordinates: [target.lng, target.lat] };
      await h.save();

      await Ambulance.updateMany(
        { hospitalId: h._id },
        { location: { type: 'Point', coordinates: [target.lng, target.lat] } }
      );

      console.log(`FIXED: ${h.name} (${h.city})`);
      console.log(`  Old: lat=${old.lat}, lng=${old.lng} (Bangalore — wrong)`);
      console.log(`  New: lat=${target.lat}, lng=${target.lng}`);
      fixed++;
    } else {
      console.log(`OK: ${h.name} (${h.city}) → lat=${lat}, lng=${lng}`);
    }
  }

  console.log(`\nDone. Fixed ${fixed} hospital(s).`);
  process.exit(0);
};

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});

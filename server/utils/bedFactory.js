const Bed = require('../models/Bed');
const Hospital = require('../models/Hospital');
const { generateBedQR } = require('./qrGenerator');

const TYPE_TOTAL_FIELD = {
  normal: 'totalBeds',
  icu: 'totalICU',
  emergency: 'totalEmergency',
  ventilator: 'totalVentilators',
};

const normalizeBedConfig = (bedConfig) => {
  const entries = [];
  for (const [type, val] of Object.entries(bedConfig || {})) {
    if (Array.isArray(val)) {
      val.forEach((w) => {
        if (w?.count && Number(w.count) > 0) {
          entries.push({ type, count: Number(w.count), wardName: w.wardName || `${type} Ward` });
        }
      });
    } else if (val?.count && Number(val.count) > 0) {
      entries.push({ type, count: Number(val.count), wardName: val.wardName || `${type} Ward` });
    }
  }
  return entries;
};

const createBedsForHospital = async (hospitalId, bedConfig) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) throw new Error('Hospital not found');

  const totals = { totalBeds: 0, totalICU: 0, totalEmergency: 0, totalVentilators: 0 };
  const entries = normalizeBedConfig(bedConfig);

  for (const { type, count, wardName } of entries) {
    const existingCount = await Bed.countDocuments({ hospitalId, type, wardName });

    for (let i = 1; i <= count; i++) {
      const bedNumber = `Bed-${String(existingCount + i).padStart(3, '0')}`;
      const bed = await Bed.create({
        hospitalId,
        wardName,
        bedNumber,
        type,
        status: 'available',
      });
      bed.qrCode = await generateBedQR(bed._id, hospitalId);
      await bed.save();
    }

    const field = TYPE_TOTAL_FIELD[type];
    if (field) totals[field] += count;
  }

  hospital.totalBeds += totals.totalBeds;
  hospital.totalICU += totals.totalICU;
  hospital.totalEmergency += totals.totalEmergency;
  hospital.totalVentilators += totals.totalVentilators;
  if (bedConfig) hospital.bedConfig = bedConfig;
  await hospital.save();

  return hospital;
};

const addBedsToHospital = async (hospitalId, type, wardName, count) => {
  const config = { [type]: [{ count, wardName }] };
  return createBedsForHospital(hospitalId, config);
};

module.exports = { createBedsForHospital, addBedsToHospital, normalizeBedConfig };

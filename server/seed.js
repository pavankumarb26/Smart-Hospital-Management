require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Hospital = require('./models/Hospital');
const Bed = require('./models/Bed');
const Driver = require('./models/Driver');
const Ambulance = require('./models/Ambulance');
const User = require('./models/User');
const { generateBedQR } = require('./utils/qrGenerator');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-hospital');
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Hospital.deleteMany({}),
    Bed.deleteMany({}),
    Driver.deleteMany({}),
    Ambulance.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);

  const patient = await User.create({
    name: 'John Doe',
    email: 'patient@test.com',
    passwordHash,
    phone: '9876543210',
  });
  console.log('Patient:', patient.email, '/ password123');

  const hospital = await Hospital.create({
    name: 'City General Hospital',
    type: 'government',
    description: 'A leading multi-specialty government hospital with 24/7 emergency services.',
    specialties: ['Cardiology', 'Orthopedics', 'Neurology', 'Emergency Medicine'],
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800'],
    adminEmail: 'hospital@test.com',
    passwordHash,
    totalBeds: 0,
    totalICU: 0,
    totalEmergency: 0,
    totalVentilators: 0,
    dailyOPCapacity: 50,
  });
  console.log('Hospital:', hospital.adminEmail, '/ password123');

  const hospital2 = await Hospital.create({
    name: 'Apollo Care Private Hospital',
    type: 'private',
    description: 'Premium private healthcare with state-of-the-art ICU and ventilator facilities.',
    specialties: ['Oncology', 'Cardiology', 'Pediatrics'],
    location: { type: 'Point', coordinates: [77.6412, 12.9352] },
    images: ['https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800'],
    adminEmail: 'apollo@test.com',
    passwordHash,
    dailyOPCapacity: 30,
  });
  console.log('Hospital 2:', hospital2.adminEmail, '/ password123');

  const bedTypes = [
    { ward: 'Ward A', type: 'normal', count: 5 },
    { ward: 'ICU Block', type: 'icu', count: 3 },
    { ward: 'Emergency', type: 'emergency', count: 2 },
    { ward: 'Ventilator Unit', type: 'ventilator', count: 2 },
  ];

  for (const { ward, type, count } of bedTypes) {
    for (let i = 1; i <= count; i++) {
      const bedNumber = `Bed-${String(i).padStart(3, '0')}`;
      const bed = await Bed.create({
        hospitalId: hospital._id,
        wardName: ward,
        bedNumber,
        type,
        status: 'available',
      });
      bed.qrCode = await generateBedQR(bed._id, hospital._id);
      await bed.save();

      if (type === 'normal') hospital.totalBeds++;
      else if (type === 'icu') hospital.totalICU++;
      else if (type === 'emergency') hospital.totalEmergency++;
      else if (type === 'ventilator') hospital.totalVentilators++;
    }
  }
  await hospital.save();

  const driver = await Driver.create({
    hospitalId: hospital._id,
    name: 'Raj Kumar',
    email: 'driver@test.com',
    passwordHash,
    phone: '9876543211',
    status: 'offline',
  });
  console.log('Driver:', driver.email, '/ password123');

  const ambulance = await Ambulance.create({
    hospitalId: hospital._id,
    vehicleNumber: 'KA-01-AB-1234',
    driverName: driver.name,
    driverId: driver._id,
    status: 'offline',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
  });

  driver.ambulanceId = ambulance._id;
  await driver.save();

  console.log('\nSeed complete!');
  console.log('Demo credentials:');
  console.log('  Patient:  patient@test.com / password123');
  console.log('  Hospital: hospital@test.com / password123');
  console.log('  Driver:   driver@test.com / password123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

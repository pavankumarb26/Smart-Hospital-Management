require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Hospital = require('./models/Hospital');
const Bed = require('./models/Bed');
const Driver = require('./models/Driver');
const Ambulance = require('./models/Ambulance');
const User = require('./models/User');
const SuperAdmin = require('./models/SuperAdmin');
const { createBedsForHospital } = require('./utils/bedFactory');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-hospital');
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    SuperAdmin.deleteMany({}),
    Hospital.deleteMany({}),
    Bed.deleteMany({}),
    Driver.deleteMany({}),
    Ambulance.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('password123', 10);

  await SuperAdmin.create({
    name: 'Super Admin',
    email: 'admin@smartcare.com',
    passwordHash,
  });
  console.log('Super Admin: admin@smartcare.com / password123');

  await User.create({
    name: 'John Doe',
    email: 'patient@test.com',
    passwordHash,
    phone: '9876543210',
  });
  console.log('Patient: patient@test.com / password123');

  const hospital = await Hospital.create({
    name: 'City General Hospital',
    type: 'government',
    description: 'A leading multi-specialty government hospital with 24/7 emergency services.',
    specialties: ['Cardiology', 'Orthopedics', 'Neurology', 'Emergency Medicine'],
    city: 'Bangalore',
    address: 'MG Road, Bangalore',
    phone: '080-12345678',
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    images: ['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800'],
    adminEmail: 'hospital@test.com',
    passwordHash,
    approvalStatus: 'approved',
    dailyOPCapacity: 50,
  });

  await createBedsForHospital(hospital._id, {
    normal: [
      { count: 5, wardName: 'Ward A' },
    ],
    icu: [{ count: 3, wardName: 'ICU Block' }],
    emergency: [{ count: 2, wardName: 'Emergency' }],
    ventilator: [{ count: 2, wardName: 'Ventilator Unit' }],
  });
  console.log('Hospital: hospital@test.com / password123 (approved)');

  await Hospital.create({
    name: 'Apollo Care Private Hospital',
    type: 'private',
    description: 'Premium private healthcare with state-of-the-art ICU and ventilator facilities.',
    specialties: ['Oncology', 'Cardiology', 'Pediatrics'],
    city: 'Bangalore',
    address: 'Koramangala, Bangalore',
    phone: '080-87654321',
    location: { type: 'Point', coordinates: [77.6412, 12.9352] },
    images: ['https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800'],
    adminEmail: 'apollo@test.com',
    passwordHash,
    approvalStatus: 'approved',
    dailyOPCapacity: 30,
  });
  console.log('Hospital 2: apollo@test.com / password123 (approved)');

  const driver = await Driver.create({
    hospitalId: hospital._id,
    name: 'Raj Kumar',
    email: 'driver@test.com',
    passwordHash,
    phone: '9876543211',
    status: 'offline',
  });

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
  console.log('Driver: driver@test.com / password123');

  console.log('\nSeed complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

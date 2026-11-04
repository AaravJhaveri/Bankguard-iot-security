require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SystemSetting = require('../models/SystemSetting');

const defaultSettings = [
  { key: 'DHT11_TEMP_WARN', value: 35 },
  { key: 'DHT11_TEMP_CRITICAL', value: 45 },
  { key: 'DHT11_HUMIDITY_WARN', value: 80 },
  { key: 'MQ2_ADC_THRESHOLD', value: 300 },
  { key: 'FIRE_CONFIRM_PERIOD_MS', value: 10000 },
  { key: 'ULTRASONIC_DISTANCE_CM', value: 100 },
  { key: 'AUTH_WINDOW_DURATION_MS', value: 30000 },
  { key: 'ADXL335_TAMPER_DELTA', value: 0.3 },
  { key: 'SENSOR_STALE_MS', value: 30000 },
  { key: 'SENSOR_OFFLINE_MS', value: 60000 },
];

async function seed() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bankguard';
  console.log(`Connecting to MongoDB at: ${uri}`);
  await mongoose.connect(uri);

  console.log('--- Seeding Default System Settings ---');
  for (const item of defaultSettings) {
    await SystemSetting.findOneAndUpdate(
      { key: item.key },
      { key: item.key, value: item.value, updatedAt: new Date() },
      { upsert: true }
    );
  }
  console.log('✓ Default settings upserted.');

  console.log('--- Checking Default Users ---');
  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('ChangeMe@123', salt);

  const existingManager = await User.findOne({ employeeId: 'MGR001' });
  if (!existingManager) {
    await User.create({
      employeeId: 'MGR001',
      name: 'Branch Manager',
      email: 'manager@bankguard.local',
      role: 'MANAGER',
      passwordHash: defaultPasswordHash,
      isActive: true,
    });
    console.log('✓ Manager account created: MGR001');
  } else {
    console.log('Manager MGR001 already exists.');
  }

  const existingEmployee = await User.findOne({ employeeId: 'EMP001' });
  if (!existingEmployee) {
    await User.create({
      employeeId: 'EMP001',
      name: 'Demo Employee',
      email: 'employee@bankguard.local',
      role: 'EMPLOYEE',
      passwordHash: defaultPasswordHash,
      isActive: true,
    });
    console.log('✓ Employee account created: EMP001');
  } else {
    console.log('Employee EMP001 already exists.');
  }

  console.log(`
======================================================
  BANKGUARD DATABASE SEED COMPLETE
  Manager Login:  Employee ID: MGR001 | Password: ChangeMe@123
  Employee Login: Employee ID: EMP001 | Password: ChangeMe@123
  
  [WARNING] CHANGE THESE DEFAULT PASSWORDS IMMEDIATELY
======================================================
`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});


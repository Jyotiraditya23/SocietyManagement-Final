/**
 * Seed Data Script for Society Maintenance Tracker
 * 
 * Usage: 
 *   node scripts/seedData.js           - Seeds all data
 *   node scripts/seedData.js --clear   - Clears all data first, then seeds
 *   node scripts/seedData.js --reset   - Clears all data only
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const Setting = require('../models/Setting');

// MongoDB connection
const connectDB = require('../config/db');

// Config
const DEFAULT_PASSWORD = 'password123';

const usersData = [
  // Manager
  {
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@example.com',
    phone: '9876543210',
    flat_no: '102',
    role: 'manager',
    password_hash: DEFAULT_PASSWORD
  },
  // Admin
  {
    name: 'Suresh Mehta',
    email: 'suresh.mehta@example.com',
    phone: '9876543216',
    flat_no: '203',
    role: 'admin',
    password_hash: DEFAULT_PASSWORD
  },
  // Residents
  {
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phone: '9876543211',
    flat_no: '103',
    role: 'resident',
    password_hash: DEFAULT_PASSWORD
  },
  {
    name: 'Amit Kumar',
    email: 'amit.kumar@example.com',
    phone: '9876543212',
    flat_no: '104',
    role: 'resident',
    password_hash: DEFAULT_PASSWORD
  },
  {
    name: 'Sunita Verma',
    email: 'sunita.verma@example.com',
    phone: '9876543213',
    flat_no: '105',
    role: 'resident',
    password_hash: DEFAULT_PASSWORD
  }
];

const noticesData = [
  {
    title: 'Water Supply Maintenance Scheduled',
    content: 'Please note that the main water pump will undergo maintenance on Saturday, 12th July, from 10:00 AM to 2:00 PM. There will be no water supply during this period. Please store water in advance.',
    is_important: true
  },
  {
    title: 'Society AGM Meeting Agenda',
    content: 'The Annual General Meeting of the society is scheduled for Sunday, 20th July, at 5:00 PM in the clubhouse. Agenda: 1. Annual Audit Report, 2. Overdue complaints tracking system, 3. Upcoming festival planning.',
    is_important: false
  },
  {
    title: 'Lift Safety Inspection',
    content: 'The monthly safety check for Lift A and Lift B has been completed. Both lifts are certified safe for use.',
    is_important: false
  }
];

async function seedDatabase() {
  try {
    await connectDB();
    console.log('📦 Connected to MongoDB\n');

    const args = process.argv.slice(2);
    const shouldClear = args.includes('--clear');
    const resetOnly = args.includes('--reset');

    if (shouldClear || resetOnly) {
      console.log('🗑️  Clearing existing data...');
      
      // Clear collections
      await Complaint.deleteMany({});
      console.log('   ✓ Complaints cleared');
      
      await Notice.deleteMany({});
      console.log('   ✓ Notices cleared');

      await Setting.deleteMany({});
      console.log('   ✓ Settings cleared');
      
      await User.deleteMany({});
      console.log('   ✓ Users cleared\n');

      if (resetOnly) {
        console.log('✅ Database reset complete!');
        process.exit(0);
      }
    }

    console.log('🌱 Starting seed process...\n');

    // 1. Seed Users
    console.log('👥 Seeding Users...');
    const createdUsers = [];
    for (const userData of usersData) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`   ✓ Created user: ${userData.name} (${userData.role}) - Flat ${userData.flat_no}`);
    }
    console.log(`   📊 Total users: ${createdUsers.length}\n`);

    const manager = createdUsers.find(u => u.role === 'manager');
    const priya = createdUsers.find(u => u.email === 'priya.patel@example.com');
    const amit = createdUsers.find(u => u.email === 'amit.kumar@example.com');
    const sunita = createdUsers.find(u => u.email === 'sunita.verma@example.com');

    // 2. Seed Settings
    console.log('⚙️ Seeding Settings...');
    await Setting.create({ key: 'overdue_threshold_days', value: 3 });
    console.log('   ✓ Created overdue threshold setting (3 days)\n');

    // 3. Seed Notices
    console.log('📌 Seeding Notices...');
    for (const noticeData of noticesData) {
      const notice = new Notice({
        ...noticeData,
        created_by: manager._id
      });
      await notice.save();
      console.log(`   ✓ Created notice: ${noticeData.title} (Important: ${noticeData.is_important})`);
    }
    console.log('');

    // 4. Seed Complaints
    console.log('📝 Seeding Complaints...');
    const complaintsData = [
      {
        user_id: priya._id,
        flat_no: priya.flat_no,
        category: 'Plumbing',
        description: 'Severe water leakage from the ceiling in the kitchen area. The leak seems to be coming from the flat above.',
        status: 'open',
        priority: 'high',
        status_history: [
          {
            status: 'open',
            actor: priya._id,
            note: 'Complaint filed. The leakage is worsening.',
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago (will show as overdue!)
          }
        ]
      },
      {
        user_id: amit._id,
        flat_no: amit.flat_no,
        category: 'Electrical',
        description: 'The corridor light outside Flat 104 is completely burnt out and needs replacement. It is pitch dark at night.',
        status: 'in-progress',
        priority: 'medium',
        status_history: [
          {
            status: 'open',
            actor: amit._id,
            note: 'Complaint filed.',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            status: 'in-progress',
            actor: manager._id,
            note: 'Electrician has been called. Scheduled to visit tomorrow.',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ]
      },
      {
        user_id: sunita._id,
        flat_no: sunita.flat_no,
        category: 'Cleaning/Garbage',
        description: 'Garbage dump bins on the ground floor are overflowing and have not been cleared for 2 days. Bad smell spreading.',
        status: 'resolved',
        priority: 'low',
        resolved_by: manager._id,
        admin_notes: 'Contacted municipal cleaning truck, garbage cleared and floor disinfected.',
        status_history: [
          {
            status: 'open',
            actor: sunita._id,
            note: 'Complaint filed.',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          {
            status: 'resolved',
            actor: manager._id,
            note: 'Municipal truck arrived. Garbage cleared.',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ]
      }
    ];

    for (const complaintData of complaintsData) {
      const complaint = new Complaint(complaintData);
      await complaint.save();
      console.log(`   ✓ Created complaint from Flat ${complaintData.flat_no} - Category: ${complaintData.category} (${complaintData.status})`);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🔐 Test Credentials:');
    console.log('   Manager: rajesh.sharma@example.com / password123');
    console.log('   Admin: suresh.mehta@example.com / password123');
    console.log('   Resident: priya.patel@example.com / password123');
    console.log('═══════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error);
    process.exit(1);
  }
}

seedDatabase();

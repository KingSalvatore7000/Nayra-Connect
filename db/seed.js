const bcrypt = require('bcryptjs');
const { initDb, getDb } = require('./index');

function seedDatabase() {
  console.log('--- Initializing Nayra Connect Database ---');
  initDb();
  const db = getDb();

  console.log('Clearing existing data...');
  db.exec(`
    DELETE FROM cases;
    DELETE FROM lawyer_specializations;
    DELETE FROM lawyers;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('cases', 'lawyer_specializations', 'lawyers', 'users');
  `);

  console.log('Seeding users and roles...');
  const salt = bcrypt.genSaltSync(10);
  const coordinatorHash = bcrypt.hashSync('Coordinator@123', salt);
  const lawyerHash = bcrypt.hashSync('Lawyer@123', salt);

  // 1. Seed Coordinator
  const coordInsert = db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Clinic Coordinator', 'coordinator@nayra.test', coordinatorHash, 'coordinator']
  );
  console.log(`Seeded Coordinator: coordinator@nayra.test (ID: ${coordInsert.lastInsertRowid})`);

  // 2. Seed Lawyers
  const lawyerProfiles = [
    {
      name: 'Adv. Priya Sharma',
      email: 'lawyer1@nayra.test',
      capacity: 4,
      available: 1,
      specs: ['bail', 'criminal']
    },
    {
      name: 'Adv. Rahul Verma',
      email: 'lawyer2@nayra.test',
      capacity: 5,
      available: 1,
      specs: ['family', 'property']
    },
    {
      name: 'Adv. Ananya Iyer',
      email: 'lawyer3@nayra.test',
      capacity: 3,
      available: 1,
      specs: ['labor', 'consumer']
    },
    {
      name: 'Adv. Vikram Malhotra',
      email: 'lawyer4@nayra.test',
      capacity: 6,
      available: 1,
      specs: ['bail', 'criminal', 'property']
    },
    {
      name: 'Adv. Sunita Rao',
      email: 'lawyer5@nayra.test',
      capacity: 4,
      available: 1,
      specs: ['family', 'labor']
    },
    {
      name: 'Adv. Arjun Nair',
      email: 'lawyer6@nayra.test',
      capacity: 5,
      available: 1,
      specs: ['consumer', 'bail']
    },
    {
      name: 'Adv. Meera Joshi',
      email: 'lawyer7@nayra.test',
      capacity: 2,
      available: 0, // Inactive/on leave
      specs: ['criminal']
    }
  ];

  const seededLawyers = [];
  for (const item of lawyerProfiles) {
    const userRes = db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [item.name, item.email, lawyerHash, 'lawyer']
    );
    const userId = userRes.lastInsertRowid;

    const lawyerRes = db.run(
      'INSERT INTO lawyers (user_id, capacity, available) VALUES (?, ?, ?)',
      [userId, item.capacity, item.available]
    );
    const lawyerId = lawyerRes.lastInsertRowid;

    for (const spec of item.specs) {
      db.run(
        'INSERT INTO lawyer_specializations (lawyer_id, case_type) VALUES (?, ?)',
        [lawyerId, spec]
      );
    }

    seededLawyers.push({ lawyerId, ...item });
  }
  console.log(`Seeded ${seededLawyers.length} volunteer lawyers.`);

  // 3. Seed Cases with realistic timestamps
  console.log('Seeding sample cases across statuses and TAT risk profiles...');
  const now = new Date();

  function getDateDaysAgo(days) {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }

  function getFutureDate(days, hours = 10) {
    const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    d.setHours(hours, 0, 0, 0);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }

  const sampleCases = [
    {
      client_name: 'Ramesh Patel',
      phone: '9876543210',
      case_type: 'bail',
      description: 'Urgent bail application for arrest in minor traffic altercation.',
      priority: 'High',
      status: 'Allocated',
      lawyer_id: seededLawyers[0].lawyerId, // lawyer1
      target_days: 3,
      created_at: getDateDaysAgo(1),
      consultation_at: null
    },
    {
      client_name: 'Kavita Reddy',
      phone: '9876543211',
      case_type: 'family',
      description: 'Custody mediation assistance and interim maintenance counsel.',
      priority: 'Medium',
      status: 'Allocated',
      lawyer_id: seededLawyers[1].lawyerId, // lawyer2
      target_days: 14,
      created_at: getDateDaysAgo(3),
      consultation_at: null
    },
    {
      client_name: 'Suresh Gupta',
      phone: '9876543212',
      case_type: 'labor',
      description: 'Unpaid severance wages recovery for factory termination without notice.',
      priority: 'High',
      status: 'Scheduled',
      lawyer_id: seededLawyers[2].lawyerId, // lawyer3
      target_days: 21,
      created_at: getDateDaysAgo(7),
      consultation_at: getFutureDate(1, 10) // Tomorrow at 10:00
    },
    {
      client_name: 'Deepak Chawla',
      phone: '9876543213',
      case_type: 'property',
      description: 'Boundary encroachment complaint and civil injunction request.',
      priority: 'Low',
      status: 'Allocated',
      lawyer_id: seededLawyers[3].lawyerId, // lawyer4
      target_days: 30,
      created_at: getDateDaysAgo(10),
      consultation_at: null
    },
    {
      client_name: 'Anita Sen',
      phone: '9876543214',
      case_type: 'consumer',
      description: 'Defective consumer appliance warranty dispute resolved successfully.',
      priority: 'Medium',
      status: 'Closed',
      lawyer_id: seededLawyers[5].lawyerId, // lawyer6
      target_days: 21,
      created_at: getDateDaysAgo(25),
      consultation_at: null
    },
    // Case 6: OVERDUE / HIGH RISK (4 days elapsed > 3 target days)
    {
      client_name: 'Mohammad Irfan',
      phone: '9876543215',
      case_type: 'bail',
      description: 'Bail plea pending hearing after detention during weekend rally.',
      priority: 'High',
      status: 'Allocated',
      lawyer_id: seededLawyers[0].lawyerId, // lawyer1
      target_days: 3,
      created_at: getDateDaysAgo(4),
      consultation_at: null
    },
    // Case 7: NEAR TAT / HIGH RISK (6 days elapsed on 7 target days = 85.7% TAT elapsed)
    {
      client_name: 'Geeta Shinde',
      phone: '9876543216',
      case_type: 'criminal',
      description: 'First Information Report (FIR) quashing petition draft.',
      priority: 'High',
      status: 'Allocated',
      lawyer_id: seededLawyers[3].lawyerId, // lawyer4
      target_days: 7,
      created_at: getDateDaysAgo(6),
      consultation_at: null
    },
    {
      client_name: 'Balwinder Singh',
      phone: '9876543217',
      case_type: 'property',
      description: 'Tenancy eviction notice challenge and rent control hearing.',
      priority: 'Medium',
      status: 'Unassigned',
      lawyer_id: null,
      target_days: 30,
      created_at: getDateDaysAgo(2),
      consultation_at: null
    },
    {
      client_name: 'Radhika Menon',
      phone: '9876543218',
      case_type: 'family',
      description: 'Mutual consent divorce legal counsel and settlement draft.',
      priority: 'High',
      status: 'New',
      lawyer_id: null,
      target_days: 14,
      created_at: getDateDaysAgo(0),
      consultation_at: null
    },
    {
      client_name: 'Vijay Kulkarni',
      phone: '9876543219',
      case_type: 'labor',
      description: 'Workplace safety violation complaint with labor commissioner.',
      priority: 'Low',
      status: 'Allocated',
      lawyer_id: seededLawyers[4].lawyerId, // lawyer5
      target_days: 21,
      created_at: getDateDaysAgo(5),
      consultation_at: null
    }
  ];

  for (const c of sampleCases) {
    db.run(
      `INSERT INTO cases (client_name, phone, case_type, description, priority, status, lawyer_id, target_days, created_at, consultation_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.client_name,
        c.phone,
        c.case_type,
        c.description,
        c.priority,
        c.status,
        c.lawyer_id,
        c.target_days,
        c.created_at,
        c.consultation_at
      ]
    );
  }
  console.log(`Seeded ${sampleCases.length} sample cases successfully.`);

  console.log('\n======================================================');
  console.log('       NAYRA CONNECT - SEEDED DEMO CREDENTIALS        ');
  console.log('======================================================');
  console.log('Coordinator:');
  console.log('  Email: coordinator@nayra.test');
  console.log('  Password: Coordinator@123');
  console.log('\nLawyers (Password for all: Lawyer@123):');
  for (const l of seededLawyers) {
    console.log(`  - ${l.name} (${l.email}) | Specs: [${l.specs.join(', ')}] | Cap: ${l.capacity} | Avail: ${l.available ? 'Yes' : 'No'}`);
  }
  console.log('======================================================\n');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'students.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Initialize database schema and seed initial data if empty
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create Students Table
      db.run(`
        CREATE TABLE IF NOT EXISTS students (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          department TEXT NOT NULL,
          enrollment_date TEXT NOT NULL,
          gpa REAL NOT NULL DEFAULT 0.0,
          status TEXT NOT NULL DEFAULT 'Active',
          gender TEXT DEFAULT 'Other',
          avatar_url TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);

        // Check if table is empty, seed initial data
        db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
          if (err) return reject(err);
          if (row.count === 0) {
            console.log('Seeding initial student records...');
            seedSampleStudents()
              .then(() => resolve(db))
              .catch(reject);
          } else {
            resolve(db);
          }
        });
      });
    });
  });
}

function seedSampleStudents() {
  const sampleStudents = [
    {
      student_id: 'STU-2024-001',
      first_name: 'Alex',
      last_name: 'Rivera',
      email: 'alex.rivera@campus.edu',
      phone: '+1 (555) 234-5678',
      department: 'Computer Science',
      enrollment_date: '2023-09-01',
      gpa: 3.88,
      status: 'Active',
      gender: 'Male',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      address: '142 University Blvd, Cambridge, MA'
    },
    {
      student_id: 'STU-2024-002',
      first_name: 'Sophia',
      last_name: 'Chen',
      email: 'sophia.chen@campus.edu',
      phone: '+1 (555) 345-6789',
      department: 'Data Science',
      enrollment_date: '2022-09-01',
      gpa: 3.95,
      status: 'Active',
      gender: 'Female',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      address: '88 Tech Way, San Jose, CA'
    },
    {
      student_id: 'STU-2024-003',
      first_name: 'Liam',
      last_name: 'Johnson',
      email: 'liam.johnson@campus.edu',
      phone: '+1 (555) 456-7890',
      department: 'Electrical Engineering',
      enrollment_date: '2021-09-01',
      gpa: 3.45,
      status: 'Active',
      gender: 'Male',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      address: '42 Oak Avenue, Austin, TX'
    },
    {
      student_id: 'STU-2024-004',
      first_name: 'Amina',
      last_name: 'Tariq',
      email: 'amina.tariq@campus.edu',
      phone: '+1 (555) 567-8901',
      department: 'Software Engineering',
      enrollment_date: '2023-01-15',
      gpa: 3.72,
      status: 'Active',
      gender: 'Female',
      avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      address: '501 Innovation Dr, Seattle, WA'
    },
    {
      student_id: 'STU-2024-005',
      first_name: 'Marcus',
      last_name: 'Vance',
      email: 'marcus.vance@campus.edu',
      phone: '+1 (555) 678-9012',
      department: 'Business Analytics',
      enrollment_date: '2020-09-01',
      gpa: 3.60,
      status: 'Graduated',
      gender: 'Male',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      address: '12 Wall Street, New York, NY'
    },
    {
      student_id: 'STU-2024-006',
      first_name: 'Elena',
      last_name: 'Rostova',
      email: 'elena.rostova@campus.edu',
      phone: '+1 (555) 789-0123',
      department: 'Computer Science',
      enrollment_date: '2024-01-10',
      gpa: 3.20,
      status: 'On Leave',
      gender: 'Female',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      address: '77 Lakeview Rd, Chicago, IL'
    },
    {
      student_id: 'STU-2024-007',
      first_name: 'David',
      last_name: 'Kim',
      email: 'david.kim@campus.edu',
      phone: '+1 (555) 890-1234',
      department: 'Cybersecurity',
      enrollment_date: '2023-09-01',
      gpa: 3.82,
      status: 'Active',
      gender: 'Male',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      address: '304 Redwood Park, Portland, OR'
    },
    {
      student_id: 'STU-2024-008',
      first_name: 'Zoe',
      last_name: 'Washington',
      email: 'zoe.washington@campus.edu',
      phone: '+1 (555) 901-2345',
      department: 'Information Technology',
      enrollment_date: '2024-09-01',
      gpa: 2.75,
      status: 'Probation',
      gender: 'Female',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      address: '91 Elm St, Atlanta, GA'
    }
  ];

  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO students (
        student_id, first_name, last_name, email, phone, department,
        enrollment_date, gpa, status, gender, avatar_url, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.serialize(() => {
      sampleStudents.forEach((s) => {
        stmt.run(
          s.student_id,
          s.first_name,
          s.last_name,
          s.email,
          s.phone,
          s.department,
          s.enrollment_date,
          s.gpa,
          s.status,
          s.gender,
          s.avatar_url,
          s.address
        );
      });
      stmt.finalize((err) => {
        if (err) return reject(err);
        console.log(`Seeded ${sampleStudents.length} sample students successfully.`);
        resolve();
      });
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  seedSampleStudents
};

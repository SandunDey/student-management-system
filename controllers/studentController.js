const { db } = require('../database/db');

// Get all students with optional search, filters, sorting and pagination
exports.getAllStudents = (req, res) => {
  const {
    search = '',
    department = 'All',
    status = 'All',
    sortBy = 'id',
    order = 'DESC',
    page = 1,
    limit = 50
  } = req.query;

  const validSortColumns = ['id', 'student_id', 'first_name', 'last_name', 'department', 'gpa', 'enrollment_date', 'status'];
  const sanitizedSort = validSortColumns.includes(sortBy) ? sortBy : 'id';
  const sanitizedOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const whereConditions = [];
  const params = [];

  if (search.trim()) {
    whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR student_id LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (department && department !== 'All') {
    whereConditions.push('department = ?');
    params.push(department);
  }

  if (status && status !== 'All') {
    whereConditions.push('status = ?');
    params.push(status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count for pagination metadata
  const countSql = `SELECT COUNT(*) AS total FROM students ${whereClause}`;

  db.get(countSql, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    const total = countRow.total;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const querySql = `
      SELECT * FROM students
      ${whereClause}
      ORDER BY ${sanitizedSort} ${sanitizedOrder}
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];

    db.all(querySql, queryParams, (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        data: rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    });
  });
};

// Get system-wide statistics for the dashboard
exports.getStudentStats = (req, res) => {
  const statsSql = `
    SELECT 
      COUNT(*) AS totalStudents,
      SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS activeStudents,
      SUM(CASE WHEN status = 'Graduated' THEN 1 ELSE 0 END) AS graduatedStudents,
      SUM(CASE WHEN status = 'Probation' THEN 1 ELSE 0 END) AS probationStudents,
      ROUND(AVG(gpa), 2) AS averageGpa,
      COUNT(DISTINCT department) AS totalDepartments
    FROM students
  `;

  const deptSql = `
    SELECT department, COUNT(*) AS count, ROUND(AVG(gpa), 2) AS avgGpa
    FROM students
    GROUP BY department
    ORDER BY count DESC
  `;

  db.get(statsSql, [], (err, stats) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    db.all(deptSql, [], (err, departmentBreakdown) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({
        success: true,
        stats: {
          totalStudents: stats.totalStudents || 0,
          activeStudents: stats.activeStudents || 0,
          graduatedStudents: stats.graduatedStudents || 0,
          probationStudents: stats.probationStudents || 0,
          averageGpa: stats.averageGpa || 0.0,
          totalDepartments: stats.totalDepartments || 0
        },
        departmentBreakdown
      });
    });
  });
};

// Get single student by ID
exports.getStudentById = (req, res) => {
  const { id } = req.params;
  const sql = `SELECT * FROM students WHERE id = ?`;

  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (!row) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, data: row });
  });
};

// Create a new student record
exports.createStudent = (req, res) => {
  const {
    student_id,
    first_name,
    last_name,
    email,
    phone,
    department,
    enrollment_date,
    gpa,
    status = 'Active',
    gender = 'Other',
    avatar_url,
    address
  } = req.body;

  // Validation
  if (!first_name || !last_name || !email || !department || !enrollment_date) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: first_name, last_name, email, department, enrollment_date'
    });
  }

  // Generate unique student ID if not provided
  const generatedId = student_id || `STU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const studentGpa = gpa !== undefined ? parseFloat(gpa) : 0.0;

  const sql = `
    INSERT INTO students (
      student_id, first_name, last_name, email, phone, department,
      enrollment_date, gpa, status, gender, avatar_url, address,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const params = [
    generatedId,
    first_name.trim(),
    last_name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : null,
    department,
    enrollment_date,
    studentGpa,
    status,
    gender,
    avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(first_name + last_name)}`,
    address ? address.trim() : null
  ];

  db.run(sql, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: students.email')) {
        return res.status(400).json({ success: false, message: 'A student with this email address already exists.' });
      }
      if (err.message.includes('UNIQUE constraint failed: students.student_id')) {
        return res.status(400).json({ success: false, message: 'A student with this Student ID already exists.' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }

    db.get('SELECT * FROM students WHERE id = ?', [this.lastID], (err, newStudent) => {
      if (err) {
        return res.status(201).json({ success: true, id: this.lastID, message: 'Student created successfully' });
      }
      res.status(201).json({
        success: true,
        message: 'Student created successfully',
        data: newStudent
      });
    });
  });
};

// Update student record
exports.updateStudent = (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    email,
    phone,
    department,
    enrollment_date,
    gpa,
    status,
    gender,
    avatar_url,
    address
  } = req.body;

  if (!first_name || !last_name || !email || !department || !enrollment_date) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: first_name, last_name, email, department, enrollment_date'
    });
  }

  const sql = `
    UPDATE students SET
      first_name = ?,
      last_name = ?,
      email = ?,
      phone = ?,
      department = ?,
      enrollment_date = ?,
      gpa = ?,
      status = ?,
      gender = ?,
      avatar_url = ?,
      address = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params = [
    first_name.trim(),
    last_name.trim(),
    email.trim().toLowerCase(),
    phone ? phone.trim() : null,
    department,
    enrollment_date,
    parseFloat(gpa) || 0.0,
    status || 'Active',
    gender || 'Other',
    avatar_url,
    address ? address.trim() : null,
    id
  ];

  db.run(sql, params, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: students.email')) {
        return res.status(400).json({ success: false, message: 'A student with this email address already exists.' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found' });
    }

    db.get('SELECT * FROM students WHERE id = ?', [id], (err, updatedStudent) => {
      if (err) {
        return res.json({ success: true, message: 'Student updated successfully' });
      }
      res.json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent
      });
    });
  });
};

// Delete student record
exports.deleteStudent = (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM students WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    res.json({ success: true, message: 'Student record deleted successfully', id });
  });
};

// Reset to seed data
exports.resetDatabase = async (req, res) => {
  const { seedSampleStudents } = require('../database/db');
  db.serialize(() => {
    db.run('DELETE FROM students', (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      seedSampleStudents()
        .then(() => {
          res.json({ success: true, message: 'Database reset to default sample records successfully.' });
        })
        .catch((err) => {
          res.status(500).json({ success: false, error: err.message });
        });
    });
  });
};

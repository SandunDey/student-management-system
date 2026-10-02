/**
 * Automated Test Suite for Student Management System REST APIs
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Student Management System API Tests ---');
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  try {
    // 1. Healthcheck Test
    const health = await makeRequest('/api/health');
    assert(health.status === 200 && health.data.status === 'online', '1. Server Health Check API');

    // 2. Fetch Stats
    const stats = await makeRequest('/api/students/stats');
    assert(stats.status === 200 && stats.data.success && stats.data.stats.totalStudents >= 0, '2. Fetch Dashboard Statistics API');

    // 3. Fetch All Students
    const allStudents = await makeRequest('/api/students');
    assert(allStudents.status === 200 && allStudents.data.success && Array.isArray(allStudents.data.data), '3. GET /api/students list');

    // 4. Create Student (POST /api/students)
    const testStudentPayload = {
      student_id: `TEST-${Date.now()}`,
      first_name: 'Jordan',
      last_name: 'Bell',
      email: `jordan.bell.${Date.now()}@testcampus.edu`,
      phone: '+1 555 123 4567',
      department: 'Software Engineering',
      enrollment_date: '2024-02-01',
      gpa: 3.85,
      status: 'Active',
      gender: 'Male',
      address: '77 Silicon St, Boston, MA'
    };

    const createRes = await makeRequest('/api/students', 'POST', testStudentPayload);
    assert(createRes.status === 201 && createRes.data.success && createRes.data.data.id, '4. POST /api/students Create Student');
    const createdId = createRes.data?.data?.id;

    // 5. Get Student by ID (GET /api/students/:id)
    if (createdId) {
      const getSingle = await makeRequest(`/api/students/${createdId}`);
      assert(getSingle.status === 200 && getSingle.data.data.first_name === 'Jordan', '5. GET /api/students/:id View Student Details');

      // 6. Update Student (PUT /api/students/:id)
      const updatePayload = {
        ...testStudentPayload,
        gpa: 3.95,
        status: 'Graduated'
      };
      const updateRes = await makeRequest(`/api/students/${createdId}`, 'PUT', updatePayload);
      assert(updateRes.status === 200 && updateRes.data.success, '6. PUT /api/students/:id Update Student Record');

      // 7. Verify updated value
      const verifyRes = await makeRequest(`/api/students/${createdId}`);
      assert(verifyRes.data.data.gpa === 3.95 && verifyRes.data.data.status === 'Graduated', '7. Verify Updated Values in Database');

      // 8. Delete Student (DELETE /api/students/:id)
      const deleteRes = await makeRequest(`/api/students/${createdId}`, 'DELETE');
      assert(deleteRes.status === 200 && deleteRes.data.success, '8. DELETE /api/students/:id Delete Student');

      // 9. Verify deletion (Should return 404)
      const afterDelete = await makeRequest(`/api/students/${createdId}`);
      assert(afterDelete.status === 404, '9. Confirm Student Record No Longer Exists (404)');
    }

    console.log(`\n===============================================`);
    console.log(`Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
    console.log(`===============================================`);

    if (passed === total) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();

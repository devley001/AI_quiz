// Test script to verify educator dashboard functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test educator dashboard endpoints
async function testEducatorDashboard() {
  console.log('Testing Educator Dashboard Endpoints...\n');

  // First, let's test if the server is running
  try {
    const healthCheck = await axios.get('http://localhost:5000/health');
    console.log('✅ Server is running:', healthCheck.data);
  } catch (error) {
    console.log('❌ Server is not running. Please start the backend server first.');
    return;
  }

  // Test educator endpoints (these will fail without auth, but we can see if routes exist)
  const endpoints = [
    '/educator/analytics/class',
    '/educator/analytics/trends',
    '/educator/analytics/blooms-distribution',
    '/educator/analytics/question-bank'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`);
      console.log(`✅ ${endpoint}: Working`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`✅ ${endpoint}: Route exists (401 - needs auth)`);
      } else if (error.response?.status === 404) {
        console.log(`❌ ${endpoint}: Route not found`);
      } else {
        console.log(`⚠️  ${endpoint}: ${error.message}`);
      }
    }
  }

  console.log('\nTest completed. If routes show 401 errors, that means they exist but need authentication.');
  console.log('If routes show 404 errors, check if the educator routes are properly registered.');
}

testEducatorDashboard();
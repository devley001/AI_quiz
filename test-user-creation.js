const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testUserCreation() {
  try {
    console.log('Testing user registration...');
    
    // Test user data
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'student'
    };

    // Register user
    const registerResponse = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('Registration successful:', registerResponse.data);

    // Login user
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: userData.email,
      password: userData.password
    });
    console.log('Login successful:', loginResponse.data);

    const token = loginResponse.data.data.token;

    // Test adaptive quiz generation
    console.log('Testing adaptive quiz generation...');
    const quizResponse = await axios.post(`${API_URL}/adaptive-quiz/generate`, {
      topic: 'Computer Science'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Quiz generation successful:', quizResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUserCreation();
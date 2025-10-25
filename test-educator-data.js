/**
 * Test script to verify educator dashboard data fetching
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './ai_backend/.env' });

// Import models
const User = require('./ai_backend/src/models/User');
const AdaptiveSession = require('./ai_backend/src/models/AdaptiveSession');
const QuestionBank = require('./ai_backend/src/models/QuestionBank');
const BloomsData = require('./ai_backend/src/models/BloomsData');

async function testEducatorData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Check users
    const users = await User.find({ role: 'user' });
    console.log(`📊 Found ${users.length} students`);

    // Test 2: Check adaptive sessions
    const sessions = await AdaptiveSession.find({ status: 'completed' });
    console.log(`📊 Found ${sessions.length} completed sessions`);

    // Test 3: Check question bank
    const questions = await QuestionBank.find({ isActive: true });
    console.log(`📊 Found ${questions.length} active questions`);

    // Test 4: Check Bloom's data
    const bloomsData = await BloomsData.find({ isActive: true });
    console.log(`📊 Found ${bloomsData.length} Bloom's taxonomy entries`);

    // Test 5: Sample analytics calculation
    if (sessions.length > 0) {
      const avgAccuracy = sessions.reduce((sum, s) => sum + (s.performanceMetrics?.accuracy || 0), 0) / sessions.length;
      console.log(`📊 Average accuracy: ${(avgAccuracy * 100).toFixed(1)}%`);
    }

    // Test 6: Ability distribution
    const abilityRanges = {
      'beginner': sessions.filter(s => s.finalAbility < -1.0).length,
      'below_average': sessions.filter(s => s.finalAbility >= -1.0 && s.finalAbility < -0.5).length,
      'developing': sessions.filter(s => s.finalAbility >= -0.5 && s.finalAbility < 0.0).length,
      'proficient': sessions.filter(s => s.finalAbility >= 0.0 && s.finalAbility < 0.5).length,
      'advanced': sessions.filter(s => s.finalAbility >= 0.5 && s.finalAbility < 1.0).length,
      'expert': sessions.filter(s => s.finalAbility >= 1.0).length
    };
    console.log('📊 Ability distribution:', abilityRanges);

    console.log('✅ All tests completed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testEducatorData();
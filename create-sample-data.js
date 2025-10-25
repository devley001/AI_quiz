/**
 * Script to create sample data for educator dashboard testing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './ai_backend/.env' });

// Import models
const User = require('./ai_backend/src/models/User');
const AdaptiveSession = require('./ai_backend/src/models/AdaptiveSession');
const QuestionBank = require('./ai_backend/src/models/QuestionBank');

async function createSampleData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create sample students if they don't exist
    const existingUsers = await User.find({ role: 'user' });
    if (existingUsers.length === 0) {
      const sampleStudents = [
        { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123', role: 'user' },
        { name: 'Bob Smith', email: 'bob@example.com', password: 'password123', role: 'user' },
        { name: 'Carol Davis', email: 'carol@example.com', password: 'password123', role: 'user' },
        { name: 'David Wilson', email: 'david@example.com', password: 'password123', role: 'user' },
        { name: 'Eva Brown', email: 'eva@example.com', password: 'password123', role: 'user' }
      ];

      for (const student of sampleStudents) {
        await User.create(student);
      }
      console.log('✅ Created sample students');
    }

    // Get all students
    const students = await User.find({ role: 'user' });

    // Create sample adaptive sessions
    const existingSessions = await AdaptiveSession.find();
    if (existingSessions.length === 0) {
      const topics = ['Mathematics', 'Computer Science', 'Physics', 'Chemistry'];
      const bloomsLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];

      for (let i = 0; i < 20; i++) {
        const student = students[Math.floor(Math.random() * students.length)];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const bloomsLevel = bloomsLevels[Math.floor(Math.random() * bloomsLevels.length)];
        
        const session = {
          sessionId: `session_${Date.now()}_${i}`,
          userId: student._id,
          topic: topic,
          startTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
          endTime: new Date(Date.now() - Math.random() * 29 * 24 * 60 * 60 * 1000),
          status: 'completed',
          initialAbility: (Math.random() - 0.5) * 2, // -1 to 1
          finalAbility: (Math.random() - 0.5) * 2, // -1 to 1
          currentBloomsLevel: bloomsLevel,
          initialBloomsLevel: bloomsLevel,
          performanceMetrics: {
            totalQuestions: Math.floor(Math.random() * 20) + 5, // 5-25 questions
            correctAnswers: Math.floor(Math.random() * 15) + 2, // 2-17 correct
            accuracy: Math.random() * 0.8 + 0.2, // 20-100% accuracy
            averageResponseTime: Math.random() * 30 + 10, // 10-40 seconds
            standardError: Math.random() * 0.5 + 0.1 // 0.1-0.6
          }
        };

        // Calculate correct answers based on accuracy
        session.performanceMetrics.correctAnswers = Math.floor(
          session.performanceMetrics.totalQuestions * session.performanceMetrics.accuracy
        );

        await AdaptiveSession.create(session);
      }
      console.log('✅ Created sample adaptive sessions');
    }

    // Create sample questions
    const existingQuestions = await QuestionBank.find();
    if (existingQuestions.length === 0) {
      const sampleQuestions = [
        {
          questionId: 'q1',
          questionText: 'What is 2 + 2?',
          questionType: 'multiple_choice',
          options: [
            { id: 'a', text: '3' },
            { id: 'b', text: '4' },
            { id: 'c', text: '5' },
            { id: 'd', text: '6' }
          ],
          correctAnswer: 'b',
          topic: 'Mathematics',
          difficulty: 'easy',
          bloomsTaxonomy: {
            cognitiveLevel: 'remember',
            levelIndex: 1,
            confidence: 0.9
          },
          irtParameters: {
            difficulty: -1.0,
            discrimination: 1.2,
            calibrated: true
          },
          performanceData: {
            totalAttempts: 50,
            correctAttempts: 45,
            successRate: 0.9,
            averageResponseTime: 5.2
          },
          reviewStatus: 'approved',
          isActive: true
        },
        {
          questionId: 'q2',
          questionText: 'Explain the concept of recursion in programming.',
          questionType: 'short_answer',
          correctAnswer: 'A function that calls itself',
          topic: 'Computer Science',
          difficulty: 'medium',
          bloomsTaxonomy: {
            cognitiveLevel: 'understand',
            levelIndex: 2,
            confidence: 0.8
          },
          irtParameters: {
            difficulty: 0.2,
            discrimination: 1.5,
            calibrated: true
          },
          performanceData: {
            totalAttempts: 30,
            correctAttempts: 18,
            successRate: 0.6,
            averageResponseTime: 45.3
          },
          reviewStatus: 'approved',
          isActive: true
        }
      ];

      for (const question of sampleQuestions) {
        await QuestionBank.create(question);
      }
      console.log('✅ Created sample questions');
    }

    console.log('✅ Sample data creation completed');

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSampleData();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';

// Connect to MongoDB directly for seeding
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_quiz');
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

// Models
const User = require('./ai_backend/src/models/User');
const StudentProfile = require('./ai_backend/src/models/StudentProfile');
const QuizResult = require('./ai_backend/src/models/QuizResult');

// Sample data
const sampleUsers = [
  {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  },
  {
    name: 'Jane Smith',
    username: 'janesmith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  },
  {
    name: 'Admin User',
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    isActive: true
  }
];

const sampleStudentProfiles = [
  {
    grade: '10th Grade',
    subjects: ['Mathematics', 'Science', 'English'],
    school: 'Lincoln High School',
    bio: 'Passionate about science and technology.'
  },
  {
    grade: '11th Grade',
    subjects: ['History', 'Geography', 'Literature'],
    school: 'Washington Academy',
    bio: 'Love learning about different cultures.'
  }
];

const sampleQuizResults = [
  {
    topic: 'Mathematics',
    score: 8,
    totalQuestions: 10,
    percentage: 80
  },
  {
    topic: 'Science',
    score: 9,
    totalQuestions: 10,
    percentage: 90
  },
  {
    topic: 'English',
    score: 7,
    totalQuestions: 10,
    percentage: 70
  },
  {
    topic: 'History',
    score: 6,
    totalQuestions: 10,
    percentage: 60
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await QuizResult.deleteMany({});

    console.log('✅ Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.name} (${user.username})`);
    }

    // Create student profiles
    for (let i = 0; i < sampleStudentProfiles.length; i++) {
      const profileData = sampleStudentProfiles[i];
      const profile = new StudentProfile({
        user: createdUsers[i]._id,
        ...profileData
      });
      await profile.save();

      // Update user with student profile reference
      await User.findByIdAndUpdate(createdUsers[i]._id, {
        studentProfile: profile._id
      });

      console.log(`✅ Created student profile for: ${createdUsers[i].name}`);
    }

    // Create quiz results for first user
    for (const resultData of sampleQuizResults) {
      const result = new QuizResult({
        user: createdUsers[0]._id,
        ...resultData,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      });
      await result.save();
    }
    console.log(`✅ Created ${sampleQuizResults.length} quiz results for: ${createdUsers[0].name}`);

    // Create some quiz results for second user
    const secondUserResults = sampleQuizResults.slice(0, 2);
    for (const resultData of secondUserResults) {
      const result = new QuizResult({
        user: createdUsers[1]._id,
        ...resultData,
        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) // Random date within last 15 days
      });
      await result.save();
    }
    console.log(`✅ Created ${secondUserResults.length} quiz results for: ${createdUsers[1].name}`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${createdUsers.length} users created`);
    console.log(`   - ${sampleStudentProfiles.length} student profiles created`);
    console.log(`   - ${sampleQuizResults.length + secondUserResults.length} quiz results created`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

async function testWithRealData() {
  console.log('🧪 Testing system with real user data from database...\n');

  try {
    // Test getting all users
    console.log('1. Testing get all users...');
    const usersResponse = await axios.get(`${BASE_URL}/users`);
    console.log(`✅ Retrieved ${usersResponse.data.data.users.length} users`);

    // Test getting user by ID
    const firstUser = usersResponse.data.data.users[0];
    console.log('\n2. Testing get user by ID...');
    const userResponse = await axios.get(`${BASE_URL}/users/${firstUser._id}`);
    console.log(`✅ Retrieved user: ${userResponse.data.data.user.name}`);

    // Test getting student profile
    console.log('\n3. Testing get student profile...');
    const profileResponse = await axios.get(`${BASE_URL}/students/profile`);
    if (profileResponse.data.data.studentProfile) {
      console.log(`✅ Retrieved student profile: Grade ${profileResponse.data.data.studentProfile.grade}`);
    } else {
      console.log('ℹ️  No student profile found');
    }

    // Test getting quiz results
    console.log('\n4. Testing get quiz results...');
    const quizResponse = await axios.get(`${BASE_URL}/quizzes/results`);
    console.log(`✅ Retrieved ${quizResponse.data.data.quizResults.length} quiz results`);
    console.log(`   Overall average: ${quizResponse.data.data.averages.overall}%`);

    // Test updating user
    console.log('\n5. Testing update user...');
    const updateResponse = await axios.put(`${BASE_URL}/users/update`, {
      name: 'Updated Name'
    });
    console.log(`✅ Updated user: ${updateResponse.data.data.user.name}`);

    console.log('\n🎉 All tests with real data passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Main execution
async function main() {
  await connectDB();
  await seedDatabase();
  await testWithRealData();
}

if (require.main === module) {
  main();
}

module.exports = { seedDatabase, testWithRealData };

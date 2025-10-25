require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    process.exit(1);
  }
};

async function createTeacher() {
  try {
    await connectDB();
    
    // Check if teacher already exists
    const existingTeacher = await User.findOne({ email: 'teacher@example.com' });
    if (existingTeacher) {
      console.log('Teacher already exists:', existingTeacher.email);
      console.log('Role:', existingTeacher.role);
      return;
    }

    // Create teacher user
    const teacher = new User({
      name: 'Teacher User',
      username: 'teacher',
      email: 'teacher@example.com',
      password: 'Teacher123',
      role: 'teacher',
      isActive: true
    });

    await teacher.save();
    console.log('✅ Teacher created successfully!');
    console.log('Email: teacher@example.com');
    console.log('Password: Teacher123');
    console.log('Role: teacher');
    
  } catch (error) {
    console.error('❌ Error creating teacher:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createTeacher();
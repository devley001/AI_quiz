// ============================================
// FILE: src/models/StudentProfile.js
// ============================================
const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    trim: true,
    maxlength: [20, 'Grade cannot exceed 20 characters']
  },
  subjects: [{
    type: String,
    trim: true,
    maxlength: [50, 'Subject name cannot exceed 50 characters']
  }],
  school: {
    type: String,
    trim: true,
    maxlength: [100, 'School name cannot exceed 100 characters']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);

const mongoose = require('mongoose');

const adaptiveQuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  courseId: {
    type: String,
    required: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  initialDifficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isAdaptive: {
    type: Boolean,
    default: true
  },
  bloomsLevels: [{
    level: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    },
    weight: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  irtParameters: {
    discriminationRange: {
      min: { type: Number, default: 0.5 },
      max: { type: Number, default: 2.5 }
    },
    difficultyRange: {
      min: { type: Number, default: -3 },
      max: { type: Number, default: 3 }
    }
  },
  questionPool: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  settings: {
    maxQuestions: { type: Number, default: 20 },
    minQuestions: { type: Number, default: 5 },
    timeLimit: { type: Number }, // in minutes
    passingScore: { type: Number, default: 70 },
    allowRetakes: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdaptiveQuiz', adaptiveQuizSchema);
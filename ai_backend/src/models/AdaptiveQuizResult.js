const mongoose = require('mongoose');

const adaptiveQuizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  topic: {
    type: String,
    required: true
  },
  questions: [{
    questionText: String,
    options: [String],
    correctAnswer: Number,
    userAnswer: Number,
    isCorrect: Boolean,
    bloomsLevel: String,
    difficulty: Number,
    timeSpent: Number
  }],
  totalQuestions: {
    type: Number,
    default: 20
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  initialAbility: {
    type: Number,
    default: 0
  },
  finalAbility: {
    type: Number,
    default: 0
  },
  bloomsProgression: [{
    level: String,
    questionsAtLevel: Number,
    accuracyAtLevel: Number
  }],
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number, // in minutes
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdaptiveQuizResult', adaptiveQuizResultSchema);
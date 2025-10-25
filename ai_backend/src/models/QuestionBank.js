/**
 * Question Bank Model
 * Stores question bank data with IRT and Bloom's taxonomy integration
 */

const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  questionText: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer', 'essay'],
    default: 'multiple_choice'
  },
  options: [{
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    }
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  subtopic: {
    type: String,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  tags: [{
    type: String,
    index: true
  }],
  // IRT Parameters
  irtParameters: {
    difficulty: {
      type: Number,
      default: 0.0,
      min: -3.0,
      max: 3.0
    },
    discrimination: {
      type: Number,
      default: 1.0,
      min: 0.1,
      max: 2.5
    },
    guessing: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0
    },
    calibrated: {
      type: Boolean,
      default: false
    },
    calibrationCount: {
      type: Number,
      default: 0
    },
    lastCalibrated: Date
  },
  // Bloom's Taxonomy
  bloomsTaxonomy: {
    cognitiveLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
      default: 'understand'
    },
    levelIndex: {
      type: Number,
      min: 1,
      max: 6,
      default: 2
    },
    confidence: {
      type: Number,
      default: 0.5,
      min: 0.0,
      max: 1.0
    },
    detectedVerbs: [{
      type: String
    }],
    complexity: {
      difficulty: {
        type: Number,
        min: 1,
        max: 6,
        default: 2
      },
      description: String
    }
  },
  // Performance Analytics
  performanceData: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    correctAttempts: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0
    },
    averageResponseTime: {
      type: Number,
      default: 0.0 // in seconds
    },
    discriminationIndex: {
      type: Number,
      default: 0.0,
      min: -1.0,
      max: 1.0
    }
  },
  // Student Response History
  responseHistory: [{
    userId: mongoose.Schema.Types.ObjectId,
    response: String,
    isCorrect: Boolean,
    responseTime: Number, // in seconds
    timestamp: {
      type: Date,
      default: Date.now
    },
    sessionId: String
  }],
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  source: {
    type: String,
    enum: ['manual', 'generated', 'imported'],
    default: 'manual'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date,
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_revision'],
    default: 'pending'
  },
  reviewNotes: String
}, {
  timestamps: true
});

// Indexes for efficient queries
questionBankSchema.index({ topic: 1, 'bloomsTaxonomy.cognitiveLevel': 1 });
questionBankSchema.index({ 'irtParameters.difficulty': 1 });
questionBankSchema.index({ 'performanceData.successRate': -1 });
questionBankSchema.index({ tags: 1 });
questionBankSchema.index({ isActive: 1, reviewStatus: 1 });

// Virtual for current success rate
questionBankSchema.virtual('currentSuccessRate').get(function() {
  return this.performanceData.totalAttempts > 0
    ? this.performanceData.correctAttempts / this.performanceData.totalAttempts
    : 0;
});

// Pre-save middleware to update performance data
questionBankSchema.pre('save', function(next) {
  if (this.responseHistory && this.responseHistory.length > 0) {
    const totalAttempts = this.responseHistory.length;
    const correctAttempts = this.responseHistory.filter(r => r.isCorrect).length;
    const successRate = correctAttempts / totalAttempts;

    // Calculate average response time
    const totalResponseTime = this.responseHistory.reduce((sum, r) => sum + (r.responseTime || 0), 0);
    const averageResponseTime = totalResponseTime / totalAttempts;

    this.performanceData.totalAttempts = totalAttempts;
    this.performanceData.correctAttempts = correctAttempts;
    this.performanceData.successRate = successRate;
    this.performanceData.averageResponseTime = averageResponseTime;

    // Calculate discrimination index (point-biserial correlation)
    this.performanceData.discriminationIndex = this._calculateDiscriminationIndex();
  }
  next();
});

// Instance methods
questionBankSchema.methods.addResponse = function(userId, response, isCorrect, responseTime, sessionId) {
  this.responseHistory.push({
    userId,
    response,
    isCorrect,
    responseTime,
    sessionId,
    timestamp: new Date()
  });

  this.usageCount += 1;
  this.lastUsed = new Date();

  return this.save();
};

questionBankSchema.methods.updateIRTParameters = function(difficulty, discrimination, guessing = 0.0) {
  this.irtParameters.difficulty = difficulty;
  this.irtParameters.discrimination = discrimination;
  this.irtParameters.guessing = guessing;
  this.irtParameters.calibrated = true;
  this.irtParameters.calibrationCount += 1;
  this.irtParameters.lastCalibrated = new Date();

  return this.save();
};

questionBankSchema.methods.updateBloomsClassification = function(cognitiveLevel, confidence, detectedVerbs = []) {
  this.bloomsTaxonomy.cognitiveLevel = cognitiveLevel;
  this.bloomsTaxonomy.levelIndex = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].indexOf(cognitiveLevel) + 1;
  this.bloomsTaxonomy.confidence = confidence;
  this.bloomsTaxonomy.detectedVerbs = detectedVerbs;

  return this.save();
};

questionBankSchema.methods._calculateDiscriminationIndex = function() {
  if (this.responseHistory.length < 10) return 0;

  const responses = this.responseHistory.map(r => r.isCorrect ? 1 : 0);
  const totalScore = responses.reduce((sum, r) => sum + r, 0);
  const meanScore = totalScore / responses.length;

  if (meanScore === 0 || meanScore === 1) return 0;

  const correctResponses = responses.filter(r => r === 1);
  const incorrectResponses = responses.filter(r => r === 0);

  if (correctResponses.length === 0 || incorrectResponses.length === 0) return 0;

  const meanCorrect = correctResponses.reduce((sum, r) => sum + r, 0) / correctResponses.length;
  const meanIncorrect = incorrectResponses.reduce((sum, r) => sum + r, 0) / incorrectResponses.length;

  const variance = responses.reduce((sum, r) => sum + Math.pow(r - meanScore, 2), 0) / responses.length;

  if (variance === 0) return 0;

  return ((meanCorrect - meanIncorrect) / Math.sqrt(variance)) * Math.sqrt((correctResponses.length * incorrectResponses.length) / Math.pow(responses.length, 2));
};

// Static methods
questionBankSchema.statics.findByTopicAndLevel = function(topic, bloomsLevel) {
  return this.find({
    topic,
    'bloomsTaxonomy.cognitiveLevel': bloomsLevel,
    isActive: true,
    reviewStatus: 'approved'
  });
};

questionBankSchema.statics.getQuestionStats = function(topic = null) {
  const matchStage = { isActive: true };
  if (topic) {
    matchStage.topic = topic;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        approvedQuestions: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'approved'] }, 1, 0] }
        },
        avgDifficulty: { $avg: '$irtParameters.difficulty' },
        avgSuccessRate: { $avg: '$performanceData.successRate' },
        topics: { $addToSet: '$topic' },
        bloomsDistribution: {
          $push: '$bloomsTaxonomy.cognitiveLevel'
        }
      }
    }
  ]);
};

questionBankSchema.statics.getTopPerformingQuestions = function(limit = 10) {
  return this.find({
    isActive: true,
    'performanceData.totalAttempts': { $gte: 5 }
  })
  .sort({ 'performanceData.successRate': -1 })
  .limit(limit);
};

questionBankSchema.statics.getNeedsCalibration = function() {
  return this.find({
    isActive: true,
    'irtParameters.calibrated': false,
    'performanceData.totalAttempts': { $gte: 10 }
  });
};

module.exports = mongoose.model('QuestionBank', questionBankSchema);

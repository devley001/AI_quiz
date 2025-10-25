/**
 * Adaptive Session Model
 * Stores adaptive assessment session data and analytics
 */

const mongoose = require('mongoose');

const adaptiveSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  initialAbility: {
    type: Number,
    required: true,
    default: 0.0
  },
  finalAbility: {
    type: Number
  },
  abilityTrajectory: [{
    questionNumber: {
      type: Number,
      required: true
    },
    ability: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  currentBloomsLevel: {
    type: String,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
    default: 'understand'
  },
  initialBloomsLevel: {
    type: String,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
    default: 'understand'
  },
  questionsAnswered: [{
    questionId: {
      type: String,
      required: true
    },
    questionText: String,
    bloomsLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    },
    difficulty: Number,
    discrimination: Number,
    response: {
      type: Number,
      enum: [0, 1] // 0=incorrect, 1=correct
    },
    responseTime: Number, // in seconds
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  performanceMetrics: {
    totalQuestions: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0
    },
    averageResponseTime: {
      type: Number,
      default: 0.0
    },
    standardError: {
      type: Number,
      default: 0.0
    }
  },
  bloomsProgression: [{
    level: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    },
    questionsAtLevel: {
      type: Number,
      default: 0
    },
    correctAtLevel: {
      type: Number,
      default: 0
    },
    accuracyAtLevel: {
      type: Number,
      default: 0.0
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  terminationReason: {
    type: String,
    enum: ['max_questions', 'target_se_reached', 'time_limit', 'user_abandoned', 'completed'],
    default: null
  },
  recommendations: [{
    type: {
      type: String,
      enum: ['practice', 'review', 'advance', 'remediate']
    },
    level: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    },
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
    browser: String,
    adaptiveAlgorithm: {
      type: String,
      default: 'IRT_2PL'
    },
    version: {
      type: String,
      default: '1.0'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
adaptiveSessionSchema.index({ userId: 1, startTime: -1 });
adaptiveSessionSchema.index({ topic: 1, status: 1 });
adaptiveSessionSchema.index({ status: 1, startTime: -1 });
adaptiveSessionSchema.index({ 'performanceMetrics.accuracy': -1 });

// Virtual for duration
adaptiveSessionSchema.virtual('duration').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / 1000 / 60); // minutes
  }
  return null;
});

// Static methods
adaptiveSessionSchema.statics.getUserSessions = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ startTime: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

adaptiveSessionSchema.statics.getTopicAnalytics = function(topic, dateRange = null) {
  const matchStage = { topic, status: 'completed' };
  if (dateRange) {
    matchStage.startTime = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$topic',
        totalSessions: { $sum: 1 },
        avgInitialAbility: { $avg: '$initialAbility' },
        avgFinalAbility: { $avg: '$finalAbility' },
        avgAccuracy: { $avg: '$performanceMetrics.accuracy' },
        avgQuestionsAnswered: { $avg: '$performanceMetrics.totalQuestions' },
        completionRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        }
      }
    }
  ]);
};

adaptiveSessionSchema.statics.getAbilityProgression = function(userId, topic = null) {
  const matchStage = { userId, status: 'completed' };
  if (topic) {
    matchStage.topic = topic;
  }

  return this.aggregate([
    { $match: matchStage },
    { $sort: { startTime: 1 } },
    {
      $project: {
        sessionId: 1,
        topic: 1,
        startTime: 1,
        initialAbility: 1,
        finalAbility: 1,
        abilityImprovement: {
          $subtract: ['$finalAbility', '$initialAbility']
        },
        accuracy: '$performanceMetrics.accuracy'
      }
    }
  ]);
};

adaptiveSessionSchema.statics.getBloomsLevelDistribution = function(topic = null) {
  const matchStage = { status: 'completed' };
  if (topic) {
    matchStage.topic = topic;
  }

  return this.aggregate([
    { $match: matchStage },
    { $unwind: '$bloomsProgression' },
    {
      $group: {
        _id: '$bloomsProgression.level',
        totalQuestions: { $sum: '$bloomsProgression.questionsAtLevel' },
        totalCorrect: { $sum: '$bloomsProgression.correctAtLevel' },
        avgAccuracy: { $avg: '$bloomsProgression.accuracyAtLevel' }
      }
    },
    {
      $project: {
        level: '$_id',
        totalQuestions: 1,
        totalCorrect: 1,
        avgAccuracy: 1,
        successRate: {
          $cond: [
            { $gt: ['$totalQuestions', 0] },
            { $divide: ['$totalCorrect', '$totalQuestions'] },
            0
          ]
        }
      }
    },
    { $sort: { totalQuestions: -1 } }
  ]);
};

module.exports = mongoose.model('AdaptiveSession', adaptiveSessionSchema);

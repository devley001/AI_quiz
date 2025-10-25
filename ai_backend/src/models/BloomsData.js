/**
 * Blooms Taxonomy Data Model
 * Stores Bloom's taxonomy classification data and analytics
 */

const mongoose = require('mongoose');

const bloomsDataSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cognitiveLevel: {
    type: String,
    required: true,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
  },
  levelIndex: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  confidence: {
    type: Number,
    required: true,
    min: 0.0,
    max: 1.0
  },
  detectedVerbs: [{
    type: String
  }],
  complexity: {
    difficulty: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },
    description: {
      type: String,
      required: true
    }
  },
  questionText: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  performanceData: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    correctAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0
    },
    successRate: {
      type: Number,
      default: 0.0,
      min: 0.0,
      max: 1.0
    }
  },
  studentPerformance: [{
    userId: mongoose.Schema.Types.ObjectId,
    attempts: {
      type: Number,
      default: 0
    },
    correct: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0.0
    },
    lastAttempt: {
      type: Date,
      default: Date.now
    }
  }],
  learningPathData: {
    prerequisiteLevels: [{
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    }],
    nextRecommendedLevels: [{
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    }],
    masteryThreshold: {
      type: Number,
      default: 0.8,
      min: 0.0,
      max: 1.0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
bloomsDataSchema.index({ topic: 1, cognitiveLevel: 1 });
bloomsDataSchema.index({ levelIndex: 1 });
bloomsDataSchema.index({ 'performanceData.successRate': -1 });

// Static methods
bloomsDataSchema.statics.getLevelDistribution = function(topic = null) {
  const matchStage = { isActive: true };
  if (topic) {
    matchStage.topic = topic;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$cognitiveLevel',
        count: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgSuccessRate: { $avg: '$performanceData.successRate' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

bloomsDataSchema.statics.getTopicAnalytics = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$topic',
        totalQuestions: { $sum: 1 },
        avgDifficulty: { $avg: '$complexity.difficulty' },
        avgSuccessRate: { $avg: '$performanceData.successRate' },
        levelDistribution: {
          $push: '$cognitiveLevel'
        }
      }
    },
    {
      $sort: { totalQuestions: -1 }
    }
  ]);
};

bloomsDataSchema.statics.getStudentMastery = function(userId) {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        'studentPerformance.userId': userId
      }
    },
    {
      $unwind: '$studentPerformance'
    },
    {
      $match: {
        'studentPerformance.userId': userId
      }
    },
    {
      $group: {
        _id: '$cognitiveLevel',
        totalQuestions: { $sum: 1 },
        masteredQuestions: {
          $sum: {
            $cond: [
              { $gte: ['$studentPerformance.averageScore', '$learningPathData.masteryThreshold'] },
              1,
              0
            ]
          }
        },
        avgScore: { $avg: '$studentPerformance.averageScore' }
      }
    },
    {
      $project: {
        level: '$_id',
        totalQuestions: 1,
        masteredQuestions: 1,
        avgScore: 1,
        masteryPercentage: {
          $multiply: [
            { $divide: ['$masteredQuestions', '$totalQuestions'] },
            100
          ]
        }
      }
    },
    {
      $sort: { level: 1 }
    }
  ]);
};

module.exports = mongoose.model('BloomsData', bloomsDataSchema);

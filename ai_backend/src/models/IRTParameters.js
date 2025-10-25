/**
 * IRT Parameters Model
 * Stores Item Response Theory parameters for questions
 */

const mongoose = require('mongoose');

const irtParametersSchema = new mongoose.Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  difficulty: {
    type: Number,
    required: true,
    min: -3.0,
    max: 3.0
  },
  discrimination: {
    type: Number,
    required: true,
    min: 0.1,
    max: 2.5
  },
  guessing: {
    type: Number,
    default: 0.0,
    min: 0.0,
    max: 1.0
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  bloomsLevel: {
    type: String,
    required: true,
    enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
  },
  questionText: {
    type: String,
    required: true
  },
  options: [{
    id: String,
    text: String
  }],
  correctAnswer: {
    type: String,
    required: true
  },
  responseHistory: [{
    userId: mongoose.Schema.Types.ObjectId,
    response: Number, // 1=correct, 0=incorrect
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  calibrationCount: {
    type: Number,
    default: 0
  },
  lastCalibrated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
irtParametersSchema.index({ topic: 1, bloomsLevel: 1 });
irtParametersSchema.index({ difficulty: 1 });
irtParametersSchema.index({ 'responseHistory.timestamp': -1 });

// Static methods
irtParametersSchema.statics.findByTopicAndLevel = function(topic, bloomsLevel) {
  return this.find({
    topic: topic,
    bloomsLevel: bloomsLevel,
    isActive: true
  });
};

irtParametersSchema.statics.findByDifficultyRange = function(minDiff, maxDiff) {
  return this.find({
    difficulty: { $gte: minDiff, $lte: maxDiff },
    isActive: true
  });
};

irtParametersSchema.statics.getQuestionBankStats = function() {
  return this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: 1 },
        avgDifficulty: { $avg: '$difficulty' },
        avgDiscrimination: { $avg: '$discrimination' },
        topics: { $addToSet: '$topic' },
        bloomsDistribution: {
          $push: '$bloomsLevel'
        }
      }
    }
  ]);
};

module.exports = mongoose.model('IRTParameters', irtParametersSchema);

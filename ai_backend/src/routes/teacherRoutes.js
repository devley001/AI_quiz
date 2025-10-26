const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// Import models
const AdaptiveSession = require('../models/AdaptiveSession');
const AIRequest = require('../models/AIRequest');
const BloomsData = require('../models/BloomsData');
const IRTParameters = require('../models/IRTParameters');
const Post = require('../models/Post');
const PostView = require('../models/PostView');
const QuestionBank = require('../models/QuestionBank');
const QuizResult = require('../models/QuizResult');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

// Middleware
router.use(authMiddleware);
router.use(authorize('admin', 'educator', 'teacher'));

// Get all database collections overview
router.get('/overview', async (req, res) => {
  try {
    const collections = await Promise.all([
      AdaptiveSession.countDocuments(),
      AIRequest.countDocuments(),
      BloomsData.countDocuments(),
      IRTParameters.countDocuments(),
      Post.countDocuments(),
      PostView.countDocuments(),
      QuestionBank.countDocuments(),
      QuizResult.countDocuments(),
      StudentProfile.countDocuments(),
      User.countDocuments({ role: 'user' })
    ]);

    res.json({
      success: true,
      data: {
        adaptiveSessions: collections[0],
        aiRequests: collections[1],
        bloomsData: collections[2],
        irtParameters: collections[3],
        posts: collections[4],
        postViews: collections[5],
        questionBanks: collections[6],
        quizResults: collections[7],
        studentProfiles: collections[8],
        students: collections[9]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Adaptive Sessions
router.get('/adaptive-sessions', async (req, res) => {
  try {
    const sessions = await AdaptiveSession.find()
      .populate('userId', 'name email')
      .sort({ startTime: -1 })
      .limit(100);
    
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Requests
router.get('/ai-requests', async (req, res) => {
  try {
    const requests = await AIRequest.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blooms Data
router.get('/blooms-data', async (req, res) => {
  try {
    const bloomsData = await BloomsData.find()
      .populate('userId', 'name email')
      .sort({ timestamp: -1 });
    
    res.json({ success: true, data: bloomsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// IRT Parameters
router.get('/irt-parameters', async (req, res) => {
  try {
    const irtParams = await IRTParameters.find()
      .sort({ lastUpdated: -1 });
    
    res.json({ success: true, data: irtParams });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Posts
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Post Views
router.get('/post-views', async (req, res) => {
  try {
    const postViews = await PostView.find()
      .populate('userId', 'name email')
      .populate('postId', 'title')
      .sort({ viewedAt: -1 });
    
    res.json({ success: true, data: postViews });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Question Banks
router.get('/question-banks', async (req, res) => {
  try {
    const questionBanks = await QuestionBank.find()
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: questionBanks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Quiz Results
router.get('/quiz-results', async (req, res) => {
  try {
    const quizResults = await QuizResult.find()
      .populate('userId', 'name email')
      .sort({ completedAt: -1 });
    
    res.json({ success: true, data: quizResults });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Student Profiles
router.get('/student-profiles', async (req, res) => {
  try {
    const studentProfiles = await StudentProfile.find()
      .populate('userId', 'name email')
      .sort({ lastUpdated: -1 });
    
    res.json({ success: true, data: studentProfiles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Detailed analytics for specific collection
router.get('/analytics/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    let data = {};

    switch (collection) {
      case 'adaptive-sessions':
        data = await AdaptiveSession.aggregate([
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              avgAccuracy: { $avg: '$performanceMetrics.accuracy' },
              avgAbility: { $avg: '$finalAbility' },
              completedSessions: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          }
        ]);
        break;

      case 'quiz-results':
        data = await QuizResult.aggregate([
          {
            $group: {
              _id: null,
              totalQuizzes: { $sum: 1 },
              avgScore: { $avg: '$score' },
              avgTimeSpent: { $avg: '$timeSpent' },
              completionRate: {
                $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
              }
            }
          }
        ]);
        break;

      default:
        return res.status(400).json({ success: false, error: 'Invalid collection' });
    }

    res.json({ success: true, data: data[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
// ai_backend/src/routes/educatorRoutes.js
const express = require('express');
const router = express.Router();
const educatorController = require('../controllers/educatorController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// All routes require authentication and educator/admin role
router.use(authMiddleware);
router.use(authorize('admin', 'educator', 'teacher'));

// Class Analytics
router.get('/analytics/class', educatorController.getClassAnalytics);

// Student Progress
router.get('/students/:studentId/progress', educatorController.getStudentProgress);

// Performance Trends
router.get('/analytics/trends', educatorController.getPerformanceTrends);

// Intervention Recommendations
router.get('/interventions/recommendations', educatorController.getInterventionRecommendations);

// Bloom's Taxonomy Distribution
router.get('/analytics/blooms-distribution', educatorController.getBloomsTaxonomyDistribution);

// Question Bank Analytics
router.get('/analytics/question-bank', educatorController.getQuestionBankAnalytics);

// Export Data
router.get('/data/export', educatorController.exportAssessmentData);

module.exports = router;
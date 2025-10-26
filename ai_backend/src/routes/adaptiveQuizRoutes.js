const express = require('express');
const router = express.Router();
const adaptiveQuizController = require('../controllers/adaptiveQuizController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Create adaptive quiz (instructors only)
router.post('/', authorize('admin', 'educator', 'teacher'), adaptiveQuizController.createAdaptiveQuiz);

// Generate adaptive quiz
router.post('/generate', adaptiveQuizController.generateAdaptiveQuiz);

// Submit quiz answers
router.post('/submit', adaptiveQuizController.submitQuizAnswers);

// Submit answer and get next question
router.post('/sessions/:sessionId/answer', adaptiveQuizController.submitAnswer);

module.exports = router;
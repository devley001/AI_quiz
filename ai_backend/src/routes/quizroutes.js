// ============================================
// FILE: src/routes/quizroutes.js
// ============================================
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/results', quizController.getQuizResults);
router.post('/results', quizController.createQuizResult);
router.delete('/results/:id', quizController.deleteQuizResult);

module.exports = router;

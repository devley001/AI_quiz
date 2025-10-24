
// ============================================
// FILE: src/routes/ai.routes.js
// ============================================
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');
const optionalAuthMiddleware = require('../middleware/optionalAuthMiddleware');
const { validateAIRequest } = require('../validators/aiValidator');

// Health check endpoint (no auth required)
router.get('/health', aiController.healthCheck);

// Test endpoint to create user and get token
router.post('/test-token', async (req, res) => {
  const { createTestUser } = require('../utils/testToken');
  const result = await createTestUser();
  res.json({ success: true, data: result });
});

// AI process endpoint (optional auth)
router.post('/process', optionalAuthMiddleware, aiController.processAIRequest);

router.use(authMiddleware);
router.get('/history', aiController.getAIRequestHistory);
router.get('/requests/:id', aiController.getAIRequestById);

module.exports = router;
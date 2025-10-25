const express = require('express');
const router = express.Router();
const pluginCoreController = require('../controllers/pluginCoreController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/initialize-session', authMiddleware, pluginCoreController.initializeAdaptiveSession);
router.post('/process-response', authMiddleware, pluginCoreController.processResponse);
router.get('/analytics', authMiddleware, pluginCoreController.getSessionAnalytics);

module.exports = router;
// ============================================
// FILE: src/routes/postViewRoutes.js
// ============================================
const express = require('express');
const router = express.Router();
const postViewController = require('../controllers/postViewController');
const authMiddleware = require('../middleware/authMiddleware');

// Record a post view
router.post('/record', authMiddleware, postViewController.recordPostView);

// Get post views for the authenticated user
router.get('/user', authMiddleware, postViewController.getPostViewsByUser);

module.exports = router;

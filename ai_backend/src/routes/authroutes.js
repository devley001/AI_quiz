
// ============================================
// FILE: src/routes/auth.routes.js
// ============================================
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin, validatePasswordUpdate } = require('../validators/authValidator');

router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.put('/update-password', authMiddleware, validatePasswordUpdate, authController.updatePassword);

module.exports = router;

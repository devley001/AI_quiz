// ============================================
// FILE: src/routes/studentroutes.js
// ============================================
const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/profile', studentController.getStudentProfile);
router.post('/profile', studentController.createOrUpdateStudentProfile);
router.delete('/profile', studentController.deleteStudentProfile);

module.exports = router;

// ============================================
// FILE: src/middleware/rateLimitermiddleware.js
// ============================================
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Allow 1000 requests per minute for development
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter; // ✅ Make sure you export the limiter function

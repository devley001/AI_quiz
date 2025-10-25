// ============================================
// FILE: src/models/PostView.js
// ============================================
const mongoose = require('mongoose');

const postViewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: String,
    required: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
postViewSchema.index({ user: 1, postId: 1 });
postViewSchema.index({ user: 1, viewedAt: -1 });

module.exports = mongoose.model('PostView', postViewSchema);

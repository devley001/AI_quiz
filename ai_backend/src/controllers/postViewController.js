// ============================================
// FILE: src/controllers/postViewController.js
// ============================================
const PostView = require('../models/PostView');
const { ApiResponse } = require('../utils/apiResponse');

exports.recordPostView = async (req, res, next) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    // Create or update post view
    await PostView.findOneAndUpdate(
      { user: userId, postId },
      { viewedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json(
      ApiResponse.success(null, 'Post view recorded successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.getPostViewsByUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const postViews = await PostView.find({ user: userId })
      .sort({ viewedAt: -1 });

    // Group by date for chart data
    const viewsByDate = {};
    postViews.forEach(view => {
      const date = view.viewedAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!viewsByDate[date]) {
        viewsByDate[date] = 0;
      }
      viewsByDate[date]++;
    });

    // Convert to array format for charts
    const chartData = Object.entries(viewsByDate).map(([date, count]) => ({
      date,
      views: count
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json(
      ApiResponse.success({
        postViews,
        chartData,
        totalViews: postViews.length
      }, 'Post views retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

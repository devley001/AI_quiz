// ============================================
// FILE: src/controllers/quizController.js
// ============================================
const QuizResult = require('../models/QuizResult');
const { ApiResponse } = require('../utils/apiResponse');

exports.getQuizResults = async (req, res, next) => {
  try {
    const quizResults = await QuizResult.find({ user: req.user.id })
      .sort({ date: -1 });

    // Calculate averages
    const averages = await calculateAverages(req.user.id);

    res.status(200).json(
      ApiResponse.success({
        quizResults,
        averages
      }, 'Quiz results retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.createQuizResult = async (req, res, next) => {
  try {
    const { topic, score, totalQuestions, percentage } = req.body;

    const quizResult = new QuizResult({
      user: req.user.id,
      topic,
      score,
      totalQuestions,
      percentage
    });

    await quizResult.save();

    res.status(201).json(
      ApiResponse.success({ quizResult }, 'Quiz result created successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.deleteQuizResult = async (req, res, next) => {
  try {
    const quizResult = await QuizResult.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!quizResult) {
      return res.status(404).json(
        ApiResponse.error('Quiz result not found')
      );
    }

    res.status(200).json(
      ApiResponse.success(null, 'Quiz result deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

async function calculateAverages(userId) {
  const quizResults = await QuizResult.find({ user: userId });

  if (quizResults.length === 0) {
    return {
      overall: 0,
      byTopic: {}
    };
  }

  // Overall average
  const totalScore = quizResults.reduce((sum, result) => sum + result.percentage, 0);
  const overall = totalScore / quizResults.length;

  // Average by topic
  const topicMap = {};
  quizResults.forEach(result => {
    if (!topicMap[result.topic]) {
      topicMap[result.topic] = { total: 0, count: 0 };
    }
    topicMap[result.topic].total += result.percentage;
    topicMap[result.topic].count += 1;
  });

  const byTopic = {};
  Object.keys(topicMap).forEach(topic => {
    byTopic[topic] = topicMap[topic].total / topicMap[topic].count;
  });

  return {
    overall: Math.round(overall * 100) / 100,
    byTopic
  };
}

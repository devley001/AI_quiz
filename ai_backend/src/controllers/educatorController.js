// ai_backend/src/controllers/educatorController.js
/**
 * Educator Dashboard Controller
 * Provides analytics and insights for instructors using real data from new models
 */

const IRTParameters = require('../models/IRTParameters');
const BloomsData = require('../models/BloomsData');
const AdaptiveSession = require('../models/AdaptiveSession');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');
const { ApiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Get class performance analytics using real data
 */
exports.getClassAnalytics = async (req, res, next) => {
  try {
    const { classId, startDate, endDate, topic } = req.query;

    // Get date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all students
    const students = await User.find({ role: 'user' }).catch(() => []);

    // Get adaptive sessions within date range
    let sessionFilter = {
      startTime: { $gte: start, $lte: end },
      status: 'completed'
    };
    if (topic) sessionFilter.topic = topic;

    const sessions = await AdaptiveSession.find(sessionFilter)
      .populate('userId', 'name email')
      .sort({ startTime: -1 })
      .catch(() => []);

    // Get question bank stats
    const questionStats = await QuestionBank.getQuestionStats(topic).catch(() => []);
    const qbStats = questionStats[0] || { totalQuestions: 0, approvedQuestions: 0 };

    // Get IRT parameters distribution
    const irtStats = await IRTParameters.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          avgDifficulty: { $avg: '$difficulty' },
          avgDiscrimination: { $avg: '$discrimination' },
          difficultyDistribution: {
            $push: '$difficulty'
          }
        }
      }
    ]).catch(() => []);
    const irtData = irtStats[0] || { avgDifficulty: 0, avgDiscrimination: 0 };

    // Get Bloom's taxonomy distribution
    const bloomsDistribution = await BloomsData.getLevelDistribution(topic).catch(() => []);

    // Calculate ability distribution from sessions
    const abilityRanges = {
      'beginner': sessions.filter(s => s.finalAbility < -1.0).length,
      'below_average': sessions.filter(s => s.finalAbility >= -1.0 && s.finalAbility < -0.5).length,
      'developing': sessions.filter(s => s.finalAbility >= -0.5 && s.finalAbility < 0.0).length,
      'proficient': sessions.filter(s => s.finalAbility >= 0.0 && s.finalAbility < 0.5).length,
      'advanced': sessions.filter(s => s.finalAbility >= 0.5 && s.finalAbility < 1.0).length,
      'expert': sessions.filter(s => s.finalAbility >= 1.0).length
    };

    // Calculate difficulty distribution from IRT data
    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    if (irtData.difficultyDistribution) {
      irtData.difficultyDistribution.forEach(diff => {
        if (diff < -0.5) difficultyDistribution.easy++;
        else if (diff > 0.5) difficultyDistribution.hard++;
        else difficultyDistribution.medium++;
      });
    }

    // Calculate analytics
    const analytics = {
      totalStudents: students.length,
      totalSessions: sessions.length,
      totalQuestions: qbStats.totalQuestions || 0,
      approvedQuestions: qbStats.approvedQuestions || 0,
      averageDifficulty: irtData.avgDifficulty ? irtData.avgDifficulty.toFixed(2) : '0.00',
      averageDiscrimination: irtData.avgDiscrimination ? irtData.avgDiscrimination.toFixed(2) : '0.00',
      abilityDistribution: abilityRanges,
      bloomsLevelDistribution: bloomsDistribution,
      performanceMetrics: {
        averageAccuracy: sessions.length > 0
          ? Math.round((sessions.reduce((sum, s) => sum + (s.performanceMetrics?.accuracy || 0), 0) / sessions.length) * 100)
          : 0,
        averageQuestionsAnswered: sessions.length > 0
          ? Math.round(sessions.reduce((sum, s) => sum + (s.performanceMetrics?.totalQuestions || 0), 0) / sessions.length)
          : 0,
        completionRate: sessions.length > 0
          ? Math.round((sessions.filter(s => s.status === 'completed').length / sessions.length) * 100)
          : 0
      },
      difficultyDistribution,
      recentActivity: sessions.slice(0, 10).map(s => ({
        sessionId: s.sessionId,
        studentName: s.userId?.name || 'Unknown',
        topic: s.topic,
        finalAbility: s.finalAbility ? s.finalAbility.toFixed(2) : '0.00',
        accuracy: s.performanceMetrics?.accuracy ? (s.performanceMetrics.accuracy * 100).toFixed(1) : '0.0',
        questionsAnswered: s.performanceMetrics?.totalQuestions || 0,
        date: s.startTime
      })),
      strugglingStudents: await identifyStrugglingStudents(sessions),
      topPerformers: await identifyTopPerformers(sessions)
    };

    res.status(200).json(
      ApiResponse.success(analytics, 'Class analytics retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting class analytics: ${error.message}`);
    next(error);
  }
};

/**
 * Get individual student progress using real adaptive session data
 */
exports.getStudentProgress = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json(
        ApiResponse.error('Student not found')
      );
    }

    // Get student's adaptive sessions
    const sessions = await AdaptiveSession.find({
      userId: studentId,
      status: 'completed'
    }).sort({ startTime: -1 });

    // Get student's Bloom's mastery data
    const bloomsMastery = await BloomsData.getStudentMastery(studentId);

    // Calculate ability progression
    const abilityProgression = sessions.map((s, index) => ({
      session: index + 1,
      date: s.startTime,
      initialAbility: s.initialAbility,
      finalAbility: s.finalAbility,
      improvement: s.finalAbility - s.initialAbility,
      accuracy: s.performanceMetrics.accuracy,
      questionsAnswered: s.performanceMetrics.totalQuestions
    }));

    // Calculate topic performance
    const topicPerformance = {};
    sessions.forEach(session => {
      if (!topicPerformance[session.topic]) {
        topicPerformance[session.topic] = {
          sessions: 0,
          totalAccuracy: 0,
          totalQuestions: 0,
          bestAbility: -Infinity
        };
      }
      topicPerformance[session.topic].sessions++;
      topicPerformance[session.topic].totalAccuracy += session.performanceMetrics.accuracy;
      topicPerformance[session.topic].totalQuestions += session.performanceMetrics.totalQuestions;
      topicPerformance[session.topic].bestAbility = Math.max(
        topicPerformance[session.topic].bestAbility,
        session.finalAbility
      );
    });

    // Convert to array with averages
    const topicStats = Object.entries(topicPerformance).map(([topic, data]) => ({
      topic,
      sessionsCount: data.sessions,
      averageAccuracy: (data.totalAccuracy / data.sessions).toFixed(2),
      totalQuestions: data.totalQuestions,
      bestAbility: data.bestAbility.toFixed(2)
    }));

    const progress = {
      studentInfo: {
        id: student._id,
        name: student.name,
        email: student.email
      },
      sessionSummary: {
        totalSessions: sessions.length,
        totalQuestionsAnswered: sessions.reduce((sum, s) => sum + s.performanceMetrics.totalQuestions, 0),
        averageAccuracy: sessions.length > 0
          ? (sessions.reduce((sum, s) => sum + s.performanceMetrics.accuracy, 0) / sessions.length).toFixed(2)
          : 0,
        currentAbility: sessions.length > 0 ? sessions[0].finalAbility : 0,
        abilityRange: sessions.length > 0 ? {
          lowest: Math.min(...sessions.map(s => s.finalAbility)),
          highest: Math.max(...sessions.map(s => s.finalAbility)),
          average: sessions.reduce((sum, s) => sum + s.finalAbility, 0) / sessions.length
        } : null
      },
      abilityProgression,
      bloomsMastery,
      topicPerformance: topicStats,
      recentSessions: sessions.slice(0, 5).map(s => ({
        sessionId: s.sessionId,
        topic: s.topic,
        date: s.startTime,
        finalAbility: s.finalAbility,
        accuracy: s.performanceMetrics.accuracy,
        questionsAnswered: s.performanceMetrics.totalQuestions,
        bloomsLevel: s.currentBloomsLevel
      })),
      recommendations: generateStudentRecommendations(sessions, bloomsMastery)
    };

    res.status(200).json(
      ApiResponse.success(progress, 'Student progress retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting student progress: ${error.message}`);
    next(error);
  }
};

/**
 * Get performance trends over time using real session data
 */
exports.getPerformanceTrends = async (req, res, next) => {
  try {
    const { period = '30d', topic } = req.query;

    const daysAgo = parseInt(period.replace('d', '')) || 30;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    let filter = {
      startTime: { $gte: startDate },
      status: 'completed'
    };
    if (topic) filter.topic = topic;

    const sessions = await AdaptiveSession.find(filter)
      .sort({ startTime: 1 });

    // Group by date
    const trendData = {};
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = {
          date,
          sessionsCount: 0,
          totalAccuracy: 0,
          totalQuestions: 0,
          averageAbility: 0,
          abilities: []
        };
      }
      trendData[date].sessionsCount++;
      trendData[date].totalAccuracy += session.performanceMetrics.accuracy;
      trendData[date].totalQuestions += session.performanceMetrics.totalQuestions;
      trendData[date].abilities.push(session.finalAbility);
    });

    // Calculate averages
    const trends = Object.values(trendData).map(day => ({
      date: day.date,
      sessionsCount: day.sessionsCount,
      averageAccuracy: (day.totalAccuracy / day.sessionsCount).toFixed(3),
      averageQuestions: Math.round(day.totalQuestions / day.sessionsCount),
      averageAbility: (day.abilities.reduce((a, b) => a + b, 0) / day.abilities.length).toFixed(3),
      abilityRange: {
        min: Math.min(...day.abilities).toFixed(3),
        max: Math.max(...day.abilities).toFixed(3)
      }
    }));

    res.status(200).json(
      ApiResponse.success({
        trends,
        period: `${daysAgo} days`,
        totalSessions: sessions.length,
        topic: topic || 'all'
      }, 'Performance trends retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting performance trends: ${error.message}`);
    next(error);
  }
};

/**
 * Get Bloom's Taxonomy distribution using real data
 */
exports.getBloomsTaxonomyDistribution = async (req, res, next) => {
  try {
    const { classId, studentId, topic } = req.query;

    let sessionFilter = { status: 'completed' };
    if (studentId) sessionFilter.userId = studentId;
    if (topic) sessionFilter.topic = topic;

    const sessions = await AdaptiveSession.find(sessionFilter);

    // Aggregate Bloom's level data from sessions
    const bloomsStats = {
      remember: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 },
      understand: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 },
      apply: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 },
      analyze: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 },
      evaluate: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 },
      create: { sessions: 0, totalQuestions: 0, correctAnswers: 0, totalAccuracy: 0 }
    };

    sessions.forEach(session => {
      const level = session.currentBloomsLevel;
      if (bloomsStats[level]) {
        bloomsStats[level].sessions++;
        bloomsStats[level].totalQuestions += session.performanceMetrics.totalQuestions;
        bloomsStats[level].correctAnswers += session.performanceMetrics.correctAnswers;
        bloomsStats[level].totalAccuracy += session.performanceMetrics.accuracy;
      }
    });

    // Calculate averages and success rates
    const distribution = {};
    const performance = {};
    const successRates = {};

    Object.keys(bloomsStats).forEach(level => {
      const stats = bloomsStats[level];
      distribution[level] = stats.sessions;
      performance[level] = {
        sessions: stats.sessions,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        averageAccuracy: stats.sessions > 0 ? (stats.totalAccuracy / stats.sessions).toFixed(3) : 0
      };
      successRates[level] = stats.totalQuestions > 0
        ? ((stats.correctAnswers / stats.totalQuestions) * 100).toFixed(2)
        : 0;
    });

    // Format distribution for frontend
    const formattedDistribution = {};
    Object.keys(bloomsStats).forEach(level => {
      formattedDistribution[level] = bloomsStats[level].sessions;
    });

    res.status(200).json(
      ApiResponse.success({
        distribution: formattedDistribution,
        performance,
        successRates,
        totalSessions: sessions.length,
        filter: { studentId, topic }
      }, 'Bloom\'s taxonomy distribution retrieved')
    );
  } catch (error) {
    logger.error(`Error getting Bloom's distribution: ${error.message}`);
    next(error);
  }
};

/**
 * Get question bank analytics
 */
exports.getQuestionBankAnalytics = async (req, res, next) => {
  try {
    const { topic, bloomsLevel } = req.query;

    let filter = { isActive: true };
    if (topic) filter.topic = topic;
    if (bloomsLevel) filter['bloomsTaxonomy.cognitiveLevel'] = bloomsLevel;

    const questions = await QuestionBank.find(filter);

    const analytics = {
      totalQuestions: questions.length,
      approvedQuestions: questions.filter(q => q.reviewStatus === 'approved').length,
      pendingReview: questions.filter(q => q.reviewStatus === 'pending').length,
      needsRevision: questions.filter(q => q.reviewStatus === 'needs_revision').length,
      topicDistribution: {},
      bloomsDistribution: {},
      difficultyDistribution: {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length
      },
      performanceMetrics: {
        averageSuccessRate: questions.length > 0
          ? (questions.reduce((sum, q) => sum + q.performanceData.successRate, 0) / questions.length).toFixed(3)
          : 0,
        averageResponseTime: questions.length > 0
          ? (questions.reduce((sum, q) => sum + q.performanceData.averageResponseTime, 0) / questions.length).toFixed(2)
          : 0,
        totalAttempts: questions.reduce((sum, q) => sum + q.performanceData.totalAttempts, 0)
      }
    };

    // Topic distribution
    questions.forEach(q => {
      analytics.topicDistribution[q.topic] = (analytics.topicDistribution[q.topic] || 0) + 1;
    });

    // Bloom's distribution
    questions.forEach(q => {
      const level = q.bloomsTaxonomy.cognitiveLevel;
      analytics.bloomsDistribution[level] = (analytics.bloomsDistribution[level] || 0) + 1;
    });

    res.status(200).json(
      ApiResponse.success(analytics, 'Question bank analytics retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting question bank analytics: ${error.message}`);
    next(error);
  }
};

/**
 * Get intervention recommendations using real data
 */
exports.getInterventionRecommendations = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'user' });

    const recommendations = [];

    for (const student of students) {
      const sessions = await AdaptiveSession.find({
        userId: student._id,
        status: 'completed'
      }).sort({ startTime: -1 }).limit(5);

      if (sessions.length === 0) continue;

      // Calculate recent performance
      const recentAccuracy = sessions.reduce((sum, s) => sum + s.performanceMetrics.accuracy, 0) / sessions.length;
      const recentAbility = sessions.reduce((sum, s) => sum + s.finalAbility, 0) / sessions.length;

      // Get Bloom's mastery data
      const bloomsMastery = await BloomsData.getStudentMastery(student._id);

      // Identify struggling areas
      const strugglingLevels = bloomsMastery
        .filter(level => level.masteryPercentage < 60)
        .map(level => level.level);

      // Generate recommendations based on real data
      if (recentAccuracy < 0.6 || recentAbility < -0.5) {
        recommendations.push({
          studentId: student._id,
          studentName: student.name,
          averageAccuracy: recentAccuracy.toFixed(2),
          averageAbility: recentAbility.toFixed(2),
          priority: recentAccuracy < 0.4 ? 'high' : 'medium',
          strugglingAreas: strugglingLevels,
          recommendedActions: generateInterventionActions(recentAccuracy, recentAbility, strugglingLevels),
          recentSessions: sessions.length,
          lastSessionDate: sessions[0].startTime
        });
      }
    }

    // Sort by priority
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    res.status(200).json(
      ApiResponse.success({
        recommendations,
        totalStudents: students.length,
        studentsNeedingIntervention: recommendations.length,
        interventionRate: ((recommendations.length / students.length) * 100).toFixed(1)
      }, 'Intervention recommendations generated')
    );
  } catch (error) {
    logger.error(`Error getting intervention recommendations: ${error.message}`);
    next(error);
  }
};

/**
 * Export assessment data using real session data
 */
exports.exportAssessmentData = async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate, topic } = req.query;

    let filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }
    if (topic) filter.topic = topic;

    const sessions = await AdaptiveSession.find(filter)
      .populate('userId', 'name email')
      .sort({ startTime: -1 });

    const exportData = sessions.map(s => ({
      sessionId: s.sessionId,
      studentName: s.userId?.name || 'Unknown',
      studentEmail: s.userId?.email || 'Unknown',
      topic: s.topic,
      startTime: s.startTime,
      endTime: s.endTime,
      durationMinutes: s.duration,
      initialAbility: s.initialAbility,
      finalAbility: s.finalAbility,
      abilityImprovement: (s.finalAbility - s.initialAbility).toFixed(3),
      questionsAnswered: s.performanceMetrics.totalQuestions,
      correctAnswers: s.performanceMetrics.correctAnswers,
      accuracy: s.performanceMetrics.accuracy.toFixed(3),
      currentBloomsLevel: s.currentBloomsLevel,
      standardError: s.performanceMetrics.standardError?.toFixed(3),
      status: s.status
    }));

    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=adaptive_session_data.csv');
      return res.send(csv);
    }

    res.status(200).json(
      ApiResponse.success({
        sessions: exportData,
        count: exportData.length,
        filters: { startDate, endDate, topic }
      }, 'Assessment data exported')
    );
  } catch (error) {
    logger.error(`Error exporting assessment data: ${error.message}`);
    next(error);
  }
};

// Helper Functions

async function identifyStrugglingStudents(sessions) {
  const studentStats = {};

  // Group sessions by student
  sessions.forEach(session => {
    const studentId = session.userId._id.toString();
    if (!studentStats[studentId]) {
      studentStats[studentId] = {
        studentId,
        studentName: session.userId.name,
        sessions: [],
        totalAccuracy: 0,
        totalQuestions: 0
      };
    }
    studentStats[studentId].sessions.push(session);
    studentStats[studentId].totalAccuracy += session.performanceMetrics.accuracy;
    studentStats[studentId].totalQuestions += session.performanceMetrics.totalQuestions;
  });

  // Identify struggling students
  const struggling = Object.values(studentStats)
    .map(stats => ({
      studentId: stats.studentId,
      studentName: stats.studentName,
      averageAccuracy: Math.round((stats.totalAccuracy / stats.sessions.length) * 100),
      sessionsCount: stats.sessions.length,
      totalQuestions: stats.totalQuestions
    }))
    .filter(stats => stats.averageAccuracy < 60)
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy)
    .slice(0, 10); // Top 10 struggling students

  return struggling;
}

async function identifyTopPerformers(sessions) {
  const studentStats = {};

  // Group sessions by student
  sessions.forEach(session => {
    const studentId = session.userId._id.toString();
    if (!studentStats[studentId]) {
      studentStats[studentId] = {
        studentId,
        studentName: session.userId.name,
        sessions: [],
        totalAccuracy: 0,
        totalAbility: 0
      };
    }
    studentStats[studentId].sessions.push(session);
    studentStats[studentId].totalAccuracy += session.performanceMetrics.accuracy;
    studentStats[studentId].totalAbility += session.finalAbility;
  });

  // Identify top performers
  const topPerformers = Object.values(studentStats)
    .map(stats => ({
      studentId: stats.studentId,
      studentName: stats.studentName,
      averageAccuracy: Math.round((stats.totalAccuracy / stats.sessions.length) * 100),
      averageAbility: (stats.totalAbility / stats.sessions.length).toFixed(2),
      sessionsCount: stats.sessions.length
    }))
    .filter(stats => stats.averageAccuracy >= 85)
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy)
    .slice(0, 10); // Top 10 performers

  return topPerformers;
}

function generateStudentRecommendations(sessions, bloomsMastery) {
  const recommendations = [];

  if (sessions.length === 0) {
    recommendations.push('Start with foundational adaptive assessments');
    return recommendations;
  }

  const recentSession = sessions[0];
  const recentAccuracy = recentSession.performanceMetrics.accuracy;
  const recentAbility = recentSession.finalAbility;

  // Ability-based recommendations
  if (recentAbility < -1.0) {
    recommendations.push('Focus on building foundational knowledge');
    recommendations.push('Start with easier topics and gradually increase difficulty');
  } else if (recentAbility < -0.5) {
    recommendations.push('Continue practicing at current level');
    recommendations.push('Review basic concepts that need reinforcement');
  } else if (recentAbility < 0.5) {
    recommendations.push('Good progress! Keep challenging yourself');
    recommendations.push('Try more complex problem-solving questions');
  } else {
    recommendations.push('Excellent performance! Ready for advanced topics');
    recommendations.push('Consider exploring specialized areas of interest');
  }

  // Accuracy-based recommendations
  if (recentAccuracy < 0.5) {
    recommendations.push('Review incorrect responses and explanations');
    recommendations.push('Practice similar question types');
  } else if (recentAccuracy < 0.7) {
    recommendations.push('Focus on understanding reasoning behind answers');
    recommendations.push('Try timed practice to improve speed and accuracy');
  }

  // Bloom's level recommendations
  const strugglingLevels = bloomsMastery.filter(level => level.masteryPercentage < 70);
  if (strugglingLevels.length > 0) {
    recommendations.push(`Strengthen skills in: ${strugglingLevels.map(l => l.level).join(', ')}`);
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

function generateInterventionActions(accuracy, ability, strugglingLevels) {
  const actions = [];

  if (accuracy < 0.4) {
    actions.push('Schedule one-on-one tutoring session');
    actions.push('Provide additional practice materials');
    actions.push('Review foundational concepts');
  } else if (accuracy < 0.6) {
    actions.push('Monitor progress closely');
    actions.push('Provide targeted practice exercises');
    actions.push('Encourage peer study groups');
  }

  if (ability < -0.5) {
    actions.push('Start with easier difficulty levels');
    actions.push('Focus on basic skill development');
  }

  if (strugglingLevels.length > 0) {
    actions.push(`Targeted instruction in: ${strugglingLevels.join(', ')} levels`);
  }

  return [...new Set(actions)]; // Remove duplicates
}

function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row).map(val =>
      typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    ).join(',')
  );

  return [headers, ...rows].join('\n');
}

module.exports = exports;

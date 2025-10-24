// ai_backend/src/controllers/educatorController.js
/**
 * Educator Dashboard Controller
 * Provides analytics and insights for instructors
 */

const AIRequest = require('../models/AIRequest');
const User = require('../models/User');
const { ApiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Get class performance analytics
 */
exports.getClassAnalytics = async (req, res, next) => {
  try {
    const { classId, startDate, endDate } = req.query;
    
    // Get all students in class (simplified - in production, use Class model)
    const students = await User.find({ role: 'user' });
    
    // Get AI assessment data for students
    const assessmentData = await AIRequest.find({
      requestType: 'quiz-generation',
      createdAt: {
        $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: endDate ? new Date(endDate) : new Date()
      }
    }).populate('userId', 'name email');
    
    // Calculate analytics
    const analytics = {
      totalStudents: students.length,
      totalAssessments: assessmentData.length,
      averageCompletion: calculateAverageCompletion(assessmentData),
      abilityDistribution: await getAbilityDistribution(students),
      bloomsLevelProgress: await getBloomsProgress(assessmentData),
      strugglingStudents: await identifyStrugglingStudents(students),
      topPerformers: await identifyTopPerformers(students),
      recentActivity: getRecentActivity(assessmentData)
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
 * Get individual student progress
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
    
    // Get student's assessment history
    const assessments = await AIRequest.find({
      userId: studentId,
      requestType: { $in: ['quiz-generation', 'text-analysis'] }
    }).sort({ createdAt: -1 });
    
    // Calculate progress metrics
    const progress = {
      studentInfo: {
        id: student._id,
        name: student.name,
        email: student.email
      },
      assessmentHistory: assessments.map(a => ({
        id: a._id,
        type: a.requestType,
        date: a.createdAt,
        score: a.output?.score || 0,
        duration: a.processingTime
      })),
      abilityTrend: calculateAbilityTrend(assessments),
      bloomsLevelMastery: calculateBloomsLevelMastery(assessments),
      strengthsAndWeaknesses: identifyStrengthsWeaknesses(assessments),
      recommendations: generateStudentRecommendations(assessments)
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
 * Get performance trends over time
 */
exports.getPerformanceTrends = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    
    const daysAgo = parseInt(period) || 30;
    const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    const assessments = await AIRequest.find({
      createdAt: { $gte: startDate },
      requestType: 'quiz-generation'
    });
    
    // Group by date
    const trendData = {};
    assessments.forEach(assessment => {
      const date = assessment.createdAt.toISOString().split('T')[0];
      if (!trendData[date]) {
        trendData[date] = {
          date,
          count: 0,
          totalScore: 0,
          averageScore: 0
        };
      }
      trendData[date].count++;
      trendData[date].totalScore += assessment.output?.score || 0;
    });
    
    // Calculate averages
    Object.keys(trendData).forEach(date => {
      trendData[date].averageScore = 
        trendData[date].totalScore / trendData[date].count;
    });
    
    const trends = Object.values(trendData).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    res.status(200).json(
      ApiResponse.success({ trends, period: `${daysAgo} days` }, 
        'Performance trends retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting performance trends: ${error.message}`);
    next(error);
  }
};

/**
 * Get intervention recommendations
 */
exports.getInterventionRecommendations = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'user' });
    
    const recommendations = [];
    
    for (const student of students) {
      const assessments = await AIRequest.find({
        userId: student._id,
        requestType: 'quiz-generation'
      }).sort({ createdAt: -1 }).limit(5);
      
      if (assessments.length === 0) continue;
      
      // Calculate recent performance
      const recentScores = assessments.map(a => a.output?.score || 0);
      const averageScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      
      // Identify students needing intervention
      if (averageScore < 0.6) {
        recommendations.push({
          studentId: student._id,
          studentName: student.name,
          averageScore,
          priority: averageScore < 0.4 ? 'high' : 'medium',
          recommendedActions: [
            'Schedule one-on-one tutoring session',
            'Review foundational concepts',
            'Provide additional practice materials',
            'Consider peer mentoring'
          ],
          strugglingAreas: identifyStrugglingAreas(assessments)
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
        studentsNeedingIntervention: recommendations.length
      }, 'Intervention recommendations generated')
    );
  } catch (error) {
    logger.error(`Error getting intervention recommendations: ${error.message}`);
    next(error);
  }
};

/**
 * Get Bloom's Taxonomy distribution
 */
exports.getBloomsTaxonomyDistribution = async (req, res, next) => {
  try {
    const { classId, studentId } = req.query;
    
    let filter = { requestType: 'quiz-generation' };
    if (studentId) filter.userId = studentId;
    
    const assessments = await AIRequest.find(filter);
    
    // Analyze Bloom's levels
    const distribution = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0
    };
    
    const performance = {
      remember: { correct: 0, total: 0 },
      understand: { correct: 0, total: 0 },
      apply: { correct: 0, total: 0 },
      analyze: { correct: 0, total: 0 },
      evaluate: { correct: 0, total: 0 },
      create: { correct: 0, total: 0 }
    };
    
    assessments.forEach(assessment => {
      const questions = assessment.output?.questions || [];
      questions.forEach(q => {
        const level = q.blooms_level || 'understand';
        if (distribution[level] !== undefined) {
          distribution[level]++;
          performance[level].total++;
          if (q.student_correct) {
            performance[level].correct++;
          }
        }
      });
    });
    
    // Calculate success rates
    const successRates = {};
    Object.keys(performance).forEach(level => {
      successRates[level] = performance[level].total > 0
        ? (performance[level].correct / performance[level].total * 100).toFixed(2)
        : 0;
    });
    
    res.status(200).json(
      ApiResponse.success({
        distribution,
        performance,
        successRates
      }, 'Bloom\'s taxonomy distribution retrieved')
    );
  } catch (error) {
    logger.error(`Error getting Bloom's distribution: ${error.message}`);
    next(error);
  }
};

/**
 * Export assessment data
 */
exports.exportAssessmentData = async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    
    const filter = {
      requestType: 'quiz-generation'
    };
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    const assessments = await AIRequest.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    const exportData = assessments.map(a => ({
      assessmentId: a._id,
      studentName: a.userId?.name || 'Unknown',
      studentEmail: a.userId?.email || 'Unknown',
      date: a.createdAt,
      topic: a.input?.topic || 'N/A',
      questionsCount: a.output?.questions?.length || 0,
      score: a.output?.score || 0,
      duration: a.processingTime,
      bloomsLevel: a.output?.blooms_level || 'N/A',
      irtAbility: a.output?.ability || 0
    }));
    
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=assessment_data.csv');
      return res.send(csv);
    }
    
    res.status(200).json(
      ApiResponse.success({ assessments: exportData, count: exportData.length }, 
        'Assessment data exported')
    );
  } catch (error) {
    logger.error(`Error exporting assessment data: ${error.message}`);
    next(error);
  }
};

// Helper Functions

function calculateAverageCompletion(assessments) {
  if (assessments.length === 0) return 0;
  const completed = assessments.filter(a => a.status === 'completed').length;
  return (completed / assessments.length * 100).toFixed(2);
}

async function getAbilityDistribution(students) {
  // Simulate IRT ability distribution
  const distribution = {
    'beginner': 0,
    'below_average': 0,
    'developing': 0,
    'proficient': 0,
    'advanced': 0,
    'expert': 0
  };
  
  // In production, calculate from actual IRT scores
  students.forEach(() => {
    const rand = Math.random();
    if (rand < 0.1) distribution.beginner++;
    else if (rand < 0.3) distribution.below_average++;
    else if (rand < 0.5) distribution.developing++;
    else if (rand < 0.7) distribution.proficient++;
    else if (rand < 0.9) distribution.advanced++;
    else distribution.expert++;
  });
  
  return distribution;
}

async function getBloomsProgress(assessments) {
  const progress = {
    remember: { attempted: 0, mastered: 0 },
    understand: { attempted: 0, mastered: 0 },
    apply: { attempted: 0, mastered: 0 },
    analyze: { attempted: 0, mastered: 0 },
    evaluate: { attempted: 0, mastered: 0 },
    create: { attempted: 0, mastered: 0 }
  };
  
  assessments.forEach(assessment => {
    const level = assessment.output?.blooms_level || 'understand';
    const score = assessment.output?.score || 0;
    
    if (progress[level]) {
      progress[level].attempted++;
      if (score >= 0.8) progress[level].mastered++;
    }
  });
  
  return progress;
}

async function identifyStrugglingStudents(students) {
  const struggling = [];
  
  for (const student of students.slice(0, 5)) { // Limit for demo
    const recentAssessments = await AIRequest.find({
      userId: student._id,
      requestType: 'quiz-generation'
    }).sort({ createdAt: -1 }).limit(3);
    
    if (recentAssessments.length > 0) {
      const avgScore = recentAssessments.reduce((sum, a) => 
        sum + (a.output?.score || 0), 0) / recentAssessments.length;
      
      if (avgScore < 0.6) {
        struggling.push({
          studentId: student._id,
          studentName: student.name,
          averageScore: avgScore.toFixed(2),
          assessmentsTaken: recentAssessments.length
        });
      }
    }
  }
  
  return struggling;
}

async function identifyTopPerformers(students) {
  const topPerformers = [];
  
  for (const student of students.slice(0, 5)) { // Limit for demo
    const recentAssessments = await AIRequest.find({
      userId: student._id,
      requestType: 'quiz-generation'
    }).sort({ createdAt: -1 }).limit(3);
    
    if (recentAssessments.length > 0) {
      const avgScore = recentAssessments.reduce((sum, a) => 
        sum + (a.output?.score || 0), 0) / recentAssessments.length;
      
      if (avgScore >= 0.85) {
        topPerformers.push({
          studentId: student._id,
          studentName: student.name,
          averageScore: avgScore.toFixed(2),
          assessmentsTaken: recentAssessments.length
        });
      }
    }
  }
  
  return topPerformers;
}

function getRecentActivity(assessments) {
  return assessments
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map(a => ({
      id: a._id,
      studentId: a.userId?._id,
      studentName: a.userId?.name || 'Unknown',
      type: a.requestType,
      date: a.createdAt,
      status: a.status
    }));
}

function calculateAbilityTrend(assessments) {
  return assessments.map((a, index) => ({
    assessment: index + 1,
    date: a.createdAt,
    ability: a.output?.ability || 0,
    score: a.output?.score || 0
  }));
}

function calculateBloomsLevelMastery(assessments) {
  const mastery = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  };
  
  assessments.forEach(a => {
    const level = a.output?.blooms_level || 'understand';
    const score = a.output?.score || 0;
    if (mastery[level] !== undefined) {
      mastery[level] = Math.max(mastery[level], score);
    }
  });
  
  return mastery;
}

function identifyStrengthsWeaknesses(assessments) {
  const topics = {};
  
  assessments.forEach(a => {
    const topic = a.input?.topic || 'General';
    const score = a.output?.score || 0;
    
    if (!topics[topic]) {
      topics[topic] = { total: 0, sum: 0, count: 0 };
    }
    topics[topic].sum += score;
    topics[topic].count++;
    topics[topic].total = topics[topic].sum / topics[topic].count;
  });
  
  const strengths = [];
  const weaknesses = [];
  
  Object.entries(topics).forEach(([topic, data]) => {
    if (data.total >= 0.7) {
      strengths.push({ topic, score: data.total.toFixed(2) });
    } else if (data.total < 0.5) {
      weaknesses.push({ topic, score: data.total.toFixed(2) });
    }
  });
  
  return { strengths, weaknesses };
}

function generateStudentRecommendations(assessments) {
  const recommendations = [];
  
  if (assessments.length === 0) {
    recommendations.push('Start with foundational assessments');
    return recommendations;
  }
  
  const recentScore = assessments[0]?.output?.score || 0;
  
  if (recentScore < 0.5) {
    recommendations.push('Review basic concepts');
    recommendations.push('Practice with easier questions');
    recommendations.push('Request tutoring support');
  } else if (recentScore < 0.7) {
    recommendations.push('Continue practicing at current level');
    recommendations.push('Focus on weak areas');
  } else {
    recommendations.push('Progress to more challenging material');
    recommendations.push('Explore advanced topics');
    recommendations.push('Consider peer teaching opportunities');
  }
  
  return recommendations;
}

function identifyStrugglingAreas(assessments) {
  const areas = [];
  
  assessments.forEach(a => {
    if (a.output?.score < 0.6) {
      areas.push({
        topic: a.input?.topic || 'General',
        blooms_level: a.output?.blooms_level || 'N/A',
        score: a.output?.score || 0
      });
    }
  });
  
  return areas.slice(0, 3); // Top 3 struggling areas
}

function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => 
      typeof val === 'string' ? `"${val}"` : val
    ).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

module.exports = exports;
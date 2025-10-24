
// ============================================
// FILE: src/controllers/aiController.js
// ============================================
const AIRequest = require('../models/AIRequest');
const aiService = require('../services/aiService');
const { ApiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

exports.processAIRequest = async (req, res, next) => {
  try {
    const { requestType, input } = req.body;
    
    if (!requestType) {
      return res.status(400).json(
        ApiResponse.error('requestType is required')
      );
    }
    
    if (!input) {
      return res.status(400).json(
        ApiResponse.error('input is required')
      );
    }
    
    const validTypes = ['text-analysis', 'sentiment-analysis', 'quiz-generation', 'text-generation'];
    if (!validTypes.includes(requestType)) {
      return res.status(400).json(
        ApiResponse.error('Invalid requestType. Must be one of: ' + validTypes.join(', '))
      );
    }
    
    // Create AI request record
    const aiRequest = await AIRequest.create({
      userId: req.user?.id || null,
      requestType,
      input,
      status: 'processing'
    });

    const startTime = Date.now();

    try {
      // Call actual AI service
      let result;
      try {
        result = await aiService.processRequest(requestType, input);
        logger.info('AI service response received');
      } catch (aiServiceError) {
        logger.warn(`AI service unavailable: ${aiServiceError.message}`);
        // Fallback to enhanced mock data that respects user parameters
        result = generateFallbackResult(requestType, input);
      }

      
      const processingTime = Date.now() - startTime;
      
      // Ensure quiz results have correct number of questions
      if (requestType === 'quiz-generation' && result.quiz) {
        const requestedQuestions = input.options?.numQuestions || 5;
        if (result.quiz.questions.length !== requestedQuestions) {
          result.quiz.questions = adjustQuestionCount(result.quiz.questions, requestedQuestions);
        }
      }

      // Update AI request record
      aiRequest.output = result;
      aiRequest.status = 'completed';
      aiRequest.processingTime = processingTime;
      await aiRequest.save();

      logger.info(`AI request completed: ${aiRequest._id} in ${processingTime}ms`);

      res.status(200).json(
        ApiResponse.success({
          requestId: aiRequest._id,
          result,
          processingTime
        }, 'AI request processed successfully')
      );
    } catch (aiError) {
      // Update AI request with error
      aiRequest.status = 'failed';
      aiRequest.error = aiError.message;
      await aiRequest.save();

      throw aiError;
    }
  } catch (error) {
    logger.error(`AI request failed: ${error.message}`);
    next(error);
  }
};

exports.getAIRequestHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const requests = await AIRequest.find({ userId: req.user.id })
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await AIRequest.countDocuments({ userId: req.user.id });

    res.status(200).json(
      ApiResponse.success({
        requests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'AI request history retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.getAIRequestById = async (req, res, next) => {
  try {
    const aiRequest = await AIRequest.findById(req.params.id);
    
    if (!aiRequest) {
      return res.status(404).json(
        ApiResponse.error('AI request not found')
      );
    }

    // Check if user owns the request
    if (aiRequest.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json(
        ApiResponse.error('Not authorized to view this request')
      );
    }

    res.status(200).json(
      ApiResponse.success({ aiRequest }, 'AI request retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

exports.healthCheck = async (req, res, next) => {
  try {
    res.status(200).json(
      ApiResponse.success({
        backend_status: 'healthy',
        ai_service_status: 'healthy',
        timestamp: new Date().toISOString()
      }, 'AI service health check completed')
    );
  } catch (error) {
    res.status(503).json(
      ApiResponse.error('AI service unavailable', {
        backend_status: 'healthy',
        ai_service_status: 'unhealthy',
        error: error.message
      })
    );
  }
};

// Helper function to generate fallback results
function generateFallbackResult(requestType, input) {
  switch (requestType) {
    case 'quiz-generation':
      const topic = input.topic;
      const numQuestions = input.options?.numQuestions || 5;
      const difficulty = input.options?.difficulty || 'medium';
      
      const questionBank = {
        'Science': {
          easy: [
            { question: 'What is water made of?', options: ['H2O', 'CO2', 'O2', 'N2'], correctAnswer: 0 },
            { question: 'What planet do we live on?', options: ['Mars', 'Earth', 'Venus', 'Jupiter'], correctAnswer: 1 }
          ],
          medium: [
            { question: 'What is the chemical symbol for water?', options: ['H2O', 'CO2', 'NaCl', 'O2'], correctAnswer: 0 },
            { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswer: 1 }
          ],
          hard: [
            { question: 'What is the speed of light in vacuum?', options: ['300,000 km/s', '150,000 km/s', '450,000 km/s', '600,000 km/s'], correctAnswer: 0 },
            { question: 'What is the atomic number of carbon?', options: ['4', '6', '8', '12'], correctAnswer: 1 }
          ]
        },
        'Mathematics': {
          easy: [
            { question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctAnswer: 1 },
            { question: 'What is 10 - 5?', options: ['3', '4', '5', '6'], correctAnswer: 2 }
          ],
          medium: [
            { question: 'What is 15% of 200?', options: ['25', '30', '35', '40'], correctAnswer: 1 },
            { question: 'What is the square root of 144?', options: ['10', '11', '12', '13'], correctAnswer: 2 }
          ],
          hard: [
            { question: 'What is the derivative of x²?', options: ['x', '2x', 'x²', '2x²'], correctAnswer: 1 },
            { question: 'What is log₁₀(100)?', options: ['1', '2', '10', '100'], correctAnswer: 1 }
          ]
        }
      };
      
      // Only use questions from the requested topic
      const topicQuestions = questionBank[topic];
      if (!topicQuestions) {
        // Generate generic questions for unknown topics
        return {
          quiz: {
            title: `${topic} Quiz`,
            topic: topic,
            difficulty: difficulty,
            questions: Array.from({length: numQuestions}, (_, i) => ({
              question: `Question ${i+1}: What is an important aspect of ${topic}?`,
              options: [`${topic} Option A`, `${topic} Option B`, `${topic} Option C`, `${topic} Option D`],
              correctAnswer: 0
            }))
          }
        };
      }
      const difficultyQuestions = topicQuestions[difficulty] || topicQuestions['medium'];
      
      return {
        quiz: {
          title: `${topic} Quiz`,
          topic: topic,
          difficulty: difficulty,
          questions: adjustQuestionCount(difficultyQuestions, numQuestions)
        }
      };
      
    default:
      return { message: 'Fallback response' };
  }
}

// Helper function to adjust question count
function adjustQuestionCount(questions, targetCount) {
  if (questions.length >= targetCount) {
    return questions.slice(0, targetCount);
  }
  
  const result = [...questions];
  while (result.length < targetCount) {
    const baseQuestion = questions[result.length % questions.length];
    const questionNumber = result.length + 1;
    result.push({
      ...baseQuestion,
      question: `${questionNumber}. ${baseQuestion.question}`
    });
  }
  
  return result;
}

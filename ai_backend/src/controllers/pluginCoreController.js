/**
 * Plugin Core Controller
 * Coordinating center linking Moodle Quiz Module with ChatGPT API and Pedagogical Engine
 * Implements the conceptual model for Generative AI in Personalized Assessments
 */

const axios = require('axios');
const AdaptiveSession = require('../models/AdaptiveSession');
const QuestionBank = require('../models/QuestionBank');
const StudentProfile = require('../models/StudentProfile');
const { apiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

class PluginCoreController {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.chatgptApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Initialize adaptive assessment session
   * Coordinates with Pedagogical Engine to set up personalized learning
   */
  async initializeAdaptiveSession(req, res) {
    try {
      const { userId, topic, initialDifficulty = 'medium' } = req.body;

      // Get student profile from database
      const studentProfile = await StudentProfile.findOne({ userId }) || 
        await StudentProfile.create({ userId, abilityEstimates: {} });

      // Get available questions for topic
      const availableQuestions = await QuestionBank.find({
        topic,
        isActive: true,
        reviewStatus: 'approved'
      }).lean();

      if (availableQuestions.length === 0) {
        return res.status(400).json(
          apiResponse.error('No approved questions available for this topic')
        );
      }

      // Initialize session with Pedagogical Engine
      const sessionInitData = await this.callPedagogicalEngine('/initialize_session', {
        user_profile: {
          ability_estimates: studentProfile.abilityEstimates,
          learning_preferences: studentProfile.learningPreferences
        },
        topic
      });

      // Create adaptive session record
      const sessionId = `session_${userId}_${Date.now()}`;
      const adaptiveSession = new AdaptiveSession({
        sessionId,
        userId,
        topic,
        initialAbility: sessionInitData.initial_ability,
        currentBloomsLevel: sessionInitData.initial_blooms_level,
        initialBloomsLevel: sessionInitData.initial_blooms_level,
        status: 'active'
      });

      await adaptiveSession.save();

      // Select first question
      const firstQuestion = await this.selectNextQuestion(sessionId, availableQuestions);

      logger.info(`Adaptive session initialized: ${sessionId} for user ${userId}`);

      res.json(apiResponse.success({
        sessionId,
        initialAbility: sessionInitData.initial_ability,
        initialBloomsLevel: sessionInitData.initial_blooms_level,
        firstQuestion,
        totalAvailableQuestions: availableQuestions.length
      }));

    } catch (error) {
      logger.error('Error initializing adaptive session:', error);
      res.status(500).json(apiResponse.error('Failed to initialize adaptive session'));
    }
  }

  /**
   * Process student response and adapt assessment
   * Core adaptive logic using IRT and Bloom's Taxonomy
   */
  async processResponse(req, res) {
    try {
      const { sessionId, questionId, response, responseTime } = req.body;

      // Get current session
      const session = await AdaptiveSession.findOne({ sessionId, status: 'active' });
      if (!session) {
        return res.status(404).json(apiResponse.error('Active session not found'));
      }

      // Get question details
      const question = await QuestionBank.findOne({ questionId });
      if (!question) {
        return res.status(404).json(apiResponse.error('Question not found'));
      }

      // Determine if response is correct
      const isCorrect = response === question.correctAnswer ? 1 : 0;

      // Record response in question bank
      await question.addResponse(session.userId, response, isCorrect, responseTime, sessionId);

      // Process response with Pedagogical Engine
      const processingResult = await this.callPedagogicalEngine('/process_response', {
        session_data: this.sessionToEngineFormat(session),
        question: this.questionToEngineFormat(question),
        response: isCorrect,
        response_time: responseTime
      });

      // Update session with new data
      await this.updateSessionFromEngine(session, processingResult.session_data, question, isCorrect, responseTime);

      let nextQuestion = null;
      let shouldTerminate = processingResult.should_terminate;

      if (!shouldTerminate) {
        // Get available questions for next selection
        const availableQuestions = await QuestionBank.find({
          topic: session.topic,
          isActive: true,
          reviewStatus: 'approved',
          questionId: { $nin: session.questionsAnswered.map(q => q.questionId) }
        }).lean();

        if (availableQuestions.length > 0) {
          nextQuestion = await this.selectNextQuestion(sessionId, availableQuestions);
        } else {
          shouldTerminate = true;
        }
      }

      // Generate AI-powered feedback using ChatGPT
      const feedback = await this.generateAIFeedback(question, response, isCorrect, session.currentBloomsLevel);

      // If session should terminate, generate final report
      let finalReport = null;
      if (shouldTerminate) {
        session.status = 'completed';
        session.endTime = new Date();
        session.finalAbility = processingResult.session_data.current_ability;
        
        finalReport = await this.callPedagogicalEngine('/generate_final_report', {
          session_data: processingResult.session_data
        });

        // Update student profile with new ability estimates
        await this.updateStudentProfile(session.userId, session.topic, session.finalAbility);
      }

      await session.save();

      logger.info(`Response processed for session ${sessionId}: ${isCorrect ? 'correct' : 'incorrect'}`);

      res.json(apiResponse.success({
        isCorrect,
        feedback,
        abilityChange: processingResult.ability_change,
        bloomsChange: processingResult.blooms_change,
        currentAbility: processingResult.session_data.current_ability,
        currentBloomsLevel: processingResult.session_data.current_blooms_level,
        recommendations: processingResult.recommendations,
        nextQuestion,
        shouldTerminate,
        finalReport,
        performanceSummary: processingResult.performance_summary
      }));

    } catch (error) {
      logger.error('Error processing response:', error);
      res.status(500).json(apiResponse.error('Failed to process response'));
    }
  }

  /**
   * Select next question using Pedagogical Engine
   */
  async selectNextQuestion(sessionId, availableQuestions) {
    try {
      const session = await AdaptiveSession.findOne({ sessionId });
      
      const selectionResult = await this.callPedagogicalEngine('/select_next_question', {
        session_data: this.sessionToEngineFormat(session),
        available_questions: availableQuestions.map(q => this.questionToEngineFormat(q))
      });

      if (selectionResult && selectionResult.id) {
        const selectedQuestion = await QuestionBank.findOne({ 
          questionId: selectionResult.id 
        }).lean();
        
        return {
          questionId: selectedQuestion.questionId,
          questionText: selectedQuestion.questionText,
          questionType: selectedQuestion.questionType,
          options: selectedQuestion.options,
          bloomsLevel: selectedQuestion.bloomsTaxonomy.cognitiveLevel,
          difficulty: selectedQuestion.irtParameters.difficulty,
          topic: selectedQuestion.topic
        };
      }

      return null;
    } catch (error) {
      logger.error('Error selecting next question:', error);
      return availableQuestions[0]; // Fallback to first available
    }
  }

  /**
   * Generate AI-powered feedback using ChatGPT API
   */
  async generateAIFeedback(question, response, isCorrect, bloomsLevel) {
    try {
      if (!this.chatgptApiKey) {
        return this.getDefaultFeedback(isCorrect, bloomsLevel);
      }

      const prompt = this.buildFeedbackPrompt(question, response, isCorrect, bloomsLevel);

      const chatgptResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an educational AI assistant providing personalized feedback for adaptive learning assessments.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.chatgptApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return chatgptResponse.data.choices[0].message.content.trim();

    } catch (error) {
      logger.error('Error generating AI feedback:', error);
      return this.getDefaultFeedback(isCorrect, bloomsLevel);
    }
  }

  /**
   * Build feedback prompt for ChatGPT
   */
  buildFeedbackPrompt(question, response, isCorrect, bloomsLevel) {
    const correctnessText = isCorrect ? 'correctly' : 'incorrectly';
    
    return `
      A student ${correctnessText} answered a ${bloomsLevel}-level question in Computer Science.
      
      Question: ${question.questionText}
      Student's Answer: ${response}
      Correct Answer: ${question.correctAnswer}
      Cognitive Level: ${bloomsLevel}
      
      Provide brief, encouraging feedback that:
      1. Acknowledges their ${correctnessText} response
      2. ${isCorrect ? 'Reinforces the concept' : 'Explains why the answer is incorrect'}
      3. Suggests next steps for learning at the ${bloomsLevel} level
      
      Keep it under 150 words and maintain a supportive tone.
    `;
  }

  /**
   * Get default feedback when AI is unavailable
   */
  getDefaultFeedback(isCorrect, bloomsLevel) {
    if (isCorrect) {
      return `Excellent work! You've demonstrated strong understanding at the ${bloomsLevel} level. Continue practicing similar concepts to reinforce your learning.`;
    } else {
      return `Not quite right, but that's part of learning! Review the concepts at the ${bloomsLevel} level and try similar questions to improve your understanding.`;
    }
  }

  /**
   * Call Pedagogical Engine API
   */
  async callPedagogicalEngine(endpoint, data) {
    try {
      const response = await axios.post(`${this.aiServiceUrl}${endpoint}`, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      logger.error(`Error calling Pedagogical Engine ${endpoint}:`, error.message);
      throw new Error(`Pedagogical Engine unavailable: ${error.message}`);
    }
  }

  /**
   * Convert session to engine format
   */
  sessionToEngineFormat(session) {
    return {
      initial_ability: session.initialAbility,
      current_ability: session.finalAbility || session.initialAbility,
      initial_blooms_level: session.initialBloomsLevel,
      current_blooms_level: session.currentBloomsLevel,
      questions_answered: session.questionsAnswered.map(q => ({
        id: q.questionId,
        blooms_level: q.bloomsLevel,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        response: q.response,
        response_time: q.responseTime
      })),
      ability_trajectory: session.abilityTrajectory,
      recommendations: session.recommendations
    };
  }

  /**
   * Convert question to engine format
   */
  questionToEngineFormat(question) {
    return {
      id: question.questionId,
      text: question.questionText,
      blooms_level: question.bloomsTaxonomy?.cognitiveLevel || 'understand',
      difficulty: question.irtParameters?.difficulty || 0.0,
      discrimination: question.irtParameters?.discrimination || 1.0,
      topic: question.topic
    };
  }

  /**
   * Update session from engine results
   */
  async updateSessionFromEngine(session, engineData, question, isCorrect, responseTime) {
    // Add question to answered list
    session.questionsAnswered.push({
      questionId: question.questionId,
      questionText: question.questionText,
      bloomsLevel: question.bloomsTaxonomy.cognitiveLevel,
      difficulty: question.irtParameters.difficulty,
      discrimination: question.irtParameters.discrimination,
      response: isCorrect,
      responseTime
    });

    // Update ability trajectory
    session.abilityTrajectory.push({
      questionNumber: session.questionsAnswered.length,
      ability: engineData.current_ability
    });

    // Update current Bloom's level
    session.currentBloomsLevel = engineData.current_blooms_level;

    // Update performance metrics
    session.performanceMetrics.totalQuestions = session.questionsAnswered.length;
    session.performanceMetrics.correctAnswers = session.questionsAnswered.filter(q => q.response === 1).length;
    session.performanceMetrics.accuracy = session.performanceMetrics.correctAnswers / session.performanceMetrics.totalQuestions;

    // Add recommendations
    if (engineData.recommendations) {
      session.recommendations.push(...engineData.recommendations);
    }
  }

  /**
   * Update student profile with new ability estimate
   */
  async updateStudentProfile(userId, topic, finalAbility) {
    try {
      await StudentProfile.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            [`abilityEstimates.${topic}`]: finalAbility,
            lastAssessment: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error updating student profile:', error);
    }
  }

  /**
   * Get session analytics for educators
   */
  async getSessionAnalytics(req, res) {
    try {
      const { topic, startDate, endDate } = req.query;

      const analytics = await AdaptiveSession.getTopicAnalytics(topic, {
        start: new Date(startDate),
        end: new Date(endDate)
      });

      res.json(apiResponse.success(analytics));

    } catch (error) {
      logger.error('Error getting session analytics:', error);
      res.status(500).json(apiResponse.error('Failed to get analytics'));
    }
  }
}

module.exports = new PluginCoreController();
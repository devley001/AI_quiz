// ============================================
// FILE: src/services/aiService.js
// ============================================
import api from './api';

const aiService = {
  // Text Analysis
  analyzeText: async (text) => {
    const response = await api.post('/ai/process', {
      requestType: 'text-analysis',
      input: { text }
    });
    return response;
  },

  // Sentiment Analysis
  analyzeSentiment: async (text) => {
    const response = await api.post('/ai/process', {
      requestType: 'sentiment-analysis',
      input: { text }
    });
    return response;
  },

  // Text Generation
  generateText: async (prompt, options = {}) => {
    const response = await api.post('/ai/process', {
      requestType: 'text-generation',
      input: { 
        prompt, 
        options: {
          maxLength: options.maxLength || 100,
          temperature: options.temperature || 0.7
        }
      }
    });
    return response;
  },

  // Quiz Generation
  generateQuiz: async (topic, options = {}) => {
    const response = await api.post('/ai/process', {
      requestType: 'quiz-generation',
      input: { 
        topic, 
        options: {
          numQuestions: options.numQuestions || 5,
          difficulty: options.difficulty || 'medium'
        }
      }
    });
    return response;
  },

  // Get Recommendations
  getRecommendations: async (userId, preferences = {}) => {
    const response = await api.post('/ai/process', {
      requestType: 'recommendations',
      input: { 
        userId, 
        preferences: {
          ...preferences,
          limit: preferences.limit || 10
        }
      }
    });
    return response;
  },

  // Get AI Request History
  getRequestHistory: async (page = 1, limit = 10) => {
    const response = await api.get(`/ai/history?page=${page}&limit=${limit}`);
    return response;
  },

  // Get AI Request by ID
  getRequestById: async (requestId) => {
    const response = await api.get(`/ai/requests/${requestId}`);
    return response;
  },

  // Health Check for AI Service
  healthCheck: async () => {
    try {
      const response = await api.get('/ai/health');
      return response;
    } catch (error) {
      throw new Error('AI service health check failed');
    }
  }
};

export default aiService;
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const teacherService = {
  // Get overview of all collections
  getOverview: async () => {
    const response = await axios.get(`${API_URL}/teacher/overview`);
    return response.data;
  },

  // Get adaptive sessions
  getAdaptiveSessions: async () => {
    const response = await axios.get(`${API_URL}/teacher/adaptive-sessions`);
    return response.data;
  },

  // Get AI requests
  getAIRequests: async () => {
    const response = await axios.get(`${API_URL}/teacher/ai-requests`);
    return response.data;
  },

  // Get Blooms data
  getBloomsData: async () => {
    const response = await axios.get(`${API_URL}/teacher/blooms-data`);
    return response.data;
  },

  // Get IRT parameters
  getIRTParameters: async () => {
    const response = await axios.get(`${API_URL}/teacher/irt-parameters`);
    return response.data;
  },

  // Get posts
  getPosts: async () => {
    const response = await axios.get(`${API_URL}/teacher/posts`);
    return response.data;
  },

  // Get post views
  getPostViews: async () => {
    const response = await axios.get(`${API_URL}/teacher/post-views`);
    return response.data;
  },

  // Get question banks
  getQuestionBanks: async () => {
    const response = await axios.get(`${API_URL}/teacher/question-banks`);
    return response.data;
  },

  // Get quiz results
  getQuizResults: async () => {
    const response = await axios.get(`${API_URL}/teacher/quiz-results`);
    return response.data;
  },

  // Get student profiles
  getStudentProfiles: async () => {
    const response = await axios.get(`${API_URL}/teacher/student-profiles`);
    return response.data;
  },

  // Get analytics for specific collection
  getCollectionAnalytics: async (collection) => {
    const response = await axios.get(`${API_URL}/teacher/analytics/${collection}`);
    return response.data;
  }
};

// Add auth token to requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default teacherService;
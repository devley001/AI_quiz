/**
 * Educator Service
 * Handles API calls for educator dashboard functionality
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class EducatorService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
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

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get class analytics data
   */
  async getClassAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.topic) queryParams.append('topic', params.topic);

      const response = await this.client.get(`/educator/analytics/class?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching class analytics:', error);
      throw new Error('Failed to fetch class analytics');
    }
  }

  /**
   * Get individual student progress
   */
  async getStudentProgress(studentId) {
    try {
      const response = await this.client.get(`/educator/students/${studentId}/progress`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student progress:', error);
      throw new Error('Failed to fetch student progress');
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(period = '30d', topic = null) {
    try {
      const queryParams = new URLSearchParams({ period });
      if (topic) queryParams.append('topic', topic);

      const response = await this.client.get(`/educator/analytics/trends?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      throw new Error('Failed to fetch performance trends');
    }
  }

  /**
   * Get Bloom's taxonomy distribution
   */
  async getBloomsTaxonomyDistribution(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.studentId) queryParams.append('studentId', params.studentId);
      if (params.topic) queryParams.append('topic', params.topic);

      const response = await this.client.get(`/educator/analytics/blooms-distribution?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Bloom\'s distribution:', error);
      throw new Error('Failed to fetch Bloom\'s taxonomy distribution');
    }
  }

  /**
   * Get question bank analytics
   */
  async getQuestionBankAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.topic) queryParams.append('topic', params.topic);
      if (params.bloomsLevel) queryParams.append('bloomsLevel', params.bloomsLevel);

      const response = await this.client.get(`/educator/analytics/question-bank?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching question bank analytics:', error);
      throw new Error('Failed to fetch question bank analytics');
    }
  }

  /**
   * Get intervention recommendations
   */
  async getInterventionRecommendations() {
    try {
      const response = await this.client.get('/educator/interventions/recommendations');
      return response.data;
    } catch (error) {
      console.error('Error fetching intervention recommendations:', error);
      throw new Error('Failed to fetch intervention recommendations');
    }
  }

  /**
   * Export assessment data
   */
  async exportAssessmentData(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.format) queryParams.append('format', params.format);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.topic) queryParams.append('topic', params.topic);

      const response = await this.client.get(`/educator/data/export?${queryParams}`, {
        responseType: params.format === 'csv' ? 'blob' : 'json'
      });

      if (params.format === 'csv') {
        // Handle CSV download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'assessment_data.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        return { success: true, message: 'CSV downloaded successfully' };
      }

      return response.data;
    } catch (error) {
      console.error('Error exporting assessment data:', error);
      throw new Error('Failed to export assessment data');
    }
  }

  /**
   * Get all students (for educator to select from)
   */
  async getAllStudents() {
    try {
      const response = await this.client.get('/users/students');
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw new Error('Failed to fetch students');
    }
  }

  /**
   * Get topics available in the system
   */
  async getAvailableTopics() {
    try {
      const response = await this.client.get('/educator/topics');
      return response.data;
    } catch (error) {
      console.error('Error fetching topics:', error);
      // Return default topics if endpoint doesn't exist
      return {
        success: true,
        data: {
          topics: [
            'Mathematics',
            'Computer Science',
            'Physics',
            'Chemistry',
            'Biology',
            'English',
            'History',
            'Geography'
          ]
        }
      };
    }
  }

  /**
   * Get real-time dashboard stats
   */
  async getDashboardStats() {
    try {
      const response = await this.client.get('/educator/dashboard-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get detailed analytics for a specific topic
   */
  async getTopicAnalytics(topic) {
    try {
      const response = await this.client.get(`/educator/topics/${encodeURIComponent(topic)}/analytics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching topic analytics:', error);
      throw new Error('Failed to fetch topic analytics');
    }
  }

  /**
   * Get comparative analytics between different groups
   */
  async getComparativeAnalytics(groupBy = 'topic', filters = {}) {
    try {
      const queryParams = new URLSearchParams({ groupBy, ...filters });
      const response = await this.client.get(`/educator/comparative?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comparative analytics:', error);
      throw new Error('Failed to fetch comparative analytics');
    }
  }
}

const educatorService = new EducatorService();
export default educatorService;

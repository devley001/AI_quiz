// ============================================
// FILE: src/services/userService.js
// ============================================
import api from './api';

const userService = {
  getAllUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/users${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response;
  },

  getStudentProfile: async () => {
    const response = await api.get('/students/profile');
    return response.data;
  },

  updateStudentProfile: async (studentData) => {
    const response = await api.post('/students/profile', studentData);
    return response.data;
  },

  getQuizResults: async () => {
    const response = await api.get('/quizzes/results');
    return response.data;
  },

  downloadProfile: async () => {
    const response = await api.get('/users/profile/download', {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default userService;

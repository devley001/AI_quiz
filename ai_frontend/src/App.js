// ============================================
// FILE: src/App.js
// ============================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/layout/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import AIAssistant from './pages/AIAssistant';
import EducatorDashboard from './pages/EducatorDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdaptiveQuiz from './pages/AdaptiveQuiz';
import TestEducatorDashboard from './pages/TestEducatorDashboard';
import NotFound from './pages/NotFound';

import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="posts" element={<Posts />} />
              <Route path="posts/:id" element={<PostDetail />} />

              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="create-post" element={<CreatePost />} />
                <Route path="ai-assistant" element={<AIAssistant />} />
                <Route path="educator-dashboard" element={<EducatorDashboard />} />
                <Route path="teacher-dashboard" element={<TeacherDashboard />} />
                <Route path="adaptive-quiz" element={<AdaptiveQuiz />} />
                <Route path="test-educator-dashboard" element={<TestEducatorDashboard />} />
              </Route>

              {/* 404 */}
              <Route path="404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;

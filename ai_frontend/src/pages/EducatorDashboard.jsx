import React, { useState, useEffect } from 'react';
import educatorService from '../services/educatorService';
import './EducatorDashboard.css';

const EducatorDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsRes, studentsRes, quizzesRes] = await Promise.all([
        educatorService.getClassAnalytics({
          startDate: getStartDate(selectedPeriod),
          endDate: new Date().toISOString()
        }),
        educatorService.getStudents(),
        educatorService.getQuizzes()
      ]);

      // Set analytics data
      if (analyticsRes?.data) {
        const data = analyticsRes.data;
        setAnalytics({
          totalStudents: data.totalStudents || 0,
          totalQuizzes: data.totalQuizzes || 0,
          totalSessions: data.totalSessions || 0,
          averageAccuracy: Math.round(data.performanceMetrics?.averageAccuracy || 0),
          topPerformers: data.topPerformers || [],
          strugglingStudents: data.strugglingStudents || []
        });
      }

      // Set students data
      if (studentsRes?.data) {
        setStudents(studentsRes.data.students || []);
      }

      // Set quizzes data
      if (quizzesRes?.data) {
        setQuizzes(quizzesRes.data.quizzes || []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Unable to load dashboard data');
      setLoading(false);
    }
  };

  const getStartDate = (period) => {
    const days = parseInt(period.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };



  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Unable to Load Dashboard</h3>
        <p>{error}</p>
        <button className="btn-retry" onClick={loadDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="educator-dashboard">
      <div className="dashboard-header">
        <h1>Educator Dashboard</h1>
        <div className="time-filter">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card students">
          <div className="metric-icon">👥</div>
          <div className="metric-value">{students?.length || 0}</div>
          <div className="metric-label">Registered Students</div>
        </div>
        <div className="metric-card quizzes">
          <div className="metric-icon">📝</div>
          <div className="metric-value">{quizzes?.length || 0}</div>
          <div className="metric-label">Total Quizzes</div>
        </div>
        <div className="metric-card sessions">
          <div className="metric-icon">🎯</div>
          <div className="metric-value">{analytics?.totalSessions || 0}</div>
          <div className="metric-label">Quiz Sessions</div>
        </div>
        <div className="metric-card accuracy">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{analytics?.averageAccuracy || 0}%</div>
          <div className="metric-label">Avg Performance</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-row">
          <div className="content-card">
            <div className="card-header">
              <h3>📈 Top Performers</h3>
              <span className="card-subtitle">Best performing students</span>
            </div>
            <div className="student-list">
              {analytics?.topPerformers?.length > 0 ? (
                analytics.topPerformers.slice(0, 5).map((student, index) => (
                  <div key={student.studentId} className="student-item top-performer">
                    <div className="rank">#{index + 1}</div>
                    <div className="student-info">
                      <div className="name">{student.studentName}</div>
                      <div className="stats">{student.quizzesTaken || 0} quizzes taken</div>
                    </div>
                    <div className="score">{student.averageAccuracy}%</div>
                  </div>
                ))
              ) : (
                <div className="no-data">No performance data available yet</div>
              )}
            </div>
          </div>

          <div className="content-card">
            <div className="card-header">
              <h3>🆘 Students Needing Support</h3>
              <span className="card-subtitle">Students with low performance</span>
            </div>
            <div className="student-list">
              {analytics?.strugglingStudents?.length > 0 ? (
                analytics.strugglingStudents.slice(0, 5).map((student, index) => (
                  <div key={student.studentId} className="student-item needs-support">
                    <div className="rank">#{index + 1}</div>
                    <div className="student-info">
                      <div className="name">{student.studentName}</div>
                      <div className="stats">{student.quizzesTaken || 0} quizzes taken</div>
                    </div>
                    <div className="score">{student.averageAccuracy}%</div>
                  </div>
                ))
              ) : (
                <div className="no-data">All students performing well! 🎉</div>
              )}
            </div>
          </div>
        </div>

        <div className="content-row">
          <div className="content-card full-width">
            <div className="card-header">
              <h3>👨‍🎓 All Students Overview</h3>
              <span className="card-subtitle">Complete student roster and activity</span>
            </div>
            <div className="students-grid">
              {students?.length > 0 ? (
                students.map((student, index) => (
                  <div key={student._id} className="student-card">
                    <div className="student-avatar">{student.name?.charAt(0)?.toUpperCase() || 'S'}</div>
                    <div className="student-details">
                      <div className="student-name">{student.name || 'Unknown Student'}</div>
                      <div className="student-email">{student.email}</div>
                      <div className="student-activity">
                        <span>Joined: {new Date(student.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data">No students registered yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <button className="refresh-btn" onClick={loadDashboardData} title="Refresh Data">
        🔄 Refresh
      </button>
    </div>
  );
};

export default EducatorDashboard;

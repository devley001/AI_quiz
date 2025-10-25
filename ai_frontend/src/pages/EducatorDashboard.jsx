import React, { useState, useEffect } from 'react';

// Temporarily comment out recharts to test if it's causing issues
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import educatorService from '../services/educatorService';
import './EducatorDashboard.css';

const EducatorDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [bloomsData, setBloomsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Debug logging
  console.log('EducatorDashboard rendered', { analytics, loading, error });

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, selectedTopic]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load real data from database
      const [analyticsResponse, questionBankResponse, trendsResponse, bloomsResponse] = await Promise.allSettled([
        educatorService.getClassAnalytics({
          startDate: getStartDate(selectedPeriod),
          endDate: new Date().toISOString(),
          topic: selectedTopic || undefined
        }),
        educatorService.getQuestionBankAnalytics({
          topic: selectedTopic || undefined
        }),
        educatorService.getPerformanceTrends(selectedPeriod, selectedTopic),
        educatorService.getBloomsTaxonomyDistribution({
          topic: selectedTopic || undefined
        })
      ]);

      // Process analytics data
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value?.data) {
        const data = analyticsResponse.value.data;
        setAnalytics({
          totalStudents: data.totalStudents || 0,
          totalSessions: data.totalSessions || 0,
          totalQuestions: data.totalQuestions || 0,
          approvedQuestions: data.approvedQuestions || 0,
          averageDifficulty: data.averageDifficulty || 0,
          averageDiscrimination: data.averageDiscrimination || 0,
          abilityDistribution: data.abilityDistribution || {},
          performanceMetrics: data.performanceMetrics || {
            averageAccuracy: 0,
            averageQuestionsAnswered: 0,
            completionRate: 0
          },
          difficultyDistribution: data.difficultyDistribution || { easy: 0, medium: 0, hard: 0 },
          topPerformers: data.topPerformers || [],
          strugglingStudents: data.strugglingStudents || []
        });
      } else {
        // Fallback to empty state if no data
        setAnalytics({
          totalStudents: 0,
          totalSessions: 0,
          totalQuestions: 0,
          approvedQuestions: 0,
          averageDifficulty: 0,
          averageDiscrimination: 0,
          abilityDistribution: {},
          performanceMetrics: { averageAccuracy: 0, averageQuestionsAnswered: 0, completionRate: 0 },
          difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
          topPerformers: [],
          strugglingStudents: []
        });
      }

      // Process question bank data
      if (questionBankResponse.status === 'fulfilled' && questionBankResponse.value?.data) {
        const qbData = questionBankResponse.value.data;
        setAnalytics(prev => ({
          ...prev,
          totalQuestions: qbData.totalQuestions || prev.totalQuestions,
          approvedQuestions: qbData.approvedQuestions || prev.approvedQuestions,
          averageDifficulty: qbData.averageDifficulty || prev.averageDifficulty,
          averageDiscrimination: qbData.averageDiscrimination || prev.averageDiscrimination,
          difficultyDistribution: qbData.difficultyDistribution || prev.difficultyDistribution
        }));
      }

      // Process trends data
      if (trendsResponse.status === 'fulfilled' && trendsResponse.value?.data?.trends) {
        setTrends(trendsResponse.value.data.trends);
      } else {
        setTrends([]);
      }

      // Process Bloom's data
      if (bloomsResponse.status === 'fulfilled' && bloomsResponse.value?.data) {
        setBloomsData(bloomsResponse.value.data);
      } else {
        setBloomsData({ distribution: {} });
      }

      setLoading(false);

    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError('Failed to load dashboard data. Please try again.');
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
      <div className="container text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="mt-3">Loading educator dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          <h4>Dashboard Loading Issues</h4>
          <p>{error}</p>
          <p>Showing available data with default values where needed.</p>
          <button className="btn btn-outline-warning" onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Fallback if analytics is still null
  if (!analytics) {
    return (
      <div className="container py-5">
        <div className="alert alert-info">
          <h4>Initializing Dashboard</h4>
          <p>Setting up your educator dashboard...</p>
          <button className="btn btn-outline-primary" onClick={loadDashboardData}>
            Load Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid educator-dashboard py-4">
      <div className="row mb-4">
        <div className="col">
          <h1 className="dashboard-title">Educator Dashboard</h1>
          <p className="dashboard-subtitle">Real-time analytics and insights for adaptive learning</p>
          {analytics?.totalSessions === 0 && (
            <div className="alert alert-info mb-3">
              <small>
                📊 No assessment data available yet. Data will appear as students complete adaptive assessments.
              </small>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-3">
          <select
            className="form-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <div className="col-md-3">
          <input
            type="text"
            className="form-control"
            placeholder="Filter by topic (optional)"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          />
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card metric-card">
            <div className="card-body">
              <div className="metric-icon">👥</div>
              <h3>{analytics?.totalStudents || 0}</h3>
              <p>Total Students</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card metric-card">
            <div className="card-body">
              <div className="metric-icon">📊</div>
              <h3>{analytics?.totalSessions || 0}</h3>
              <p>Adaptive Sessions</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card metric-card">
            <div className="card-body">
              <div className="metric-icon">✅</div>
              <h3>{analytics?.performanceMetrics?.averageAccuracy || 0}%</h3>
              <p>Average Accuracy</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card metric-card">
            <div className="card-body">
              <div className="metric-icon">📚</div>
              <h3>{analytics?.totalQuestions || 0}</h3>
              <p>Questions in Bank</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <div className="dashboard-tabs">
        <div className="tab-content">
          <div className="row mt-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Ability Distribution</h5>
                </div>
                <div className="card-body">
                  <div className="text-display">
                    {Object.keys(analytics?.abilityDistribution || {}).length > 0 ? (
                      Object.entries(analytics.abilityDistribution).map(([level, count]) => (
                        <div key={level} className="d-flex justify-content-between mb-2">
                          <span>{level.replace('_', ' ').toUpperCase()}:</span>
                          <strong>{count} students</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">No ability distribution data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Bloom's Taxonomy Distribution</h5>
                </div>
                <div className="card-body">
                  <div className="text-display">
                    {Object.keys(bloomsData?.distribution || {}).length > 0 ? (
                      Object.entries(bloomsData.distribution).map(([level, count]) => (
                        <div key={level} className="d-flex justify-content-between mb-2">
                          <span>{level.charAt(0).toUpperCase() + level.slice(1)}:</span>
                          <strong>{count} questions</strong>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">No Bloom's taxonomy data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col">
              <div className="card">
                <div className="card-header">
                  <h5>Performance Trends Over Time</h5>
                </div>
                <div className="card-body">
                  <div className="text-display">
                    {trends.length > 0 ? (
                      trends.map((trend, index) => (
                        <div key={index} className="mb-3 p-2 border-bottom">
                          <div><strong>Date:</strong> {new Date(trend.date).toLocaleDateString()}</div>
                          <div><strong>Sessions:</strong> {trend.sessionsCount}</div>
                          <div><strong>Avg Accuracy:</strong> {(parseFloat(trend.averageAccuracy) * 100).toFixed(1)}%</div>
                          <div><strong>Avg Ability:</strong> {parseFloat(trend.averageAbility).toFixed(2)}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted">No performance trends data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Top Performers</h5>
                </div>
                <div className="card-body">
                  {analytics?.topPerformers?.length > 0 ? (
                    <div className="student-list">
                      {analytics.topPerformers.slice(0, 5).map((student, index) => (
                        <div key={student.studentId} className="student-item top-performer">
                          <span className="rank">#{index + 1}</span>
                          <span className="name">{student.studentName}</span>
                          <span className="score">{student.averageAccuracy}% avg</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No top performers data available</p>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Students Needing Support</h5>
                </div>
                <div className="card-body">
                  {analytics?.strugglingStudents?.length > 0 ? (
                    <div className="student-list">
                      {analytics.strugglingStudents.slice(0, 5).map((student, index) => (
                        <div key={student.studentId} className="student-item needs-support">
                          <span className="rank">#{index + 1}</span>
                          <span className="name">{student.studentName}</span>
                          <span className="score">{student.averageAccuracy}% avg</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No students currently need support</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Question Difficulty Distribution</h5>
                </div>
                <div className="card-body">
                  <div className="text-display">
                    <div className="d-flex justify-content-between mb-2">
                      <span>Easy:</span>
                      <strong>{analytics?.difficultyDistribution?.easy || 0} questions</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Medium:</span>
                      <strong>{analytics?.difficultyDistribution?.medium || 0} questions</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Hard:</span>
                      <strong>{analytics?.difficultyDistribution?.hard || 0} questions</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h5>Question Bank Stats</h5>
                </div>
                <div className="card-body">
                  <div className="stats-grid">
                    <div className="stat-item">
                      <h4>{analytics?.totalQuestions || 0}</h4>
                      <p>Total Questions</p>
                    </div>
                    <div className="stat-item">
                      <h4>{analytics?.approvedQuestions || 0}</h4>
                      <p>Approved</p>
                    </div>
                    <div className="stat-item">
                      <h4>{analytics?.averageDifficulty || 0}</h4>
                      <p>Avg Difficulty</p>
                    </div>
                    <div className="stat-item">
                      <h4>{analytics?.averageDiscrimination || 0}</h4>
                      <p>Avg Discrimination</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboard;

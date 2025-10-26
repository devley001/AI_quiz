import React, { useState, useEffect } from 'react';
import teacherService from '../services/teacherService';
import educatorService from '../services/educatorService';
import './EducatorDashboard.css';

const TeacherDashboard = () => {
  const [data, setData] = useState({
    adaptiveSessions: [],
    aiRequests: [],
    bloomsData: [],
    irtParameters: [],
    posts: [],
    postViews: [],
    questionBanks: [],
    questions: [],
    quizResults: [],
    studentProfiles: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [overview, analytics, trends, blooms, questionBank, adaptiveSessions, quizResults] = await Promise.all([
        teacherService.getOverview(),
        educatorService.getClassAnalytics(),
        educatorService.getPerformanceTrends(),
        educatorService.getBloomsTaxonomyDistribution(),
        educatorService.getQuestionBankAnalytics(),
        teacherService.getAdaptiveSessions(),
        teacherService.getQuizResults()
      ]);

      setData({
        adaptiveSessions: adaptiveSessions?.data || [],
        quizResults: quizResults?.data || []
      });

      setStats({
        overview: overview?.data || {},
        analytics: analytics?.data || {},
        trends: trends?.data || {},
        blooms: blooms?.data || {},
        questionBank: questionBank?.data || {}
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="overview-section">
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Adaptive Sessions</h3>
          <div className="metric-value">{stats.overview?.adaptiveSessions || 0}</div>
          <div className="metric-detail">Active learning sessions</div>
        </div>
        <div className="metric-card">
          <h3>AI Requests</h3>
          <div className="metric-value">{stats.overview?.aiRequests || 0}</div>
          <div className="metric-detail">AI processing requests</div>
        </div>
        <div className="metric-card">
          <h3>Question Banks</h3>
          <div className="metric-value">{stats.overview?.questionBanks || 0}</div>
          <div className="metric-detail">Available questions</div>
        </div>
        <div className="metric-card">
          <h3>Quiz Results</h3>
          <div className="metric-value">{stats.overview?.quizResults || 0}</div>
          <div className="metric-detail">Completed assessments</div>
        </div>
      </div>

      <div className="content-row">
        <div className="content-card">
          <h3>📊 Performance Distribution</h3>
          <div className="ability-distribution">
            {Object.entries(stats.analytics?.abilityDistribution || {}).map(([level, count]) => (
              <div key={level} className="ability-level">
                <span className="level-name">{level.replace('_', ' ')}</span>
                <div className="level-bar">
                  <div className="level-fill" style={{width: `${(count / stats.analytics?.totalSessions || 1) * 100}%`}}></div>
                </div>
                <span className="level-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="content-card">
          <h3>🎯 Bloom's Taxonomy Distribution</h3>
          <div className="blooms-distribution">
            {Object.entries(stats.blooms?.distribution || {}).map(([level, count]) => (
              <div key={level} className="blooms-level">
                <span className="level-name">{level}</span>
                <div className="level-bar">
                  <div className="level-fill" style={{width: `${(count / Object.values(stats.blooms?.distribution || {}).reduce((a, b) => a + b, 1)) * 100}%`}}></div>
                </div>
                <span className="level-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdaptiveSessions = () => (
    <div className="data-section">
      <h3>Adaptive Sessions ({stats.analytics?.totalSessions || 0})</h3>
      <div className="data-table">
        <div className="table-header">
          <span>Session ID</span>
          <span>Student</span>
          <span>Topic</span>
          <span>Ability</span>
          <span>Accuracy</span>
          <span>Date</span>
        </div>
        {stats.analytics?.recentActivity?.map((session, index) => (
          <div key={index} className="table-row">
            <span>{session.sessionId}</span>
            <span>{session.studentName}</span>
            <span>{session.topic}</span>
            <span>{session.finalAbility}</span>
            <span>{session.accuracy}%</span>
            <span>{new Date(session.date).toLocaleDateString()}</span>
          </div>
        )) || <div className="no-data">No sessions available</div>}
      </div>
    </div>
  );

  const renderQuestionBanks = () => (
    <div className="data-section">
      <h3>Question Banks ({stats.questionBank?.totalQuestions || 0})</h3>
      <div className="question-stats">
        <div className="stat-item">
          <span>Total Questions:</span>
          <span>{stats.questionBank?.totalQuestions || 0}</span>
        </div>
        <div className="stat-item">
          <span>Approved:</span>
          <span>{stats.questionBank?.approvedQuestions || 0}</span>
        </div>
        <div className="stat-item">
          <span>Pending Review:</span>
          <span>{stats.questionBank?.pendingReview || 0}</span>
        </div>
        <div className="stat-item">
          <span>Needs Revision:</span>
          <span>{stats.questionBank?.needsRevision || 0}</span>
        </div>
      </div>
      
      <div className="difficulty-distribution">
        <h4>Difficulty Distribution</h4>
        {Object.entries(stats.questionBank?.difficultyDistribution || {}).map(([level, count]) => (
          <div key={level} className="difficulty-item">
            <span>{level}:</span>
            <span>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStudentProfiles = () => (
    <div className="data-section">
      <h3>Student Profiles</h3>
      <div className="students-overview">
        <div className="student-stats">
          <div className="stat-card">
            <h4>Top Performers</h4>
            {stats.analytics?.topPerformers?.map((student, index) => (
              <div key={index} className="student-item">
                <span>{student.studentName}</span>
                <span>{student.averageAccuracy}%</span>
              </div>
            )) || <div>No data available</div>}
          </div>
          
          <div className="stat-card">
            <h4>Students Needing Support</h4>
            {stats.analytics?.strugglingStudents?.map((student, index) => (
              <div key={index} className="student-item">
                <span>{student.studentName}</span>
                <span>{student.averageAccuracy}%</span>
              </div>
            )) || <div>All students performing well!</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTrends = () => (
    <div className="data-section">
      <h3>Performance Trends</h3>
      <div className="trends-data">
        {stats.trends?.trends?.map((trend, index) => (
          <div key={index} className="trend-item">
            <span className="trend-date">{new Date(trend.date).toLocaleDateString()}</span>
            <span className="trend-sessions">{trend.sessionsCount} sessions</span>
            <span className="trend-accuracy">{(parseFloat(trend.averageAccuracy) * 100).toFixed(1)}% avg accuracy</span>
            <span className="trend-ability">{trend.averageAbility} avg ability</span>
          </div>
        )) || <div className="no-data">No trend data available</div>}
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div className="data-section">
      <h3>AI Assistant for Teachers</h3>
      <div className="ai-tools">
        <div className="ai-tool-card">
          <h4>📊 Generate Student Reports</h4>
          <p>Create comprehensive reports for individual students or entire classes</p>
          <button className="btn btn-primary" onClick={() => window.open('/ai-assistant', '_blank')}>
            Open AI Assistant
          </button>
        </div>
        
        <div className="ai-tool-card">
          <h4>📝 Create Quiz Questions</h4>
          <p>Generate quiz questions based on curriculum topics</p>
          <button className="btn btn-primary" onClick={() => window.open('/ai-assistant?tab=quiz-generation', '_blank')}>
            Generate Quiz
          </button>
        </div>
        
        <div className="ai-tool-card">
          <h4>🔍 Analyze Student Performance</h4>
          <p>Get AI insights on student learning patterns and recommendations</p>
          <button className="btn btn-primary" onClick={() => analyzeClassPerformance()}>
            Analyze Performance
          </button>
        </div>
        
        <div className="ai-tool-card">
          <h4>📚 Generate Learning Materials</h4>
          <p>Create educational content and explanations for difficult topics</p>
          <button className="btn btn-primary" onClick={() => window.open('/ai-assistant?tab=text-generation', '_blank')}>
            Generate Content
          </button>
        </div>
      </div>
      
      {stats.analytics?.strugglingStudents?.length > 0 && (
        <div className="ai-recommendations">
          <h4>🤖 AI Recommendations</h4>
          <div className="recommendation-list">
            <div className="recommendation-item">
              <strong>Intervention Needed:</strong> {stats.analytics.strugglingStudents.length} students need additional support
            </div>
            <div className="recommendation-item">
              <strong>Suggested Action:</strong> Create targeted practice quizzes for struggling topics
            </div>
            <div className="recommendation-item">
              <strong>Focus Areas:</strong> Review Bloom's taxonomy levels with low performance
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const analyzeClassPerformance = () => {
    const analysis = {
      totalStudents: stats.overview?.students || 0,
      avgPerformance: stats.analytics?.performanceMetrics?.averageAccuracy || 0,
      strugglingCount: stats.analytics?.strugglingStudents?.length || 0,
      topPerformersCount: stats.analytics?.topPerformers?.length || 0
    };
    
    alert(`Class Performance Analysis:\n\nTotal Students: ${analysis.totalStudents}\nAverage Performance: ${analysis.avgPerformance}%\nStudents Needing Support: ${analysis.strugglingCount}\nTop Performers: ${analysis.topPerformersCount}\n\nRecommendation: ${analysis.strugglingCount > 0 ? 'Focus on supporting struggling students' : 'Class is performing well overall'}`);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Teacher Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="educator-dashboard">
      <div className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <button onClick={loadAllData} className="refresh-btn">🔄 Refresh</button>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'overview' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'sessions' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('sessions')}
        >
          Adaptive Sessions
        </button>
        <button 
          className={activeTab === 'questions' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('questions')}
        >
          Question Banks
        </button>
        <button 
          className={activeTab === 'students' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('students')}
        >
          Student Profiles
        </button>
        <button 
          className={activeTab === 'trends' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('trends')}
        >
          Performance Trends
        </button>
        <button 
          className={activeTab === 'ai-assistant' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('ai-assistant')}
        >
          AI Assistant
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'sessions' && renderAdaptiveSessions()}
        {activeTab === 'questions' && renderQuestionBanks()}
        {activeTab === 'students' && renderStudentProfiles()}
        {activeTab === 'trends' && renderPerformanceTrends()}
        {activeTab === 'ai-assistant' && renderAIAssistant()}
      </div>
    </div>
  );
};

export default TeacherDashboard;
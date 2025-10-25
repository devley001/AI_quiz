import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
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

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, selectedTopic]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load class analytics
      const analyticsResponse = await educatorService.getClassAnalytics({
        startDate: getStartDate(selectedPeriod),
        endDate: new Date().toISOString(),
        topic: selectedTopic || undefined
      });
      setAnalytics(analyticsResponse.data);

      // Load question bank analytics
      const questionBankResponse = await educatorService.getQuestionBankAnalytics({
        topic: selectedTopic || undefined
      });
      // Merge question bank data into analytics
      setAnalytics(prev => ({
        ...prev,
        totalQuestions: questionBankResponse.data.totalQuestions || 0,
        approvedQuestions: questionBankResponse.data.approvedQuestions || 0,
        averageDifficulty: questionBankResponse.data.averageDifficulty || 0,
        averageDiscrimination: questionBankResponse.data.averageDiscrimination || 0,
        difficultyDistribution: questionBankResponse.data.difficultyDistribution || {}
      }));

      // Load performance trends
      const trendsResponse = await educatorService.getPerformanceTrends(selectedPeriod, selectedTopic);
      setTrends(trendsResponse.data.trends);

      // Load Bloom's taxonomy distribution
      const bloomsResponse = await educatorService.getBloomsTaxonomyDistribution({
        topic: selectedTopic || undefined
      });
      setBloomsData(bloomsResponse.data);

    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Dashboard data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (period) => {
    const days = parseInt(period.replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </Spinner>
        <p className="mt-3">Loading educator dashboard...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={loadDashboardData}>
            Retry
          </button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="educator-dashboard py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="dashboard-title">Educator Dashboard</h1>
          <p className="dashboard-subtitle">Real-time analytics and insights for adaptive learning</p>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={3}>
          <select
            className="form-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </Col>
        <Col md={3}>
          <input
            type="text"
            className="form-control"
            placeholder="Filter by topic (optional)"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          />
        </Col>
      </Row>

      {/* Key Metrics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">👥</div>
              <h3>{analytics?.totalStudents || 0}</h3>
              <p>Total Students</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">📊</div>
              <h3>{analytics?.totalSessions || 0}</h3>
              <p>Adaptive Sessions</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">✅</div>
              <h3>{analytics?.performanceMetrics?.averageAccuracy || 0}%</h3>
              <p>Average Accuracy</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="metric-card">
            <Card.Body>
              <div className="metric-icon">📚</div>
              <h3>{analytics?.totalQuestions || 0}</h3>
              <p>Questions in Bank</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Dashboard Tabs */}
      <Tabs defaultActiveKey="overview" className="dashboard-tabs">
        <Tab eventKey="overview" title="Overview">
          <Row className="mt-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Ability Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(analytics?.abilityDistribution || {}).map(([level, count]) => ({
                      level: level.replace('_', ' ').toUpperCase(),
                      count
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Bloom's Taxonomy Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={Object.entries(bloomsData?.distribution || {}).map(([level, count], index) => ({
                          name: level.charAt(0).toUpperCase() + level.slice(1),
                          value: count,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(bloomsData?.distribution || {}).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="trends" title="Performance Trends">
          <Row className="mt-4">
            <Col>
              <Card>
                <Card.Header>
                  <h5>Performance Trends Over Time</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="sessionsCount" fill="#8884d8" name="Sessions" />
                      <Line yAxisId="right" type="monotone" dataKey="averageAccuracy" stroke="#82ca9d" name="Avg Accuracy" />
                      <Line yAxisId="right" type="monotone" dataKey="averageAbility" stroke="#ffc658" name="Avg Ability" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="students" title="Student Insights">
          <Row className="mt-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Top Performers</h5>
                </Card.Header>
                <Card.Body>
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
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Students Needing Support</h5>
                </Card.Header>
                <Card.Body>
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
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="questions" title="Question Bank">
          <Row className="mt-4">
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Question Difficulty Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Easy', count: analytics?.difficultyDistribution?.easy || 0 },
                      { name: 'Medium', count: analytics?.difficultyDistribution?.medium || 0 },
                      { name: 'Hard', count: analytics?.difficultyDistribution?.hard || 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Question Bank Stats</h5>
                </Card.Header>
                <Card.Body>
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
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default EducatorDashboard;

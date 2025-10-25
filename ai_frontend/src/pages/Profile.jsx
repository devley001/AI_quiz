import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatters } from '../utils/formatters';
import userService from '../services/userService';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [quizResults, setQuizResults] = useState([]);
  const [averages, setAverages] = useState({ overall: 0, byTopic: {} });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [studentFormData, setStudentFormData] = useState({
    grade: '',
    subjects: [],
    school: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchStudentProfile();
    fetchQuizResults();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await userService.getUserById(user._id);
      setUserData(response);
      setFormData({
        username: response.username || '',
        email: response.email || '',
        password: ''
      });
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const response = await userService.getStudentProfile();
      setStudentFormData({
        grade: response.data?.grade || '',
        subjects: response.data?.subjects || [],
        school: response.data?.school || '',
        bio: response.data?.bio || ''
      });
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    }
  };

  const fetchQuizResults = async () => {
    try {
      const response = await userService.getQuizResults();
      setQuizResults(response.data.quizResults || []);
      setAverages(response.data.averages || { overall: 0, byTopic: {} });
    } catch (error) {
      console.error('Failed to fetch quiz results:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    if (name === 'subjects') {
      setStudentFormData({
        ...studentFormData,
        subjects: value.split(',').map(s => s.trim()).filter(s => s)
      });
    } else {
      setStudentFormData({
        ...studentFormData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await userService.updateProfile(formData);
      updateUser({ ...user, ...formData });
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await userService.updateStudentProfile(studentFormData);
      await fetchStudentProfile();
      setMessage('Student profile updated successfully!');
    } catch (error) {
      setMessage('Failed to update student profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await userService.downloadProfile();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-profile-${userData?.username || user.username}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setMessage('Failed to download profile');
    }
  };



  if (loading) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>Your Profile</h1>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            Student Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'quizzes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            Quiz Results
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-card">
            {/* Avatar Section */}
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {userData?.avatar ? (
                  <img src={userData.avatar} alt="Profile Avatar" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    {userData?.username?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <h2>{userData?.username || user?.username || 'User'}</h2>
            </div>

            {/* Personal Information Section */}
            <div className="profile-section">
              <h3>Personal Information</h3>
              <form onSubmit={handleSubmit}>
                <div className="profile-fields-grid">
                  <div className="field-group">
                    <label>Username</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="field-group">
                    <label>Password</label>
                    <div className="password-input-group">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-control"
                        placeholder="Enter new password (leave empty to keep current)"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="field-group">
                    <label>Role</label>
                    <div className="field-value read-only">{userData?.role || 'User'}</div>
                  </div>

                  <div className="field-group">
                    <label>Status</label>
                    <div className={`field-value read-only status-${userData?.isActive ? 'active' : 'inactive'}`}>
                      {userData?.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                {/* Update Button */}
                <div className="profile-actions">
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                  <button type="button" onClick={handleDownload} className="btn btn-secondary">
                    Download Profile Report
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Profile Tab */}
        {activeTab === 'student' && (
          <div className="profile-card">
            <h3>Student Profile</h3>
            <form onSubmit={handleStudentSubmit}>
              <div className="profile-fields-grid">
                <div className="field-group">
                  <label>Grade</label>
                  <input
                    type="text"
                    name="grade"
                    value={studentFormData.grade}
                    onChange={handleStudentChange}
                    className="form-control"
                    placeholder="e.g., 10th Grade"
                  />
                </div>

                <div className="field-group">
                  <label>School</label>
                  <input
                    type="text"
                    name="school"
                    value={studentFormData.school}
                    onChange={handleStudentChange}
                    className="form-control"
                    placeholder="School name"
                  />
                </div>

                <div className="field-group">
                  <label>Subjects</label>
                  <input
                    type="text"
                    name="subjects"
                    value={studentFormData.subjects.join(', ')}
                    onChange={handleStudentChange}
                    className="form-control"
                    placeholder="Math, Science, English (comma separated)"
                  />
                </div>

                <div className="field-group full-width">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={studentFormData.bio}
                    onChange={handleStudentChange}
                    className="form-control"
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>

              <div className="profile-actions">
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Updating...' : 'Update Student Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quiz Results Tab */}
        {activeTab === 'quizzes' && (
          <div className="profile-card">
            <h3>Quiz Results</h3>

            {/* Overall Statistics */}
            <div className="quiz-stats">
              <div className="stat-card">
                <h4>Overall Average</h4>
                <div className="stat-value">{averages.overall}%</div>
              </div>
              <div className="stat-card">
                <h4>Total Quizzes</h4>
                <div className="stat-value">{quizResults.length}</div>
              </div>
            </div>

            {/* Averages by Topic */}
            {Object.keys(averages.byTopic).length > 0 && (
              <div className="profile-section">
                <h4>Average Scores by Topic</h4>
                <div className="topic-averages">
                  {Object.entries(averages.byTopic).map(([topic, avg]) => (
                    <div key={topic} className="topic-avg">
                      <span className="topic-name">{topic}</span>
                      <span className="topic-score">{avg.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Results List */}
            <div className="profile-section">
              <h4>Recent Quiz Results</h4>
              {quizResults.length > 0 ? (
                <div className="quiz-results-list">
                  {quizResults.map((result, index) => (
                    <div key={index} className="quiz-result-item">
                      <div className="quiz-info">
                        <h5>{result.topic}</h5>
                        <span className="quiz-date">{formatters.date(result.date)}</span>
                      </div>
                      <div className="quiz-scores">
                        <span className="score">{result.score}/{result.totalQuestions}</span>
                        <span className="percentage">{result.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No quiz results available.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

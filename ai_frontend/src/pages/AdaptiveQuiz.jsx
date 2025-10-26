import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import authService from '../services/authService';
import './AdaptiveQuiz.css';

const AdaptiveQuiz = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState({
    questionsAnswered: 0,
    accuracy: 0,
    currentAbility: 0,
    bloomsLevel: 'remember'
  });
  const [authError, setAuthError] = useState(false);

  const [selectedTopic, setSelectedTopic] = useState('');
  const [availableTopics] = useState([
    'Computer Science',
    'Data Structures',
    'Algorithms',
    'Programming',
    'Mathematics',
    'Science',
    'History',
    'Literature'
  ]);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const startQuiz = async () => {
    if (!selectedTopic) {
      alert('Please select a topic first');
      return;
    }

    if (!authService.isAuthenticated()) {
      setAuthError(true);
      return;
    }
    
    setLoading(true);
    setAuthError(false);
    try {
      const response = await api.post('/adaptive-quiz/generate', {
        topic: selectedTopic
      });
      const { sessionId, questions } = response.data;
      
      setSessionId(sessionId);
      setQuestions(questions);
      setCurrentQuestion(questions[0]);
      setAnswers(new Array(20).fill(null));
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error starting quiz:', error);
      if (error.message && error.message.includes('Authentication required')) {
        setAuthError(true);
      } else {
        alert('Error starting quiz. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = selectedAnswer;
    setAnswers(newAnswers);
    
    if (currentQuestionIndex < 19) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentQuestion(questions[currentQuestionIndex + 1]);
      setSelectedAnswer(null);
      setProgress(prev => ({
        ...prev,
        questionsAnswered: currentQuestionIndex + 1
      }));
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    setLoading(true);
    try {
      const response = await api.post('/adaptive-quiz/submit', {
        sessionId,
        answers: finalAnswers
      });
      
      const data = response.data;
      setSessionComplete(true);
      setResults({
        accuracy: data.accuracy / 100,
        questionsAnswered: data.totalQuestions,
        correctAnswers: data.correctAnswers
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  if (sessionComplete) {
    return (
      <div className="adaptive-quiz-container">
        <div className="quiz-complete">
          <h2>🎉 Quiz Complete!</h2>
          <div className="results-grid">
            <div className="result-card">
              <h3>Final Results</h3>
              <p><strong>Accuracy:</strong> {(results.accuracy * 100).toFixed(1)}%</p>
              <p><strong>Questions Answered:</strong> {results.questionsAnswered}</p>
              <p><strong>Final Ability Level:</strong> {results.finalAbility.toFixed(2)}</p>
              <p><strong>Bloom's Level Reached:</strong> {results.bloomsLevel}</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="btn-restart">
            Take Another Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="adaptive-quiz-container">
        <div className="quiz-intro">
          <h1>🧠 Adaptive Learning Quiz</h1>
          <p>This quiz adapts to your performance using:</p>
          <ul>
            <li><strong>Item Response Theory (IRT)</strong> - Adjusts difficulty dynamically</li>
            <li><strong>Bloom's Taxonomy</strong> - Progresses through cognitive levels</li>
          </ul>
          
          {authError && (
            <div className="auth-error" style={{background: '#fee', border: '1px solid #fcc', padding: '10px', margin: '10px 0', borderRadius: '5px'}}>
              <p style={{color: '#c00', margin: 0}}>⚠️ You need to be logged in to take the quiz.</p>
              <button 
                onClick={() => navigate('/login')} 
                style={{marginTop: '10px', padding: '5px 15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
              >
                Go to Login
              </button>
            </div>
          )}
          
          <div className="topic-selection">
            <label htmlFor="topic-select">Choose a topic:</label>
            <select 
              id="topic-select"
              value={selectedTopic} 
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="topic-select"
            >
              <option value="">Select a topic...</option>
              {availableTopics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          
          <button onClick={startQuiz} className="btn-start" disabled={loading || !selectedTopic}>
            {loading ? 'Starting...' : 'Start Adaptive Quiz'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="adaptive-quiz-container">
      <div className="quiz-header">
        <div className="progress-info">
          <div className="progress-item">
            <span>Question: {currentQuestionIndex + 1}/20</span>
          </div>
          <div className="progress-item">
            <span>Accuracy: {(progress.accuracy * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-item">
            <span>Ability: {progress.currentAbility.toFixed(2)}</span>
          </div>
          <div className="progress-item">
            <span>Level: {progress.bloomsLevel}</span>
          </div>
        </div>
      </div>

      {currentQuestion && (
        <div className="question-container">
          <div className="question-header">
            <span className="bloom-level">📚 {currentQuestion.bloomsTaxonomy?.cognitiveLevel || progress.bloomsLevel}</span>
            <span className="difficulty">⚡ Difficulty: {currentQuestion.irtParameters?.difficulty?.toFixed(2) || 'N/A'}</span>
          </div>
          
          <h3 className="question-text">{currentQuestion.questionText}</h3>
          
          <div className="options-container">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${selectedAnswer === index ? 'selected' : ''}`}
                onClick={() => setSelectedAnswer(index)}
                disabled={loading}
              >
                {String.fromCharCode(65 + index)}) {option}
              </button>
            ))}
          </div>
          
          <button
            onClick={nextQuestion}
            disabled={selectedAnswer === null || loading}
            className="btn-submit"
          >
            {loading ? 'Processing...' : currentQuestionIndex === 19 ? 'Finish Quiz' : 'Next Question'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdaptiveQuiz;
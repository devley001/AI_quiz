// ============================================
// FILE: src/pages/AIAssistant.jsx
// ============================================
import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import authService from '../services/authService';
import LoginPrompt from '../components/common/LoginPrompt';
import Quiz from '../components/common/Quiz';
import './AIAssistant.css';

const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('text-analysis');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Text Analysis State
  const [textInput, setTextInput] = useState('');

  // Quiz Generation State
  const [quizTopic, setQuizTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  // Text Generation State
  const [prompt, setPrompt] = useState('');
  const [maxLength, setMaxLength] = useState(100);
  const [temperature, setTemperature] = useState(0.7);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  if (!isAuthenticated) {
    return <LoginPrompt message="Please login to access AI features" />;
  }

  const handleTextAnalysis = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiService.analyzeText(textInput);
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Text analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSentimentAnalysis = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiService.analyzeSentiment(textInput);
      setResult(response.data);
    } catch (err) {
      setError(err.message || 'Sentiment analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizGeneration = async () => {
    if (!quizTopic.trim()) {
      setError('Please enter a topic for the quiz');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiService.generateQuiz(quizTopic, {
        numQuestions,
        difficulty
      });
      // Extract the actual result from the nested response structure
      const resultData = response.data?.result || response.result || response.data || response;
      setResult(resultData);
    } catch (err) {
      setError(err.message || 'Quiz generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTextGeneration = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for text generation');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiService.generateText(prompt, {
        maxLength,
        temperature
      });
      const resultData = response.data?.result || response.result || response.data || response;
      setResult(resultData);
    } catch (err) {
      setError(err.message || 'Text generation failed');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'text-analysis':
        return (
          <div className="tab-content">
            <h3>Text Analysis</h3>
            <div className="input-group">
              <label>Enter text to analyze:</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter your text here..."
                rows={6}
                className="text-input"
              />
            </div>
            <div className="button-group">
              <button 
                onClick={handleTextAnalysis}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Analyzing...' : 'Analyze Text'}
              </button>
              <button 
                onClick={handleSentimentAnalysis}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>
            </div>
          </div>
        );

      case 'quiz-generation':
        return (
          <div className="tab-content">
            <h3>Quiz Generation</h3>
            <div className="input-group">
              <label>Topic:</label>
              <input
                type="text"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                placeholder="Enter a topic (e.g., Science, History, Mathematics)"
                className="text-input"
                list="topic-suggestions"
              />
              <datalist id="topic-suggestions">
                <option value="Science" />
                <option value="History" />
                <option value="Mathematics" />
                <option value="Geography" />
                <option value="Literature" />
                <option value="Technology" />
                <option value="Sports" />
                <option value="Art" />
                <option value="Music" />
                <option value="General Knowledge" />
              </datalist>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Number of Questions:</label>
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="select-input"
                >
                  {[1, 2, 3, 4, 5, 10, 15, 20].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Difficulty:</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="select-input"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleQuizGeneration}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </div>
        );

      case 'text-generation':
        return (
          <div className="tab-content">
            <h3>Text Generation</h3>
            <div className="input-group">
              <label>Prompt:</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                rows={4}
                className="text-input"
              />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Max Length:</label>
                <input
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value))}
                  min="10"
                  max="500"
                  className="number-input"
                />
              </div>
              <div className="input-group">
                <label>Temperature:</label>
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  className="number-input"
                />
              </div>
            </div>
            <button 
              onClick={handleTextGeneration}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Generating...' : 'Generate Text'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    // Handle quiz generation results
    if (activeTab === 'quiz-generation' && (result.quiz || result.questions)) {
      const quizData = result.quiz || { questions: result.questions };
      const questions = quizData.questions || result.questions;
      
      const downloadQuiz = () => {
        const content = `${quizTopic} Quiz\n\nTopic: ${quizTopic}\nQuestions: ${questions.length}\nDifficulty: ${difficulty}\n\n` +
          questions.map((q, i) => 
            `Question ${i + 1}: ${q.question}\n` +
            q.options.map((opt, j) => `${String.fromCharCode(65 + j)}) ${opt}`).join('\n') +
            '\n\n'
          ).join('');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizTopic.replace(/\s+/g, '_')}_Quiz.txt`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      return (
        <div className="result-section">
          <div className="quiz-header-actions">
            <h4>Generated Quiz: {quizTopic}</h4>
            <button onClick={downloadQuiz} className="btn btn-secondary">
              Download Quiz
            </button>
          </div>
          <Quiz 
            quizData={quizData} 
            onSubmit={(quizResults) => {
              console.log('Quiz completed:', quizResults);
            }}
          />
        </div>
      );
    }

    // Handle text generation results
    if (activeTab === 'text-generation' && result.generated_text) {
      return (
        <div className="result-section">
          <h4>Generated Text:</h4>
          <div className="text-result">
            <div className="generated-content">
              {result.generated_text}
            </div>
            <div className="text-stats">
              <span>Length: {result.generated_text.length} characters</span>
              <span>Words: {result.generated_text.split(' ').length}</span>
            </div>
          </div>
        </div>
      );
    }

    // Handle text analysis results
    if (activeTab === 'text-analysis' && (result.sentiment || result.entities || result.keywords)) {
      return (
        <div className="result-section">
          <h4>Analysis Results:</h4>
          <div className="analysis-results">
            {result.sentiment && (
              <div className="analysis-card">
                <h5>Sentiment Analysis</h5>
                <div className="sentiment-result">
                  <span className={`sentiment-label ${result.sentiment.label?.toLowerCase()}`}>
                    {result.sentiment.label}
                  </span>
                  <span className="confidence">
                    Confidence: {(result.sentiment.score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
            
            {result.entities && result.entities.length > 0 && (
              <div className="analysis-card">
                <h5>Named Entities</h5>
                <div className="entities-list">
                  {result.entities.map((entity, index) => (
                    <span key={index} className="entity-tag">
                      {entity.text} ({entity.label})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {result.keywords && result.keywords.length > 0 && (
              <div className="analysis-card">
                <h5>Keywords</h5>
                <div className="keywords-list">
                  {result.keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback - hide technical details
    return (
      <div className="result-section">
        <h4>Result:</h4>
        <div className="simple-result">
          <p>Processing completed successfully.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="ai-assistant-page">
      <div className="container">
        <h1>AI Assistant</h1>
        
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'text-analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('text-analysis')}
          >
            Text Analysis
          </button>
          <button
            className={`tab ${activeTab === 'quiz-generation' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz-generation')}
          >
            Quiz Generation
          </button>
          <button
            className={`tab ${activeTab === 'text-generation' ? 'active' : ''}`}
            onClick={() => setActiveTab('text-generation')}
          >
            Text Generation
          </button>
        </div>

        <div className="content">
          {renderTabContent()}
          
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
          
          {renderResult()}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
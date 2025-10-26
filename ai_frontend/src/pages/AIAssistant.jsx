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
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    };
    
    checkAuth();
    // Check auth status periodically in case it changes
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [activeTab]);

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
      console.log('Analysis response:', response); // Debug log
      setResult(response.data?.result || response.data);
    } catch (err) {
      console.error('Analysis error:', err); // Debug log
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
                  <option value="beginner">Beginner</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
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
                <label>Max Words:</label>
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
        const htmlContent = `
          <html>
            <head>
              <meta charset="utf-8">
              <title>${quizTopic} Quiz</title>
              <style>
                body { font-family: 'Times New Roman', serif; margin: 1in; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .question { margin-bottom: 25px; page-break-inside: avoid; }
                .question-number { font-weight: bold; margin-bottom: 8px; }
                .options { margin-left: 20px; }
                .option { margin-bottom: 5px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${quizTopic} Quiz</h1>
                <p><strong>Difficulty:</strong> ${difficulty.toUpperCase()} Level</p>
                <p><strong>Questions:</strong> ${questions.length}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              ${questions.map((q, i) => `
                <div class="question">
                  <div class="question-number">Question ${i + 1}:</div>
                  <p>${q.question}</p>
                  <div class="options">
                    ${q.options.map((opt, j) => `<div class="option">${String.fromCharCode(65 + j)}) ${opt}</div>`).join('')}
                  </div>
                </div>
              `).join('')}
            </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizTopic.replace(/\s+/g, '_')}_${difficulty}_Quiz.doc`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      const downloadAnswerKey = () => {
        const htmlContent = `
          <html>
            <head>
              <meta charset="utf-8">
              <title>${quizTopic} Quiz - Answer Key</title>
              <style>
                body { font-family: 'Times New Roman', serif; margin: 1in; line-height: 1.6; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .answer { margin-bottom: 10px; padding: 5px; background-color: #f0f0f0; }
                .correct { color: #006600; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${quizTopic} Quiz - Answer Key</h1>
                <p><strong>Difficulty:</strong> ${difficulty.toUpperCase()} Level</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              ${questions.map((q, i) => {
                const correctIndex = q.correctAnswer;
                const correctLetter = String.fromCharCode(65 + correctIndex);
                return `<div class="answer"><span class="correct">${i + 1}. ${correctLetter}) ${q.options[correctIndex]}</span></div>`;
              }).join('')}
            </body>
          </html>
        `;
        
        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${quizTopic.replace(/\s+/g, '_')}_${difficulty}_AnswerKey.doc`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      return (
        <div className="result-section">
          <div className="quiz-header-actions">
            <h4>Generated Quiz: {quizTopic} ({difficulty.toUpperCase()})</h4>
            <div className="download-buttons">
              <button onClick={downloadQuiz} className="btn btn-secondary">
                📄 Download Quiz
              </button>
              <button onClick={downloadAnswerKey} className="btn btn-outline">
                🔑 Download Answer Key
              </button>
            </div>
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
    if (activeTab === 'text-analysis' && result) {
      console.log('Rendering result:', result); // Debug log
      return (
        <div className="result-section">
          <h4>Text Analysis Results:</h4>
          <div className="analysis-results">
            {result.text_summary && (
              <div className="analysis-card">
                <h5>📝 Text Summary</h5>
                <p>{result.text_summary}</p>
              </div>
            )}
            
            {result.main_concepts && result.main_concepts.length > 0 && (
              <div className="analysis-card">
                <h5>🎯 Main Concepts</h5>
                <div className="concepts-list">
                  {result.main_concepts.map((concept, index) => (
                    <div key={index} className="concept-item">
                      <strong>{concept.concept}</strong> (appears {concept.frequency} times)
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result.concept_meanings && result.concept_meanings.length > 0 && (
              <div className="analysis-card">
                <h5>💡 Concept Meanings</h5>
                <div className="meanings-list">
                  {result.concept_meanings.map((meaning, index) => (
                    <div key={index} className="meaning-item">
                      <h6>{meaning.concept}</h6>
                      <p><strong>Meaning:</strong> {meaning.meaning}</p>
                      <p><strong>Importance:</strong> {meaning.importance}</p>
                      {meaning.context_usage && meaning.context_usage.length > 0 && (
                        <div>
                          <strong>Usage Examples:</strong>
                          <ul>
                            {meaning.context_usage.map((usage, i) => (
                              <li key={i}>{usage}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {result.sentiment && (
              <div className="analysis-card">
                <h5>😊 Sentiment Analysis</h5>
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
            
            {result.keywords && result.keywords.length > 0 && (
              <div className="analysis-card">
                <h5>🔑 Keywords</h5>
                <div className="keywords-list">
                  {result.keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {result.entities && result.entities.length > 0 && (
              <div className="analysis-card">
                <h5>🏷️ Entities</h5>
                <div className="entities-list">
                  {result.entities.map((entity, index) => (
                    <span key={index} className="entity-tag">
                      {entity.text} ({entity.label})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="analysis-card">
              <h5>📊 Text Statistics</h5>
              <div className="stats-grid">
                <div className="stat-item">
                  <strong>Word Count:</strong> {result.word_count || textInput.split(' ').length || 0}
                </div>
                <div className="stat-item">
                  <strong>Character Count:</strong> {result.character_count || textInput.length || 0}
                </div>
              </div>
            </div>
            
            {/* Debug info - remove in production */}
            {(!result.main_concepts || result.main_concepts.length === 0) && (
              <div className="analysis-card" style={{backgroundColor: '#fff3cd', border: '1px solid #ffeaa7'}}>
                <h5>🔧 Debug Info</h5>
                <p>Input text: "{textInput}"</p>
                <p>Result keys: {Object.keys(result).join(', ')}</p>
                <pre style={{fontSize: '12px', maxHeight: '200px', overflow: 'auto'}}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback for other results
    if (result) {
      return (
        <div className="result-section">
          <h4>Analysis Complete:</h4>
          <div className="simple-result">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      );
    }
    
    return null;
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
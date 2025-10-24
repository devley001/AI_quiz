import React, { useState } from 'react';
import './Quiz.css';

const Quiz = ({ quizData, onSubmit }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmit = () => {
    let correctAnswers = 0;
    const results = {};

    quizData.questions.forEach((question, qIndex) => {
      const userAnswer = answers[qIndex];
      const correctAnswer = question.correctAnswer || question.correct_answer;
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctAnswers++;
      
      results[qIndex] = {
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        options: question.options || question.choices
      };
    });

    setScore(correctAnswers);
    setSubmitted(true);
    
    if (onSubmit) {
      onSubmit({
        score: correctAnswers,
        total: quizData.questions.length,
        percentage: Math.round((correctAnswers / quizData.questions.length) * 100),
        results
      });
    }
  };

  const resetQuiz = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <div className="quiz-container">
        <div className="quiz-error">
          <h3>No quiz data available</h3>
          <p>Please generate a quiz first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{quizData.title || `Quiz: ${quizData.topic || 'General Knowledge'}`}</h2>
        {quizData.description && <p className="quiz-description">{quizData.description}</p>}
        <div className="quiz-info">
          <span className="question-count">{quizData.questions.length} Questions</span>
          {quizData.difficulty && <span className="difficulty">{quizData.difficulty}</span>}
        </div>
      </div>

      {submitted ? (
        <div className="quiz-results">
          <div className="score-summary">
            <h3>Quiz Complete!</h3>
            <div className="score-display">
              <span className="score">{score}/{quizData.questions.length}</span>
              <span className="percentage">({Math.round((score / quizData.questions.length) * 100)}%)</span>
            </div>
          </div>

          <div className="results-breakdown">
            <h4>Review Your Answers:</h4>
            {quizData.questions.map((question, qIndex) => {
              const userAnswer = answers[qIndex];
              const correctAnswer = question.correctAnswer || question.correct_answer;
              const isCorrect = userAnswer === correctAnswer;
              const options = question.options || question.choices || [];

              return (
                <div key={qIndex} className={`result-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-text">
                    <strong>Q{qIndex + 1}:</strong> {question.question}
                  </div>
                  <div className="answer-review">
                    <div className="user-answer">
                      <span className="label">Your answer:</span>
                      <span className={`answer ${isCorrect ? 'correct' : 'incorrect'}`}>
                        {userAnswer !== undefined ? options[userAnswer] : 'Not answered'}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div className="correct-answer">
                        <span className="label">Correct answer:</span>
                        <span className="answer correct">{options[correctAnswer]}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={resetQuiz} className="btn btn-primary">
            Take Quiz Again
          </button>
        </div>
      ) : (
        <div className="quiz-questions">
          {quizData.questions.map((question, qIndex) => {
            const options = question.options || question.choices || [];
            
            return (
              <div key={qIndex} className="question-card">
                <div className="question-header">
                  <span className="question-number">Question {qIndex + 1}</span>
                </div>
                <div className="question-text">
                  {question.question}
                </div>
                <div className="options-list">
                  {options.map((option, oIndex) => (
                    <label key={oIndex} className="option-item">
                      <input
                        type="radio"
                        name={`question-${qIndex}`}
                        value={oIndex}
                        checked={answers[qIndex] === oIndex}
                        onChange={() => handleAnswerChange(qIndex, oIndex)}
                      />
                      <span className="option-text">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="quiz-actions">
            <button 
              onClick={handleSubmit} 
              className="btn btn-primary"
              disabled={Object.keys(answers).length !== quizData.questions.length}
            >
              Submit Quiz
            </button>
            <div className="progress-info">
              Answered: {Object.keys(answers).length}/{quizData.questions.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
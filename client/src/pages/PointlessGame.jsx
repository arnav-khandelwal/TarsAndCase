import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PointlessGame.css';

const PointlessGame = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState('loading'); // loading, playing, result, summary
  const [timer, setTimer] = useState(30);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [timerWidth, setTimerWidth] = useState(100);
  const [scoreBarWidth, setScoreBarWidth] = useState(100);
  const [error, setError] = useState('');
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [answerValid, setAnswerValid] = useState(true);
  
  const navigate = useNavigate();
  
  // Check if user has already played the game
  useEffect(() => {
    const checkGamePlayStatus = async () => {
      try {
        const config = {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        };
        
        const response = await axios.get('/api/pointless/history', config);
        
        // If the user has already completed game entries, redirect
        if (response.data && response.data.length > 0) {
          setAlreadyPlayed(true);
          setError('You have already played Round 1. Each player can only play once.');
          setGameState('error');
        } else {
          // Continue to load questions if the user hasn't played
          fetchQuestions();
        }
      } catch (err) {
        console.error('Error checking game play status:', err);
        setError('Failed to check game status. Please try again.');
        setGameState('error');
      }
    };
    
    checkGamePlayStatus();
  }, []);
  
  // Load questions
  const fetchQuestions = async () => {
    try {
      // Include auth token in the request
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const response = await axios.get('/api/pointless/questions', config);
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No questions available');
      }
      
      // Randomly select 5 questions from the pool (or use all if fewer than 5)
      const questionCount = Math.min(10, response.data.length);
      const shuffled = [...response.data].sort(() => 0.5 - Math.random());
      setQuestions(shuffled.slice(0, questionCount));
      setGameState('playing');
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.message || 'Failed to load questions. Please try again.');
      setGameState('error');
    }
  };
  
  // Handle timer
  useEffect(() => {
    let interval = null;
    
    if (gameState === 'playing' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          const newTimer = prevTimer - 1;
          setTimerWidth(newTimer * 100 / 30);
          return newTimer;
        });
      }, 1000);
    } else if (timer === 0 && gameState === 'playing') {
      handleSubmit();
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timer, gameState]);
  
  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
  };
  
  const handleSubmit = async () => {
    if (gameState !== 'playing' || !questions.length) return;
    
    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      if (!currentQuestion) {
        throw new Error('Question not found');
      }
      
      // Check if answer exists in question data
      let answerFound = false;
      let answerScore = 100; // Default high score if not found
      
      const cleanedAnswer = answer.trim().toLowerCase();
      
      if (cleanedAnswer === '') {
        // If no answer provided, set a default high score
        answerScore = 100;
        setAnswerValid(false); // No answer is considered invalid
      } else if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
        // Search for the answer in the question data
        currentQuestion.answers.forEach(ans => {
          if (ans && ans.answer && ans.answer.toLowerCase() === cleanedAnswer) {
            answerFound = true;
            answerScore = ans.points || 100; // Get the score from the answer data
            setAnswerValid(true); // Answer found in the list is valid
          }
        });
        
        // If answer was not found in the list, it's invalid
        if (!answerFound) {
          setAnswerValid(false);
        }
      }
      
      // Update score
      setCurrentScore(answerScore);
      setScore(prevScore => prevScore + answerScore);
      
      // Add to score history
      setScoreHistory(prev => [
        ...prev, 
        { 
          question: currentQuestion.question || 'Unknown question', 
          answer: answer || "(No answer)", 
          score: answerScore,
          valid: answerFound || answer.trim() === ''
        }
      ]);
      
      // Save the result to the server
      await axios.post('/api/pointless/submit', {
        questionId: currentQuestion.id || 0,
        answer: answer || "(No answer)",
        score: answerScore,
        valid: answerFound || answer.trim() === ''
      }, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });
      
      // Show result
      setGameState('result');
      
      // Animate score bar - Note: bar starts full and reduces based on score
      // For a pointless answer (0), it will empty completely
      // For a wrong/high score answer (100), it will stay full
      setScoreBarWidth(100); // Start full
      setTimeout(() => {
        // Transition to the appropriate width based on score
        // 100 points = 100% width (full), 0 points = 0% width (empty)
        setScoreBarWidth(answerScore);
      }, 100);
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err.message || 'Failed to submit answer. Please try again.');
    }
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setAnswer('');
      setTimer(30);
      setTimerWidth(100);
      setGameState('playing');
      setCurrentScore(null);
      setAnswerValid(true); // Reset validity for new question
    } else {
      // End of game
      setGameState('summary');
      
      // Submit final score to server
      axios.post('/api/pointless/finalize', { 
        totalScore: score,
        scoreHistory
      }, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      }).catch(err => {
        console.error('Error finalizing game:', err);
        // Don't set error state here to avoid disrupting the summary view
      });
    }
  };
  
  const handleFinish = () => {
    navigate('/landing');
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  // Render different components based on game state
  const renderGameContent = () => {
    if (gameState === 'loading') {
      return (
        <div className="loading-spinner">
          <p>Loading questions...</p>
        </div>
      );
    }
    
    if (gameState === 'error') {
      return (
        <div className="error-message">
          <p>{error || 'An error occurred'}</p>
          {alreadyPlayed ? (
            <button className="answer-submit" onClick={() => navigate('/landing')}>
              Back to Dashboard
            </button>
          ) : (
            <>
              <button className="answer-submit" onClick={() => window.location.reload()}>
                Try Again
              </button>
              <button 
                className="answer-submit" 
                onClick={() => navigate('/landing')} 
                style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      );
    }
    
    if (gameState === 'playing') {
      // Safely get the current question
      const currentQuestion = questions[currentQuestionIndex] || {};
      
      return (
        <>
          <div className="question-display">
            <div className="question-number">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="question-text">
              {currentQuestion.question || 'Loading question...'}
            </div>
          </div>
          
          <div className="timer-container">
            <div className="timer-bar" style={{ width: `${timerWidth}%` }}></div>
          </div>
          
          <form className="answer-form" onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}>
            <input
              type="text"
              className="answer-input"
              value={answer}
              onChange={handleAnswerChange}
              placeholder="Type your answer here"
              autoFocus
              disabled={!currentQuestion.question}
            />
            <button 
              type="submit" 
              className="answer-submit"
              disabled={!currentQuestion.question}
            >
              Submit
            </button>
          </form>
          
          <div className="time-remaining">
            Time remaining: {timer} seconds
          </div>
        </>
      );
    }
    
    if (gameState === 'result') {
      const getScoreClass = (score, valid) => {
        if (!valid) return 'wrong-answer';
        if (score === 0) return 'pointless-answer';
        if (score > 70) return 'high-score-answer';
        if (score > 30) return 'medium-score-answer';
        return 'low-score-answer';
      };
      
      const getScoreFeedback = (score, valid) => {
        if (!valid) return 'The answer is wrong for the given question.';
        if (score === 0) return 'POINTLESS! Perfect answer!';
        if (score <= 5) return 'Amazing! Very few people thought of this!';
        if (score <= 20) return 'Great answer! Not many people said this.';
        if (score <= 50) return 'Good answer, but somewhat common.';
        if (score <= 80) return 'This was a popular answer.';
        return 'This was one of the most common answers.';
      };
      
      return (
        <div className="result-container">
          <h2>Your Answer: {answer || "(No answer)"}</h2>
          
          <div className="score-reveal">
            <div className="score-bar-container">
              <div 
                className="score-bar" 
                style={{ width: `${scoreBarWidth}%` }}
              ></div>
            </div>
            
            <div className={`score-text ${getScoreClass(currentScore || 0, answerValid)}`}>
              {currentScore || 0} {currentScore === 0 && answerValid && <span className="pointless-badge">POINTLESS!</span>}
            </div>
            
            <p className={`answer-feedback ${getScoreClass(currentScore || 0, answerValid)}`}>
              {getScoreFeedback(currentScore || 0, answerValid)}
            </p>
          </div>
          
          <button 
            className="next-button"
            onClick={handleNextQuestion}
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Final Score'}
          </button>
        </div>
      );
    }
    
    if (gameState === 'summary') {
      return (
        <div className="game-summary">
          <h2 className="summary-title">Game Complete!</h2>
          
          <div className="total-score">
            Total Score: {score}
          </div>
          
          <div className="score-breakdown">
            <h3>Score Breakdown:</h3>
            {scoreHistory.map((item, index) => (
              <div className="score-item" key={index}>
                <div>{item.question}</div>
                <div>
                  {item.answer}: <strong>{item.score}</strong> points
                  {item.score === 0 && item.valid && <span className="pointless-badge">POINTLESS!</span>}
                  {!item.valid && <span className="wrong-badge">WRONG</span>}
                </div>
              </div>
            ))}
            <div className="score-item">
              <div>Total:</div>
              <div>{score} points</div>
            </div>
          </div>
          
          <p>
            Remember: In Pointless, lower scores are better!
          </p>
          
          <button className="finish-button" onClick={handleFinish}>
            Return to Dashboard
          </button>
        </div>
      );
    }
    
    // Default view if none of the above states match
    return (
      <div className="error-message">
        <p>Something went wrong. Please try again.</p>
        <button className="answer-submit" onClick={() => navigate('/landing')}>
          Back to Dashboard
        </button>
      </div>
    );
  };
  
  return (
    <div className="pointless-container">
      <div className="pointless-header">
        <h1>Pointless: Round 1</h1>
        <div className="navigation-links">
          <button 
            className="nav-link logout-button" 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
      
      <div className="game-area">
        {renderGameContent()}
      </div>
    </div>
  );
};

export default PointlessGame;
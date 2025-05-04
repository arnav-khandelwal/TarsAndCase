import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PointlessGame.css';

const PointlessGame = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameState, setGameState] = useState('loading'); // loading, playing, showing-score, summary
  const [timer, setTimer] = useState(12);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [timerWidth, setTimerWidth] = useState(100);
  const [scoreBarWidth, setScoreBarWidth] = useState(100);
  const [error, setError] = useState('');
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [answerValid, setAnswerValid] = useState(true);
  const [scoreDisplayTimer, setScoreDisplayTimer] = useState(5);
  const [scoreDisplayProgress, setScoreDisplayProgress] = useState(100);
  const [submittedAnswer, setSubmittedAnswer] = useState(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [gameId, setGameId] = useState(null);

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
          
          if (response.data && response.data.length === 10) {
            setAlreadyPlayed(true);
            setError('You have already played Round 1. Each player can only play once.');
            setGameState('error');
          } else {
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

  // Load questions and check for saved game state
  const fetchQuestions = async () => {
    try {
      // Check localStorage for saved game state
      const savedGame = localStorage.getItem('pointlessGameState');
      if (savedGame) {
        const {
          gameId: savedGameId,
          questions: savedQuestions,
          currentQuestionIndex: savedIndex,
          score: savedScore,
          scoreHistory: savedHistory,
          submittedAnswer: savedAnswer,
          currentScore: savedCurrentScore
        } = JSON.parse(savedGame);

        // Verify this is the same game session
        const config = {
          headers: {
            'x-auth-token': localStorage.getItem('token')
          }
        };
        
        const response = await axios.get(`/api/pointless/check-game/${savedGameId}`, config);
        
        if (response.data.valid) {
          // Find the first unanswered question
          let firstUnansweredIndex = 0;
          const gameProgress = localStorage.getItem(`pointlessGameProgress_${savedGameId}`);
          
          if (gameProgress) {
            const progress = JSON.parse(gameProgress);
            firstUnansweredIndex = progress.answeredQuestions.length;
            
            // If all questions are answered, show summary
            if (firstUnansweredIndex >= savedQuestions.length) {
              setGameState('summary');
              return;
            }
          }

          setQuestions(savedQuestions);
          setCurrentQuestionIndex(firstUnansweredIndex); // Start from first unanswered question
          setScore(savedScore);
          setScoreHistory(savedHistory);
          setSubmittedAnswer(null); // Reset submitted answer for new question
          setCurrentScore(null);
          setGameId(savedGameId);
          setLoadedFromStorage(true);
          setGameState('playing');
          return;
        }
      }

      // No valid saved game, load fresh questions
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const response = await axios.get('/api/pointless/questions', config);
      
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No questions available');
      }
      
      const questionCount = Math.min(10, response.data.length);
      const shuffled = [...response.data];
      const newGameId = Date.now().toString();
      
      // Save initial game state
      const initialGameState = {
        gameId: newGameId,
        questions: shuffled.slice(0, questionCount),
        currentQuestionIndex: 0,
        score: 0,
        scoreHistory: [],
        submittedAnswer: null,
        currentScore: null
      };
      
      localStorage.setItem('pointlessGameState', JSON.stringify(initialGameState));
      
      // Initialize game progress
      localStorage.setItem(`pointlessGameProgress_${newGameId}`, JSON.stringify({
        answeredQuestions: []
      }));
      
      setGameId(newGameId);
      setQuestions(shuffled.slice(0, questionCount));
      setGameState('playing');
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.message || 'Failed to load questions. Please try again.');
      setGameState('error');
    }
  };
  // Update saved game state when relevant state changes
  const updateSavedGameState = () => {
    if (!gameId) return;
    
    const gameState = {
      gameId,
      questions,
      currentQuestionIndex,
      score,
      scoreHistory,
      submittedAnswer,
      currentScore
    };
    localStorage.setItem('pointlessGameState', JSON.stringify(gameState));
  };

  useEffect(() => {
    if (loadedFromStorage || gameId) {
      updateSavedGameState();
    }
  }, [currentQuestionIndex, score, scoreHistory, submittedAnswer, currentScore]);

  // Main game timer
  useEffect(() => {
    let interval = null;
    
    if (gameState === 'playing' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          const newTimer = prevTimer - 1;
          setTimerWidth((newTimer / 12) * 100);
          return newTimer;
        });
      }, 1000);
    } else if (timer === 0 && gameState === 'playing') {
      if (submittedAnswer !== null) {
        showScore();
      } else {
        handleSubmit("");
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timer, gameState, submittedAnswer]);

  // Score display timer
  useEffect(() => {
    let interval = null;
    
    if (gameState === 'showing-score' && scoreDisplayTimer > 0) {
      interval = setInterval(() => {
        setScoreDisplayTimer(prev => {
          const newTime = prev - 1;
          setScoreDisplayProgress((newTime / 5) * 100);
          return newTime;
        });
      }, 1000);
    } else if (scoreDisplayTimer === 0 && gameState === 'showing-score') {
      moveToNextQuestion();
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [scoreDisplayTimer, gameState]);

  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
  };

  const handleSubmit = async (manualAnswer = null) => {
    const answerToSubmit = manualAnswer !== null ? manualAnswer : answer;
    
    if (gameState !== 'playing' || !questions.length || submittedAnswer !== null) return;
    
    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      if (!currentQuestion) {
        throw new Error('Question not found');
      }
      
      // Check if answer was already submitted
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const checkResponse = await axios.get(
        `/api/pointless/check-answer/${gameId}/${currentQuestion.id}`,
        config
      );
      
      if (checkResponse.data.submitted) {
        setSubmittedAnswer(checkResponse.data.answer);
        setCurrentScore(checkResponse.data.score);
        setAnswerValid(checkResponse.data.valid);
        return;
      }
      
      // Calculate score
      let answerFound = false;
      let answerScore = 100;
      
      const cleanedAnswer = answerToSubmit.trim().toLowerCase();
      
      if (cleanedAnswer === '') {
        answerScore = 100;
        setAnswerValid(false);
      } else if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
        currentQuestion.answers.forEach(ans => {
          if (ans && ans.answer && ans.answer.toLowerCase() === cleanedAnswer) {
            answerFound = true;
            answerScore = ans.points;
            setAnswerValid(true);
          }
        });
        
        if (!answerFound) {
          setAnswerValid(false);
        }
      }
      
      // Submit to server
      await axios.post('/api/pointless/submit', {
        gameId,
        questionId: currentQuestion.id || 0,
        answer: answerToSubmit || "(No answer)",
        score: answerScore,
        valid: answerFound || answerToSubmit.trim() === ''
      }, config);
      
      // Update game progress in localStorage
      const gameProgress = localStorage.getItem(`pointlessGameProgress_${gameId}`);
      let progress = gameProgress ? JSON.parse(gameProgress) : { answeredQuestions: [] };
      
      progress.answeredQuestions.push({
        questionId: currentQuestion.id,
        answer: answerToSubmit,
        score: answerScore,
        valid: answerFound
      });
      
      localStorage.setItem(`pointlessGameProgress_${gameId}`, JSON.stringify(progress));
      
      // Update state
      setSubmittedAnswer(answerToSubmit);
      setCurrentScore(answerScore);
      updateSavedGameState();
      
    } catch (err) {
      console.error('Error submitting answer:', err);
      setError(err.message || 'Failed to submit answer. Please try again.');
    }
  };


  const showScore = () => {
    setScore(prevScore => prevScore + (currentScore || 0));
    setScoreHistory(prev => [
      ...prev, 
      { 
        question: questions[currentQuestionIndex].question || 'Unknown question', 
        answer: submittedAnswer || "(No answer)", 
        score: currentScore || 0,
        valid: answerValid
      }
    ]);
    
    setScoreBarWidth(100);
    setTimeout(() => {
      setScoreBarWidth(currentScore || 0);
    }, 100);
    
    setGameState('showing-score');
    setScoreDisplayTimer(5);
    setScoreDisplayProgress(100);
    updateSavedGameState();
  };

  const moveToNextQuestion = () => {
    // Update score history
    const newScoreHistory = [
      ...scoreHistory, 
      { 
        question: questions[currentQuestionIndex].question || 'Unknown question', 
        answer: submittedAnswer || "(No answer)", 
        score: currentScore || 0,
        valid: answerValid
      }
    ];
    
    setScoreHistory(newScoreHistory);
    setScore(prevScore => prevScore + (currentScore || 0));
    
    // Check if there are more questions
    const gameProgress = localStorage.getItem(`pointlessGameProgress_${gameId}`);
    const progress = gameProgress ? JSON.parse(gameProgress) : { answeredQuestions: [] };
    
    if (progress.answeredQuestions.length < questions.length) {
      // Move to next unanswered question
      setCurrentQuestionIndex(progress.answeredQuestions.length);
      setAnswer('');
      setSubmittedAnswer(null);
      setTimer(12);
      setTimerWidth(100);
      setGameState('playing');
      setCurrentScore(null);
      setAnswerValid(true);
      updateSavedGameState();
    } else {
      // Game completed
      setGameState('summary');
      localStorage.removeItem('pointlessGameState');
      localStorage.removeItem(`pointlessGameProgress_${gameId}`);
      
      axios.post('/api/pointless/finalize', { 
        gameId,
        totalScore: score + (currentScore || 0),
        scoreHistory: newScoreHistory
      }, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      }).catch(err => {
        console.error('Error finalizing game:', err);
      });
    }
  };

  const handleFinish = () => {
    localStorage.removeItem('pointlessGameState');
    navigate('/landing');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('pointlessGameState');
    navigate('/login');
  };

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
            <div className="timer-text">{timer}s remaining</div>
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
              disabled={submittedAnswer !== null}
            />
            <button 
              type="submit" 
              className="answer-submit"
              disabled={!currentQuestion.question || submittedAnswer !== null}
            >
              {submittedAnswer !== null ? 'Answer Submitted' : 'Submit'}
            </button>
          </form>
          
          {submittedAnswer !== null && (
            <div className="submitted-answer-notice">
              Answer submitted! Waiting for time to run out...
            </div>
          )}
        </>
      );
    }
    
    if (gameState === 'showing-score') {
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
          <h2>Your Answer: {submittedAnswer || "(No answer)"}</h2>
          
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
          
          <div className="score-timer-container">
            <div className="score-timer-bar" style={{ width: `${scoreDisplayProgress}%` }}></div>
            <div className="score-timer-text">Next question in {scoreDisplayTimer}s</div>
          </div>
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
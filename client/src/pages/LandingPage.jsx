import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LandingPage.css';

const LandingPage = () => {
  const [round1Locked, setRound1Locked] = useState(false);
  const [round2Locked, setRound2Locked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  // Check for auth token and get game status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      loadGameStatus();
      loadUserData();
    }
  }, [navigate]);
  
  // Load game status (which rounds are locked)
  const loadGameStatus = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/game/status', config);
      
      setRound1Locked(res.data.round1Locked);
      setRound2Locked(res.data.round2Locked);
    } catch (err) {
      console.error(err);
      setError('Failed to load game status');
      
      // Set default status if the API is not available yet
      setRound1Locked(false);
      setRound2Locked(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Load user data
  const loadUserData = async () => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/auth/user', config);
      setUsername(res.data.username);
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="landing-container">
      <div className="landing-header">
        <h1 className="landing-title">Image Similarity Game</h1>
        <div className="landing-nav">
          <Link to="/leaderboard" className="leaderboard-button">
            View Leaderboard
          </Link>
          <button 
            className="logout-button" 
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      <div className="welcome-message">
        <h2 className="welcome-title">Welcome, {username || 'Player'}!</h2>
        <p className="welcome-text">
          Choose a game round to play. Complete Round 1 to boost your overall score,
          then test your skills in Round 2. Your scores from both rounds will be combined 
          on the leaderboard.
        </p>
      </div>
      
      <div className="rounds-container">
        {/* Round 1 - Pointless */}
        <div className="round-card">
          <div className="round-header round-1-header">
            <h2 className="round-title">Round 1</h2>
            <p className="round-subtitle">Pointless Quiz</p>
          </div>
          <div className="round-content">
            <p className="round-description">
              Test your knowledge with our Pointless quiz! Try to find the most obscure correct 
              answers to score the lowest points. A 'pointless' answer scores zero!
            </p>
            {round1Locked ? (
              <button className="start-button round-1-button locked-button" disabled>
                <span className="lock-icon">🔒</span> Currently Locked
              </button>
            ) : (
              <Link to="/pointless" className="start-button round-1-button">
                Start Round 1
              </Link>
            )}
          </div>
        </div>
        
        {/* Round 2 - Image Similarity */}
        <div className="round-card">
          <div className="round-header round-2-header">
            <h2 className="round-title">Round 2</h2>
            <p className="round-subtitle">Image Similarity</p>
          </div>
          <div className="round-content">
            <p className="round-description">
              Upload images that are most similar to our reference images. Our AI will score your 
              submissions based on similarity, with higher scores for more similar images.
            </p>
            {round2Locked ? (
              <button className="start-button round-2-button locked-button" disabled>
                <span className="lock-icon">🔒</span> Currently Locked
              </button>
            ) : (
              <Link to="/table" className="start-button round-2-button">
                Start Round 2
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
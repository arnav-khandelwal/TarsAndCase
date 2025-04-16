import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30); // 30 seconds refresh interval
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);

  const navigate = useNavigate();

  // Check user authentication and role
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      // Try to decode the token to get user info
      try {
        // JWT tokens are in format: header.payload.signature
        // We need the payload which is the second part
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          // Check if user is admin
          setIsAdmin(payload.user && payload.user.isAdmin === true);
        }
      } catch (err) {
        console.error('Error decoding token:', err);
      }
    }
  }, [navigate]);

  // Load leaderboard data initially
  useEffect(() => {
    loadLeaderboardData();
  }, []);

  // Set up refresh interval for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      loadLeaderboardData();
      setLastUpdated(new Date());
    }, refreshInterval * 1000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Function to load leaderboard data from API
  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/leaderboard', config);
      setLeaderboardData(res.data);
      setError('');
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setError('Failed to load leaderboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to change refresh interval
  const handleRefreshIntervalChange = (e) => {
    const newInterval = parseInt(e.target.value);
    setRefreshInterval(newInterval);
  };

  // Force manual refresh
  const handleManualRefresh = () => {
    loadLeaderboardData();
    setLastUpdated(new Date());
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>Image Similarity Game Leaderboard</h1>
        <div className="navigation-links">
          {isAdmin ? (
            <Link to="/admin" className="nav-link">Admin Dashboard</Link>
          ) : (
            <Link to="/table" className="nav-link">Game Dashboard</Link>
          )}
          <button 
            className="nav-link logout-button" 
            onClick={handleLogout}
            style={{
              cursor: 'pointer',
              background: 'none',
              border: '1px solid #e74c3c',
              borderRadius: '4px',
              color: '#e74c3c',
              fontWeight: '600',
              padding: '8px 15px',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              fontSize: '1rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e74c3c';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#e74c3c';
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="refresh-controls">
        <div className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <div className="refresh-interval">
          <label htmlFor="refresh-interval">Auto-refresh every:</label>
          <select 
            id="refresh-interval"
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
            className="form-select"
          >
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
          </select>
        </div>
        <button 
          
          style={{
            padding: '0.75rem 1.2rem',
            color: 'white',
            backgroundColor: '#e53e3e',
            border: '2px solid #e53e3e',
            borderRadius: '0.375rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c53030';
            e.target.style.borderColor = '#c53030';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#e53e3e';
            e.target.style.borderColor = '#e53e3e';
          }}
          onClick={handleManualRefresh}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>

      <div className="leaderboard-content">
        <h2>Top Performers</h2>
        {loading && <div className="loading-spinner">Loading...</div>}
        
        {!loading && (!leaderboardData.overall || leaderboardData.overall.length === 0) ? (
          <div className="no-data">No leaderboard data available yet.</div>
        ) : (
          <div className="leaderboard-tables">
            {/* Overall Leaderboard */}
            <div className="leaderboard-section">
              <h3>Overall Leaders</h3>
              <table className="table leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Username</th>
                    <th>Total Score</th>
                    <th>Submissions</th>
                    <th>Avg. Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.overall && leaderboardData.overall.map((entry, index) => (
                    <tr key={`overall-${entry.username}`} className={index < 3 ? 'top-rank' : ''}>
                      <td className="rank-cell">
                        {index + 1}
                        {index < 3 && <span className="rank-badge">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>}
                      </td>
                      <td>{entry.username}</td>
                      <td className="score-cell">{entry.totalScore.toFixed(1)}</td>
                      <td>{entry.submissionCount}</td>
                      <td>{entry.averageScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Row-Specific Leaderboards */}
            <div className="row-leaderboards">
              <h3>Row Champions</h3>
              <div className="row-tabs">
                {leaderboardData.byRow && Object.keys(leaderboardData.byRow).map(rowNum => (
                  <div key={`row-${rowNum}`} className="row-section">
                    <h4>Row #{rowNum}</h4>
                    <table className="table row-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Username</th>
                          <th>Best Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.byRow[rowNum].slice(0, 5).map((entry, index) => (
                          <tr key={`row-${rowNum}-${entry.username}`} className={index < 3 ? 'top-rank' : ''}>
                            <td className="rank-cell">
                              {index + 1}
                              {index < 3 && <span className="rank-badge-small">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>}
                            </td>
                            <td>{entry.username}</td>
                            <td className="score-cell">{entry.maxScore.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
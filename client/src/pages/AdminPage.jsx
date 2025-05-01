import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const AdminPage = () => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  const [round1Locked, setRound1Locked] = useState(false);
  const [round2Locked, setRound2Locked] = useState(false);
  const [gameStatus, setGameStatus] = useState({});
  
  const navigate = useNavigate();
  
  // Check for auth token and admin status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      loadAllEntries();
      loadGameStatus();
    }
  }, [navigate]);
  
  // Load all entries
  const loadAllEntries = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/table/all', config);
      
      // Initialize scores object with data from backend
      const initialScores = {};
      res.data.forEach(entry => {
        initialScores[entry._id] = entry.adminScore || 0;
      });
      
      setScores(initialScores);
      setEntries(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load entries');
      
      // Redirect if not admin or unauthorized
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
    setLoading(false);
  };
  
  // Load game status
  const loadGameStatus = async () => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/game/status', config);
      setRound1Locked(res.data.round1Locked);
      setRound2Locked(res.data.round2Locked);
      setGameStatus(res.data);
    } catch (err) {
      console.error('Error loading game status:', err);
      // For now, set default values if API is not yet implemented
      setRound1Locked(false);
      setRound2Locked(false);
    }
  };
  
  // Handle toggling round lock status
  const toggleRoundLock = async (round) => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
          'Content-Type': 'application/json'
        }
      };
      
      const updatedStatus = {
        ...gameStatus,
        [round === 1 ? 'round1Locked' : 'round2Locked']: 
          round === 1 ? !round1Locked : !round2Locked
      };
      
      await axios.put('/api/game/status', updatedStatus, config);
      
      // Update local state
      if (round === 1) {
        setRound1Locked(!round1Locked);
      } else {
        setRound2Locked(!round2Locked);
      }
      
      setFeedback(`Round ${round} has been ${round === 1 ? !round1Locked : !round2Locked ? 'locked' : 'unlocked'} successfully`);
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
    } catch (err) {
      console.error(`Error toggling round ${round} lock:`, err);
      setError(`Failed to update Round ${round} status`);
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Handle entry deletion
  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }
    
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      await axios.delete(`/api/table/${entryId}`, config);
      
      // Update the entries list
      setEntries(entries.filter(entry => entry._id !== entryId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete entry');
    }
  };

  // Handle score input change
  const handleScoreChange = (entryId, value) => {
    // Validate input to ensure it's a number between 0 and 10
    let score = parseFloat(value);
    
    if (isNaN(score)) {
      score = 0;
    } else if (score < 0) {
      score = 0;
    } else if (score > 10) {
      score = 10;
    }
    
    setScores({
      ...scores,
      [entryId]: score
    });
  };

  // Submit admin score
  const handleScoreSubmit = async (entryId) => {
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token'),
          'Content-Type': 'application/json'
        }
      };
      
      const adminScore = scores[entryId];
      
      await axios.put(`/api/table/score/${entryId}`, { adminScore }, config);
      
      // Update the entry in the local state
      const updatedEntries = entries.map(entry => 
        entry._id === entryId ? { ...entry, adminScore } : entry
      );
      
      setEntries(updatedEntries);
      setFeedback('Score saved successfully');
      
      // Clear feedback after 3 seconds
      setTimeout(() => {
        setFeedback('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save score');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  // Calculate total score
  const calculateTotalScore = (aiScore, adminScore) => {
    const ai = parseFloat(aiScore) || 0;
    const admin = parseFloat(adminScore) || 0;
    return (ai + admin).toFixed(1);
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-nav-buttons">
          <Link 
            to="/landing" 
            style={{
              padding: '0.75rem 1.2rem',
              color: '#3498db',
              backgroundColor: 'transparent',
              border: '2px solid #3498db',
              borderRadius: '0.375rem',
              transition: 'all 0.3s ease',
              marginRight: '12px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#3498db';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#3498db';
            }}
          >
            Game Dashboard
          </Link>
          <button style={{
              padding: '0.7rem 1rem',
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
            onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {feedback && <div className="alert alert-success">{feedback}</div>}
      
      {/* Game Control Panel */}
      <div className="game-control-panel" style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Game Controls</h2>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ 
            flex: '1',
            minWidth: '250px',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '15px',
              color: '#e74c3c'
            }}>Round 1: Pointless Quiz</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ 
                  display: 'inline-block',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: round1Locked ? '#e74c3c' : '#27ae60'
                }}>
                  {round1Locked ? 'LOCKED' : 'UNLOCKED'}
                </span>
              </div>
              
              <button 
                onClick={() => toggleRoundLock(1)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: round1Locked ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = round1Locked ? '#219653' : '#c0392b';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = round1Locked ? '#27ae60' : '#e74c3c';
                }}
              >
                {round1Locked ? 'Unlock Round 1' : 'Lock Round 1'}
              </button>
            </div>
          </div>
          
          <div style={{ 
            flex: '1',
            minWidth: '250px',
            borderRadius: '8px',
            padding: '15px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ 
              fontSize: '1.2rem', 
              marginBottom: '15px',
              color: '#3498db'
            }}>Round 2: Image Similarity</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ 
                  display: 'inline-block',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: round2Locked ? '#e74c3c' : '#27ae60'
                }}>
                  {round2Locked ? 'LOCKED' : 'UNLOCKED'}
                </span>
              </div>
              
              <button 
                onClick={() => toggleRoundLock(2)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: round2Locked ? '#27ae60' : '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = round2Locked ? '#219653' : '#c0392b';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = round2Locked ? '#27ae60' : '#e74c3c';
                }}
              >
                {round2Locked ? 'Unlock Round 2' : 'Lock Round 2'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* All Entries */}
      <div className="all-entries">
        <h2>All User Entries</h2>
        {loading ? (
          <p>Loading entries...</p>
        ) : entries.length === 0 ? (
          <p>No entries found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Serial #</th>
                <th>User</th>
                <th>Image</th>
                <th>AI Response</th>
                <th>Our Score</th>
                <th>Total Score</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry._id}>
                  <td>{entry.serialNumber}</td>
                  <td>{entry.user?.username || 'Unknown'}</td>
                  <td>
                    <img 
                      src={entry.imageUrl} 
                      alt={`Entry ${entry.serialNumber}`}
                      className="entry-thumbnail"
                    />
                  </td>
                  <td>{entry.aiResponse || 'No AI response'}</td>
                  <td>
                    <div className="score-input-container">
                      <input 
                      style={{
                        padding: '0.6rem 0.8rem',
                        color: 'white',
                        backgroundColor: 'rgb(135, 173, 92)',
                        border: '2px solidrgb(147, 155, 77)',
                        borderRadius: '0.37rem',
                        margin: '0.05rem 0.5rem',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgb(136, 233, 77)';
                       }}
                       onMouseLeave={(e) => {
                        e.target.style.backgroundColor ='rgb(92, 180, 67)';
                      }}
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1"
                        className="form-control admin-score-input"
                        value={scores[entry._id] || 0}
                        onChange={(e) => handleScoreChange(entry._id, e.target.value)}
                      />
                      <button 
                        style={{
                          padding: '0.7rem 1rem',
                          justifyContent: 'center',
                          color: 'white',
                          backgroundColor: 'rgb(24, 150, 228)',
                          border: '1px solidrgb(62, 165, 229)',
                          borderRadius: '0.375rem',
                         margin: '0.3rem 1.6rem',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = 'rgb(20, 111, 168)';
                         }}
                         onMouseLeave={(e) => {
                          e.target.style.backgroundColor ='rgb(24, 150, 228)';
                        }}
                        onClick={() => handleScoreSubmit(entry._id)}
                      >
                        Save
                      </button>
                    </div>
                  </td>
                  <td className="total-score">
                    {calculateTotalScore(entry.aiResponse, scores[entry._id])}
                  </td>
                  <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      style={{
                        padding: '0.5rem 0.5rem',
                        color: 'white',
                        backgroundColor: '#e53e3e',
                        border: '2px solidrgb(201, 72, 72)',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        margin: '0.2rem 1.4rem',
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#c53030';
                        
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#e53e3e';
                       
                      }} 
                      onClick={() => handleDelete(entry._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState('');
  
  const navigate = useNavigate();
  
  // Check for auth token and admin status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      loadAllEntries();
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
        <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {feedback && <div className="alert alert-success">{feedback}</div>}
      
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
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1"
                        className="form-control admin-score-input"
                        value={scores[entry._id] || 0}
                        onChange={(e) => handleScoreChange(entry._id, e.target.value)}
                      />
                      <button 
                        className="btn btn-sm btn-primary save-score-btn"
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
                      className="btn btn-danger btn-sm"
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
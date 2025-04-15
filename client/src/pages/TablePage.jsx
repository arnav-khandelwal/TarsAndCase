import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../components/DataTable/DataTable';

const TablePage = () => {
  const [entries, setEntries] = useState([]);
  const [maxScores, setMaxScores] = useState(Array(11).fill(0));
  const [submissionLimits, setSubmissionLimits] = useState({});
  const [maxSubmissionsPerRow, setMaxSubmissionsPerRow] = useState(5); // Default value
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  
  // Check for auth token and load entries
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    } else {
      loadEntries();
    }
  }, [navigate]);
  
  // Set up a refresh interval to periodically update the entries
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        loadEntries();
      }
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(refreshInterval); // Clean up on unmount
  }, []);
  
  // Load user's entries from database and calculate max scores
  const loadEntries = async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const res = await axios.get('/api/table/user', config);
      
      // Handle the updated response format
      let entriesData = [];
      
      if (res.data && res.data.entries) {
        // New format: { entries: [...], submissionLimits: {...} }
        entriesData = res.data.entries || [];
        setEntries(entriesData);
        setSubmissionLimits(res.data.submissionLimits || {});
        setMaxSubmissionsPerRow(res.data.maxSubmissionsPerRow || 5);
      } else if (Array.isArray(res.data)) {
        // Old format: direct array of entries
        entriesData = res.data;
        setEntries(entriesData);
      } else {
        // Unexpected format
        console.error('Unexpected data format:', res.data);
        entriesData = [];
        setEntries([]);
      }
      
      calculateMaxScores(entriesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load entries');
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
    setLoading(false);
  };
  
  // Calculate max scores for each row based on entries
  const calculateMaxScores = (entriesData) => {
    if (!Array.isArray(entriesData)) {
      console.error('entriesData is not an array:', entriesData);
      return;
    }
    
    const newMaxScores = Array(11).fill(0);
    
    entriesData.forEach(entry => {
      if (entry && entry.serialNumber !== undefined) {
        const rowIndex = entry.serialNumber - 1; // Convert to 0-based index
        const score = parseFloat(entry.aiResponse) || 0;
        
        if (rowIndex >= 0 && rowIndex < 11 && score > newMaxScores[rowIndex]) {
          newMaxScores[rowIndex] = score;
        }
      }
    });
    
    setMaxScores(newMaxScores);
  };
  
  // Process row submission
  const handleRowSubmit = async (rowIndex, formData) => {
    try {
      // Check if user has reached the submission limit for this row
      const currentRowLimits = submissionLimits[rowIndex + 1];
      if (currentRowLimits && currentRowLimits.remaining <= 0) {
        throw new Error(`You've reached the maximum limit of ${maxSubmissionsPerRow} submissions for row #${rowIndex + 1}`);
      }
      
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': localStorage.getItem('token')
        }
      };
      
      const response = await axios.post('/api/table', formData, config);
      
      // Reload entries immediately after a successful submission
      await loadEntries();
      
      return {
        aiScore: response.data.aiScore,
        submissionsRemaining: response.data.submissionsRemaining || 0
      };
    } catch (err) {
      console.error('Submission error:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to submit entry');
    }
  };
  
  // Handle successful submission
  const handleSuccess = async (message) => {
    setSuccess(message);
    setError('');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess('');
    }, 3000);
    
    // Reload entries to ensure we have the latest data
    await loadEntries();
  };
  
  // Handle submission error
  const handleError = (message) => {
    setError(message);
    setSuccess('');
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold', 
        }}>Data Entry</h1>
        <div className="header-buttons">
          <Link 
            to="/leaderboard" 
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
            View Leaderboard
          </Link>
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
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      <div className="submission-limits-info">
        <p className="info-text">
          <i className="bi bi-info-circle"></i> You can submit a maximum of {maxSubmissionsPerRow} images per row.
        </p>
      </div>
      
      {/* Data Entry Table */}
      <h2>Select Images</h2>
      <DataTable 
        onSuccess={handleSuccess}
        onError={handleError}
        onRowSubmit={handleRowSubmit}
        maxScores={maxScores}
        submissionLimits={submissionLimits}
        maxSubmissionsPerRow={maxSubmissionsPerRow}
      />
      
      {/* Display Entries */}
      <div className="entries-display">
        <h2>Your Entries</h2>
        {loading ? (
          <p>Loading entries...</p>
        ) : entries.length === 0 ? (
          <p>No entries yet. Add your entries using the form above.</p>
        ) : (
            <div className="entries-grid">
            {entries.map(entry => (
                <div className="entry-card" key={entry._id}>
                <div className="entry-image">
                <img 
                    src={entry.imageUrl} 
                    alt={`Entry ${entry.serialNumber}`}
                    onError={(e) => {
                        console.error('Failed to load image:', entry.imageUrl);
                        e.target.style.display = 'none';
                    }}
                    />
                </div>
                <div className="entry-content">
                    <h3>Row #{entry.serialNumber}</h3>
                    {entry.aiResponse && (
                    <div className="ai-response">
                        <h4>AI Response:</h4>
                        <p>Similarity score: {entry.aiResponse}</p>
                        <p>Max score (for this row): {maxScores[entry.serialNumber - 1]}</p>
                    </div>
                    )}
                    <div className="entry-date">
                    <small>Created: {new Date(entry.createdAt).toLocaleString()}</small>
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default TablePage;
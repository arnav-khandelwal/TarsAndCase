import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DataTable from '../components/DataTable/DataTable';

const TablePage = () => {
  const [entries, setEntries] = useState([]);
  const [maxScores, setMaxScores] = useState(Array(11).fill(0)); // Initialize max scores for all 11 rows
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
      setEntries(res.data);
      
      // Calculate max scores for each row (serialNumber)
      calculateMaxScores(res.data);
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
    // Initialize array with 11 zeros (for rows 1-11)
    const newMaxScores = Array(11).fill(0);
    
    // Loop through all entries to find max score for each row
    entriesData.forEach(entry => {
      const rowIndex = entry.serialNumber - 1; // Convert to 0-based index
      const score = parseFloat(entry.aiResponse) || 0;
      
      // Update max score if this entry has a higher score
      if (rowIndex >= 0 && rowIndex < 11 && score > newMaxScores[rowIndex]) {
        newMaxScores[rowIndex] = score;
      }
    });
    
    setMaxScores(newMaxScores);
  };
  
  // Process row submission
  const handleRowSubmit = async (rowIndex, formData) => {
    try {
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
        aiScore: response.data.aiScore
      };
    } catch (err) {
      console.error('Submission error:', err);
      throw new Error(err.response?.data?.message || 'Failed to submit entry');
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
        <h1>Data Entry</h1>
        <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {/* Data Entry Table */}
      <h2>Select Images</h2>
      <DataTable 
        onSuccess={handleSuccess}
        onError={handleError}
        onRowSubmit={handleRowSubmit}
        maxScores={maxScores}
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
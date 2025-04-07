import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminPage = () => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
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
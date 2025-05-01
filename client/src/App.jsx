import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TablePage from './pages/TablePage';
import AdminPage from './pages/AdminPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LandingPage from './pages/LandingPage';
import PointlessGame from './pages/PointlessGame';
import axios from 'axios';
import './App.css';

// Basic PrivateRoute component for authentication
const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? element : <Navigate to="/login" />;
};

// Enhanced PrivateRoundRoute component that checks if round is locked
const PrivateRoundRoute = ({ element, round, fallback = '/landing' }) => {
  const [isLocked, setIsLocked] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const checkRoundStatus = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        const response = await axios.get('/api/game/status', config);
        
        if (round === 1) {
          setIsLocked(response.data.round1Locked);
        } else if (round === 2) {
          setIsLocked(response.data.round2Locked);
        }
      } catch (error) {
        console.error('Error checking round status:', error);
        // Default to unlocked if there's an error fetching status
        setIsLocked(false);
      } finally {
        setLoading(false);
      }
    };

    checkRoundStatus();
  }, [token, round]);

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    // Show loading while checking round status
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f0f2f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p>Checking game status</p>
        </div>
      </div>
    );
  }

  // If round is locked, redirect to fallback route
  if (isLocked) {
    return <Navigate to={fallback} />;
  }

  // If round is unlocked and user is authenticated, render the component
  return element;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route 
            path="/landing" 
            element={<PrivateRoute element={<LandingPage />} />} 
          />
          <Route 
            path="/pointless" 
            element={<PrivateRoundRoute element={<PointlessGame />} round={1} />} 
          />
          <Route 
            path="/leaderboard" 
            element={<PrivateRoute element={<LeaderboardPage />} />} 
          />
          <Route 
            path="/table" 
            element={<PrivateRoundRoute element={<TablePage />} round={2} />} 
          />
          <Route 
            path="/admin" 
            element={<PrivateRoute element={<AdminPage />} />} 
          />
          <Route path="*" element={<Navigate to="/landing" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
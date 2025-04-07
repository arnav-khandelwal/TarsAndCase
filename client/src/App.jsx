import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import TablePage from './pages/TablePage';
import AdminPage from './pages/AdminPage';
import './App.css';

// PrivateRoute component for protected routes
const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? element : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route 
            path="/table" 
            element={<PrivateRoute element={<TablePage />} />} 
          />
          <Route 
            path="/admin" 
            element={<PrivateRoute element={<AdminPage />} />} 
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import './Header.css';

const Header = () => {
  const { user, logout, isAuthenticated, updateUser } = useAuth();
  const [currentUser, setCurrentUser] = useState(user);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (isAuthenticated && !currentUser?.name) {
        try {
          const response = await authService.getCurrentUser();
          if (response.success) {
            const userData = response.data.user || response.data;
            setCurrentUser(userData);
            updateUser(userData);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      } else {
        setCurrentUser(user);
      }
    };

    fetchCurrentUser();
  }, [isAuthenticated, user, updateUser]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">
          AI Quiz App
        </Link>
        
        <nav className="nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/posts" className="nav-link">Posts</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/ai-assistant" className="nav-link">AI Assistant</Link>
              <div className="user-menu">
                <span>Welcome, {currentUser?.name || currentUser?.username || 'User'}</span>
                <button onClick={handleLogout} className="btn btn-outline">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
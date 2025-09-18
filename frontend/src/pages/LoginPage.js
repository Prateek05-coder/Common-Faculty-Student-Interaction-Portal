import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student'
  });
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(formData.email, formData.password, formData.role);

    if (!result.success) {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const testAccounts = [
    { email: 'alice@university.edu', password: 'password123', role: 'student', name: 'Alice (Student)' },
    { email: 'sarah@university.edu', password: 'password123', role: 'faculty', name: 'Dr. Sarah (Faculty)' },
    { email: 'admin@university.edu', password: 'admin123', role: 'admin', name: 'Admin' },
    { email: 'john.ta@university.edu', password: 'password123', role: 'ta', name: 'John (TA)' }
  ];

  const fillTestAccount = (account) => {
    setFormData({
      email: account.email,
      password: account.password,
      role: account.role
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-form-wrapper">
          <div className="login-header">
            <h1>Faculty Portal</h1>
            <p>Welcome back! Please sign in to your account.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="role">Select Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
                <option value="ta">Teaching Assistant</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="test-accounts">
            <h4>Test Accounts (Click to fill)</h4>
            <div className="test-accounts-grid">
              {testAccounts.map((account, index) => (
                <button
                  key={index}
                  type="button"
                  className="test-account-btn"
                  onClick={() => fillTestAccount(account)}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
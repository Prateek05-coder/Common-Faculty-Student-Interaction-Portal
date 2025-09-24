import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, getDemoAccounts } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  const loadDemoAccounts = useCallback(async () => {
    try {
      const accounts = await getDemoAccounts();
      setDemoAccounts(accounts);
    } catch (error) {
      console.error('Failed to load demo accounts:', error);
    }
  }, [getDemoAccounts]);

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Load demo accounts for testing
    loadDemoAccounts();
  }, [loadDemoAccounts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      // Basic validation
      if (!formData.email || !formData.password) {
        toast.error('Please enter both email and password');
        return;
      }

      // Attempt login
      await login(formData.email, formData.password);
      
      // Success - redirect will happen via useEffect
      toast.success('Login successful!');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDemoLogin = async (account) => {
    setLoginLoading(true);
    try {
      await login(account.email, account.password);
      toast.success(`Logged in as ${account.name} (${account.role})`);
    } catch (error) {
      console.error('Demo login error:', error);
      toast.error(`Demo login failed: ${error.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  // Show loading spinner if checking authentication
  if (loading) {
    return (
      <div className={`loading-screen ${isDark ? 'dark' : ''}`}>
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`auth-page ${isDark ? 'dark' : ''}`} data-theme={isDark ? 'dark' : 'light'}>
      {/* Theme Toggle */}
      <button className="theme-toggle" onClick={toggleTheme}>
        <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
      </button>

      <div className="auth-container">
        {/* Left Side - Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h1>EduPortal</h1>
            </div>
            
            <div className="brand-description">
              <h2>Welcome to Your Learning Hub</h2>
              <p>Access courses, assignments, discussions, and connect with your academic community through our comprehensive educational platform.</p>
            </div>

            <div className="features-grid">
              <div className="feature-item">
                <i className="fas fa-users"></i>
                <span>Collaborative Learning</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-video"></i>
                <span>Video Lectures</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-tasks"></i>
                <span>Assignment Tracking</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-comments"></i>
                <span>Discussion Forums</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-chart-line"></i>
                <span>Progress Analytics</span>
              </div>
              <div className="feature-item">
                <i className="fas fa-mobile-alt"></i>
                <span>Mobile Access</span>
              </div>
            </div>

            <div className="testimonial">
              <div className="testimonial-content">
                <i className="fas fa-quote-left"></i>
                <p>"EduPortal has transformed how we manage our courses and connect with students. It's intuitive, powerful, and reliable."</p>
                <div className="testimonial-author">
                  <strong>Dr. Sarah Johnson</strong>
                  <span>Computer Science Faculty</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="form-header">
              <h2>Sign In</h2>
              <p>Welcome back! Please sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    disabled={loginLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    disabled={loginLoading}
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loginLoading}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input type="checkbox" disabled={loginLoading} />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
                
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Demo Accounts Section */}
            {demoAccounts.length > 0 && (
              <div className="demo-section">
                <div className="section-divider">
                  <span className="divider-line"></span>
                  <span className="divider-text">Quick Demo Access</span>
                  <span className="divider-line"></span>
                </div>
                
                <div className="demo-grid">
                  {demoAccounts.map((account, index) => (
                    <button 
                      key={index}
                      type="button"
                      className={`demo-btn ${account.role}`}
                      onClick={() => handleDemoLogin(account)}
                      disabled={loginLoading}
                    >
                      <div className="demo-icon">
                        <i className={`fas ${
                          account.role === 'student' ? 'fa-user-graduate' :
                          account.role === 'faculty' ? 'fa-chalkboard-teacher' :
                          account.role === 'ta' ? 'fa-user-tie' :
                          'fa-user-shield'
                        }`}></i>
                      </div>
                      <div className="demo-info">
                        <span className="demo-name">{account.name}</span>
                        <span className="demo-role">{account.role.toUpperCase()}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="demo-note">
                  <i className="fas fa-info-circle"></i>
                  Click any demo account for instant access (testing only)
                </p>
              </div>
            )}

            {/* Registration Section */}
            <div className="auth-switch">
              <div className="switch-content">
                <span>New to EduPortal?</span>
                <Link to="/register" className="switch-link">
                  Create Your Account
                  <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>

            {/* Security Info */}
            <div className="security-info">
              <div className="security-item">
                <i className="fas fa-shield-alt"></i>
                <span>Secure Login</span>
              </div>
              <div className="security-item">
                <i className="fas fa-lock"></i>
                <span>Encrypted Data</span>
              </div>
              <div className="security-item">
                <i className="fas fa-user-shield"></i>
                <span>Privacy Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Theme Variables */
        :root {
          --auth-bg-light: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --auth-bg-dark: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          --auth-surface-light: #ffffff;
          --auth-surface-dark: #1e293b;
          --auth-text-light: #1f2937;
          --auth-text-dark: #f1f5f9;
          --auth-text-secondary-light: #6b7280;
          --auth-text-secondary-dark: #cbd5e1;
          --auth-border-light: #e5e7eb;
          --auth-border-dark: #374151;
          --auth-input-bg-light: #ffffff;
          --auth-input-bg-dark: #334155;
          --auth-placeholder-light: #9ca3af;
          --auth-placeholder-dark: #64748b;
        }

        .theme-toggle {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          font-size: 1.2rem;
        }

        .theme-toggle:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .auth-page {
          min-height: 100vh;
          background: var(--auth-bg-light);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          transition: all 0.3s ease;
        }

        .auth-page.dark {
          background: var(--auth-bg-dark);
        }

        .auth-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1200px;
          width: 100%;
          background: var(--auth-surface-light);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          min-height: 700px;
          transition: all 0.3s ease;
        }

        .dark .auth-container {
          background: var(--auth-surface-dark);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }

        .auth-branding {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          padding: 3rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .dark .auth-branding {
          background: linear-gradient(135deg, #3730a3 0%, #6b21a8 100%);
        }

        .auth-branding::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        .branding-content {
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .logo-icon {
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          backdrop-filter: blur(10px);
        }

        .brand-logo h1 {
          font-size: 2.5rem;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(45deg, #fff, #e0e7ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-description {
          margin-bottom: 2rem;
        }

        .brand-description h2 {
          font-size: 1.75rem;
          margin: 0 0 1rem 0;
          font-weight: 600;
        }

        .brand-description p {
          font-size: 1.1rem;
          opacity: 0.9;
          line-height: 1.6;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.2s ease;
        }

        .feature-item:hover {
          transform: translateY(-2px);
        }

        .feature-item i {
          color: #fbbf24;
          font-size: 1.2rem;
          width: 20px;
        }

        .feature-item span {
          font-weight: 500;
        }

        .testimonial {
          margin-top: 2rem;
        }

        .testimonial-content {
          background: rgba(255, 255, 255, 0.1);
          padding: 1.5rem;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .testimonial-content i {
          color: #fbbf24;
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .testimonial-content p {
          font-style: italic;
          margin: 0 0 1rem 0;
          line-height: 1.5;
        }

        .testimonial-author strong {
          display: block;
          font-weight: 600;
        }

        .testimonial-author span {
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .auth-form-section {
          padding: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
          transition: all 0.3s ease;
        }

        .dark .auth-form-section {
          background: #1e293b;
        }

        .auth-form-container {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--auth-text-light);
          margin: 0 0 0.5rem 0;
          transition: color 0.3s ease;
        }

        .dark .form-header h2 {
          color: var(--auth-text-dark);
        }

        .form-header p {
          color: var(--auth-text-secondary-light);
          margin: 0;
          font-size: 1rem;
          transition: color 0.3s ease;
        }

        .dark .form-header p {
          color: var(--auth-text-secondary-dark);
        }

        .auth-form {
          margin-bottom: 2rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          color: var(--auth-text-light);
          margin-bottom: 0.5rem;
          font-size: 0.95rem;
          transition: color 0.3s ease;
        }

        .dark .form-group label {
          color: var(--auth-text-dark);
        }

        .input-wrapper {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--auth-placeholder-light);
          z-index: 1;
          transition: color 0.3s ease;
        }

        .dark .input-icon {
          color: var(--auth-placeholder-dark);
        }

        .form-group input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border: 2px solid var(--auth-border-light);
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.2s ease;
          background: var(--auth-input-bg-light);
          color: var(--auth-text-light);
        }

        .dark .form-group input {
          background: var(--auth-input-bg-dark);
          border-color: var(--auth-border-dark);
          color: var(--auth-text-dark);
        }

        .form-group input::placeholder {
          color: var(--auth-placeholder-light);
          transition: color 0.3s ease;
        }

        .dark .form-group input::placeholder {
          color: var(--auth-placeholder-dark);
        }

        /* Fix for password input - ensure text is visible */
        .password-input {
          color: var(--auth-text-light) !important;
        }

        .dark .password-input {
          color: var(--auth-text-dark) !important;
        }

        .password-input::-webkit-textfield-decoration-container {
          color: var(--auth-text-light);
        }

        .dark .password-input::-webkit-textfield-decoration-container {
          color: var(--auth-text-dark);
        }

        .form-group input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-group input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .dark .form-group input:disabled {
          background: #1e293b;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--auth-text-secondary-light);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .dark .password-toggle {
          color: var(--auth-text-secondary-dark);
        }

        .password-toggle:hover:not(:disabled) {
          color: var(--auth-text-light);
          background: rgba(0, 0, 0, 0.05);
        }

        .dark .password-toggle:hover:not(:disabled) {
          color: var(--auth-text-dark);
          background: rgba(255, 255, 255, 0.05);
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--auth-text-light);
          transition: color 0.3s ease;
        }

        .dark .checkbox-wrapper {
          color: var(--auth-text-dark);
        }

        .checkbox-wrapper input[type="checkbox"] {
          width: auto;
          margin: 0;
          padding: 0;
        }

        .forgot-link {
          color: #4f46e5;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .forgot-link:hover {
          color: #3730a3;
          text-decoration: underline;
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          padding: 1rem;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .demo-section {
          margin-bottom: 2rem;
        }

        .section-divider {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--auth-border-light);
          transition: background 0.3s ease;
        }

        .dark .divider-line {
          background: var(--auth-border-dark);
        }

        .divider-text {
          padding: 0 1rem;
          color: var(--auth-text-secondary-light);
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .dark .divider-text {
          color: var(--auth-text-secondary-dark);
        }

        .demo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .demo-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border: 2px solid var(--auth-border-light);
          border-radius: 12px;
          background: var(--auth-surface-light);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .dark .demo-btn {
          background: var(--auth-input-bg-dark);
          border-color: var(--auth-border-dark);
        }

        .demo-btn:hover:not(:disabled) {
          border-color: #4f46e5;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .dark .demo-btn:hover:not(:disabled) {
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .demo-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .demo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .demo-btn.student .demo-icon {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }

        .demo-btn.faculty .demo-icon {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .demo-btn.ta .demo-icon {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .demo-btn.admin .demo-icon {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }

        .demo-info {
          display: flex;
          flex-direction: column;
        }

        .demo-name {
          font-weight: 600;
          color: var(--auth-text-light);
          font-size: 0.9rem;
          transition: color 0.3s ease;
        }

        .dark .demo-name {
          color: var(--auth-text-dark);
        }

        .demo-role {
          font-size: 0.75rem;
          color: var(--auth-text-secondary-light);
          font-weight: 500;
          transition: color 0.3s ease;
        }

        .dark .demo-role {
          color: var(--auth-text-secondary-dark);
        }

        .demo-note {
          color: var(--auth-text-secondary-light);
          font-size: 0.8rem;
          text-align: center;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: color 0.3s ease;
        }

        .dark .demo-note {
          color: var(--auth-text-secondary-dark);
        }

        .auth-switch {
          margin-bottom: 2rem;
          text-align: center;
          padding: 1.5rem;
          background: var(--auth-surface-light);
          border-radius: 12px;
          border: 2px solid var(--auth-border-light);
          transition: all 0.3s ease;
        }

        .dark .auth-switch {
          background: var(--auth-input-bg-dark);
          border-color: var(--auth-border-dark);
        }

        .switch-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .switch-content span {
          color: var(--auth-text-secondary-light);
          font-size: 1rem;
          transition: color 0.3s ease;
        }

        .dark .switch-content span {
          color: var(--auth-text-secondary-dark);
        }

        .switch-link {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .switch-link:hover {
          color: #3730a3;
          transform: translateX(5px);
        }

        .security-info {
          display: flex;
          justify-content: space-around;
          padding: 1rem;
          background: rgba(79, 70, 229, 0.05);
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .dark .security-info {
          background: rgba(79, 70, 229, 0.1);
        }

        .security-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--auth-text-secondary-light);
          transition: color 0.3s ease;
        }

        .dark .security-item {
          color: var(--auth-text-secondary-dark);
        }

        .security-item i {
          color: #4f46e5;
          font-size: 1.2rem;
        }

        .loading-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--auth-bg-light);
          color: white;
          transition: all 0.3s ease;
        }

        .loading-screen.dark {
          background: var(--auth-bg-dark);
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .auth-container {
            grid-template-columns: 1fr;
            max-width: 500px;
          }
          
          .auth-branding {
            display: none;
          }

          .demo-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .auth-page {
            padding: 0.5rem;
          }

          .auth-form-section {
            padding: 2rem 1.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .theme-toggle {
            top: 1rem;
            right: 1rem;
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    studentId: '',
    employeeId: '',
    institutionCode: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      // Validate password strength
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      // Validate role-specific fields
      if (formData.role === 'student' && !formData.studentId) {
        toast.error('Student ID is required for student accounts');
        return;
      }

      if (['faculty', 'ta', 'admin'].includes(formData.role) && !formData.employeeId) {
        toast.error('Employee ID is required for faculty, TA, and admin accounts');
        return;
      }

      // Validate institutional email
      const emailDomain = formData.email.split('@')[1]?.toLowerCase();
      const allowedDomains = ['university.edu', 'college.edu', 'school.edu', 'edu.in', 'ac.in', 'iit.ac.in'];
      
      if (!emailDomain || !allowedDomains.some(domain => emailDomain.includes(domain.split('.')[0]))) {
        toast.error('Please use your institutional email address (.edu, .edu.in, .ac.in domains)');
        return;
      }

      // Register user
      await register({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        studentId: formData.studentId || undefined,
        employeeId: formData.employeeId || undefined,
        institutionCode: formData.institutionCode || emailDomain
      });

      toast.success('Account created successfully! Please login to continue.');
      navigate('/login');
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="auth-page">
      <div className="auth-container register-container">
        {/* Left Side - Registration Form */}
        <div className="auth-form-section">
          <div className="auth-form-container">
            <div className="form-header">
              <h2>Create Account</h2>
              <p>Join our educational community today</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Name Field */}
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <i className="fas fa-user input-icon"></i>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    autoComplete="name"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="email">Institutional Email</label>
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@university.edu"
                    required
                    autoComplete="email"
                    disabled={registerLoading}
                  />
                </div>
                <small className="form-help">
                  Use your official institutional email address
                </small>
              </div>

              {/* Role Selection */}
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <div className="input-wrapper">
                  <i className="fas fa-user-tag input-icon"></i>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    disabled={registerLoading}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="ta">Teaching Assistant</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Conditional ID Fields */}
              {formData.role === 'student' && (
                <div className="form-group">
                  <label htmlFor="studentId">Student ID</label>
                  <div className="input-wrapper">
                    <i className="fas fa-id-card input-icon"></i>
                    <input
                      type="text"
                      id="studentId"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="Enter your student ID"
                      required
                      disabled={registerLoading}
                    />
                  </div>
                </div>
              )}

              {['faculty', 'ta', 'admin'].includes(formData.role) && (
                <div className="form-group">
                  <label htmlFor="employeeId">Employee ID</label>
                  <div className="input-wrapper">
                    <i className="fas fa-id-badge input-icon"></i>
                    <input
                      type="text"
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      placeholder="Enter your employee ID"
                      required
                      disabled={registerLoading}
                    />
                  </div>
                </div>
              )}

              {/* Password Fields */}
              <div className="form-row">
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
                      placeholder="Create a password"
                      required
                      autoComplete="new-password"
                      minLength="8"
                      disabled={registerLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={registerLoading}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <div className="input-wrapper">
                    <i className="fas fa-lock input-icon"></i>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      required
                      autoComplete="new-password"
                      disabled={registerLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={registerLoading}
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Institution Code (Optional) */}
              <div className="form-group">
                <label htmlFor="institutionCode">Institution Code (Optional)</label>
                <div className="input-wrapper">
                  <i className="fas fa-university input-icon"></i>
                  <input
                    type="text"
                    id="institutionCode"
                    name="institutionCode"
                    value={formData.institutionCode}
                    onChange={handleChange}
                    placeholder="Enter institution code if available"
                    disabled={registerLoading}
                  />
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="form-group checkbox-group">
                <label className="checkbox-wrapper">
                  <input type="checkbox" required disabled={registerLoading} />
                  <span className="checkmark"></span>
                  <span className="checkbox-label">
                    I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="submit-btn"
                disabled={registerLoading}
              >
                {registerLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    Create Account
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="auth-switch">
              <div className="switch-content">
                <span>Already have an account?</span>
                <Link to="/login" className="switch-link">
                  Sign In Here
                  <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
            </div>

            {/* Security Info */}
            <div className="security-info">
              <div className="security-item">
                <i className="fas fa-shield-alt"></i>
                <span>Secure Registration</span>
              </div>
              <div className="security-item">
                <i className="fas fa-envelope-open"></i>
                <span>Email Verification</span>
              </div>
              <div className="security-item">
                <i className="fas fa-headset"></i>
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Branding */}
        <div className="auth-branding">
          <div className="branding-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h1>EduPortal</h1>
            </div>
            
            <div className="brand-description">
              <h2>Join Our Community</h2>
              <p>Create your account to access courses, connect with peers, and take your learning journey to the next level.</p>
            </div>

            <div className="benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="benefit-content">
                  <h3>Access Quality Education</h3>
                  <p>Join courses from top institutions and learn from expert faculty</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="benefit-content">
                  <h3>Connect & Collaborate</h3>
                  <p>Network with peers, join study groups, and engage in discussions</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="benefit-content">
                  <h3>Track Your Progress</h3>
                  <p>Monitor your academic journey with detailed analytics and insights</p>
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">50K+</div>
                <div className="stat-label">Students</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">1K+</div>
                <div className="stat-label">Courses</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">200+</div>
                <div className="stat-label">Faculty</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">95%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .register-container {
          grid-template-columns: 1fr 1fr;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-help {
          color: #6b7280;
          font-size: 0.8rem;
          margin-top: 0.25rem;
          display: block;
        }

        .checkbox-group {
          margin-bottom: 2rem;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .checkbox-wrapper input[type="checkbox"] {
          width: auto;
          margin: 0;
          padding: 0;
          margin-top: 2px;
        }

        .checkbox-label a {
          color: #4f46e5;
          text-decoration: none;
        }

        .checkbox-label a:hover {
          text-decoration: underline;
        }

        .benefits-list {
          margin: 2rem 0;
        }

        .benefit-item {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .benefit-icon {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: #fbbf24;
          flex-shrink: 0;
        }

        .benefit-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .benefit-content p {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.9;
          line-height: 1.4;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-top: 2rem;
        }

        .stat-item {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: #fbbf24;
        }

        .stat-label {
          font-size: 0.8rem;
          opacity: 0.9;
        }

        @media (max-width: 1024px) {
          .register-container {
            grid-template-columns: 1fr;
          }
          
          .auth-branding {
            order: -1;
            padding: 2rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .benefits-list {
            margin: 1rem 0;
          }

          .benefit-item {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
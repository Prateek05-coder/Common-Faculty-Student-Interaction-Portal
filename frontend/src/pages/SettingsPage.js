import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const SettingsPage = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    language: 'en',
    timezone: 'UTC'
  });

  const handlePreferenceChange = async (key, value) => {
    try {
      setLoading(true);
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      // Save to backend
      await axios.put(`${process.env.REACT_APP_API_URL}/users/preferences`, {
        preferences: newPreferences
      });

      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (formData) => {
    try {
      setLoading(true);
      await axios.put(`${process.env.REACT_APP_API_URL}/auth/change-password`, formData);
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and portal settings</p>
      </div>

      <div className="settings-content">
        {/* Theme Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-palette"></i>
              Appearance
            </h2>
          </div>

          <div className="theme-toggle-section">
            <div className="theme-toggle-content">
              <div className="theme-info">
                <h3>Theme Mode</h3>
                <p>Choose between light and dark themes for better visual comfort</p>
              </div>
              
              <div className="theme-controls">
                <div className="theme-preview">
                  <span className="current-theme">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                
                <button 
                  className={`theme-toggle-btn ${isDark ? 'active' : ''}`}
                  onClick={toggleTheme}
                  disabled={loading}
                >
                  <div className="theme-toggle-slider">
                    <i className={`theme-toggle-icon fas ${isDark ? 'fa-moon' : 'fa-sun'}`}></i>
                  </div>
                </button>
              </div>
            </div>

            <div className="theme-description">
              <p>
                <i className="fas fa-info-circle"></i>
                {isDark 
                  ? 'Dark mode reduces eye strain in low-light environments and may help save battery on OLED displays.'
                  : 'Light mode provides better readability in bright environments and is suitable for daytime use.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-bell"></i>
              Notifications
            </h2>
          </div>

          <div className="notification-settings">
            <div className="setting-item">
              <div className="setting-info">
                <h4>Email Notifications</h4>
                <p>Receive important updates via email</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  disabled={loading}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Push Notifications</h4>
                <p>Get instant notifications in your browser</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.pushNotifications}
                  onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                  disabled={loading}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h4>Weekly Digest</h4>
                <p>Receive a weekly summary of activities</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
                  disabled={loading}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-user-cog"></i>
              Account
            </h2>
          </div>

          <div className="account-settings">
            <div className="account-info">
              <div className="user-details">
                <h4>{user?.name}</h4>
                <p>{user?.email}</p>
                <span className={`role-badge ${user?.role}`}>
                  {user?.role?.toUpperCase()}
                </span>
              </div>
              <div className="account-actions">
                <button 
                  className="btn btn-outline"
                  onClick={() => window.location.href = '/profile'}
                >
                  <i className="fas fa-edit"></i>
                  Edit Profile
                </button>
              </div>
            </div>

            <div className="security-section">
              <h4>Security</h4>
              <div className="security-actions">
                <button 
                  className="btn btn-outline"
                  onClick={() => {/* Open password change modal */}}
                >
                  <i className="fas fa-key"></i>
                  Change Password
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => {/* Open 2FA setup */}}
                >
                  <i className="fas fa-shield-alt"></i>
                  Two-Factor Authentication
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-sliders-h"></i>
              Preferences
            </h2>
          </div>

          <div className="preferences-grid">
            <div className="preference-item">
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                disabled={loading}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div className="preference-item">
              <label htmlFor="timezone">Timezone</label>
              <select
                id="timezone"
                value={preferences.timezone}
                onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                disabled={loading}
              >
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">Eastern Time (GMT-5)</option>
                <option value="America/Chicago">Central Time (GMT-6)</option>
                <option value="America/Denver">Mountain Time (GMT-7)</option>
                <option value="America/Los_Angeles">Pacific Time (GMT-8)</option>
                <option value="Asia/Kolkata">India Standard Time (GMT+5:30)</option>
                <option value="Europe/London">London Time (GMT+0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-database"></i>
              Data & Privacy
            </h2>
          </div>

          <div className="privacy-settings">
            <div className="privacy-item">
              <h4>Download Your Data</h4>
              <p>Get a copy of all your data including assignments, forums, and messages.</p>
              <button className="btn btn-outline">
                <i className="fas fa-download"></i>
                Download Data
              </button>
            </div>

            <div className="privacy-item">
              <h4>Clear Cache</h4>
              <p>Clear stored data to free up space and resolve issues.</p>
              <button className="btn btn-outline">
                <i className="fas fa-trash"></i>
                Clear Cache
              </button>
            </div>

            <div className="privacy-item danger">
              <h4>Delete Account</h4>
              <p>Permanently delete your account and all associated data.</p>
              <button className="btn btn-danger">
                <i className="fas fa-exclamation-triangle"></i>
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Help & Support */}
        <div className="settings-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-question-circle"></i>
              Help & Support
            </h2>
          </div>

          <div className="help-section">
            <div className="help-links">
              <a href="/help" className="help-link">
                <i className="fas fa-book"></i>
                <span>User Guide</span>
              </a>
              <a href="/faq" className="help-link">
                <i className="fas fa-question"></i>
                <span>FAQ</span>
              </a>
              <a href="/contact" className="help-link">
                <i className="fas fa-envelope"></i>
                <span>Contact Support</span>
              </a>
              <a href="/feedback" className="help-link">
                <i className="fas fa-comment"></i>
                <span>Send Feedback</span>
              </a>
            </div>

            <div className="version-info">
              <h4>Version Information</h4>
              <p>EduPortal v2.0.1</p>
              <p>Last updated: September 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
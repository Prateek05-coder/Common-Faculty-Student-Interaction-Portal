import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [systemHealth, setSystemHealth] = useState({});
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemActivity, setSystemActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes, healthRes, activityRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/admin/stats`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/recent-users?limit=10`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/system-health`),
        axios.get(`${process.env.REACT_APP_API_URL}/admin/activity?limit=10`)
      ]);

      setStats(statsRes.data.data || {});
      setRecentUsers(usersRes.data.data || []);
      setSystemHealth(healthRes.data.data || {});
      setSystemActivity(activityRes.data.data || []);

    } catch (error) {
      console.error('Error loading admin data:', error);
      // Set default values
      setStats({});
      setRecentUsers([]);
      setSystemHealth({});
      setSystemActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/${action}`);
      loadAdminData(); // Refresh data
    } catch (error) {
      console.error(`Error ${action} user:`, error);
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>System Overview and Management</p>
      </div>

      {/* System Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon admin">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalUsers || 0}</h3>
            <p>Total Users</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <i className="fas fa-user-graduate"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalStudents || 0}</h3>
            <p>Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalFaculty || 0}</h3>
            <p>Faculty</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <i className="fas fa-book"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalCourses || 0}</h3>
            <p>Active Courses</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* System Health */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-heartbeat"></i> System Health</h2>
          </div>
          <div className="system-health">
            <div className="health-item">
              <div className="health-metric">
                <span className="metric-label">Database</span>
                <span className={`metric-status ${systemHealth.database?.status || 'unknown'}`}>
                  <i className="fas fa-circle"></i>
                  {systemHealth.database?.status || 'Unknown'}
                </span>
              </div>
              <div className="health-details">
                Response Time: {systemHealth.database?.responseTime || 'N/A'}ms
              </div>
            </div>

            <div className="health-item">
              <div className="health-metric">
                <span className="metric-label">Server</span>
                <span className={`metric-status ${systemHealth.server?.status || 'unknown'}`}>
                  <i className="fas fa-circle"></i>
                  {systemHealth.server?.status || 'Unknown'}
                </span>
              </div>
              <div className="health-details">
                Uptime: {systemHealth.server?.uptime || 'N/A'}
              </div>
            </div>

            <div className="health-item">
              <div className="health-metric">
                <span className="metric-label">Memory Usage</span>
                <span className="metric-value">
                  {systemHealth.memory?.usage || 'N/A'}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${systemHealth.memory?.usage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-user-plus"></i> Recent Users</h2>
            <a href="/admin/users" className="section-link">Manage All Users</a>
          </div>
          <div className="users-list">
            {recentUsers.length > 0 ? (
              recentUsers.map((userItem) => (
                <div key={userItem._id} className="user-item">
                  <div className="user-info">
                    <div className="user-avatar">
                      {userItem.avatar ? (
                        <img src={userItem.avatar} alt={userItem.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {userItem.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-details">
                      <h4>{userItem.name}</h4>
                      <p className="user-email">{userItem.email}</p>
                      <p className="user-role">
                        <span className={`role-badge ${userItem.role}`}>
                          {userItem.role}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => handleUserAction(userItem._id, 'activate')}
                      disabled={userItem.isActive}
                    >
                      {userItem.isActive ? 'Active' : 'Activate'}
                    </button>
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => handleUserAction(userItem._id, 'deactivate')}
                      disabled={!userItem.isActive}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No recent users</p>
            )}
          </div>
        </div>

        {/* System Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-activity"></i> Recent Activity</h2>
          </div>
          <div className="activity-list">
            {systemActivity.length > 0 ? (
              systemActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    <i className={activity.icon || 'fas fa-info-circle'}></i>
                  </div>
                  <div className="activity-content">
                    <p className="activity-description">{activity.description}</p>
                    <div className="activity-meta">
                      <span className="activity-user">{activity.user}</span>
                      <span className="activity-time">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="activity-status">
                    <span className={`status ${activity.status}`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions admin">
        <h2>Administrative Actions</h2>
        <div className="action-buttons">
          <a href="/admin/users" className="action-btn primary">
            <i className="fas fa-users-cog"></i>
            Manage Users
          </a>
          <a href="/admin/courses" className="action-btn secondary">
            <i className="fas fa-book-open"></i>
            Manage Courses
          </a>
          <a href="/admin/system" className="action-btn secondary">
            <i className="fas fa-cog"></i>
            System Settings
          </a>
          <a href="/admin/reports" className="action-btn secondary">
            <i className="fas fa-chart-bar"></i>
            Generate Reports
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
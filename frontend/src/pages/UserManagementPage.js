import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const UserManagementPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'student',
    password: '',
    isActive: true
  });

  useEffect(() => {
    loadUsers();
  }, [searchQuery, roleFilter, statusFilter, sortBy]);

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sortBy', sortBy);

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users?${params}`);
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/users`, userForm);
      setUsers(prev => [response.data.data, ...prev]);
      setShowCreateModal(false);
      resetForm();
      toast.success('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/admin/users/${selectedUser._id}`, userForm);
      setUsers(prev => prev.map(u => u._id === selectedUser._id ? response.data.data : u));
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      toast.success('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/status`, {
        isActive: !currentStatus
      });
      setUsers(prev => prev.map(u => 
        u._id === userId ? { ...u, isActive: !currentStatus } : u
      ));
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password?')) {
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/reset-password`);
      toast.success(`Password reset! New password: ${response.data.newPassword}`);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const openEditModal = (userToEdit) => {
    setSelectedUser(userToEdit);
    setUserForm({
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role,
      password: '',
      isActive: userToEdit.isActive
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setUserForm({
      name: '',
      email: '',
      role: 'student',
      password: '',
      isActive: true
    });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'faculty': return 'role-faculty';
      case 'ta': return 'role-ta';
      case 'student': return 'role-student';
      default: return 'role-default';
    }
  };

  const userStats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    byRole: {
      admin: users.filter(u => u.role === 'admin').length,
      faculty: users.filter(u => u.role === 'faculty').length,
      ta: users.filter(u => u.role === 'ta').length,
      student: users.filter(u => u.role === 'student').length
    }
  };

  if (!['admin'].includes(user?.role)) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>This page is only available to administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="user-management-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>User Management</h1>
            <p>Manage system users and their permissions</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fas fa-plus"></i>
            Create User
          </button>
        </div>
      </div>

      <div className="user-management-content">
        {/* Statistics Overview */}
        <div className="user-stats">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-info">
                <h3>{userStats.total}</h3>
                <p>Total Users</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-user-check"></i>
              </div>
              <div className="stat-info">
                <h3>{userStats.active}</h3>
                <p>Active Users</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              <div className="stat-info">
                <h3>{userStats.byRole.student}</h3>
                <p>Students</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <div className="stat-info">
                <h3>{userStats.byRole.faculty}</h3>
                <p>Faculty</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="user-filters">
          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
              <option value="ta">TA</option>
              <option value="student">Student</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="createdAt">Sort by Created Date</option>
              <option value="lastActive">Sort by Last Active</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="users-table-container">
          {users.length > 0 ? (
            <div className="users-table">
              <div className="table-header">
                <div className="header-cell">User</div>
                <div className="header-cell">Role</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Created</div>
                <div className="header-cell">Last Active</div>
                <div className="header-cell">Actions</div>
              </div>

              {users.map(userItem => (
                <div key={userItem._id} className="table-row">
                  <div className="cell user-info">
                    <div className="user-avatar">
                      {userItem.avatar ? (
                        <img src={userItem.avatar} alt={userItem.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {userItem.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{userItem.name}</div>
                      <div className="user-email">{userItem.email}</div>
                    </div>
                  </div>

                  <div className="cell role-info">
                    <span className={`role-badge ${getRoleColor(userItem.role)}`}>
                      {userItem.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="cell status-info">
                    <span className={`status-badge ${userItem.isActive ? 'active' : 'inactive'}`}>
                      {userItem.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="cell created-date">
                    {new Date(userItem.createdAt).toLocaleDateString()}
                  </div>

                  <div className="cell last-active">
                    {userItem.lastActive 
                      ? new Date(userItem.lastActive).toLocaleDateString()
                      : 'Never'
                    }
                  </div>

                  <div className="cell actions">
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => openEditModal(userItem)}
                        title="Edit User"
                      >
                        <i className="fas fa-edit"></i>
                      </button>

                      <button 
                        className={`btn btn-sm ${userItem.isActive ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleStatus(userItem._id, userItem.isActive)}
                        title={userItem.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <i className={`fas ${userItem.isActive ? 'fa-pause' : 'fa-play'}`}></i>
                      </button>

                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => handleResetPassword(userItem._id)}
                        title="Reset Password"
                      >
                        <i className="fas fa-key"></i>
                      </button>

                      {userItem._id !== user._id && (
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteUser(userItem._id)}
                          title="Delete User"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-users"></i>
              <h3>No Users Found</h3>
              <p>
                {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'No users match your current filters.'
                  : 'No users found in the system.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content user-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="ta">Teaching Assistant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active User
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <i className="fas fa-plus"></i>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content user-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="modal-body">
              <div className="form-group">
                <label htmlFor="edit-name">Full Name *</label>
                <input
                  type="text"
                  id="edit-name"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-email">Email Address *</label>
                <input
                  type="email"
                  id="edit-email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-role">Role *</label>
                <select
                  id="edit-role"
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="ta">Teaching Assistant</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-password">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  id="edit-password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  minLength="6"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={userForm.isActive}
                    onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Active User
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <i className="fas fa-save"></i>
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;

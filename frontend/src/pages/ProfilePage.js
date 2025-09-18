import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    department: user?.department || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 5000000) { // 5MB limit
      setAvatarFile(file);
    } else {
      toast.error('File size should be less than 5MB');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update basic profile info
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/users/profile`,
        formData
      );

      // Upload avatar if selected
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', avatarFile);

        const avatarResponse = await axios.post(
          `${process.env.REACT_APP_API_URL}/users/upload-avatar`,
          avatarFormData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

        // Update user context with new avatar
        if (updateUser) {
          updateUser({ ...response.data.data, avatar: avatarResponse.data.data.avatar });
        }
      } else {
        // Update user context with profile data
        if (updateUser) {
          updateUser(response.data.data);
        }
      }

      setIsEditing(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully!');

    } catch (error) {
      console.error('Profile update error:', error);
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      department: user?.department || ''
    });
    setAvatarFile(null);
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your account information and preferences</p>
      </div>

      <div className="profile-content">
        <div className="profile-card card">
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="profile-avatar">
                {avatarFile ? (
                  <img src={URL.createObjectURL(avatarFile)} alt="Preview" />
                ) : user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                {isEditing && (
                  <label className="avatar-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                    <i className="fas fa-camera"></i>
                  </label>
                )}
              </div>
            </div>
            <div className="profile-info">
              <h2>{user?.name}</h2>
              <p className={`role-badge ${user?.role}`}>{user?.role}</p>
            </div>
            <div className="profile-actions">
              {!isEditing ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="fas fa-edit"></i>
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    form="profile-form"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <form id="profile-form" onSubmit={handleSubmit} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="form-input-disabled"
                  />
                  <small className="form-help">Email cannot be changed</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="department">Department</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Enter department"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Tell us about yourself..."
                />
                <small className="form-help">Maximum 500 characters</small>
              </div>
            </form>
          ) : (
            <div className="profile-details">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Email Address</label>
                  <span>{user?.email}</span>
                </div>
                <div className="detail-item">
                  <label>Phone Number</label>
                  <span>{user?.phone || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <label>Department</label>
                  <span>{user?.department || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <label>Role</label>
                  <span className={`role-badge ${user?.role}`}>
                    {user?.role}
                  </span>
                </div>
                <div className="detail-item full-width">
                  <label>Bio</label>
                  <span className="bio-text">
                    {user?.bio || 'No bio available'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Member Since</label>
                  <span>{new Date(user?.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Last Active</label>
                  <span>{new Date(user?.lastActive).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Security Section */}
        <div className="security-section card">
          <h3>Account Security</h3>
          <div className="security-actions">
            <button 
              className="btn btn-outline"
              onClick={() => {/* Implement change password modal */}}
            >
              <i className="fas fa-key"></i>
              Change Password
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => {/* Implement two-factor auth */}}
            >
              <i className="fas fa-shield-alt"></i>
              Two-Factor Authentication
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
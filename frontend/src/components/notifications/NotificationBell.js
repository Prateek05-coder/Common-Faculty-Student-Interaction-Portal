import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/notifications?limit=10`);
      setNotifications(response.data.data.notifications || []);
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true } 
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await axios.put(`${process.env.REACT_APP_API_URL}/notifications/mark-all-read`);
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark notifications as read');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    setShowDropdown(false);
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      assignment_created: 'fas fa-tasks',
      assignment_submitted: 'fas fa-upload',
      assignment_graded: 'fas fa-check-circle',
      forum_created: 'fas fa-comments',
      forum_reply: 'fas fa-reply',
      task_assigned: 'fas fa-clipboard-list',
      video_uploaded: 'fas fa-video',
      course_announcement: 'fas fa-bullhorn',
      deadline_reminder: 'fas fa-clock',
      system_notification: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-bell';
  };

  const getPriorityClass = (priority) => {
    const classes = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent'
    };
    return classes[priority] || 'priority-medium';
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return created.toLocaleDateString();
  };

  return (
    <div className="notification-bell">
      <button
        className="notification-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="notification-overlay"
            onClick={() => setShowDropdown(false)}
          />
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                  disabled={loading}
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    'Mark all read'
                  )}
                </button>
              )}
            </div>

            <div className="notification-list">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${!notification.isRead ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      <i className={getNotificationIcon(notification.type)}></i>
                    </div>
                    
                    <div className="notification-content">
                      <div className="notification-title">
                        {notification.title}
                      </div>
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-meta">
                        <span className="notification-time">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                        {notification.sender && (
                          <span className="notification-sender">
                            by {notification.sender.name}
                          </span>
                        )}
                        {notification.metadata?.courseId && (
                          <span className="notification-course">
                            in {notification.metadata.courseId.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {!notification.isRead && (
                      <div className="unread-indicator"></div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-notifications">
                  <i className="fas fa-bell-slash"></i>
                  <p>No notifications yet</p>
                </div>
              )}
            </div>

            <div className="notification-footer">
              <button
                className="view-all-btn"
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/notifications');
                }}
              >
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
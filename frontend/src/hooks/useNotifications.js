import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/notifications`);
      
      // Ensure response.data.data is an array
      const notificationsData = response.data?.data || response.data || [];
      
      if (Array.isArray(notificationsData)) {
        const unread = notificationsData.filter(notification => !notification.isRead);
        setNotifications(notificationsData);
        setUnreadCount(unread.length);
      } else {
        console.warn('Invalid notifications data format:', notificationsData);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      
      // Only show error toast if it's not a 404 (no notifications yet)
      if (error.response?.status !== 404) {
        toast.error('Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/notifications/mark-all-read`);
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
      toast.success('All notifications marked as read');
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/notifications/${notificationId}`);
      
      const deletedNotification = notifications.find(n => n._id === notificationId);
      
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification deleted');
      
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: loadNotifications
  };
};

export default useNotifications;
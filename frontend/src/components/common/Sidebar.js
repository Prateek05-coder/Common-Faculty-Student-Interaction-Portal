import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../contexts/SidebarContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { isCollapsed, isMobile, closeSidebar } = useSidebar();

  const getMenuItems = () => {
    const commonItems = [
      { path: '/dashboard', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
      { path: '/profile', icon: 'fas fa-user', label: 'Profile' },
      { path: '/settings', icon: 'fas fa-cog', label: 'Settings' }
    ];

    const roleBasedItems = {
      student: [
        { path: '/courses', icon: 'fas fa-book', label: 'My Courses' },
        { path: '/assignments', icon: 'fas fa-tasks', label: 'Assignments' },
        { path: '/forums', icon: 'fas fa-comments', label: 'Discussion Forums' },
        { path: '/calendar', icon: 'fas fa-calendar', label: 'Calendar' },
        { path: '/documents', icon: 'fas fa-folder', label: 'Documents' },
        { path: '/chat', icon: 'fas fa-comment-dots', label: 'Chat' },
        { path: '/video-lectures', icon: 'fas fa-video', label: 'Video Lectures' }
      ],
      faculty: [
        { path: '/courses', icon: 'fas fa-chalkboard-teacher', label: 'Teaching Courses' },
        { path: '/assignments', icon: 'fas fa-clipboard-list', label: 'Manage Assignments' },
        { path: '/forums', icon: 'fas fa-comments', label: 'Discussion Forums' },
        { path: '/calendar', icon: 'fas fa-calendar', label: 'Schedule' },
        { path: '/documents', icon: 'fas fa-folder-open', label: 'Course Materials' },
        { path: '/chat', icon: 'fas fa-comment-dots', label: 'Student Chat' },
        { path: '/video-lectures', icon: 'fas fa-video', label: 'Video Lectures' },
        { path: '/analytics', icon: 'fas fa-chart-bar', label: 'Analytics' },
        { path: '/grading', icon: 'fas fa-clipboard-check', label: 'Grading Center' },
        { path: '/ta-management', icon: 'fas fa-users-cog', label: 'TA Management' }
      ],
      admin: [
        { path: '/courses', icon: 'fas fa-university', label: 'All Courses' },
        { path: '/users', icon: 'fas fa-users', label: 'User Management' },
        { path: '/forums', icon: 'fas fa-comments', label: 'Forum Management' },
        { path: '/assignments', icon: 'fas fa-tasks', label: 'Assignment Overview' },
        { path: '/analytics', icon: 'fas fa-chart-line', label: 'System Analytics' },
        { path: '/reports', icon: 'fas fa-file-chart', label: 'Reports' },
        { path: '/system', icon: 'fas fa-server', label: 'System Settings' },
        { path: '/logs', icon: 'fas fa-list-alt', label: 'Activity Logs' }
      ],
      ta: [
        { path: '/courses', icon: 'fas fa-book-reader', label: 'Assisting Courses' },
        { path: '/assignments', icon: 'fas fa-clipboard-list', label: 'Grading Queue' },
        { path: '/forums', icon: 'fas fa-comments', label: 'Student Forums' },
        { path: '/calendar', icon: 'fas fa-calendar', label: 'Schedule' },
        { path: '/documents', icon: 'fas fa-folder', label: 'Course Documents' },
        { path: '/chat', icon: 'fas fa-comment-dots', label: 'Student Support' },
        { path: '/video-lectures', icon: 'fas fa-video', label: 'Video Lectures' },
        { path: '/tasks', icon: 'fas fa-list-check', label: 'Assigned Tasks' },
        { path: '/office-hours', icon: 'fas fa-clock', label: 'Office Hours' }
      ]
    };

    const userRoleItems = roleBasedItems[user?.role] || [];
    return [...userRoleItems, ...commonItems];
  };

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !isCollapsed && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobile ? 'mobile' : ''}`}>
        <div className="sidebar-content">
          {/* Sidebar Header */}
          <div className="sidebar-header">
            {!isCollapsed && (
              <div className="sidebar-brand">
                <div className="brand-icon">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="brand-text">
                  <span className="brand-name">EduPortal</span>
                  <span className="brand-subtitle">Learning Hub</span>
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          {!isCollapsed && (
            <div className="sidebar-user">
              <div className="user-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className={`user-role ${user?.role}`}>
                  {user?.role?.toUpperCase()}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Menu */}
          <nav className="sidebar-nav">
            <ul className="nav-list">
              {getMenuItems().map((item, index) => {
                const isActive = location.pathname === item.path || 
                                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                
                return (
                  <li key={index} className="nav-item">
                    <Link
                      to={item.path}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                      onClick={handleLinkClick}
                      title={isCollapsed ? item.label : ''}
                    >
                      <div className="nav-icon">
                        <i className={item.icon}></i>
                      </div>
                      {!isCollapsed && (
                        <span className="nav-text">{item.label}</span>
                      )}
                      {isActive && <div className="active-indicator"></div>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar Footer */}
          {!isCollapsed && (
            <div className="sidebar-footer">
              <div className="footer-item">
                <i className="fas fa-question-circle"></i>
                <span>Help & Support</span>
              </div>
              <div className="footer-item">
                <i className="fas fa-book"></i>
                <span>Documentation</span>
              </div>
              <div className="sidebar-version">
                <span>Version 2.0.1</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions (Collapsed Mode) */}
        {isCollapsed && (
          <div className="quick-actions-collapsed">
            <button 
              className="quick-action-btn"
              title="Notifications"
              onClick={() => window.location.href = '/notifications'}
            >
              <i className="fas fa-bell"></i>
            </button>
            <button 
              className="quick-action-btn"
              title="Messages"
              onClick={() => window.location.href = '/chat'}
            >
              <i className="fas fa-envelope"></i>
            </button>
            <button 
              className="quick-action-btn"
              title="Calendar"
              onClick={() => window.location.href = '/calendar'}
            >
              <i className="fas fa-calendar"></i>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
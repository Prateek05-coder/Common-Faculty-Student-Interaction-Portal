import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../notifications/NotificationBell';
import { useSidebar } from '../../contexts/SidebarContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="header">
      <div className="header-content">
         <button className="sidebar-toggle" onClick={toggleSidebar}>
          <i className="fas fa-bars"></i>
        </button>
        <div className="header-left">
          <h1 className="header-title">Student Faculty Portal</h1>
        </div>

        <div className="header-right">
          <NotificationBell />
          <div className="header-notifications">
            
          </div>

          <div className="header-user">
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
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
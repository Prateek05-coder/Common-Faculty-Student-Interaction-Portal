import React from 'react';
import { useAuth } from '../hooks/useAuth';

const AnalyticsPage = () => {
  const { user } = useAuth();

  if (!['faculty', 'admin'].includes(user?.role)) {
    return (
      <div className="error">
        Access denied. This page is only available to faculty and administrators.
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>View detailed insights and statistics.</p>
      </div>

      <div className="analytics-content">
        <div className="empty-state">
          <i className="fas fa-chart-bar"></i>
          <h3>Analytics coming soon</h3>
          <p>Detailed analytics and reporting will be available shortly.</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
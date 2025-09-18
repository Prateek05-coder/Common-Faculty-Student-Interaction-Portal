import React from 'react';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import FacultyDashboard from '../components/dashboard/FacultyDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import TADashboard from '../components/dashboard/TADashboard';
import { useAuth } from '../hooks/useAuth';

const DashboardPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="error">Authentication required.</div>;
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'faculty':
      return <FacultyDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'ta':
      return <TADashboard />;
    default:
      return (
        <div className="error">
          <h2>Invalid Role</h2>
          <p>Your account role "{user.role}" is not recognized. Please contact an administrator.</p>
        </div>
      );
  }
};

export default DashboardPage;
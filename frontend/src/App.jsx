import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
// Components
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loader from './components/common/Loader';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';

// Pages
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import AssignmentsPage from './pages/AssignmentsPage';
import ForumsPage from './pages/ForumsPage';
import ForumDetailPage from './pages/ForumDetailPage';
import CalendarPage from './pages/CalendarPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import VideoLecturesPage from './pages/VideoLecturesPage';
// Hook
import { useAuth } from './hooks/useAuth';

// Styles
import './App.css';
import './styles/globals.css';

// Layout component for authenticated pages
const AppLayout = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader text="Loading application..." />;
  }

  return (
    <div className="app-layout">
      <Header />
      <div className="app-content">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

// Main App component
function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    theme: {
                      primary: '#10b981',
                      secondary: '#000',
                    },
                  },
                  error: {
                    duration: 5000,
                    theme: {
                      primary: '#ef4444',
                      secondary: '#000',
                    },
                  },
                }}
              />

              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } />

                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DashboardPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/courses" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/courses/:courseId" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CoursesPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/assignments" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AssignmentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/assignments/:assignmentId" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AssignmentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/forums" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ForumsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/forums/create" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ForumsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/forums/:forumId" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ForumDetailPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/calendar" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CalendarPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/chat" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ChatPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/chat/:chatId" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ChatPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/documents" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <DocumentsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/analytics" element={
                  <ProtectedRoute requiredRoles={['faculty', 'admin']}>
                    <AppLayout>
                      <AnalyticsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ProfilePage />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                <Route path="/settings" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SettingsPage />
                    </AppLayout>
                  </ProtectedRoute>
                } />
                <Route path="/video-lectures" element={
                 <ProtectedRoute>
                  <AppLayout><VideoLecturesPage /></AppLayout>
                 </ProtectedRoute>
                } />


                {/* Admin Routes */}
                <Route path="/admin/*" element={
                  <ProtectedRoute requiredRoles={['admin']}>
                    <AppLayout>
                      <AdminRoutes />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                {/* Faculty Routes */}
                <Route path="/faculty/*" element={
                  <ProtectedRoute requiredRoles={['faculty']}>
                    <AppLayout>
                      <FacultyRoutes />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                {/* TA Routes */}
                <Route path="/ta/*" element={
                  <ProtectedRoute requiredRoles={['ta']}>
                    <AppLayout>
                      <TARoutes />
                    </AppLayout>
                  </ProtectedRoute>
                } />

                {/* Catch-all route */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <AppLayout>
                      <div className="not-found">
                        <h1>404 - Page Not Found</h1>
                        <p>The page you're looking for doesn't exist.</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => window.location.href = '/dashboard'}
                        >
                          Go to Dashboard
                        </button>
                      </div>
                    </AppLayout>
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

// Public Route component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader text="Checking authentication..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin-specific routes
const AdminRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="users" element={<div>Admin Users Management</div>} />
      <Route path="courses" element={<div>Admin Courses Management</div>} />
      <Route path="system" element={<div>System Settings</div>} />
      <Route path="reports" element={<div>Admin Reports</div>} />
    </Routes>
  );
};

// Faculty-specific routes
const FacultyRoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="courses" element={<div>Faculty Course Management</div>} />
      <Route path="grading" element={<div>Faculty Grading Interface</div>} />
      <Route path="reports" element={<div>Faculty Reports</div>} />
    </Routes>
  );
};

// TA-specific routes
const TARoutes = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="grading" element={<div>TA Grading Queue</div>} />
      <Route path="office-hours" element={<div>Office Hours Management</div>} />
      <Route path="help" element={<div>TA Help Center</div>} />
    </Routes>
  );
};

export default App;
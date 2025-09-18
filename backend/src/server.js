const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static( 'uploads'));

// Create upload directories
const uploadDirs = [
  'uploads/assignments',
  'uploads/avatars',
  'uploads/videos',
  'uploads/thumbnails',
  'uploads/documents',
  'uploads/subtitles'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Socket.io handlers
require('./socket/chatSocket')(io);

// Import all routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');
const forumRoutes = require('./routes/forums');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const videoRoutes = require('./routes/videos');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const calendarRoutes = require('./routes/calendar');

// API Routes - COMPLETE SETUP
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);

app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_portal',
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/api/health`);
  
  console.log('\n📋 Registered API Routes:');
  console.log('   POST /api/auth/register');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/auth/profile');
  console.log('   GET  /api/users/search');
  console.log('   GET  /api/courses/enrolled');
  console.log('   GET  /api/courses/teaching');
  console.log('   GET  /api/assignments');
  console.log('   POST /api/assignments');
  console.log('   GET  /api/forums');
  console.log('   POST /api/forums');
  console.log('   GET  /api/notifications');
  console.log('   GET  /api/videos');
  console.log('   POST /api/videos');
  console.log('   GET  /api/dashboard/student-stats');
  console.log('   GET  /api/dashboard/faculty-stats');
  console.log('   GET  /api/admin/stats');
  console.log('   GET  /api/calendar/events');
  console.log('   GET  /api/chat/conversations');
  console.log('   And more...\n');
});

module.exports = app;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Fix Mongoose deprecation warning
mongoose.set('strictQuery', false);

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

// Create upload directories
const uploadDirs = [
  'assignments',
  'avatars',
  'videos',
  'thumbnails',
  'documents',
  'subtitles'
];

// Ensure base uploads directory exists under backend/uploads
const baseUploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(baseUploadsDir)) {
  fs.mkdirSync(baseUploadsDir, { recursive: true });
  console.log(`📁 Created directory: uploads`);
}

uploadDirs.forEach(dir => {
  const fullPath = path.join(baseUploadsDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: uploads/${dir}`);
  }
});

// Serve static files for uploads
app.use('/uploads', express.static(baseUploadsDir));

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

// Start server with error handling
const PORT = process.env.PORT || 5000;

const startServer = () => {
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
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.log(`💡 Try one of these solutions:`);
      console.log(`   1. Kill the process using port ${PORT}:`);
      console.log(`      Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F`);
      console.log(`      Mac/Linux: lsof -ti:${PORT} | xargs kill -9`);
      console.log(`   2. Use a different port by setting PORT environment variable`);
      console.log(`   3. Set PORT=5001 in your .env file`);
      process.exit(1);
    } else {
      console.error('❌ Server startup error:', err);
      process.exit(1);
    }
  });
};

// Start the server
startServer();

module.exports = app;
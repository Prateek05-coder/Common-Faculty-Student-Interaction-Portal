# Faculty-Student Interaction Portal - Full Stack

A comprehensive faculty-student interaction platform built with React.js, Node.js, Express, MongoDB, and Socket.io.

## 🚀 Features

- **Role-based Authentication** (Student, Faculty, Admin, TA)
- **Real-time Chat System** with Socket.io
- **Document Management** with versioning
- **Smart Scheduling** with conflict detection
- **Analytics Dashboard** with interactive charts
- **Assignment Management** with file submissions
- **Discussion Forums** with threaded conversations
- **Calendar Management** with notifications
- **File Storage** with Firebase/AWS S3
- **Responsive Design** for mobile and desktop

## 🛠️ Tech Stack

### Frontend
- React.js 18+
- React Router v6
- Axios for API calls
- Socket.io Client
- Chart.js for analytics
- Firebase SDK

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io for real-time features
- JWT Authentication
- Firebase Storage
- Nodemailer for emails

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher)
- **Firebase Project** (for file storage)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Setup
```bash
# Navigate to project directory
cd faculty-portal-fullstack

# Install all dependencies
npm run install-all
```

### 2. Environment Configuration

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
```

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

### 3. Run the Application

```bash
# Run both frontend and backend
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 🔐 Test Credentials

- **Student**: alice@university.edu / password123
- **Faculty**: sarah@university.edu / password123
- **Admin**: admin@university.edu / admin123
- **TA**: john.ta@university.edu / password123

## 📚 Documentation

Check the `docs/` folder for detailed documentation:
- API.md - API endpoints
- DEPLOYMENT.md - Deployment guide
- FEATURES.md - Feature list
- SETUP.md - Detailed setup guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.
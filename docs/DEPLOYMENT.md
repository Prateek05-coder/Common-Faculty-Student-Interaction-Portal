# Deployment Guide

## Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Firebase project (for file storage)

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_SOCKET_URL=https://your-backend-domain.com
```

## Deployment Options

### 1. Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy

#### Backend (Render)
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Set environment variables
5. Deploy

### 2. Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build -d
```

### 3. Traditional Server

#### Backend
```bash
cd backend
npm install --production
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run build
# Serve build folder with nginx or Apache
```

## Database Setup

### MongoDB Atlas (Recommended)
1. Create cluster at mongodb.com/cloud/atlas
2. Create database user
3. Whitelist IP addresses
4. Get connection string

### Local MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongod
```

## SSL/HTTPS

For production, always use HTTPS:
- Use Let's Encrypt for free SSL certificates
- Configure reverse proxy (Nginx/Apache)
- Update CORS settings

## Monitoring

Set up monitoring for:
- Server health
- Database connections
- Error rates
- Response times
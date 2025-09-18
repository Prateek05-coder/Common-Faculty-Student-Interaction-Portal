# Detailed Setup Guide

## System Requirements

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **MongoDB**: Version 4.4 or higher
- **Memory**: Minimum 2GB RAM
- **Storage**: At least 1GB free space

## Step-by-Step Installation

### 1. Project Setup
```bash
# Extract the project files
unzip faculty-portal-fullstack.zip
cd faculty-portal-fullstack

# Install root dependencies
npm install
```

### 2. Backend Setup
```bash
cd backend

# Install backend dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install frontend dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

### 4. Database Configuration

#### Option A: Local MongoDB
```bash
# Install MongoDB Community Edition
# Ubuntu/Debian:
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installation
mongo --version
```

#### Option B: MongoDB Atlas (Cloud)
1. Visit https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new cluster
4. Create a database user
5. Whitelist your IP address
6. Get the connection string
7. Update MONGODB_URI in backend/.env

### 5. Firebase Setup (Optional - for file storage)
1. Go to https://console.firebase.google.com/
2. Create a new project
3. Enable Firebase Storage
4. Go to Project Settings > Service Accounts
5. Generate a new private key
6. Download the JSON file
7. Extract configuration values for .env files

### 6. Email Configuration (Optional)
For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use App Password in EMAIL_PASS

### 7. Running the Application

#### Development Mode
```bash
# From project root - runs both frontend and backend
npm run dev

# Or run separately:
# Terminal 1 (Backend):
cd backend && npm run dev

# Terminal 2 (Frontend):
cd frontend && npm start
```

#### Production Mode
```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm start
```

### 8. Initial Data (Optional)
```bash
# Seed database with sample data
cd backend
npm run seed
```

### 9. Verification

Visit the following URLs to verify installation:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

### 10. Test Login

Use these test accounts:
- **Student**: alice@university.edu / password123
- **Faculty**: sarah@university.edu / password123
- **Admin**: admin@university.edu / admin123

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 5000
npx kill-port 3000
npx kill-port 5000
```

#### MongoDB Connection Issues
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check connection string in .env
- Ensure firewall allows MongoDB port (27017)

#### Node Modules Issues
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Environment Variables Not Loading
- Ensure .env files are in correct directories
- Restart servers after changing .env
- Check for syntax errors in .env files

### Performance Optimization

#### Development
- Use `npm run dev` for hot reloading
- Install React Developer Tools
- Use Redux DevTools for state debugging

#### Production
- Set NODE_ENV=production
- Enable gzip compression
- Use a reverse proxy (nginx)
- Implement caching strategies

### Security Checklist

- [ ] Change default JWT secrets
- [ ] Use HTTPS in production
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Validate all inputs
- [ ] Use environment variables for secrets
- [ ] Keep dependencies updated

## Next Steps

1. Customize the application for your institution
2. Add your branding and colors
3. Configure email templates
4. Set up monitoring and logging
5. Plan your deployment strategy
6. Train users on the platform

For additional support, refer to the API documentation and feature guide.

const admin = require('firebase-admin');

// Firebase configuration using environment variables
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    try {
      // Option 1: Using service account key file (recommended for development)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      // Option 2: Using environment variables (recommended for production)
      else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          }),
          projectId: process.env.FIREBASE_PROJECT_ID
        });
      }
      else {
        console.warn('Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables or FIREBASE_SERVICE_ACCOUNT_PATH.');
        return null;
      }
      
      console.log('✅ Firebase Admin initialized successfully');
      return admin;
    } catch (error) {
      console.error('❌ Firebase initialization error:', error.message);
      return null;
    }
  }
  return admin;
};

module.exports = initializeFirebase();

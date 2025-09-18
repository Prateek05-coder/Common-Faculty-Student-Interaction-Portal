const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Create demo accounts if they don't exist
const createDemoAccounts = async () => {
  try {
    const demoUsers = [
      {
        name: 'John Student',
        email: 'john.student@university.edu',
        password: 'password123',
        role: 'student',
        studentId: 'STU001',
        isEmailVerified: true,
        isActive: true,
        profile: {
          bio: 'Demo student account for testing',
          avatar: '',
          phone: '+1-234-567-8901',
          address: '123 University Ave, Campus City'
        }
      },
      {
        name: 'Prof. Smith',
        email: 'prof.smith@university.edu', 
        password: 'password123',
        role: 'faculty',
        employeeId: 'FAC001',
        isEmailVerified: true,
        isActive: true,
        teachingCourses: [],
        profile: {
          bio: 'Demo faculty account for testing',
          avatar: '',
          phone: '+1-234-567-8902',
          address: '456 Faculty Row, Campus City'
        }
      },
      {
        name: 'Jane TA',
        email: 'jane.ta@university.edu',
        password: 'password123', 
        role: 'ta',
        employeeId: 'TA001',
        isEmailVerified: true,
        isActive: true,
        assistingCourses: [],
        profile: {
          bio: 'Demo TA account for testing',
          avatar: '',
          phone: '+1-234-567-8903',
          address: '789 TA Lane, Campus City'
        }
      },
      {
        name: 'System Admin',
        email: 'admin@university.edu',
        password: 'password123',
        role: 'admin',
        employeeId: 'ADM001',
        isEmailVerified: true,
        isActive: true,
        profile: {
          bio: 'Demo system administrator account for testing',
          avatar: '',
          phone: '+1-234-567-8904',
          address: '101 Admin Building, Campus City'
        }
      }
    ];

    let createdCount = 0;
    let existingCount = 0;

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (!existingUser) {
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        
        // Create user with all required fields
        const newUserData = {
          ...userData,
          password: hashedPassword,
          enrolledCourses: userData.role === 'student' ? [] : undefined,
          teachingCourses: userData.role === 'faculty' ? [] : undefined,
          assistingCourses: userData.role === 'ta' ? [] : undefined,
          createdAt: new Date(),
          lastActive: new Date(),
          lastLogin: new Date(),
          institutionCode: 'university.edu',
          preferences: {
            theme: 'system',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              assignments: true,
              messages: true
            }
          }
        };

        const newUser = new User(newUserData);
        await newUser.save();
        createdCount++;
        console.log(`✅ Created demo ${userData.role}: ${userData.email}`);
      } else {
        // Update existing user to ensure they have correct password and are active
        if (!existingUser.isActive) {
          existingUser.isActive = true;
          await existingUser.save();
          console.log(`🔄 Activated demo ${userData.role}: ${userData.email}`);
        }
        
        // Ensure password is correct (useful for development)
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
        existingUser.password = hashedPassword;
        existingUser.lastActive = new Date();
        await existingUser.save();
        
        existingCount++;
        console.log(`📋 Updated demo ${userData.role}: ${userData.email}`);
      }
    }

    console.log(`🎯 Demo accounts setup complete: ${createdCount} created, ${existingCount} updated`);
    return { created: createdCount, updated: existingCount };
  } catch (error) {
    console.error('❌ Error creating demo accounts:', error);
    return false;
  }
};

// Get demo accounts info
const getDemoAccountsInfo = () => {
  return [
    {
      email: 'john.student@university.edu',
      password: 'password123',
      role: 'student',
      name: 'John Student',
      description: 'Demo student account'
    },
    {
      email: 'prof.smith@university.edu',
      password: 'password123',
      role: 'faculty',
      name: 'Prof. Smith',
      description: 'Demo faculty account'
    },
    {
      email: 'jane.ta@university.edu',
      password: 'password123',
      role: 'ta',
      name: 'Jane TA',
      description: 'Demo TA account'
    },
    {
      email: 'admin@university.edu',
      password: 'password123',
      role: 'admin',
      name: 'System Admin',
      description: 'Demo system administrator account'
    }
  ];
};

// Reset demo account passwords (useful for development)
const resetDemoPasswords = async () => {
  try {
    const accounts = getDemoAccountsInfo();
    let resetCount = 0;

    for (const account of accounts) {
      const user = await User.findOne({ email: account.email });
      if (user) {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(account.password, saltRounds);
        user.password = hashedPassword;
        user.isActive = true;
        user.lastActive = new Date();
        await user.save();
        resetCount++;
        console.log(`🔑 Reset password for ${account.role}: ${account.email}`);
      }
    }

    console.log(`🎯 Password reset complete for ${resetCount} demo accounts`);
    return resetCount;
  } catch (error) {
    console.error('❌ Error resetting demo passwords:', error);
    return 0;
  }
};

module.exports = {
  createDemoAccounts,
  getDemoAccountsInfo,
  resetDemoPasswords
};
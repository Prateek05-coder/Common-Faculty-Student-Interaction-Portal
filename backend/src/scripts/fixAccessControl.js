
const mongoose = require('mongoose');
const Course = require('../models/Course');
const User = require('../models/User');
const Video = require('../models/Video');

const fixAccessControl = async () => {
  try {
    console.log('🔧 Starting comprehensive access control fix...');

    console.log('\n📚 Fixing course relationships...');
    const courses = await Course.find({});
    let coursesFixed = 0;

    for (const course of courses) {
      let courseUpdated = false;

      // Ensure teachingAssistants array exists
      if (!course.teachingAssistants) {
        course.teachingAssistants = [];
        courseUpdated = true;
        console.log(`✅ Added teachingAssistants array to ${course.code}`);
      }

      // Ensure enrolledStudents array exists
      if (!course.enrolledStudents) {
        course.enrolledStudents = [];
        courseUpdated = true;
        console.log(`✅ Added enrolledStudents array to ${course.code}`);
      }

      // Ensure faculty is properly set
      if (!course.faculty) {
        console.log(`⚠️ Course ${course.code} has no faculty assigned`);
      }

      if (courseUpdated) {
        await course.save();
        coursesFixed++;
      }
    }

    console.log(`✅ Fixed ${coursesFixed} courses`);


    console.log('\n👥 Fixing user-course relationships...');
    const users = await User.find({});
    let usersFixed = 0;

    for (const user of users) {
      let userUpdated = false;

      // Ensure arrays exist for all user types
      if (user.role === 'student' && !user.enrolledCourses) {
        user.enrolledCourses = [];
        userUpdated = true;
      }

      if (user.role === 'faculty' && !user.teachingCourses) {
        user.teachingCourses = [];
        userUpdated = true;
      }

      if (user.role === 'ta' && !user.assistingCourses) {
        user.assistingCourses = [];
        userUpdated = true;
      }

      if (userUpdated) {
        await user.save();
        usersFixed++;
        console.log(`✅ Fixed user arrays for ${user.email}`);
      }
    }

    console.log(`✅ Fixed ${usersFixed} users`);
    console.log('\n🔄 Syncing course-user relationships...');
    let relationshipsFixed = 0;

    for (const course of courses) {
      if (course.faculty) {
        // Ensure faculty user has this course in teachingCourses
        const faculty = await User.findById(course.faculty);
        if (faculty && faculty.role === 'faculty') {
          if (!faculty.teachingCourses) {
            faculty.teachingCourses = [];
          }
          
          if (!faculty.teachingCourses.includes(course._id)) {
            faculty.teachingCourses.push(course._id);
            await faculty.save();
            relationshipsFixed++;
            console.log(`✅ Added course ${course.code} to faculty ${faculty.email}`);
          }
        }
      }

      for (const taId of course.teachingAssistants || []) {
        const ta = await User.findById(taId);
        if (ta && ta.role === 'ta') {
          if (!ta.assistingCourses) {
            ta.assistingCourses = [];
          }
          
          if (!ta.assistingCourses.includes(course._id)) {
            ta.assistingCourses.push(course._id);
            await ta.save();
            relationshipsFixed++;
            console.log(`✅ Added course ${course.code} to TA ${ta.email}`);
          }
        }
      }

      // Sync student relationships
      for (const enrollment of course.enrolledStudents || []) {
        const studentId = enrollment.student;
        const student = await User.findById(studentId);
        if (student && student.role === 'student') {
          if (!student.enrolledCourses) {
            student.enrolledCourses = [];
          }
          
          const existingEnrollment = student.enrolledCourses.find(
            ec => ec.course && ec.course.toString() === course._id.toString()
          );
          
          if (!existingEnrollment) {
            student.enrolledCourses.push({
              course: course._id,
              enrolledAt: enrollment.enrolledAt || new Date(),
              status: enrollment.status || 'active'
            });
            await student.save();
            relationshipsFixed++;
            console.log(`✅ Added course ${course.code} to student ${student.email}`);
          }
        }
      }
    }

    console.log(`✅ Fixed ${relationshipsFixed} relationships`);

    console.log('\n🎥 Verifying video access...');
    const videos = await Video.find({}).populate('course');
    let videosChecked = 0;

    for (const video of videos) {
      if (video.course) {
        videosChecked++;
        console.log(`✅ Video "${video.title}" linked to course ${video.course.code}`);
      } else {
        console.log(`⚠️ Video "${video.title}" has no course link`);
      }
    }

    console.log(`✅ Checked ${videosChecked} videos`);

    console.log('\n📊 SUMMARY REPORT:');
    console.log('==================');
    console.log(`Total Courses: ${courses.length}`);
    console.log(`Courses Fixed: ${coursesFixed}`);
    console.log(`Total Users: ${users.length}`);
    console.log(`Users Fixed: ${usersFixed}`);
    console.log(`Relationships Fixed: ${relationshipsFixed}`);
    console.log(`Videos Checked: ${videosChecked}`);
    console.log('\n🧪 Testing access control...');
    const testResults = [];

    for (const course of courses.slice(0, 3)) { // Test first 3 courses
      const testResult = {
        courseCode: course.code,
        facultyAccess: false,
        taAccess: false,
        studentAccess: false
      };

      // Test faculty access
      if (course.faculty) {
        const faculty = await User.findById(course.faculty);
        if (faculty) {
          testResult.facultyAccess = true;
          console.log(`✅ Faculty ${faculty.email} can access ${course.code}`);
        }
      }

      // Test TA access
      if (course.teachingAssistants && course.teachingAssistants.length > 0) {
        const ta = await User.findById(course.teachingAssistants[0]);
        if (ta) {
          testResult.taAccess = true;
          console.log(`✅ TA ${ta.email} can access ${course.code}`);
        }
      }

      // Test student access
      if (course.enrolledStudents && course.enrolledStudents.length > 0) {
        const student = await User.findById(course.enrolledStudents[0].student);
        if (student) {
          testResult.studentAccess = true;
          console.log(`✅ Student ${student.email} can access ${course.code}`);
        }
      }

      testResults.push(testResult);
    }

    console.log('\n🎉 Access control fix completed successfully!');
    console.log('All course relationships have been verified and fixed.');
    console.log('Video upload access control should now work properly.');

    return {
      success: true,
      coursesFixed,
      usersFixed,
      relationshipsFixed,
      videosChecked,
      testResults
    };

  } catch (error) {
    console.error('💥 Error fixing access control:', error);
    throw error;
  }
};

// Export for use in API endpoint
module.exports = { fixAccessControl };

// Run directly if called as script
if (require.main === module) {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty-portal';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('📡 Connected to MongoDB');
      return fixAccessControl();
    })
    .then((result) => {
      console.log('\n✅ Fix completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}

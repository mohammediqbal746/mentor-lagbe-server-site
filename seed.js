require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const seedTutors = [
  {
    name: 'Dr. Tanvir Ahmed',
    email: 'tanvir.tutor@mentorlagbe.com',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
    role: 'tutor',
    phone: '01711000001',
    bio: 'M.Sc. in Mathematics with 8+ years of teaching SSC & HSC students.',
    plan: 'pro',
    bookmarks: [],
    createdAt: new Date()
  },
  {
    name: 'Nusrat Jahan',
    email: 'nusrat.tutor@mentorlagbe.com',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
    role: 'tutor',
    phone: '01711000002',
    bio: 'IELTS Band 8.5 instructor and English Literature graduate.',
    plan: 'pro',
    bookmarks: [],
    createdAt: new Date()
  },
  {
    name: 'Engr. Rafiqul Islam',
    email: 'rafiq.tutor@mentorlagbe.com',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    role: 'tutor',
    phone: '01711000003',
    bio: 'BUET graduate specializing in HSC Physics, Chemistry & Admission prep.',
    plan: 'pro',
    bookmarks: [],
    createdAt: new Date()
  },
  {
    name: 'Mahmudul Hasan',
    email: 'mahmud.tutor@mentorlagbe.com',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    role: 'tutor',
    phone: '01711000004',
    bio: 'Full-Stack Software Engineer mentoring students in Python, C++ & Web Dev.',
    plan: 'pro',
    bookmarks: [],
    createdAt: new Date()
  }
];

const seedTuitions = [
  {
    title: 'HSC Higher Mathematics Complete Batch',
    subject: 'Mathematics',
    classLevel: 'HSC',
    mode: 'Online',
    location: 'Zoom / Google Meet',
    monthlyFee: 2500,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
    description: 'Comprehensive coverage of HSC Higher Math 1st & 2nd paper with weekly model tests, calculus deep-dives, and board question solving.',
    tutorName: 'Dr. Tanvir Ahmed',
    tutorEmail: 'tanvir.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'IELTS Academic & General 8.0+ Bootcamp',
    subject: 'IELTS',
    classLevel: 'University / Adult',
    mode: 'Online',
    location: 'Online Live Class',
    monthlyFee: 4500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800',
    description: 'Structured IELTS preparation focusing on Writing Task 1 & 2 feedback, 1-on-1 Speaking mocks, and Reading speed techniques.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'HSC Physics Concept & Admission Prep',
    subject: 'Physics',
    classLevel: 'HSC',
    mode: 'Offline',
    location: 'Dhanmondi, Dhaka',
    monthlyFee: 3500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800',
    description: 'Master mechanics, electromagnetism, and modern physics with visual simulations and BUET/DU admission problem sets.',
    tutorName: 'Engr. Rafiqul Islam',
    tutorEmail: 'rafiq.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'Python & Problem Solving for Beginners',
    subject: 'Programming',
    classLevel: 'University / Adult',
    mode: 'Online',
    location: 'Discord & Google Meet',
    monthlyFee: 3000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
    description: 'Learn Python from scratch, data structures, and solve 100+ Codeforces/LeetCode problems with live code reviews.',
    tutorName: 'Mahmudul Hasan',
    tutorEmail: 'mahmud.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'SSC General & Higher Math Foundation',
    subject: 'Mathematics',
    classLevel: 'SSC',
    mode: 'Offline',
    location: 'Agrabad, Chittagong',
    monthlyFee: 2000,
    daysPerWeek: 5,
    bannerImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800',
    description: 'Strong geometry, trigonometry, and algebra foundation for Class 9-10 students aiming for A+ in SSC board exams.',
    tutorName: 'Dr. Tanvir Ahmed',
    tutorEmail: 'tanvir.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'Spoken English & Presentation Fluency',
    subject: 'English',
    classLevel: 'HSC',
    mode: 'Online',
    location: 'Online Live Class',
    monthlyFee: 1800,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800',
    description: 'Interactive speaking practice, pronunciation drills, and confidence building for college and university students.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'HSC Organic & Inorganic Chemistry Mastery',
    subject: 'Chemistry',
    classLevel: 'HSC',
    mode: 'Online',
    location: 'Zoom Live',
    monthlyFee: 2800,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
    description: 'Easy reaction mechanisms, organic conversions, and medical/engineering admission question bank practice.',
    tutorName: 'Engr. Rafiqul Islam',
    tutorEmail: 'rafiq.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'Full-Stack Web Development Mentorship (MERN)',
    subject: 'Programming',
    classLevel: 'University / Adult',
    mode: 'Online',
    location: 'Google Meet',
    monthlyFee: 5000,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    description: '1-on-1 project-based mentorship covering React, Next.js, Node.js, Express, MongoDB, and deployment best practices.',
    tutorName: 'Mahmudul Hasan',
    tutorEmail: 'mahmud.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'Class 8 Science & Mathematics Care',
    subject: 'Mathematics',
    classLevel: 'Class 6-8',
    mode: 'Offline',
    location: 'Uttara, Dhaka',
    monthlyFee: 2200,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    description: 'Personalized home-style batch focusing on clear concept building in Math and General Science with monthly parent updates.',
    tutorName: 'Dr. Tanvir Ahmed',
    tutorEmail: 'tanvir.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'SSC Physics & Chemistry Practical Batch',
    subject: 'Physics',
    classLevel: 'SSC',
    mode: 'Offline',
    location: 'Mirpur, Dhaka',
    monthlyFee: 2400,
    daysPerWeek: 4,
    bannerImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
    description: 'Chapter-wise creative question (CQ) and MCQ mastery for Class 9 and 10 Science students.',
    tutorName: 'Engr. Rafiqul Islam',
    tutorEmail: 'rafiq.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'English Grammar & Academic Writing',
    subject: 'English',
    classLevel: 'SSC',
    mode: 'Online',
    location: 'Zoom',
    monthlyFee: 1500,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    description: 'Complete SSC English 1st & 2nd paper grammar rules, freehand writing, and composition techniques.',
    tutorName: 'Nusrat Jahan',
    tutorEmail: 'nusrat.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  },
  {
    title: 'HSC ICT (C Programming & HTML/SQL)',
    subject: 'Programming',
    classLevel: 'HSC',
    mode: 'Online',
    location: 'Online Live Class',
    monthlyFee: 1600,
    daysPerWeek: 3,
    bannerImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    description: 'Hands-on HSC ICT preparation covering number systems, digital logic, HTML tables, C programming, and SQL databases.',
    tutorName: 'Mahmudul Hasan',
    tutorEmail: 'mahmud.tutor@mentorlagbe.com',
    approvalStatus: 'approved',
    isActive: true,
    createdAt: new Date()
  }
];

async function runSeed() {
  try {
    await client.connect();
    const db = client.db('mentorLagbeDB');
    const usersCol = db.collection('users');
    const tuitionsCol = db.collection('tuitions');

    // Insert tutors if they don't already exist
    for (const tutor of seedTutors) {
      await usersCol.updateOne(
        { email: tutor.email },
        { $setOnInsert: tutor },
        { upsert: true }
      );
    }

    // Insert tuitions only if collection is empty
    const existingCount = await tuitionsCol.countDocuments();
    if (existingCount === 0) {
      await tuitionsCol.insertMany(seedTuitions);
      console.log('✅ Seeded 4 tutors and 12 approved tuitions successfully!');
    } else {
      console.log(`ℹ️ Tuitions collection already has ${existingCount} items. Skipped inserting duplicates.`);
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await client.close();
  }
}

runSeed();
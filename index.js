const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let usersCollection, tuitionsCollection, applicationsCollection, paymentsCollection;

async function connectDB() {
  if (!usersCollection) {
    await client.connect();
    const db = client.db('mentorLagbeDB');
    usersCollection = db.collection('users');
    tuitionsCollection = db.collection('tuitions');
    applicationsCollection = db.collection('applications');
    paymentsCollection = db.collection('payments');
    console.log('✅ Connected to MongoDB (mentorLagbeDB)');
  }
}

// Ensure DB is connected before handling requests (Vercel friendly)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('DB Connection Error:', error);
    res.status(500).send({ message: 'Database connection failed' });
  }
});
// ==================== JWT & ROLE MIDDLEWARES ====================

// 1. Generate JWT Token
app.post('/jwt', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send({ message: 'Email is required' });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.send({ token });
  } catch (error) {
    res.status(500).send({ message: 'Failed to generate token' });
  }
});

// 2. Verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized access: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access: Invalid token' });
    }
    req.decoded = decoded;
    next();
  });
};

// 3. Verify Student Role
const verifyStudent = async (req, res, next) => {
  const email = req.decoded?.email;
  const user = await usersCollection.findOne({ email });
  if (user?.role !== 'student') {
    return res.status(403).send({ message: 'Forbidden: Student access required' });
  }
  next();
};

// 4. Verify Tutor Role
const verifyTutor = async (req, res, next) => {
  const email = req.decoded?.email;
  const user = await usersCollection.findOne({ email });
  if (user?.role !== 'tutor') {
    return res.status(403).send({ message: 'Forbidden: Tutor access required' });
  }
  next();
};

// 5. Verify Admin Role
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded?.email;
  const user = await usersCollection.findOne({ email });
  if (user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden: Admin access required' });
  }
  next();
};

// ==================== USERS API ====================

// 1. Save or get user on Sign Up / Login
app.post('/users', async (req, res) => {
  try {
    const user = req.body;
    const existingUser = await usersCollection.findOne({ email: user.email });
    if (existingUser) {
      return res.send({ message: 'User already exists', user: existingUser });
    }
    const newUser = {
      name: user.name || 'User',
      email: user.email,
      image: user.image || '',
      role: user.role || 'student',
      phone: user.phone || '',
      bio: user.bio || '',
      plan: 'free',
      bookmarks: [],
      createdAt: new Date()
    };
    const result = await usersCollection.insertOne(newUser);
    res.send({ insertedId: result.insertedId, user: newUser });
  } catch (error) {
    res.status(500).send({ message: 'Failed to save user' });
  }
});

// 2. Get single user by email
app.get('/users/:email', verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    const user = await usersCollection.findOne({ email });
    res.send(user);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch user' });
  }
});

// 3. Update user profile (Shared for all roles)
app.patch('/users/profile/:email', verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    if (req.decoded.email !== email) {
      return res.status(403).send({ message: 'Forbidden access' });
    }
    const { name, phone, bio, image } = req.body;
    const updateDoc = {
      $set: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(image !== undefined && { image }),
      }
    };
    const result = await usersCollection.updateOne({ email }, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update profile' });
  }
});

// 4. Get all users (Admin only)
app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await usersCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch users' });
  }
});

// 5. Update user role (Admin only)
app.patch('/users/role/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;
    if (!['student', 'tutor', 'admin'].includes(role)) {
      return res.status(400).send({ message: 'Invalid role' });
    }
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update user role' });
  }
});

// ==================== TUITIONS API ====================

// 1. Get Approved & Active Tuitions (Public: Search, Filter & Pagination)
app.get('/tuitions', async (req, res) => {
  try {
    const { search, subject, classLevel, mode, page = 1, limit = 6 } = req.query;

    const query = {
      approvalStatus: 'approved',
      isActive: true
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }
    if (subject && subject !== 'All') {
      query.subject = { $regex: subject, $options: 'i' };
    }
    if (classLevel && classLevel !== 'All') {
      query.classLevel = classLevel;
    }
    if (mode && mode !== 'All') {
      query.mode = mode;
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 6;
    const skip = (pageNum - 1) * limitNum;

    const total = await tuitionsCollection.countDocuments(query);
    const tuitions = await tuitionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.send({
      tuitions,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch tuitions' });
  }
});

// 2. Get Single Tuition Details (Public)
app.get('/tuitions/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid tuition ID' });
    }
    const tuition = await tuitionsCollection.findOne({ _id: new ObjectId(id) });
    if (!tuition) {
      return res.status(404).send({ message: 'Tuition not found' });
    }
    res.send(tuition);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch tuition details' });
  }
});

// 3. Create New Tuition (Tutor only - Free limit: 2, Pro: Unlimited)
app.post('/tuitions', verifyToken, verifyTutor, async (req, res) => {
  try {
    const tutorEmail = req.decoded.email;
    const tutor = await usersCollection.findOne({ email: tutorEmail });

    if (tutor?.plan !== 'pro') {
      const existingCount = await tuitionsCollection.countDocuments({ tutorEmail });
      if (existingCount >= 2) {
        return res.status(403).send({
          message: 'Free plan tutors can post up to 2 tuitions. Upgrade to Pro for unlimited posts!'
        });
      }
    }

    const tuitionData = req.body;
    const newTuition = {
      title: tuitionData.title,
      subject: tuitionData.subject,
      classLevel: tuitionData.classLevel,
      mode: tuitionData.mode,
      location: tuitionData.location || 'Online',
      monthlyFee: Number(tuitionData.monthlyFee),
      daysPerWeek: Number(tuitionData.daysPerWeek),
      bannerImage: tuitionData.bannerImage || '',
      description: tuitionData.description,
      tutorName: tutor?.name || tuitionData.tutorName,
      tutorEmail,
      approvalStatus: 'pending',
      isActive: true,
      createdAt: new Date()
    };

    const result = await tuitionsCollection.insertOne(newTuition);
    res.send({ insertedId: result.insertedId, tuition: newTuition });
  } catch (error) {
    res.status(500).send({ message: 'Failed to create tuition' });
  }
});

// 4. Get Tutor's Own Tuitions (Tutor only)
app.get('/tutor/tuitions', verifyToken, verifyTutor, async (req, res) => {
  try {
    const tutorEmail = req.decoded.email;
    const tuitions = await tuitionsCollection
      .find({ tutorEmail })
      .sort({ createdAt: -1 })
      .toArray();
    res.send(tuitions);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch your tuitions' });
  }
});

// 5. Update Tuition or Toggle Active Status (Tutor only)
app.patch('/tuitions/:id', verifyToken, verifyTutor, async (req, res) => {
  try {
    const id = req.params.id;
    const tutorEmail = req.decoded.email;
    const tuition = await tuitionsCollection.findOne({ _id: new ObjectId(id) });

    if (!tuition || tuition.tutorEmail !== tutorEmail) {
      return res.status(403).send({ message: 'Forbidden: You can only edit your own tuitions' });
    }

    const updatedFields = { ...req.body };
    delete updatedFields._id;
    delete updatedFields.approvalStatus; // Tutor cannot self-approve
    delete updatedFields.tutorEmail;

    if (updatedFields.monthlyFee) updatedFields.monthlyFee = Number(updatedFields.monthlyFee);
    if (updatedFields.daysPerWeek) updatedFields.daysPerWeek = Number(updatedFields.daysPerWeek);

    const result = await tuitionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedFields }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update tuition' });
  }
});

// 6. Delete Tuition (Tutor only)
app.delete('/tuitions/:id', verifyToken, verifyTutor, async (req, res) => {
  try {
    const id = req.params.id;
    const tutorEmail = req.decoded.email;
    const result = await tuitionsCollection.deleteOne({
      _id: new ObjectId(id),
      tutorEmail
    });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Tuition not found or unauthorized' });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to delete tuition' });
  }
});

// 7. Get All Tuitions for Moderation (Admin only)
app.get('/admin/tuitions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const tuitions = await tuitionsCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(tuitions);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch all tuitions' });
  }
});

// 8. Approve or Reject Tuition (Admin only)
app.patch('/admin/tuitions/status/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).send({ message: 'Invalid approval status' });
    }
    const result = await tuitionsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update tuition status' });
  }
});

// ==================== APPLICATIONS API ====================

// 1. Submit Tuition Application (Student only + Duplicate Prevention)
app.post('/applications', verifyToken, verifyStudent, async (req, res) => {
  try {
    const studentEmail = req.decoded.email;
    const {
      tuitionId,
      tuitionTitle,
      subject,
      monthlyFee,
      tutorEmail,
      studentName,
      studentPhone,
      preferredSchedule,
      studentNote
    } = req.body;

    // Prevent duplicate application by the same student for the same tuition
    const existingApp = await applicationsCollection.findOne({
      tuitionId,
      studentEmail
    });
    if (existingApp) {
      return res.status(409).send({ message: 'You have already applied for this tuition!' });
    }

    const newApplication = {
      tuitionId,
      tuitionTitle,
      subject,
      monthlyFee: Number(monthlyFee),
      tutorEmail,
      studentName,
      studentEmail,
      studentPhone,
      preferredSchedule,
      studentNote: studentNote || '',
      status: 'pending',
      appliedAt: new Date()
    };

    const result = await applicationsCollection.insertOne(newApplication);
    res.send({ insertedId: result.insertedId, application: newApplication });
  } catch (error) {
    res.status(500).send({ message: 'Failed to submit application' });
  }
});

// 2. Get Student's Own Applications (Student only)
app.get('/student/applications', verifyToken, verifyStudent, async (req, res) => {
  try {
    const studentEmail = req.decoded.email;
    const applications = await applicationsCollection
      .find({ studentEmail })
      .sort({ appliedAt: -1 })
      .toArray();
    res.send(applications);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch applications' });
  }
});

// 3. Cancel/Delete Pending Application (Student only)
app.delete('/applications/:id', verifyToken, verifyStudent, async (req, res) => {
  try {
    const id = req.params.id;
    const studentEmail = req.decoded.email;

    const application = await applicationsCollection.findOne({
      _id: new ObjectId(id),
      studentEmail
    });

    if (!application) {
      return res.status(404).send({ message: 'Application not found' });
    }
    if (application.status !== 'pending') {
      return res.status(400).send({ message: 'Only pending applications can be cancelled' });
    }

    const result = await applicationsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to cancel application' });
  }
});

// 4. Get All Applicants for Tutor's Tuitions (Tutor only)
app.get('/tutor/applicants', verifyToken, verifyTutor, async (req, res) => {
  try {
    const tutorEmail = req.decoded.email;
    const applicants = await applicationsCollection
      .find({ tutorEmail })
      .sort({ appliedAt: -1 })
      .toArray();
    res.send(applicants);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch applicants' });
  }
});

// 5. Accept or Reject Application (Tutor only)
app.patch('/applications/status/:id', verifyToken, verifyTutor, async (req, res) => {
  try {
    const id = req.params.id;
    const tutorEmail = req.decoded.email;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).send({ message: 'Invalid status' });
    }

    const result = await applicationsCollection.updateOne(
      { _id: new ObjectId(id), tutorEmail },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: 'Application not found or unauthorized' });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: 'Failed to update application status' });
  }
});
// ==================== BOOKMARKS API (STUDENT) ====================

// 1. Toggle Bookmark (Add/Remove) - Free limit: 5, Pro: Unlimited
app.post('/student/bookmarks/:tuitionId', verifyToken, verifyStudent, async (req, res) => {
  try {
    const email = req.decoded.email;
    const tuitionId = req.params.tuitionId;
    const user = await usersCollection.findOne({ email });
    const currentBookmarks = user?.bookmarks || [];

    const isBookmarked = currentBookmarks.includes(tuitionId);

    if (isBookmarked) {
      await usersCollection.updateOne(
        { email },
        { $pull: { bookmarks: tuitionId } }
      );
      return res.send({ bookmarked: false, message: 'Removed from saved tuitions' });
    }

    if (user?.plan !== 'pro' && currentBookmarks.length >= 5) {
      return res.status(403).send({
        message: 'Free students can bookmark up to 5 tuitions. Upgrade to Pro for unlimited bookmarks!'
      });
    }

    await usersCollection.updateOne(
      { email },
      { $addToSet: { bookmarks: tuitionId } }
    );
    res.send({ bookmarked: true, message: 'Added to saved tuitions' });
  } catch (error) {
    res.status(500).send({ message: 'Failed to update bookmark' });
  }
});

// 2. Get All Bookmarked Tuitions for Logged-in Student
app.get('/student/bookmarks', verifyToken, verifyStudent, async (req, res) => {
  try {
    const email = req.decoded.email;
    const user = await usersCollection.findOne({ email });
    const bookmarkIds = (user?.bookmarks || [])
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    if (bookmarkIds.length === 0) {
      return res.send([]);
    }

    const tuitions = await tuitionsCollection
      .find({ _id: { $in: bookmarkIds } })
      .toArray();
    res.send(tuitions);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch bookmarked tuitions' });
  }
});

// ==================== DASHBOARD STATS API ====================

// 1. Student Dashboard Stats
app.get('/stats/student', verifyToken, verifyStudent, async (req, res) => {
  try {
    const email = req.decoded.email;
    const user = await usersCollection.findOne({ email });
    const totalApplied = await applicationsCollection.countDocuments({ studentEmail: email });
    const acceptedApps = await applicationsCollection.countDocuments({ studentEmail: email, status: 'accepted' });
    const pendingApps = await applicationsCollection.countDocuments({ studentEmail: email, status: 'pending' });

    res.send({
      totalApplied,
      acceptedApps,
      pendingApps,
      plan: user?.plan || 'free',
      totalBookmarks: user?.bookmarks?.length || 0
    });
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch student stats' });
  }
});

// 2. Tutor Dashboard Stats
app.get('/stats/tutor', verifyToken, verifyTutor, async (req, res) => {
  try {
    const email = req.decoded.email;
    const user = await usersCollection.findOne({ email });
    const totalPosted = await tuitionsCollection.countDocuments({ tutorEmail: email });
    const approvedTuitions = await tuitionsCollection.countDocuments({
      tutorEmail: email,
      approvalStatus: 'approved',
      isActive: true
    });
    const totalApplicants = await applicationsCollection.countDocuments({ tutorEmail: email });

    res.send({
      totalPosted,
      approvedTuitions,
      totalApplicants,
      plan: user?.plan || 'free'
    });
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch tutor stats' });
  }
});

// 3. Admin Dashboard Stats
app.get('/stats/admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const totalTutors = await usersCollection.countDocuments({ role: 'tutor' });
    const pendingTuitions = await tuitionsCollection.countDocuments({ approvalStatus: 'pending' });
    const approvedTuitions = await tuitionsCollection.countDocuments({ approvalStatus: 'approved' });

    const revenueResult = await paymentsCollection.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]).toArray();
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.send({
      totalUsers,
      totalTutors,
      pendingTuitions,
      approvedTuitions,
      totalRevenue
    });
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch admin stats' });
  }
});
// ==================== STRIPE PAYMENT API ====================

// 1. Create Stripe Checkout Session (Pro Tutor $15 / Pro Student $10)
app.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const email = req.decoded.email;
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const isTutor = user.role === 'tutor';
    const amount = isTutor ? 15 : 10; // $15 for Tutor, $10 for Student
    const planName = isTutor ? 'Pro Tutor Plan' : 'Pro Student Plan';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MentorLagbe - ${planName}`,
              description: isTutor
                ? 'Unlimited tuition posts & verified tutor badge'
                : 'Unlimited tuition bookmarks & priority booking',
            },
            unit_amount: amount * 100, // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userEmail: email,
        userName: user.name || 'User',
        userRole: user.role,
        planName,
        amount: String(amount),
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.send({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe Checkout Error:', error);
    res.status(500).send({ message: 'Failed to create checkout session' });
  }
});

// 2. Verify Stripe Session, Record Payment & Upgrade User to Pro
app.post('/payments/verify', verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).send({ message: 'Session ID is required' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(400).send({ message: 'Payment not completed' });
    }

    // Check if already recorded to prevent duplicates
    const existingPayment = await paymentsCollection.findOne({ stripeSessionId: sessionId });
    if (existingPayment) {
      return res.send({ success: true, payment: existingPayment, message: 'Already verified' });
    }

    const { userEmail, userName, userRole, planName, amount } = session.metadata;

    const paymentRecord = {
      userEmail,
      userName,
      userRole,
      planName,
      amount: Number(amount),
      currency: session.currency || 'usd',
      transactionId: session.payment_intent || sessionId,
      stripeSessionId: sessionId,
      paymentStatus: 'paid',
      paidAt: new Date(),
    };

    await paymentsCollection.insertOne(paymentRecord);
    await usersCollection.updateOne(
      { email: userEmail },
      { $set: { plan: 'pro' } }
    );

    res.send({ success: true, payment: paymentRecord });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).send({ message: 'Failed to verify payment' });
  }
});

// 3. Get All Transactions (Admin only)
app.get('/admin/transactions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const transactions = await paymentsCollection
      .find()
      .sort({ paidAt: -1 })
      .toArray();
    res.send(transactions);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch transactions' });
  }
});
// Root Route
app.get('/', (req, res) => {
  res.send({ status: 'ok', message: 'MentorLagbe Server is running!' });
});

// Local server listen
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 MentorLagbe server running on port ${port}`);
  });
}

module.exports = app;
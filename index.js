const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

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
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
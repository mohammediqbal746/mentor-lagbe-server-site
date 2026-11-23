const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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
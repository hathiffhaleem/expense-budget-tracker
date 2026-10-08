require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`Server listening on port ${port}`)))
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });

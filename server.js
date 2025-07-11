const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

// Import routes
const seoRoutes = require('./routes/seoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced security
app.use(helmet());

// Logging middleware
app.use(morgan('dev'));

// CORS setup
app.use(cors({
  origin: '*'
}));


// Request body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.send('Default route is working!');
});

app.use('/api', seoRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Key present: ${!!process.env.TEXT_RAZOR_API_KEY}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./src/routes/auth');
const applicationRoutes = require('./src/routes/applications');
const eligibilityRoutes = require('./src/routes/eligibility');
const adminRoutes = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// HTTP security headers — must be first middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));

// CORS — only allow the configured frontend origin; never allow no-origin requests
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Reject requests with no Origin header (curl, Postman, file:// XSS)
    if (!origin) return callback(new Error('Not allowed by CORS'));
    if (origin === ALLOWED_ORIGIN) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: false, // JWT Bearer tokens don't need cookie credentials
}));

// Body parsers with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NOTE: /uploads is intentionally NOT served as a static route.
// All file downloads go through the authenticated GET /api/applications/:id/documents endpoint.

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Maplewood Grants API is running' });
});

// Global error handler — never expose internal error details to the client
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);

  // Surface safe, user-facing Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File exceeds the 5 MB size limit.' });
  }
  if (err.message === 'Only PDF, JPG, and PNG files are allowed.') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

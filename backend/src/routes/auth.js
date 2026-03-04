const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login } = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  skipSuccessfulRequests: true,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

module.exports = router;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function register(req, res) {
  const { full_name, email, phone, organization_name, password, confirm_password } = req.body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number.',
    });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, phone, organization_name, role)
    VALUES (?, ?, ?, ?, ?, 'APPLICANT')
  `).run(
    email.toLowerCase(),
    passwordHash,
    full_name.trim(),
    phone ? phone.trim() : '',
    organization_name ? organization_name.trim() : '',
  );

  const token = jwt.sign(
    { id: result.lastInsertRowid, role: 'APPLICANT' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );

  res.status(201).json({
    message: 'Account created successfully.',
    token,
    user: {
      id: result.lastInsertRowid,
      email: email.toLowerCase(),
      full_name: full_name.trim(),
      role: 'APPLICANT',
    },
  });
}

function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m' },
  );

  res.json({
    message: 'Login successful.',
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
  });
}

module.exports = { register, login };

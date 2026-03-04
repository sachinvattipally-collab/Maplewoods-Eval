const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

function requireReviewer(req, res, next) {
  if (req.user.role !== 'REVIEWER') {
    return res.status(403).json({ error: 'Access denied. Reviewer role required.' });
  }
  next();
}

function requireApplicant(req, res, next) {
  if (req.user.role !== 'APPLICANT') {
    return res.status(403).json({ error: 'Access denied. Applicant role required.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
}

module.exports = { authenticate, requireReviewer, requireApplicant, requireAdmin };

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sanitizeFilename = require('sanitize-filename');
const { authenticate, requireReviewer, requireApplicant } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../utils/applicationHelpers');
const ctrl = require('../controllers/applicationController');

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safe = sanitizeFilename(file.originalname) || 'upload';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Routes — all business logic lives in the controller
router.get('/', authenticate, ctrl.listMyApplications);
router.get('/all', authenticate, requireReviewer, ctrl.listAllApplications);
router.get('/stats', authenticate, requireReviewer, ctrl.getStats);
router.get('/:id', authenticate, ctrl.getApplication);
router.get('/:id/documents', authenticate, ctrl.downloadDocument);
router.post('/', authenticate, requireApplicant, ctrl.createApplication);
router.post('/:id/documents', authenticate, requireApplicant, upload.single('document'), ctrl.uploadDocument);
router.patch('/:id/status', authenticate, requireReviewer, ctrl.updateStatus);
router.post('/:id/award', authenticate, requireReviewer, ctrl.previewAward);

module.exports = router;

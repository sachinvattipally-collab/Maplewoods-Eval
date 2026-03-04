const path = require('path');
const fs = require('fs');
const sanitizeFilename = require('sanitize-filename');
const { getDb } = require('../db/database');
const { checkEligibility } = require('../services/eligibilityEngine');
const { calculateAward } = require('../services/awardCalculator');
const { validateApplicationData, parseAppJson, sanitizeForApplicant, validateMagicBytes, deleteFile, UPLOAD_DIR } = require('../utils/applicationHelpers');

function listMyApplications(req, res) {
  if (req.user.role === 'REVIEWER') {
    return res.status(403).json({ error: 'Use /api/applications/all for reviewer access.' });
  }
  const db = getDb();
  const apps = db.prepare(`
    SELECT a.*, d.file_name
    FROM applications a
    LEFT JOIN documents d ON d.application_id = a.id
    WHERE a.applicant_id = ?
    ORDER BY a.created_at DESC
  `).all(req.user.id);

  res.json(apps.map((a) => sanitizeForApplicant(parseAppJson(a))));
}

function listAllApplications(req, res) {
  const db = getDb();
  const { eligibility, status } = req.query;

  const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];
  const statusFilter = typeof status === 'string' ? status.toUpperCase() : null;
  const eligibilityFilter = typeof eligibility === 'string' ? eligibility : null;

  let query = `
    SELECT a.*, u.full_name as applicant_name, u.email as applicant_email, d.file_name
    FROM applications a
    JOIN users u ON a.applicant_id = u.id
    LEFT JOIN documents d ON d.application_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (statusFilter && statusFilter !== 'ALL' && validStatuses.includes(statusFilter)) {
    query += ' AND a.status = ?';
    params.push(statusFilter);
  }

  if (eligibilityFilter === 'eligible') {
    query += ' AND a.is_eligible = 1';
  } else if (eligibilityFilter === 'not_eligible') {
    query += ' AND a.is_eligible = 0';
  }

  query += ' ORDER BY a.created_at ASC';

  const apps = db.prepare(query).all(...params);
  res.json(apps.map(parseAppJson));
}

function getStats(req, res) {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as submitted,
      COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
      COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN award_amount ELSE 0 END), 0) as total_awarded
    FROM applications
  `).get();
  res.json(stats);
}

function getApplication(req, res) {
  const db = getDb();
  const app = db.prepare(`
    SELECT a.*, u.full_name as applicant_name, u.email as applicant_email,
           d.file_name, d.file_type, d.file_size
    FROM applications a
    JOIN users u ON a.applicant_id = u.id
    LEFT JOIN documents d ON d.application_id = a.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!app) return res.status(404).json({ error: 'Application not found.' });

  if (req.user.role === 'APPLICANT' && app.applicant_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only view your own applications.' });
  }

  const parsed = parseAppJson(app);
  res.json(req.user.role === 'APPLICANT' ? sanitizeForApplicant(parsed) : parsed);
}

function downloadDocument(req, res) {
  const db = getDb();
  const row = db.prepare(`
    SELECT a.applicant_id, d.file_path, d.file_name, d.file_type
    FROM applications a
    LEFT JOIN documents d ON d.application_id = a.id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!row) return res.status(404).json({ error: 'Application not found.' });
  if (!row.file_path) return res.status(404).json({ error: 'No document uploaded for this application.' });

  if (req.user.role === 'APPLICANT' && row.applicant_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const absPath = path.join(UPLOAD_DIR, row.file_path);
  if (!fs.existsSync(absPath)) {
    return res.status(404).json({ error: 'File not found on server.' });
  }

  res.setHeader('Content-Type', row.file_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name)}"`);
  fs.createReadStream(absPath).pipe(res);
}

function createApplication(req, res) {
  const data = req.body;

  const validationErrors = validateApplicationData(data);
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: 'Validation failed.', details: validationErrors });
  }

  const eligibilityResult = checkEligibility(data);

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO applications (
      applicant_id, org_name, ein, org_type, year_founded, annual_budget, num_employees,
      contact_name, contact_email, contact_phone, org_address, mission_statement,
      project_title, project_category, project_description, target_population,
      num_beneficiaries, total_project_cost, amount_requested,
      project_start_date, project_end_date, prev_grant,
      eligibility_score, eligibility_results, is_eligible, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED'
    )
  `).run(
    req.user.id,
    data.org_name.trim(), data.ein, data.org_type,
    parseInt(data.year_founded), parseFloat(data.annual_budget), parseInt(data.num_employees),
    data.contact_name.trim(), data.contact_email, data.contact_phone,
    data.org_address.trim(), data.mission_statement.trim(),
    data.project_title.trim(), data.project_category, data.project_description.trim(),
    data.target_population.trim(),
    parseInt(data.num_beneficiaries), parseFloat(data.total_project_cost), parseFloat(data.amount_requested),
    data.project_start_date, data.project_end_date, data.prev_grant ? 1 : 0,
    eligibilityResult.score,
    JSON.stringify(eligibilityResult.rules),
    eligibilityResult.overallEligible ? 1 : 0,
  );

  db.prepare(`
    INSERT INTO status_history (application_id, old_status, new_status, changed_by, comments)
    VALUES (?, NULL, 'SUBMITTED', ?, 'Application submitted by applicant')
  `).run(result.lastInsertRowid, req.user.id);

  res.status(201).json({
    message: 'Application submitted successfully.',
    applicationId: result.lastInsertRowid,
    eligibility: eligibilityResult,
  });
}

function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const db = getDb();
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);

  if (!app) {
    deleteFile(req.file.path);
    return res.status(404).json({ error: 'Application not found.' });
  }

  if (app.applicant_id !== req.user.id) {
    deleteFile(req.file.path);
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (app.status === 'APPROVED' || app.status === 'REJECTED') {
    deleteFile(req.file.path);
    return res.status(400).json({
      error: 'Documents cannot be modified after a decision has been made on the application.',
    });
  }

  if (!validateMagicBytes(req.file.path)) {
    deleteFile(req.file.path);
    return res.status(400).json({
      error: 'File content does not match the declared type. Only genuine PDF, JPG, and PNG files are accepted.',
    });
  }

  const old = db.prepare('SELECT file_path FROM documents WHERE application_id = ?').get(req.params.id);
  if (old) {
    deleteFile(path.join(UPLOAD_DIR, old.file_path));
    db.prepare('DELETE FROM documents WHERE application_id = ?').run(req.params.id);
  }

  db.prepare(`
    INSERT INTO documents (application_id, file_name, file_type, file_size, file_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.params.id,
    sanitizeFilename(req.file.originalname) || 'document',
    req.file.mimetype,
    req.file.size,
    req.file.filename,
  );

  res.json({ message: 'File uploaded successfully.', fileName: req.file.originalname });
}

function updateStatus(req, res) {
  const { status, comments } = req.body;

  const validStatuses = ['UNDER_REVIEW', 'APPROVED', 'REJECTED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be UNDER_REVIEW, APPROVED, or REJECTED.' });
  }

  if (status === 'REJECTED' && (!comments || comments.trim() === '')) {
    return res.status(400).json({ error: 'A rejection reason is required.' });
  }

  if (comments && comments.length > 2000) {
    return res.status(400).json({ error: 'Comments must be 2,000 characters or fewer.' });
  }

  const db = getDb();
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });

  const forwardMap = {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: [],
  };

  const allowed = forwardMap[app.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Cannot transition from ${app.status} to ${status}. Status can only move forward and cannot be changed once a final decision is made.`,
    });
  }

  let awardData = {};
  if (status === 'APPROVED') {
    const award = calculateAward(app);
    awardData = {
      award_amount: award.finalAward,
      award_breakdown: JSON.stringify(award.breakdown),
      award_percentage: award.awardPercentage,
    };
  }

  db.prepare(`
    UPDATE applications
    SET status = ?, reviewer_id = ?, reviewer_comments = ?,
        award_amount = ?, award_breakdown = ?, award_percentage = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    status, req.user.id, comments ? comments.trim() : null,
    awardData.award_amount || null,
    awardData.award_breakdown || null,
    awardData.award_percentage || null,
    req.params.id,
  );

  db.prepare(`
    INSERT INTO status_history (application_id, old_status, new_status, changed_by, comments)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, app.status, status, req.user.id, comments ? comments.trim() : null);

  const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  res.json({
    message: `Application ${status.toLowerCase().replace('_', ' ')}.`,
    application: parseAppJson(updated),
  });
}

function previewAward(req, res) {
  const db = getDb();
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  if (app.status === 'APPROVED' || app.status === 'REJECTED') {
    return res.status(400).json({ error: 'A decision has already been made on this application.' });
  }

  const award = calculateAward(app);
  res.json(award);
}

module.exports = {
  listMyApplications,
  listAllApplications,
  getStats,
  getApplication,
  downloadDocument,
  createApplication,
  uploadDocument,
  updateStatus,
  previewAward,
};

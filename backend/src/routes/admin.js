const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/report', authenticate, requireAdmin, (req, res) => {
  const db = getDb();

  const statusCounts = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END) as submitted,
      COUNT(CASE WHEN status = 'UNDER_REVIEW' THEN 1 END) as under_review,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
      COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN award_amount ELSE 0 END), 0) as total_awarded,
      COALESCE(AVG(CASE WHEN status = 'APPROVED' THEN award_amount END), 0) as avg_award,
      COALESCE(MAX(CASE WHEN status = 'APPROVED' THEN award_amount END), 0) as max_award,
      COALESCE(MIN(CASE WHEN status = 'APPROVED' THEN award_amount END), 0) as min_award
    FROM applications
  `).get();

  const byCategory = db.prepare(`
    SELECT project_category as category, COUNT(*) as count,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN award_amount ELSE 0 END), 0) as total_awarded
    FROM applications WHERE project_category IS NOT NULL
    GROUP BY project_category ORDER BY count DESC
  `).all();

  const byEligibility = db.prepare(`
    SELECT CASE WHEN is_eligible = 1 THEN 'Eligible' ELSE 'Not Eligible' END as eligibility,
      COUNT(*) as count,
      COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
    FROM applications GROUP BY is_eligible
  `).all();

  const recentApps = db.prepare(`
    SELECT a.id, a.org_name, a.project_title, a.status, a.amount_requested,
      a.award_amount, a.is_eligible, a.eligibility_score, a.created_at,
      u.full_name as applicant_name
    FROM applications a JOIN users u ON a.applicant_id = u.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  const applicantCount = db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'APPLICANT'`).get();

  res.json({ summary: statusCounts, byCategory, byEligibility, recentApplications: recentApps, totalApplicants: applicantCount.count });
});

module.exports = router;

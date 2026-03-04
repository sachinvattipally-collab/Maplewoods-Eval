const express = require('express');
const { authenticate } = require('../middleware/auth');
const { checkEligibility } = require('../services/eligibilityEngine');
const { VALID_ORG_TYPES, VALID_CATEGORIES } = require('../utils/applicationHelpers');

const router = express.Router();

const ALLOWED_FIELDS = new Set([
  'org_type', 'orgType',
  'year_founded', 'yearFounded',
  'annual_budget', 'annualBudget',
  'amount_requested', 'amountRequested',
  'total_project_cost', 'totalProjectCost',
  'num_beneficiaries', 'numBeneficiaries',
]);

router.post('/check', authenticate, (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  // Strip all unrecognised keys — prevents prototype pollution surface
  const safe = {};
  for (const key of Object.keys(req.body)) {
    if (ALLOWED_FIELDS.has(key)) {
      safe[key] = req.body[key];
    }
  }

  const result = checkEligibility(safe);
  res.json(result);
});

module.exports = router;

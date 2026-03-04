const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const VALID_ORG_TYPES = [
  '501(c)(3)', '501(c)(4)', 'Community-Based Organization',
  'Faith-Based Organization', 'For-Profit Business', 'Government Agency', 'Individual',
];
const VALID_CATEGORIES = [
  'Youth Programs', 'Senior Services', 'Public Health', 'Neighborhood Safety',
  'Arts & Culture', 'Workforce Development', 'Other',
];
const PHONE_RE = /^\(\d{3}\) \d{3}-\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EIN_RE = /^\d{2}-\d{7}$/;

function validateApplicationData(data) {
  const errors = [];
  const currentYear = new Date().getFullYear();

  const orgName = (data.org_name || '').trim();
  if (!orgName || orgName.length < 2 || orgName.length > 100)
    errors.push('Organization name must be 2–100 characters.');

  if (!EIN_RE.test(data.ein || ''))
    errors.push('EIN must be in format XX-XXXXXXX.');

  if (!VALID_ORG_TYPES.includes(data.org_type))
    errors.push('Invalid organization type.');

  const yearFounded = parseInt(data.year_founded);
  if (isNaN(yearFounded) || yearFounded < 1800 || yearFounded > currentYear)
    errors.push(`Year founded must be between 1800 and ${currentYear}.`);

  const annualBudget = parseFloat(data.annual_budget);
  if (isNaN(annualBudget) || annualBudget < 0 || annualBudget > 100000000)
    errors.push('Annual operating budget must be between $0 and $100,000,000.');

  const numEmployees = parseInt(data.num_employees);
  if (isNaN(numEmployees) || numEmployees < 0 || numEmployees > 9999)
    errors.push('Number of full-time employees must be between 0 and 9,999.');

  const contactName = (data.contact_name || '').trim();
  if (!contactName || contactName.length < 2 || contactName.length > 50)
    errors.push('Contact name must be 2–50 characters.');

  if (!EMAIL_RE.test(data.contact_email || ''))
    errors.push('Contact email must be a valid email address.');

  if (!PHONE_RE.test(data.contact_phone || ''))
    errors.push('Contact phone must be in format (XXX) XXX-XXXX.');

  const orgAddress = (data.org_address || '').trim();
  if (!orgAddress || orgAddress.length < 5)
    errors.push('Organization address is required (minimum 5 characters).');

  const mission = (data.mission_statement || '').trim();
  if (!mission || mission.length < 20 || mission.length > 500)
    errors.push('Mission statement must be 20–500 characters.');

  const projectTitle = (data.project_title || '').trim();
  if (!projectTitle || projectTitle.length < 5 || projectTitle.length > 100)
    errors.push('Project title must be 5–100 characters.');

  if (!VALID_CATEGORIES.includes(data.project_category))
    errors.push('Invalid project category.');

  const description = (data.project_description || '').trim();
  if (!description || description.length < 50 || description.length > 2000)
    errors.push('Project description must be 50–2,000 characters.');

  const targetPop = (data.target_population || '').trim();
  if (!targetPop || targetPop.length < 5 || targetPop.length > 200)
    errors.push('Target population must be 5–200 characters.');

  const numBeneficiaries = parseInt(data.num_beneficiaries);
  if (isNaN(numBeneficiaries) || numBeneficiaries < 1 || numBeneficiaries > 1000000)
    errors.push('Number of beneficiaries must be between 1 and 1,000,000.');

  const totalCost = parseFloat(data.total_project_cost);
  if (isNaN(totalCost) || totalCost < 100 || totalCost > 10000000)
    errors.push('Total project cost must be between $100 and $10,000,000.');

  const amountReq = parseFloat(data.amount_requested);
  if (isNaN(amountReq) || amountReq < 100 || amountReq > 50000)
    errors.push('Amount requested must be between $100 and $50,000.');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minStart = new Date(today);
  minStart.setDate(minStart.getDate() + 30);

  if (!data.project_start_date) {
    errors.push('Project start date is required.');
  } else {
    const startDate = new Date(data.project_start_date);
    if (isNaN(startDate.getTime())) {
      errors.push('Project start date is invalid.');
    } else if (startDate < minStart) {
      errors.push('Project start date must be at least 30 days from today.');
    } else if (data.project_end_date) {
      const endDate = new Date(data.project_end_date);
      if (isNaN(endDate.getTime())) {
        errors.push('Project end date is invalid.');
      } else if (endDate <= startDate) {
        errors.push('Project end date must be after the start date.');
      } else {
        const maxEnd = new Date(startDate);
        maxEnd.setMonth(maxEnd.getMonth() + 24);
        if (endDate > maxEnd) {
          errors.push('Project must be completed within 24 months of the start date.');
        }
      }
    } else {
      errors.push('Project end date is required.');
    }
  }

  return errors;
}

function parseAppJson(app) {
  if (!app) return app;
  try {
    return {
      ...app,
      eligibility_results: app.eligibility_results ? JSON.parse(app.eligibility_results) : [],
      award_breakdown: app.award_breakdown ? JSON.parse(app.award_breakdown) : [],
    };
  } catch {
    return { ...app, eligibility_results: [], award_breakdown: [] };
  }
}

function sanitizeForApplicant(app) {
  const { reviewer_id, file_path, ...rest } = app;
  return rest;
}

function validateMagicBytes(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(8);
    const read = fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    if (read < 3) return false;
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return true;
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    return false;
  } catch {
    return false;
  }
}

function deleteFile(filePath) {
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

module.exports = {
  UPLOAD_DIR,
  VALID_ORG_TYPES,
  VALID_CATEGORIES,
  validateApplicationData,
  parseAppJson,
  sanitizeForApplicant,
  validateMagicBytes,
  deleteFile,
};

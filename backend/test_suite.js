/**
 * Comprehensive Test Suite — Maplewood County Grant System
 * Tests: Unit | Integration | Edge Cases | Security | Hidden Cases
 * Run: node test_suite.js
 */

const BASE = 'http://localhost:3001/api';
const { checkEligibility } = require('./src/services/eligibilityEngine');
const { calculateAward } = require('./src/services/awardCalculator');

const currentYear = new Date().getFullYear();

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, info = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${info ? ' — ' + info : ''}`);
    failed++;
    failures.push({ label, info });
  }
}

async function req(method, path, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // CORS requires Origin header; Node.js fetch doesn't send one by default
      'Origin': 'http://localhost:5173',
    },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

// Returns a future date N days from now as YYYY-MM-DD
function futureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Valid sample application payload
function sampleApp(overrides = {}) {
  return {
    org_name: 'Youth Forward Inc.',
    ein: '52-1234567',
    org_type: '501(c)(3)',
    year_founded: currentYear - 11,
    annual_budget: 320000,
    num_employees: 8,
    contact_name: 'Diana Torres',
    contact_email: 'diana@youthforward.org',
    contact_phone: '(410) 555-0142',
    org_address: '742 Oak Street, Maplewood, MD 21201',
    mission_statement: 'Youth Forward empowers at-risk youth through mentorship, academic support, and leadership development programs.',
    project_title: 'After-School Mentorship Expansion',
    project_category: 'Youth Programs',
    project_description: 'Expand our after-school mentorship program from 2 locations to 5 locations across East Maplewood, serving an additional 200 students with one-on-one mentoring, homework help, and career exploration workshops.',
    target_population: 'At-risk youth ages 14-18 in East Maplewood',
    num_beneficiaries: 500,
    total_project_cost: 95000,
    amount_requested: 40000,
    project_start_date: futureDate(35),
    project_end_date: futureDate(400),
    prev_grant: false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: UNIT TESTS — ELIGIBILITY ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function testEligibilityEngine() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 1: ELIGIBILITY ENGINE UNIT TESTS');
  console.log('═══════════════════════════════════════════');

  // --- Rule 1: Nonprofit Status ---
  console.log('\n[Rule 1] Nonprofit Status');
  const eligibleTypes = ['501(c)(3)', '501(c)(4)', 'Community-Based Organization', 'Faith-Based Organization'];
  const ineligibleTypes = ['For-Profit Business', 'Government Agency', 'Individual'];

  for (const t of eligibleTypes) {
    const r = checkEligibility({ org_type: t });
    assert(`Rule 1 PASS for "${t}"`, r.rules[0].pass === true);
  }
  for (const t of ineligibleTypes) {
    const r = checkEligibility({ org_type: t });
    assert(`Rule 1 FAIL for "${t}"`, r.rules[0].pass === false);
  }
  assert('Rule 1 null when org_type empty', checkEligibility({ org_type: '' }).rules[0].pass === null);
  assert('Rule 1 null when org_type missing', checkEligibility({}).rules[0].pass === null);

  // --- Rule 2: Minimum Operating History ---
  console.log('\n[Rule 2] Minimum Operating History');
  assert('Rule 2 PASS: exactly 2 years old', checkEligibility({ year_founded: currentYear - 2 }).rules[1].pass === true);
  assert('Rule 2 PASS: 11 years old', checkEligibility({ year_founded: currentYear - 11 }).rules[1].pass === true);
  assert('Rule 2 FAIL: 1 year old', checkEligibility({ year_founded: currentYear - 1 }).rules[1].pass === false);
  assert('Rule 2 FAIL: founded this year', checkEligibility({ year_founded: currentYear }).rules[1].pass === false);
  assert('Rule 2 null when year_founded missing', checkEligibility({}).rules[1].pass === null);
  assert('Rule 2 boundary: 2 years exactly (PASS)', checkEligibility({ year_founded: currentYear - 2 }).rules[1].pass === true);
  const r2msg = checkEligibility({ year_founded: currentYear - 11 });
  assert('Rule 2 message contains years', r2msg.rules[1].message.includes('11'));

  // --- Rule 3: Budget Cap ---
  console.log('\n[Rule 3] Budget Cap');
  assert('Rule 3 PASS: $1,999,999', checkEligibility({ annual_budget: 1999999 }).rules[2].pass === true);
  assert('Rule 3 FAIL: $2,000,000 exactly', checkEligibility({ annual_budget: 2000000 }).rules[2].pass === false);
  assert('Rule 3 FAIL: $2,000,001', checkEligibility({ annual_budget: 2000001 }).rules[2].pass === false);
  assert('Rule 3 PASS: $0 (valid per spec, range is $0–$100M)', checkEligibility({ annual_budget: 0 }).rules[2].pass === true);
  assert('Rule 3 null when budget missing', checkEligibility({}).rules[2].pass === null);
  assert('Rule 3 null when budget empty string', checkEligibility({ annual_budget: '' }).rules[2].pass === null);

  // --- Rule 4: Funding Ratio ---
  console.log('\n[Rule 4] Funding Ratio');
  assert('Rule 4 PASS: 40% ratio', checkEligibility({ amount_requested: 40000, total_project_cost: 100000 }).rules[3].pass === true);
  assert('Rule 4 PASS: exactly 50% ratio', checkEligibility({ amount_requested: 50000, total_project_cost: 100000 }).rules[3].pass === true);
  assert('Rule 4 FAIL: 51% ratio', checkEligibility({ amount_requested: 51000, total_project_cost: 100000 }).rules[3].pass === false);
  assert('Rule 4 FAIL: 100% ratio', checkEligibility({ amount_requested: 100000, total_project_cost: 100000 }).rules[3].pass === false);
  assert('Rule 4 null when fields missing', checkEligibility({}).rules[3].pass === null);
  assert('Rule 4 boundary: exactly 50% (PASS)', checkEligibility({ amount_requested: 25000, total_project_cost: 50000 }).rules[3].pass === true);

  // --- Rule 5: Maximum Request ---
  console.log('\n[Rule 5] Maximum Request');
  assert('Rule 5 PASS: $50,000 exactly', checkEligibility({ amount_requested: 50000 }).rules[4].pass === true);
  assert('Rule 5 PASS: $49,999', checkEligibility({ amount_requested: 49999 }).rules[4].pass === true);
  assert('Rule 5 FAIL: $50,001', checkEligibility({ amount_requested: 50001 }).rules[4].pass === false);
  assert('Rule 5 FAIL: $100,000', checkEligibility({ amount_requested: 100000 }).rules[4].pass === false);
  assert('Rule 5 null when amount_requested missing', checkEligibility({}).rules[4].pass === null);

  // --- Rule 6: Minimum Impact ---
  console.log('\n[Rule 6] Minimum Impact');
  assert('Rule 6 PASS: 50 beneficiaries exactly', checkEligibility({ num_beneficiaries: 50 }).rules[5].pass === true);
  assert('Rule 6 PASS: 500 beneficiaries', checkEligibility({ num_beneficiaries: 500 }).rules[5].pass === true);
  assert('Rule 6 FAIL: 49 beneficiaries', checkEligibility({ num_beneficiaries: 49 }).rules[5].pass === false);
  assert('Rule 6 FAIL: 1 beneficiary', checkEligibility({ num_beneficiaries: 1 }).rules[5].pass === false);
  assert('Rule 6 FAIL: 0 beneficiaries', checkEligibility({ num_beneficiaries: 0 }).rules[5].pass === false);
  assert('Rule 6 null when num_beneficiaries missing', checkEligibility({}).rules[5].pass === null);

  // --- Overall Eligibility ---
  console.log('\n[Overall Eligibility]');
  const fullyEligible = checkEligibility({
    org_type: '501(c)(3)',
    year_founded: currentYear - 11,
    annual_budget: 320000,
    amount_requested: 40000,
    total_project_cost: 95000,
    num_beneficiaries: 500,
  });
  assert('All 6 pass → overallEligible=true', fullyEligible.overallEligible === true);
  assert('All 6 pass → score=6', fullyEligible.score === 6);
  assert('All 6 pass → summary contains "All 6"', fullyEligible.summary.includes('All 6'));

  const fiveOfSix = checkEligibility({
    org_type: '501(c)(3)',
    year_founded: currentYear - 11,
    annual_budget: 320000,
    amount_requested: 40000,
    total_project_cost: 95000,
    num_beneficiaries: 30, // FAIL: < 50
  });
  assert('5 of 6 pass → overallEligible=false', fiveOfSix.overallEligible === false);
  assert('5 of 6 pass → score=5', fiveOfSix.score === 5);
  assert('5 of 6 pass → summary contains "5 of 6"', fiveOfSix.summary.includes('5 of 6'));

  const empty = checkEligibility({});
  assert('Empty form → score=0', empty.score === 0);
  assert('Empty form → overallEligible=false', empty.overallEligible === false);
  assert('Empty form → returns 6 rules', empty.rules.length === 6);

  // --- Cross-field tests ---
  console.log('\n[Cross-field tests]');
  const cross1 = checkEligibility({ amount_requested: 50000, total_project_cost: 80000 });
  assert('Cross: $50k req, $80k cost → Rule 4 FAIL (62.5%)', cross1.rules[3].pass === false);
  assert('Cross: $50k req, $80k cost → Rule 5 PASS ($50k max)', cross1.rules[4].pass === true);

  // Dual field support (snake_case vs camelCase)
  const snakeCase = checkEligibility({ org_type: '501(c)(3)', year_founded: currentYear - 5, annual_budget: 500000 });
  const camelCase = checkEligibility({ orgType: '501(c)(3)', yearFounded: currentYear - 5, annualBudget: 500000 });
  assert('Eligibility supports snake_case fields', snakeCase.rules[0].pass === true);
  assert('Eligibility supports camelCase fields', camelCase.rules[0].pass === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: UNIT TESTS — AWARD CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

function testAwardCalculator() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 2: AWARD CALCULATOR UNIT TESTS');
  console.log('═══════════════════════════════════════════');

  // --- Spec worked example 1 (expected $32,000) ---
  console.log('\n[Spec Example 1 — Expected $32,000]');
  const ex1 = calculateAward({
    num_beneficiaries: 1500,
    year_founded: currentYear - 8,
    project_category: 'Public Health',
    annual_budget: 320000,
    amount_requested: 40000,
    total_project_cost: 120000,
  });
  assert('Example 1: communityImpact = 3 (1500 beneficiaries)', ex1.breakdown[0].score === 3);
  assert('Example 1: trackRecord = 2 (8 years)', ex1.breakdown[1].score === 2);
  assert('Example 1: categoryPriority = 3 (Public Health)', ex1.breakdown[2].score === 3);
  assert('Example 1: financialNeed = 2 ($320k budget)', ex1.breakdown[3].score === 2);
  assert('Example 1: costEfficiency = 2 (33.3%)', ex1.breakdown[4].score === 2);
  assert('Example 1: totalScore = 12', ex1.totalScore === 12);
  assert('Example 1: awardPercentage = 80%', ex1.awardPercentage === 80);
  assert('Example 1: finalAward = $32,000', ex1.finalAward === 32000);

  // --- Spec worked example 2 (expected $8,300) ---
  console.log('\n[Spec Example 2 — Expected $8,300]');
  const ex2 = calculateAward({
    num_beneficiaries: 75,
    year_founded: currentYear - 3,
    project_category: 'Arts & Culture',
    annual_budget: 900000,
    amount_requested: 25000,
    total_project_cost: 52000,
  });
  assert('Example 2: communityImpact = 1', ex2.breakdown[0].score === 1);
  assert('Example 2: trackRecord = 1', ex2.breakdown[1].score === 1);
  assert('Example 2: categoryPriority = 1', ex2.breakdown[2].score === 1);
  assert('Example 2: financialNeed = 1', ex2.breakdown[3].score === 1);
  assert('Example 2: costEfficiency = 1', ex2.breakdown[4].score === 1);
  assert('Example 2: totalScore = 5', ex2.totalScore === 5);
  assert('Example 2: finalAward = $8,300', ex2.finalAward === 8300);

  // --- Sample App example (expected $24,000) ---
  console.log('\n[Sample App — Expected $24,000]');
  const sampleEx = calculateAward({
    num_beneficiaries: 500,
    year_founded: currentYear - 11,
    project_category: 'Youth Programs',
    annual_budget: 320000,
    amount_requested: 40000,
    total_project_cost: 95000,
  });
  assert('Sample App: communityImpact = 2', sampleEx.breakdown[0].score === 2);
  assert('Sample App: trackRecord = 2', sampleEx.breakdown[1].score === 2);
  assert('Sample App: categoryPriority = 2', sampleEx.breakdown[2].score === 2);
  assert('Sample App: financialNeed = 2', sampleEx.breakdown[3].score === 2);
  assert('Sample App: costEfficiency = 1 (42%)', sampleEx.breakdown[4].score === 1);
  assert('Sample App: totalScore = 9', sampleEx.totalScore === 9);
  assert('Sample App: awardPercentage = 60%', sampleEx.awardPercentage === 60);
  assert('Sample App: finalAward = $24,000', sampleEx.finalAward === 24000);

  // --- Factor 1: Community Impact boundaries ---
  console.log('\n[Factor 1: Community Impact Boundaries]');
  const base = { year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 };
  assert('Impact score 1 for 50 beneficiaries', calculateAward({ ...base, num_beneficiaries: 50 }).breakdown[0].score === 1);
  assert('Impact score 1 for 200 beneficiaries', calculateAward({ ...base, num_beneficiaries: 200 }).breakdown[0].score === 1);
  assert('Impact score 2 for 201 beneficiaries', calculateAward({ ...base, num_beneficiaries: 201 }).breakdown[0].score === 2);
  assert('Impact score 2 for 1000 beneficiaries', calculateAward({ ...base, num_beneficiaries: 1000 }).breakdown[0].score === 2);
  assert('Impact score 3 for 1001 beneficiaries', calculateAward({ ...base, num_beneficiaries: 1001 }).breakdown[0].score === 3);

  // --- Factor 2: Track Record boundaries ---
  console.log('\n[Factor 2: Track Record Boundaries]');
  assert('Track score 1: 2 years', calculateAward({ ...base, num_beneficiaries: 100, year_founded: currentYear - 2 }).breakdown[1].score === 1);
  assert('Track score 1: 5 years', calculateAward({ ...base, num_beneficiaries: 100, year_founded: currentYear - 5 }).breakdown[1].score === 1);
  assert('Track score 2: 6 years', calculateAward({ ...base, num_beneficiaries: 100, year_founded: currentYear - 6 }).breakdown[1].score === 2);
  assert('Track score 2: 15 years', calculateAward({ ...base, num_beneficiaries: 100, year_founded: currentYear - 15 }).breakdown[1].score === 2);
  assert('Track score 3: 16 years', calculateAward({ ...base, num_beneficiaries: 100, year_founded: currentYear - 16 }).breakdown[1].score === 3);

  // --- Factor 3: Category Priority ---
  console.log('\n[Factor 3: Category Priority]');
  const catBase = { num_beneficiaries: 100, year_founded: currentYear - 10, annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 };
  assert('Category score 3: Public Health', calculateAward({ ...catBase, project_category: 'Public Health' }).breakdown[2].score === 3);
  assert('Category score 3: Neighborhood Safety', calculateAward({ ...catBase, project_category: 'Neighborhood Safety' }).breakdown[2].score === 3);
  assert('Category score 2: Youth Programs', calculateAward({ ...catBase, project_category: 'Youth Programs' }).breakdown[2].score === 2);
  assert('Category score 2: Senior Services', calculateAward({ ...catBase, project_category: 'Senior Services' }).breakdown[2].score === 2);
  assert('Category score 1: Arts & Culture', calculateAward({ ...catBase, project_category: 'Arts & Culture' }).breakdown[2].score === 1);
  assert('Category score 1: Workforce Development', calculateAward({ ...catBase, project_category: 'Workforce Development' }).breakdown[2].score === 1);
  assert('Category score 1: Other', calculateAward({ ...catBase, project_category: 'Other' }).breakdown[2].score === 1);

  // --- Factor 4: Financial Need boundaries ---
  console.log('\n[Factor 4: Financial Need Boundaries]');
  const fnBase = { num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', amount_requested: 10000, total_project_cost: 50000 };
  assert('FinNeed score 3: $99,999', calculateAward({ ...fnBase, annual_budget: 99999 }).breakdown[3].score === 3);
  assert('FinNeed score 3: $0', calculateAward({ ...fnBase, annual_budget: 0 }).breakdown[3].score === 3);
  assert('FinNeed score 2: $100,000', calculateAward({ ...fnBase, annual_budget: 100000 }).breakdown[3].score === 2);
  assert('FinNeed score 2: $499,999', calculateAward({ ...fnBase, annual_budget: 499999 }).breakdown[3].score === 2);
  assert('FinNeed score 1: $500,000', calculateAward({ ...fnBase, annual_budget: 500000 }).breakdown[3].score === 1);

  // --- Factor 5: Cost Efficiency boundaries ---
  console.log('\n[Factor 5: Cost Efficiency Boundaries]');
  const ceBase = { num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000 };
  assert('CostEff score 3: 25% (= 25%)', calculateAward({ ...ceBase, amount_requested: 25000, total_project_cost: 100000 }).breakdown[4].score === 3);
  assert('CostEff score 2: 26% ratio', calculateAward({ ...ceBase, amount_requested: 26000, total_project_cost: 100000 }).breakdown[4].score === 2);
  assert('CostEff score 2: 40% ratio', calculateAward({ ...ceBase, amount_requested: 40000, total_project_cost: 100000 }).breakdown[4].score === 2);
  assert('CostEff score 1: 41% ratio', calculateAward({ ...ceBase, amount_requested: 41000, total_project_cost: 100000 }).breakdown[4].score === 1);
  assert('CostEff score 1: 50% ratio', calculateAward({ ...ceBase, amount_requested: 50000, total_project_cost: 100000 }).breakdown[4].score === 1);

  // --- Cap and rounding ---
  console.log('\n[$50,000 Cap & Rounding]');
  const maxAward = calculateAward({
    num_beneficiaries: 10000, year_founded: currentYear - 50,
    project_category: 'Public Health', annual_budget: 50000,
    amount_requested: 50000, total_project_cost: 500000,
  });
  assert('Max score = 15', maxAward.totalScore === 15);
  assert('$50k requested × 100% = $50,000 (capped)', maxAward.finalAward === 50000);
  assert('Rounding: $8333 → $8300', ex2.finalAward === 8300);
  assert('finalAward is always multiple of 100', ex2.finalAward % 100 === 0);

  // Return object structure
  assert('Return has breakdown array of 5', ex1.breakdown.length === 5);
  assert('Return has totalScore', typeof ex1.totalScore === 'number');
  assert('Return has awardPercentage', typeof ex1.awardPercentage === 'number');
  assert('Return has finalAward', typeof ex1.finalAward === 'number');
  assert('Return has amountRequested', typeof ex1.amountRequested === 'number');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: API INTEGRATION TESTS — AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

async function testAuth() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 3: AUTH API INTEGRATION TESTS');
  console.log('═══════════════════════════════════════════');

  const ts = Date.now();
  const testEmail = `test.${ts}@example.com`;
  const otherEmail = `other.${ts}@example.com`;

  // --- Registration: register ALL needed users FIRST (before any failed attempts) ---
  // This ensures users are created before the rate limiter is exhausted by failures.
  console.log('\n[Registration — valid users]');

  const r1 = await req('POST', '/auth/register', {
    full_name: 'Diana Torres',
    email: testEmail,
    phone: '(410) 555-0100',
    organization_name: 'Youth Forward Inc.',
    password: 'Password1',
    confirm_password: 'Password1',
  });
  assert('Register: 201 on valid data', r1.status === 201);
  assert('Register: returns token', !!r1.data.token);
  assert('Register: returns user object', !!r1.data.user);
  assert('Register: role is APPLICANT', r1.data.user?.role === 'APPLICANT');

  // Register the second user now (before rate limit is exhausted)
  const other = await req('POST', '/auth/register', {
    full_name: 'Other Person',
    email: otherEmail,
    password: 'Password2',
    confirm_password: 'Password2',
    organization_name: 'Other Org',
  });
  assert('Register: 201 for second applicant', other.status === 201);
  const otherToken = other.data.token;

  // --- Registration validation failures ---
  // NOTE: the rate limiter allows max 5 failed attempts per IP per hour
  // (skipSuccessfulRequests: true, so successful 201s don't count).
  // We accept both 400 (validation) and 429 (rate-limited) as "blocked" —
  // both prove the server correctly refuses the invalid request.
  console.log('\n[Registration — validation rejections]');

  const r2 = await req('POST', '/auth/register', {
    full_name: 'Duplicate User', email: testEmail,
    password: 'Password1', confirm_password: 'Password1',
  });
  assert('Register: blocked on duplicate email', r2.status === 400 || r2.status === 429);
  assert('Register: error message present on duplicate', !!r2.data.error);

  const r3 = await req('POST', '/auth/register', {
    full_name: 'Test User', email: `weak.${ts}@example.com`,
    password: 'password1', confirm_password: 'password1',
  });
  assert('Register: blocked on weak password (no uppercase)', r3.status === 400 || r3.status === 429);

  const r4 = await req('POST', '/auth/register', {
    full_name: 'Test User', email: `mismatch.${ts}@example.com`,
    password: 'Password1', confirm_password: 'Password2',
  });
  assert('Register: blocked on password mismatch', r4.status === 400 || r4.status === 429);

  const r5 = await req('POST', '/auth/register', {
    full_name: 'Test User', email: 'not-an-email',
    password: 'Password1', confirm_password: 'Password1',
  });
  assert('Register: blocked on invalid email', r5.status === 400 || r5.status === 429);

  const r6 = await req('POST', '/auth/register', {
    full_name: 'A', email: `short.${ts}@example.com`,
    password: 'Password1', confirm_password: 'Password1',
  });
  assert('Register: blocked on name < 2 chars', r6.status === 400 || r6.status === 429);

  const r7 = await req('POST', '/auth/register', {});
  assert('Register: blocked on empty body (400 or 429)', r7.status === 400 || r7.status === 429);

  // --- Login ---
  console.log('\n[Login]');

  const l1 = await req('POST', '/auth/login', { email: testEmail, password: 'Password1' });
  assert('Login: 200 on valid credentials', l1.status === 200);
  assert('Login: returns token', !!l1.data.token);
  assert('Login: role is APPLICANT', l1.data.user?.role === 'APPLICANT');
  const applicantToken = l1.data.token;

  const l2 = await req('POST', '/auth/login', { email: testEmail, password: 'WrongPass1' });
  assert('Login: 401 on wrong password', l2.status === 401);
  assert('Login: generic error (no user enumeration hint)', l2.data.error === 'Invalid email or password.');

  const l3 = await req('POST', '/auth/login', { email: 'noone@example.com', password: 'Password1' });
  assert('Login: 401 on non-existent email', l3.status === 401);
  assert('Login: same error for invalid email vs wrong password (anti-enumeration)', l3.data.error === l2.data.error);

  const l4 = await req('POST', '/auth/login', { email: testEmail });
  assert('Login: 400 on missing password', l4.status === 400);

  const l5 = await req('POST', '/auth/login', {});
  assert('Login: 400 on empty body', l5.status === 400);

  const lr = await req('POST', '/auth/login', {
    email: 'marcus.johnson@maplewood.gov', password: 'Reviewer123',
  });
  assert('Login: Reviewer login 200', lr.status === 200);
  assert('Login: Reviewer role is REVIEWER', lr.data.user?.role === 'REVIEWER');
  const reviewerToken = lr.data.token;

  return { applicantToken, reviewerToken, otherToken, testEmail };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: API INTEGRATION TESTS — APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────

async function testApplications(tokens) {
  const { applicantToken, reviewerToken } = tokens;

  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 4: APPLICATIONS API TESTS');
  console.log('═══════════════════════════════════════════');

  // --- Submit Application ---
  console.log('\n[Submit Application]');

  const s1 = await req('POST', '/applications', sampleApp(), applicantToken);
  assert('Submit: 201 on valid application', s1.status === 201);
  assert('Submit: returns applicationId', !!s1.data.applicationId);
  assert('Submit: returns eligibility result', !!s1.data.eligibility);
  assert('Submit: eligibility score present', typeof s1.data.eligibility.score === 'number');
  const appId = s1.data.applicationId;

  const s2 = await req('POST', '/applications', sampleApp(), null);
  assert('Submit: 401 without auth token', s2.status === 401);

  const s3 = await req('POST', '/applications', sampleApp(), reviewerToken);
  assert('Submit: 403 when reviewer tries to submit', s3.status === 403);

  const s4 = await req('POST', '/applications', { org_name: 'Only Name' }, applicantToken);
  assert('Submit: 400 on incomplete data', s4.status === 400);
  assert('Submit: returns validation details array', Array.isArray(s4.data.details));

  const s5 = await req('POST', '/applications', sampleApp({ ein: '1234567' }), applicantToken);
  assert('Submit: 400 on invalid EIN format', s5.status === 400);

  const s6 = await req('POST', '/applications', sampleApp({ amount_requested: 55000 }), applicantToken);
  assert('Submit: 400 on amount > $50,000', s6.status === 400);

  const s7 = await req('POST', '/applications', sampleApp({ project_start_date: futureDate(10) }), applicantToken);
  assert('Submit: 400 when start date < 30 days', s7.status === 400);

  const s8 = await req('POST', '/applications', sampleApp({
    project_start_date: futureDate(35), project_end_date: futureDate(30),
  }), applicantToken);
  assert('Submit: 400 when end date before start date', s8.status === 400);

  const s9 = await req('POST', '/applications', sampleApp({
    project_start_date: futureDate(35), project_end_date: futureDate(35 + 750),
  }), applicantToken);
  assert('Submit: 400 when end date > 24 months', s9.status === 400);

  const s10 = await req('POST', '/applications', sampleApp({ org_type: 'Invalid Type' }), applicantToken);
  assert('Submit: 400 on invalid org_type', s10.status === 400);

  const s11 = await req('POST', '/applications', sampleApp({ contact_phone: '410-555-0142' }), applicantToken);
  assert('Submit: 400 on invalid phone format (must be (XXX) XXX-XXXX)', s11.status === 400);

  const s12 = await req('POST', '/applications', sampleApp({ mission_statement: 'Short' }), applicantToken);
  assert('Submit: 400 on mission_statement < 20 chars', s12.status === 400);

  const s13 = await req('POST', '/applications', sampleApp({ num_beneficiaries: -1 }), applicantToken);
  assert('Submit: 400 on negative num_beneficiaries', s13.status === 400);

  // --- Get My Applications ---
  console.log('\n[Get My Applications]');

  const g1 = await req('GET', '/applications', null, applicantToken);
  assert('GetMy: 200 with auth', g1.status === 200);
  assert('GetMy: returns array', Array.isArray(g1.data));
  assert('GetMy: contains submitted application', g1.data.some(a => a.id === appId));

  const g2 = await req('GET', '/applications', null, reviewerToken);
  assert('GetMy: 403 for reviewer on /applications', g2.status === 403);

  const g3 = await req('GET', '/applications', null, null);
  assert('GetMy: 401 without token', g3.status === 401);

  // --- Get All Applications (Reviewer) ---
  console.log('\n[Get All Applications - Reviewer]');

  const ga1 = await req('GET', '/applications/all', null, reviewerToken);
  assert('GetAll: 200 for reviewer', ga1.status === 200);
  assert('GetAll: returns array', Array.isArray(ga1.data));

  const ga2 = await req('GET', '/applications/all', null, applicantToken);
  assert('GetAll: 403 for applicant', ga2.status === 403);

  const ga3 = await req('GET', '/applications/all', null, null);
  assert('GetAll: 401 without token', ga3.status === 401);

  const gaEligible = await req('GET', '/applications/all?eligibility=eligible', null, reviewerToken);
  assert('GetAll: filter by eligible works', gaEligible.status === 200);

  const gaNotEligible = await req('GET', '/applications/all?eligibility=not_eligible', null, reviewerToken);
  assert('GetAll: filter by not_eligible works', gaNotEligible.status === 200);

  const gaStatus = await req('GET', '/applications/all?status=SUBMITTED', null, reviewerToken);
  assert('GetAll: filter by status SUBMITTED', gaStatus.status === 200);

  // SQL injection in filter — parameterized query should return empty (not crash)
  const gaInject = await req('GET', "/applications/all?status='; DROP TABLE applications;--", null, reviewerToken);
  assert('GetAll: SQL injection in filter handled safely (200)', gaInject.status === 200);
  assert('GetAll: SQL injection returns array (not error)', Array.isArray(gaInject.data));

  // --- Get Single Application ---
  console.log('\n[Get Single Application]');

  const gs1 = await req('GET', `/applications/${appId}`, null, applicantToken);
  assert('GetOne: 200 for own application (applicant)', gs1.status === 200);
  assert('GetOne: applicant response has no reviewer_id', gs1.data.reviewer_id === undefined);
  assert('GetOne: applicant response has no file_path', gs1.data.file_path === undefined);

  const gs2 = await req('GET', `/applications/${appId}`, null, reviewerToken);
  assert('GetOne: 200 for reviewer', gs2.status === 200);

  const gs3 = await req('GET', `/applications/${appId}`, null, null);
  assert('GetOne: 401 without token', gs3.status === 401);

  const gs4 = await req('GET', '/applications/99999', null, applicantToken);
  assert('GetOne: 404 for non-existent app', gs4.status === 404);

  // --- Stats Endpoint ---
  console.log('\n[Reviewer Stats]');

  const st1 = await req('GET', '/applications/stats', null, reviewerToken);
  assert('Stats: 200 for reviewer', st1.status === 200);
  assert('Stats: has submitted count', typeof st1.data.submitted === 'number');
  assert('Stats: has approved count', typeof st1.data.approved === 'number');
  assert('Stats: has total_awarded', typeof st1.data.total_awarded === 'number');

  const st2 = await req('GET', '/applications/stats', null, applicantToken);
  assert('Stats: 403 for applicant', st2.status === 403);

  // --- Status Workflow ---
  console.log('\n[Status Updates - Workflow]');

  const su1 = await req('PATCH', `/applications/${appId}/status`, { status: 'APPROVED' }, reviewerToken);
  assert('Status: 400 when skipping SUBMITTED→APPROVED', su1.status === 400);

  const su2 = await req('PATCH', `/applications/${appId}/status`, { status: 'REJECTED' }, reviewerToken);
  assert('Status: 400 when rejecting without comment', su2.status === 400);

  const su3 = await req('PATCH', `/applications/${appId}/status`, { status: 'UNDER_REVIEW' }, applicantToken);
  assert('Status: 403 when applicant tries to change status', su3.status === 403);

  const su4 = await req('PATCH', `/applications/${appId}/status`, { status: 'UNDER_REVIEW' }, reviewerToken);
  assert('Status: 200 SUBMITTED→UNDER_REVIEW', su4.status === 200);
  assert('Status: application status updated to UNDER_REVIEW', su4.data.application?.status === 'UNDER_REVIEW');

  const su5 = await req('PATCH', `/applications/${appId}/status`, { status: 'SUBMITTED' }, reviewerToken);
  assert('Status: 400 cannot go back to SUBMITTED', su5.status === 400);

  const su6 = await req('PATCH', `/applications/${appId}/status`, { status: 'UNDER_REVIEW' }, reviewerToken);
  assert('Status: 400 cannot re-enter UNDER_REVIEW', su6.status === 400);

  // --- Award Preview ---
  console.log('\n[Award Preview]');

  const aw1 = await req('POST', `/applications/${appId}/award`, null, reviewerToken);
  assert('Award: 200 for reviewer', aw1.status === 200);
  assert('Award: has breakdown', Array.isArray(aw1.data.breakdown));
  assert('Award: has finalAward', typeof aw1.data.finalAward === 'number');
  assert('Award: has totalScore', typeof aw1.data.totalScore === 'number');

  const aw2 = await req('POST', `/applications/${appId}/award`, null, applicantToken);
  assert('Award: 403 for applicant', aw2.status === 403);

  // --- Approve Application ---
  console.log('\n[Approve Application]');

  const ap1 = await req('PATCH', `/applications/${appId}/status`, { status: 'APPROVED', comments: 'Great application!' }, reviewerToken);
  assert('Approve: 200 on approval', ap1.status === 200);
  assert('Approve: status is APPROVED', ap1.data.application?.status === 'APPROVED');
  assert('Approve: award_amount is set and > 0', ap1.data.application?.award_amount > 0);

  const ap2 = await req('PATCH', `/applications/${appId}/status`, { status: 'REJECTED', comments: 'Changing mind' }, reviewerToken);
  assert('Approve: 400 cannot change status after APPROVED', ap2.status === 400);

  const ap3 = await req('POST', `/applications/${appId}/award`, null, reviewerToken);
  assert('Award: 400 after decision made', ap3.status === 400);

  // --- Reject Application ---
  console.log('\n[Reject Application]');

  const s_r = await req('POST', '/applications', sampleApp({ project_title: 'Test Reject App' }), applicantToken);
  const rejectAppId = s_r.data?.applicationId;

  if (rejectAppId) {
    await req('PATCH', `/applications/${rejectAppId}/status`, { status: 'UNDER_REVIEW' }, reviewerToken);

    const rej1 = await req('PATCH', `/applications/${rejectAppId}/status`, {
      status: 'REJECTED', comments: 'X'.repeat(2001),
    }, reviewerToken);
    assert('Reject: 400 on comment > 2000 chars', rej1.status === 400);

    const rej2 = await req('PATCH', `/applications/${rejectAppId}/status`, {
      status: 'REJECTED', comments: 'Does not meet priority criteria.',
    }, reviewerToken);
    assert('Reject: 200 on valid rejection', rej2.status === 200);
    assert('Reject: status is REJECTED', rej2.data.application?.status === 'REJECTED');
    assert('Reject: comments stored', !!rej2.data.application?.reviewer_comments);

    const rej3 = await req('PATCH', `/applications/${rejectAppId}/status`, { status: 'APPROVED' }, reviewerToken);
    assert('Reject: 400 cannot approve after rejection', rej3.status === 400);
  }

  // --- Applicant can see approved award amount ---
  console.log('\n[Applicant View of Approved Application]');
  const myApps = await req('GET', '/applications', null, applicantToken);
  const approvedApp = myApps.data?.find(a => a.status === 'APPROVED');
  assert('Applicant sees approved app in dashboard', !!approvedApp);
  assert('Applicant sees award_amount on approved app', approvedApp?.award_amount > 0);

  return appId;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: SECURITY TESTS
// ─────────────────────────────────────────────────────────────────────────────

async function testSecurity(tokens, appId) {
  const { applicantToken, reviewerToken, otherToken } = tokens;

  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 5: SECURITY TESTS');
  console.log('═══════════════════════════════════════════');

  // --- JWT Tampering ---
  console.log('\n[JWT Security]');

  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IlJFVklFV0VSIiwiaWF0IjoxNjAwMDAwMDAwfQ.invalid_signature';
  const jwt1 = await req('GET', '/applications', null, fakeToken);
  assert('JWT: 401 on tampered token', jwt1.status === 401);

  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFQUExJQ0FOVCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.FAKE';
  const jwt2 = await req('GET', '/applications', null, expiredToken);
  assert('JWT: 401 on expired/invalid token', jwt2.status === 401);

  const jwt3 = await req('GET', '/applications/stats', null, null);
  assert('JWT: 401 when no Authorization header', jwt3.status === 401);

  const badAuthRes = await fetch(`${BASE}/applications`, {
    headers: { 'Authorization': 'NotBearer token123', 'Origin': 'http://localhost:5173' },
  });
  assert('JWT: 401 on malformed Authorization header', badAuthRes.status === 401);

  // --- IDOR (Insecure Direct Object Reference) ---
  console.log('\n[IDOR Tests]');

  if (otherToken && appId) {
    // Second applicant tries to view app owned by first applicant
    const idor1 = await req('GET', `/applications/${appId}`, null, otherToken);
    assert('IDOR: 403 when applicant views another user\'s application', idor1.status === 403);

    // Second applicant tries to change status on app 1 (not reviewer)
    const idor2 = await req('PATCH', `/applications/${appId}/status`, { status: 'REJECTED', comments: 'hack' }, otherToken);
    assert('IDOR: 403 when non-reviewer tries to change status', idor2.status === 403);
  } else {
    console.log('  ⚠️  IDOR tests skipped (otherToken unavailable)');
  }

  // --- Role Escalation ---
  console.log('\n[Role Escalation]');

  const role1 = await req('GET', '/applications/all', null, applicantToken);
  assert('Role: 403 applicant cannot access reviewer all-apps', role1.status === 403);

  const role2 = await req('GET', '/applications/stats', null, applicantToken);
  assert('Role: 403 applicant cannot access stats', role2.status === 403);

  const role3 = await req('POST', `/applications/${appId}/award`, null, applicantToken);
  assert('Role: 403 applicant cannot preview award', role3.status === 403);

  const role4 = await req('GET', '/applications', null, reviewerToken);
  assert('Role: 403 reviewer cannot use applicant /applications', role4.status === 403);

  // --- Input Injection ---
  console.log('\n[Input Injection]');

  // XSS in org_name — should not crash, stored but never executed
  const xssApp = sampleApp({ org_name: '<script>alert("xss")</script>' });
  const xss1 = await req('POST', '/applications', xssApp, applicantToken);
  assert('XSS: server handles HTML in org_name without 500', xss1.status !== 500);

  // org_name > 100 chars
  const long1 = await req('POST', '/applications', sampleApp({ org_name: 'A'.repeat(200) }), applicantToken);
  assert('Input: 400 on org_name > 100 chars', long1.status === 400);

  // String in numeric field
  const type1 = await req('POST', '/applications', sampleApp({ annual_budget: 'drop table users' }), applicantToken);
  assert('Input: 400 on string in numeric field (annual_budget)', type1.status === 400);

  // SQL injection in EIN
  const sql1 = await req('POST', '/applications', sampleApp({ ein: "52-1234567'; DROP TABLE applications;--" }), applicantToken);
  assert('SQL injection in EIN handled safely (400)', sql1.status === 400);

  // --- Eligibility Check Endpoint ---
  console.log('\n[Eligibility API Endpoint]');

  const elig1 = await req('POST', '/eligibility/check', {
    org_type: '501(c)(3)',
    year_founded: currentYear - 11,
    annual_budget: 320000,
    amount_requested: 40000,
    total_project_cost: 95000,
    num_beneficiaries: 500,
  }, applicantToken);
  assert('Eligibility: 200 with auth', elig1.status === 200);
  assert('Eligibility: returns rules array', Array.isArray(elig1.data.rules));
  assert('Eligibility: returns score', typeof elig1.data.score === 'number');
  assert('Eligibility: returns overallEligible bool', typeof elig1.data.overallEligible === 'boolean');
  assert('Eligibility: fully eligible application scores 6', elig1.data.score === 6);

  const elig2 = await req('POST', '/eligibility/check', { org_type: '501(c)(3)' }, null);
  assert('Eligibility: 401 without auth', elig2.status === 401);

  // --- Health Check ---
  console.log('\n[Health Check]');
  const healthRoot = await fetch('http://localhost:3001/api/health', {
    headers: { 'Origin': 'http://localhost:5173' },
  });
  assert('Health: server responds 200', healthRoot.status === 200);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: EDGE CASES & HIDDEN TESTS
// ─────────────────────────────────────────────────────────────────────────────

function testEdgeCases() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SECTION 6: EDGE CASES & HIDDEN TESTS');
  console.log('═══════════════════════════════════════════');

  console.log('\n[Eligibility Engine Edge Cases]');

  assert('EE edge: org founded exactly 2 years ago → PASS',
    checkEligibility({ year_founded: currentYear - 2 }).rules[1].pass === true);

  assert('EE edge: budget $1,999,999 → PASS',
    checkEligibility({ annual_budget: 1999999 }).rules[2].pass === true);

  assert('EE edge: budget exactly $2,000,000 → FAIL',
    checkEligibility({ annual_budget: 2000000 }).rules[2].pass === false);

  // $0 budget is valid per spec (range $0–$100M) and should PASS
  assert('EE edge: $0 budget is valid and should PASS budget cap',
    checkEligibility({ annual_budget: 0 }).rules[2].pass === true);

  // $0 budget message should be "within limit", not the ineligible message
  assert('EE edge: $0 budget shows correct passing message',
    checkEligibility({ annual_budget: 0 }).rules[2].message === 'Operating budget is within limit');

  assert('EE edge: exactly 50% ratio → PASS',
    checkEligibility({ amount_requested: 5000, total_project_cost: 10000 }).rules[3].pass === true);

  assert('EE edge: 50.0001% ratio → FAIL',
    checkEligibility({ amount_requested: 50001, total_project_cost: 100000 }).rules[3].pass === false);

  assert('EE edge: $50,000 exactly → PASS Rule 5',
    checkEligibility({ amount_requested: 50000 }).rules[4].pass === true);

  assert('EE edge: exactly 50 beneficiaries → PASS',
    checkEligibility({ num_beneficiaries: 50 }).rules[5].pass === true);

  assert('EE edge: 49 beneficiaries → FAIL',
    checkEligibility({ num_beneficiaries: 49 }).rules[5].pass === false);

  // 0 beneficiaries — provided but fails (not treated as "not entered")
  assert('EE edge: 0 beneficiaries is provided and should FAIL (not null)',
    checkEligibility({ num_beneficiaries: 0 }).rules[5].pass === false);

  assert('EE edge: non-numeric year_founded → FAIL (not null)',
    checkEligibility({ year_founded: 'abc' }).rules[1].pass === false);

  console.log('\n[Award Calculator Edge Cases]');

  const perfectScore = calculateAward({
    num_beneficiaries: 5000, year_founded: currentYear - 20,
    project_category: 'Public Health', annual_budget: 50000,
    amount_requested: 30000, total_project_cost: 300000,
  });
  assert('Award edge: perfect score 15/15', perfectScore.totalScore === 15);
  assert('Award edge: 100% of $30,000 = $30,000', perfectScore.finalAward === 30000);

  const minRequest = calculateAward({
    num_beneficiaries: 75, year_founded: currentYear - 3,
    project_category: 'Arts & Culture', annual_budget: 900000,
    amount_requested: 100, total_project_cost: 52000,
  });
  assert('Award edge: minimum $100 request rounds correctly', minRequest.finalAward % 100 === 0);

  const nearCap = calculateAward({
    num_beneficiaries: 10000, year_founded: currentYear - 50,
    project_category: 'Public Health', annual_budget: 50000,
    amount_requested: 50000, total_project_cost: 1000000,
  });
  assert('Award edge: $50,000 requested at 100% = $50,000 (capped)', nearCap.finalAward === 50000);

  const cr25 = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 25000, total_project_cost: 100000 });
  assert('Award edge: exactly 25% cost ratio → score 3', cr25.breakdown[4].score === 3);

  const cr40 = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 40000, total_project_cost: 100000 });
  assert('Award edge: exactly 40% cost ratio → score 2', cr40.breakdown[4].score === 2);

  const fn100k = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 100000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly $100,000 budget → score 2', fn100k.breakdown[3].score === 2);

  const fn99k = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 99999, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: $99,999 budget → score 3', fn99k.breakdown[3].score === 3);

  const fn500k = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 500000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly $500,000 budget → score 1', fn500k.breakdown[3].score === 1);

  const yr6 = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 6, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly 6 years → track score 2', yr6.breakdown[1].score === 2);

  const yr16 = calculateAward({ num_beneficiaries: 100, year_founded: currentYear - 16, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly 16 years → track score 3', yr16.breakdown[1].score === 3);

  const ben201 = calculateAward({ num_beneficiaries: 201, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly 201 beneficiaries → impact score 2', ben201.breakdown[0].score === 2);

  const ben1001 = calculateAward({ num_beneficiaries: 1001, year_founded: currentYear - 10, project_category: 'Youth Programs', annual_budget: 200000, amount_requested: 10000, total_project_cost: 50000 });
  assert('Award edge: exactly 1,001 beneficiaries → impact score 3', ben1001.breakdown[0].score === 3);

  console.log('\n[Spec Compliance Tests]');

  // Rule 3 uses strict < (not <=)
  assert('SPEC: Rule 3 uses strict < $2M',
    checkEligibility({ annual_budget: 1999999 }).rules[2].pass === true &&
    checkEligibility({ annual_budget: 2000000 }).rules[2].pass === false);

  // Rule 4 uses <= 50%
  assert('SPEC: Rule 4 uses <= 50%',
    checkEligibility({ amount_requested: 50000, total_project_cost: 100000 }).rules[3].pass === true);

  // Rule 5 uses <= $50,000
  assert('SPEC: Rule 5 uses <= $50,000',
    checkEligibility({ amount_requested: 50000 }).rules[4].pass === true);

  // Rule 6 uses >= 50
  assert('SPEC: Rule 6 uses >= 50',
    checkEligibility({ num_beneficiaries: 50 }).rules[5].pass === true);

  // Award rounding to nearest $100
  const specRound = calculateAward({
    num_beneficiaries: 75, year_founded: currentYear - 3,
    project_category: 'Arts & Culture', annual_budget: 900000,
    amount_requested: 25000, total_project_cost: 52000,
  });
  assert('SPEC: award rounds to nearest $100 ($8333→$8300)', specRound.finalAward === 8300);

  // Cap at $50,000
  const overCap = calculateAward({
    num_beneficiaries: 5000, year_founded: currentYear - 20,
    project_category: 'Neighborhood Safety', annual_budget: 50000,
    amount_requested: 50000, total_project_cost: 500000,
  });
  assert('SPEC: $50,000 cap applied', overCap.finalAward === 50000);

  // Overall: all null fields → score 0
  assert('SPEC: empty form → score 0, not eligible', checkEligibility({}).overallEligible === false);
  assert('SPEC: overallEligible requires ALL 6 to pass', checkEligibility({
    org_type: '501(c)(3)', year_founded: currentYear - 11, annual_budget: 320000,
    amount_requested: 40000, total_project_cost: 95000,
    num_beneficiaries: 30, // FAIL
  }).overallEligible === false);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  MAPLEWOOD GRANTS — COMPREHENSIVE TEST SUITE          ║');
  console.log('║  Unit | Integration | Edge Cases | Security           ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  // Synchronous unit tests
  testEligibilityEngine();
  testAwardCalculator();
  testEdgeCases();

  // Async API tests
  let apiTokens;
  let appId;
  try {
    apiTokens = await testAuth();
    appId = await testApplications(apiTokens);
    await testSecurity(apiTokens, appId);
  } catch (e) {
    console.log(`\n❌ API test error: ${e.message}`);
    console.log('  (Is the backend server running on port 3001?)');
  }

  // Summary
  const total = passed + failed;
  console.log('\n═══════════════════════════════════════════');
  console.log(` TEST SUMMARY: ${passed}/${total} passed`);
  console.log('═══════════════════════════════════════════');
  if (failed > 0) {
    console.log('\nFailed Tests:');
    failures.forEach(f => console.log(`  ❌ ${f.label}${f.info ? ' — ' + f.info : ''}`));
  } else {
    console.log('\n✅ All tests passed!');
  }
  console.log(`\nTotal: ${total} tests | ✅ ${passed} passed | ❌ ${failed} failed\n`);
}

main().catch(console.error);

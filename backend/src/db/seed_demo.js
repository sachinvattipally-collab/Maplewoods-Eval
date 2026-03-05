/**
 * Demo seed — creates applicant accounts + sample applications in all statuses
 * Run: node src/db/seed_demo.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

const CURRENT_YEAR = new Date().getFullYear();

/* ── helpers ─────────────────────────────────────────────── */
function eligibilityResults(orgType, yearFounded, budget, requested, totalCost, beneficiaries) {
  const rules = [
    {
      rule: 'Nonprofit Status',
      pass: ['501(c)(3)', '501(c)(4)', 'Community-Based Organization', 'Faith-Based Organization'].includes(orgType),
      message: ['501(c)(3)', '501(c)(4)', 'Community-Based Organization', 'Faith-Based Organization'].includes(orgType)
        ? 'Eligible organization type' : 'Only nonprofit and community organizations are eligible',
    },
    {
      rule: 'Minimum Operating History',
      pass: (CURRENT_YEAR - yearFounded) >= 2,
      message: (CURRENT_YEAR - yearFounded) >= 2
        ? `Organization has been operating for ${CURRENT_YEAR - yearFounded} years`
        : 'Organization must be at least 2 years old',
    },
    {
      rule: 'Budget Cap',
      pass: budget < 2000000,
      message: budget < 2000000 ? 'Operating budget is within limit' : 'Organizations with budgets of $2M or more are not eligible',
    },
    {
      rule: 'Funding Ratio',
      pass: requested <= totalCost * 0.5,
      message: requested <= totalCost * 0.5
        ? `Requested amount is ${Math.round((requested / totalCost) * 100)}% of project cost`
        : 'Requested amount cannot exceed 50% of total project cost',
    },
    {
      rule: 'Maximum Request',
      pass: requested <= 50000,
      message: requested <= 50000 ? 'Requested amount is within the $50,000 maximum' : 'Maximum grant amount is $50,000',
    },
    {
      rule: 'Minimum Impact',
      pass: beneficiaries >= 50,
      message: beneficiaries >= 50 ? `Project will serve ${beneficiaries} beneficiaries` : 'Project must serve at least 50 beneficiaries',
    },
  ];
  const score = rules.filter(r => r.pass).length;
  return { rules, score, overallEligible: score === 6 };
}

function awardCalc(beneficiaries, yearFounded, category, budget, requested, totalCost) {
  const years = CURRENT_YEAR - yearFounded;
  const ratio = requested / totalCost;

  const factors = [
    {
      factor: 'Community Impact',
      score: beneficiaries >= 1001 ? 3 : beneficiaries >= 201 ? 2 : 1,
      reason: `${beneficiaries} beneficiaries`,
    },
    {
      factor: 'Organization Track Record',
      score: years >= 16 ? 3 : years >= 6 ? 2 : 1,
      reason: `${years} years operating`,
    },
    {
      factor: 'Project Category Priority',
      score: ['Public Health', 'Neighborhood Safety'].includes(category) ? 3
        : ['Youth Programs', 'Senior Services'].includes(category) ? 2 : 1,
      reason: category,
    },
    {
      factor: 'Financial Need',
      score: budget < 100000 ? 3 : budget < 500000 ? 2 : 1,
      reason: `$${budget.toLocaleString()} budget`,
    },
    {
      factor: 'Cost Efficiency',
      score: ratio <= 0.25 ? 3 : ratio <= 0.40 ? 2 : 1,
      reason: `${Math.round(ratio * 100)}% of project cost`,
    },
  ];

  const totalScore = factors.reduce((s, f) => s + f.score, 0);
  const pct = totalScore / 15;
  const raw = requested * pct;
  const rounded = Math.round(raw / 100) * 100;
  const final = Math.min(rounded, 50000);
  return { factors, totalScore, pct, final };
}

/* ── main ─────────────────────────────────────────────────── */
function seed() {
  const db = getDb();

  /* 1. Applicant accounts */
  const applicants = [
    { email: 'diana@youthforward.org',   password: 'Diana@123', full_name: 'Diana Torres',   phone: '(410) 555-0142', org: 'Youth Forward Inc.' },
    { email: 'carlos@greenfuture.org',   password: 'Carlos@123', full_name: 'Carlos Mendez',  phone: '(410) 555-0199', org: 'Green Future Alliance' },
    { email: 'sarah@healingarts.org',    password: 'Sarah@123',  full_name: 'Sarah Kim',      phone: '(410) 555-0211', org: 'Healing Arts Collective' },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (email, password_hash, full_name, phone, organization_name, role)
    VALUES (?, ?, ?, ?, ?, 'APPLICANT')
  `);

  for (const a of applicants) {
    const hash = bcrypt.hashSync(a.password, 10);
    insertUser.run(a.email, hash, a.full_name, a.phone, a.org);
    console.log(`Applicant: ${a.email}  pwd: ${a.password}`);
  }

  /* 2. Fetch IDs */
  const getUser = (email) => db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const diana   = getUser('diana@youthforward.org');
  const carlos  = getUser('carlos@greenfuture.org');
  const sarah   = getUser('sarah@healingarts.org');
  const marcus  = getUser('marcus.johnson@maplewood.gov');

  /* 3. Application builder */
  const insertApp = db.prepare(`
    INSERT INTO applications (
      applicant_id, org_name, ein, org_type, year_founded, annual_budget, num_employees,
      contact_name, contact_email, contact_phone, org_address, mission_statement,
      project_title, project_category, project_description, target_population,
      num_beneficiaries, total_project_cost, amount_requested, project_start_date,
      project_end_date, prev_grant, eligibility_score, eligibility_results, is_eligible,
      status, reviewer_id, reviewer_comments, award_amount, award_percentage, award_breakdown,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const insertHistory = db.prepare(`
    INSERT INTO status_history (application_id, old_status, new_status, changed_by, comments, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();
  const future  = (d) => new Date(now.getTime() + d * 86400000).toISOString().slice(0, 10);

  /* ── Application 1: Diana — APPROVED ──────────────────── */
  {
    const e = eligibilityResults('501(c)(3)', 2015, 320000, 40000, 95000, 500);
    const a = awardCalc(500, 2015, 'Youth Programs', 320000, 40000, 95000);
    const id = insertApp.run(
      diana.id,
      'Youth Forward Inc.', '52-1234567', '501(c)(3)', 2015, 320000, 8,
      'Diana Torres', 'diana@youthforward.org', '(410) 555-0142',
      '742 Oak Street, Maplewood, MD 21201',
      'Youth Forward empowers at-risk youth through mentorship, academic support, and leadership development programs.',
      'After-School Mentorship Expansion', 'Youth Programs',
      'Expand our after-school mentorship program from 2 locations to 5 locations across East Maplewood, serving an additional 200 students with one-on-one mentoring, homework help, and career exploration workshops.',
      'At-risk youth ages 14-18 in East Maplewood',
      500, 95000, 40000, future(45), future(410),
      0,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'APPROVED', marcus.id, 'Excellent proposal with clear community impact and strong track record.',
      a.final, a.pct, JSON.stringify(a.factors),
      daysAgo(12), daysAgo(3),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', diana.id, null, daysAgo(12));
    insertHistory.run(id, 'SUBMITTED', 'UNDER_REVIEW', marcus.id, null, daysAgo(8));
    insertHistory.run(id, 'UNDER_REVIEW', 'APPROVED', marcus.id, 'Excellent proposal with clear community impact and strong track record.', daysAgo(3));
    console.log(`App #${id}: Diana — APPROVED ($${a.final.toLocaleString()})`);
  }

  /* ── Application 2: Diana — REJECTED ──────────────────── */
  {
    const e = eligibilityResults('501(c)(3)', 2015, 320000, 30000, 55000, 120);
    const id = insertApp.run(
      diana.id,
      'Youth Forward Inc.', '52-1234567', '501(c)(3)', 2015, 320000, 8,
      'Diana Torres', 'diana@youthforward.org', '(410) 555-0142',
      '742 Oak Street, Maplewood, MD 21201',
      'Youth Forward empowers at-risk youth through mentorship, academic support, and leadership development programs.',
      'Digital Literacy Lab', 'Workforce Development',
      'Create a digital literacy lab with 20 computer stations to provide job-readiness training, coding bootcamps, and resume workshops for unemployed youth aged 18-24.',
      'Unemployed youth ages 18-24 in West Maplewood',
      120, 55000, 30000, future(35), future(280),
      1,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'REJECTED', marcus.id, 'Insufficient detail on measurable outcomes and sustainability plan beyond the grant period. Please reapply with a stronger evaluation framework.',
      null, null, null,
      daysAgo(20), daysAgo(7),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', diana.id, null, daysAgo(20));
    insertHistory.run(id, 'SUBMITTED', 'UNDER_REVIEW', marcus.id, null, daysAgo(14));
    insertHistory.run(id, 'UNDER_REVIEW', 'REJECTED', marcus.id, 'Insufficient detail on measurable outcomes and sustainability plan beyond the grant period. Please reapply with a stronger evaluation framework.', daysAgo(7));
    console.log(`App #${id}: Diana — REJECTED`);
  }

  /* ── Application 3: Diana — SUBMITTED (new) ───────────── */
  {
    const e = eligibilityResults('501(c)(3)', 2015, 320000, 25000, 70000, 300);
    const id = insertApp.run(
      diana.id,
      'Youth Forward Inc.', '52-1234567', '501(c)(3)', 2015, 320000, 8,
      'Diana Torres', 'diana@youthforward.org', '(410) 555-0142',
      '742 Oak Street, Maplewood, MD 21201',
      'Youth Forward empowers at-risk youth through mentorship, academic support, and leadership development programs.',
      'Summer Leadership Academy', 'Youth Programs',
      'A 10-week summer leadership academy for 300 high-school students covering civic engagement, entrepreneurship, and community service projects across 6 Maplewood neighborhoods.',
      'High school students ages 14-18 across Maplewood',
      300, 70000, 25000, future(40), future(110),
      1,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'SUBMITTED', null, null,
      null, null, null,
      daysAgo(2), daysAgo(2),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', diana.id, null, daysAgo(2));
    console.log(`App #${id}: Diana — SUBMITTED`);
  }

  /* ── Application 4: Carlos — UNDER REVIEW ─────────────── */
  {
    const e = eligibilityResults('Community-Based Organization', 2010, 85000, 45000, 110000, 800);
    const id = insertApp.run(
      carlos.id,
      'Green Future Alliance', '47-9876543', 'Community-Based Organization', 2010, 85000, 5,
      'Carlos Mendez', 'carlos@greenfuture.org', '(410) 555-0199',
      '1205 Elm Avenue, Maplewood, MD 21202',
      'Green Future Alliance builds sustainable, healthy communities through urban farming, environmental education, and neighborhood clean-up initiatives.',
      'Urban Community Garden Network', 'Public Health',
      'Establish 8 community gardens across food-desert neighborhoods in Maplewood, providing fresh produce to 800 families and delivering nutrition education workshops to 400 residents.',
      'Low-income families in food-desert zones of North Maplewood',
      800, 110000, 45000, future(50), future(415),
      0,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'UNDER_REVIEW', marcus.id, null,
      null, null, null,
      daysAgo(9), daysAgo(4),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', carlos.id, null, daysAgo(9));
    insertHistory.run(id, 'SUBMITTED', 'UNDER_REVIEW', marcus.id, null, daysAgo(4));
    console.log(`App #${id}: Carlos — UNDER_REVIEW`);
  }

  /* ── Application 5: Carlos — APPROVED ─────────────────── */
  {
    const e = eligibilityResults('Community-Based Organization', 2010, 85000, 35000, 90000, 1200);
    const a = awardCalc(1200, 2010, 'Neighborhood Safety', 85000, 35000, 90000);
    const id = insertApp.run(
      carlos.id,
      'Green Future Alliance', '47-9876543', 'Community-Based Organization', 2010, 85000, 5,
      'Carlos Mendez', 'carlos@greenfuture.org', '(410) 555-0199',
      '1205 Elm Avenue, Maplewood, MD 21202',
      'Green Future Alliance builds sustainable, healthy communities through urban farming, environmental education, and neighborhood clean-up initiatives.',
      'Neighborhood Safety Lighting Initiative', 'Neighborhood Safety',
      'Install solar-powered LED lighting in 12 high-crime alleyways and pedestrian paths across South Maplewood, partnering with the city to reduce incidents and increase resident safety.',
      'Residents of South Maplewood neighborhoods',
      1200, 90000, 35000, future(55), future(420),
      0,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'APPROVED', marcus.id, 'Strong community safety impact with excellent cost efficiency.',
      a.final, a.pct, JSON.stringify(a.factors),
      daysAgo(30), daysAgo(15),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', carlos.id, null, daysAgo(30));
    insertHistory.run(id, 'SUBMITTED', 'UNDER_REVIEW', marcus.id, null, daysAgo(22));
    insertHistory.run(id, 'UNDER_REVIEW', 'APPROVED', marcus.id, 'Strong community safety impact with excellent cost efficiency.', daysAgo(15));
    console.log(`App #${id}: Carlos — APPROVED ($${a.final.toLocaleString()})`);
  }

  /* ── Application 6: Sarah — SUBMITTED ─────────────────── */
  {
    const e = eligibilityResults('Faith-Based Organization', 2008, 150000, 50000, 130000, 650);
    const id = insertApp.run(
      sarah.id,
      'Healing Arts Collective', '31-5556789', 'Faith-Based Organization', 2008, 150000, 12,
      'Sarah Kim', 'sarah@healingarts.org', '(410) 555-0211',
      '88 Maple Boulevard, Maplewood, MD 21203',
      'Healing Arts Collective provides mental health and wellness services through art therapy, counseling, and community healing circles for underserved populations.',
      'Community Mental Health Arts Program', 'Public Health',
      'Launch a 12-month art therapy and mental wellness program serving 650 residents across 4 community centers, addressing the mental health crisis among low-income adults and seniors post-pandemic.',
      'Low-income adults and seniors experiencing mental health challenges',
      650, 130000, 50000, future(32), future(397),
      0,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'SUBMITTED', null, null,
      null, null, null,
      daysAgo(1), daysAgo(1),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', sarah.id, null, daysAgo(1));
    console.log(`App #${id}: Sarah — SUBMITTED`);
  }

  /* ── Application 7: Sarah — UNDER REVIEW ──────────────── */
  {
    const e = eligibilityResults('Faith-Based Organization', 2008, 150000, 40000, 95000, 200);
    const id = insertApp.run(
      sarah.id,
      'Healing Arts Collective', '31-5556789', 'Faith-Based Organization', 2008, 150000, 12,
      'Sarah Kim', 'sarah@healingarts.org', '(410) 555-0211',
      '88 Maple Boulevard, Maplewood, MD 21203',
      'Healing Arts Collective provides mental health and wellness services through art therapy, counseling, and community healing circles for underserved populations.',
      'Senior Wellness & Arts Initiative', 'Senior Services',
      'Deliver weekly art therapy sessions, chair yoga, and social engagement programs to 200 isolated seniors across 5 assisted-living facilities in Maplewood, reducing loneliness and improving quality of life.',
      'Isolated seniors aged 65+ in assisted-living facilities',
      200, 95000, 40000, future(38), future(403),
      1,
      e.score, JSON.stringify(e.rules), e.overallEligible ? 1 : 0,
      'UNDER_REVIEW', marcus.id, null,
      null, null, null,
      daysAgo(6), daysAgo(2),
    ).lastInsertRowid;
    insertHistory.run(id, null, 'SUBMITTED', sarah.id, null, daysAgo(6));
    insertHistory.run(id, 'SUBMITTED', 'UNDER_REVIEW', marcus.id, null, daysAgo(2));
    console.log(`App #${id}: Sarah — UNDER_REVIEW`);
  }

  console.log('\n✅ Demo seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('APPLICANT LOGINS:');
  console.log('  diana@youthforward.org   / Diana@123');
  console.log('  carlos@greenfuture.org   / Carlos@123');
  console.log('  sarah@healingarts.org    / Sarah@123');
  console.log('\nREVIEWER LOGINS:');
  console.log('  marcus.johnson@maplewood.gov / Reviewer123');
  console.log('  sarah.mitchell@maplewood.gov / Reviewer123');
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
}

seed();

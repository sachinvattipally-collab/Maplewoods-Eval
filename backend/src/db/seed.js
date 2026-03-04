require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

async function seed() {
  const db = getDb();

  // Reviewer and admin passwords are read from environment variables.
  // Set REVIEWER_PASSWORD and ADMIN_PASSWORD in backend/.env before running this script.
  // They must satisfy the strong-password policy: 8+ chars, upper, lower, digit.
  const reviewerPassword = process.env.REVIEWER_PASSWORD;
  const adminPassword    = process.env.ADMIN_PASSWORD;

  if (!reviewerPassword || !adminPassword) {
    console.error(
      'ERROR: REVIEWER_PASSWORD and ADMIN_PASSWORD must be set in backend/.env before seeding.\n' +
      'Example:\n  REVIEWER_PASSWORD=Reviewer@2026!\n  ADMIN_PASSWORD=Admin@2026!',
    );
    process.exit(1);
  }

  const accounts = [
    { email: 'marcus.johnson@maplewood.gov', password: reviewerPassword, full_name: 'Marcus Johnson', phone: '(410) 555-0001', organization_name: 'Maplewood County Office of Community Development', role: 'REVIEWER' },
    { email: 'sarah.mitchell@maplewood.gov', password: reviewerPassword, full_name: 'Sarah Mitchell', phone: '(410) 555-0002', organization_name: 'Maplewood County Office of Community Development', role: 'REVIEWER' },
    { email: 'priya.sharma@maplewood.gov',   password: adminPassword,    full_name: 'Priya Sharma',   phone: '(410) 555-0003', organization_name: 'Maplewood County Office of Community Development', role: 'ADMIN' },
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (email, password_hash, full_name, phone, organization_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const account of accounts) {
    const hash = bcrypt.hashSync(account.password, 10);
    insertUser.run(account.email, hash, account.full_name, account.phone, account.organization_name, account.role);
    console.log(`Seeded: ${account.email} (${account.role})`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'grants.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      organization_name TEXT,
      role TEXT NOT NULL DEFAULT 'APPLICANT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL,
      org_name TEXT, ein TEXT, org_type TEXT, year_founded INTEGER,
      annual_budget REAL, num_employees INTEGER,
      contact_name TEXT, contact_email TEXT, contact_phone TEXT,
      org_address TEXT, mission_statement TEXT,
      project_title TEXT, project_category TEXT, project_description TEXT,
      target_population TEXT, num_beneficiaries INTEGER,
      total_project_cost REAL, amount_requested REAL,
      project_start_date TEXT, project_end_date TEXT, prev_grant INTEGER DEFAULT 0,
      eligibility_score INTEGER DEFAULT 0,
      eligibility_results TEXT,
      is_eligible INTEGER DEFAULT 0,
      award_amount REAL, award_breakdown TEXT, award_percentage REAL,
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      reviewer_id INTEGER, reviewer_comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applicant_id) REFERENCES users(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT, file_size INTEGER, file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id)
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      old_status TEXT, new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL, comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );
  `);
}

module.exports = { getDb };

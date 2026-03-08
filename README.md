# Maplewood County Community Development Grant Portal

A full\-stack web application for managing the Maplewood County Community Development Grant Program. Applicants submit grant applications, and reviewers evaluate, approve, or reject them with calculated award amounts.

## Tech Stack

* Frontend: React 18 \+ Vite \+ React Router v6
* Backend: Node.js \+ Express
* Database: SQLite (via better\-sqlite3 — no separate install needed)
* Auth: JWT \+ bcrypt
* File Upload: Multer with magic\-byte validation
* Security: Helmet, CORS, express\-rate\-limit, sanitize\-filename

## Prerequisites

* Node.js 18\+ (download from https://nodejs.org — choose LTS)
* npm (comes with Node.js)

## Setup Instructions

### 1\. Clone / open the project

```bash
cd maplewood-grants
```

### 2\. Install and start the backend

```bash
cd backend
npm install
node src/db/seed.js
npm run dev
```

Backend runs at: http://localhost:3001

### 3\. Install and start the frontend (new terminal tab)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

Open http://localhost:5173 in your browser.

## Test Credentials

* **Applicant**: Register a new account at /register
* **Reviewer 1**: marcus.johnson@maplewood.gov / Reviewer123
* **Reviewer 2**: sarah.mitchell@maplewood.gov / Reviewer123

## Architecture & Design Decisions

### Layered Backend Architecture

The backend follows a clean **Route → Controller → Service** pattern:

* **Routes** (`src/routes/`): Define HTTP endpoints, apply middleware (auth, rate limiting, multer). No business logic.
* **Controllers** (`src/controllers/`): Handle request/response, orchestrate services, and return appropriate status codes.
* **Services** (`src/services/`): Pure business logic \- eligibility engine and award calculator. No HTTP awareness.
* **Utils** (`src/utils/`): Shared validation functions, helpers, and constants.
* **Middleware** (`src/middleware/`): JWT authentication and role\-based authorization guards.

### Eligibility Engine \- Dual Deployment

The same pure function runs in two places:

* **Frontend** (`frontend/src/services/eligibilityEngine.js`): Real\-time feedback as the user fills out the form, with a three\-state visual (pass/fail/not\-yet\-evaluated).
* **Backend** (`backend/src/services/eligibilityEngine.js`): Server\-side validation on submission. Results are persisted in the database and displayed on detail views.

Both implementations are identical pure functions. This ensures the applicant sees accurate eligibility feedback before submitting, and the server independently verifies on submission.

**Six rules evaluated:**

| # | Rule | Condition |
|:--|:-----|:----------|
| 1 | Organization Type | Must be 501(c)(3), 501(c)(4), or Community\-Based Organization |
| 2 | Established Organization | Founded ≥ 2 years ago |
| 3 | Budget Cap | Annual budget < $2,000,000 |
| 4 | Maximum Request | Amount requested ≤ $50,000 |
| 5 | Cost Ratio | Amount requested ≤ 50% of total project cost |
| 6 | Community Impact | ≥ 50 beneficiaries |

### Award Calculator \- Server\-Side Only

The award calculator (`backend/src/services/awardCalculator.js`) runs exclusively on the backend when a reviewer approves an application. It is never exposed to the client before approval.

**Formula:**

```
Total Score      = sum of 5 factor scores (range 5-15)
Award Percentage = Total Score / 15
Raw Award        = Amount Requested × Award Percentage
Rounded Award    = round to nearest $100
Final Award      = min(Rounded Award, $50,000)
```

**Five scoring factors:**

| Factor | Max | Criteria |
|:-------|:----|:---------|
| Community Impact | 3 | Based on beneficiary count thresholds |
| Budget Efficiency | 3 | Based on grant\-to\-budget ratio |
| Organization Track Record | 3 | Previous grants \+ years of operation |
| Project Scope Alignment | 3 | Cost ratio and category match |
| Financial Need | 3 | Based on budget size |

The reviewer sees the full breakdown (each factor's score and reason) in a modal before confirming approval.

### Authentication & Security

* **JWT with 30\-minute expiry** — tokens carry only `{ id, role }` to minimize payload and risk.
* **Client\-side token expiry check** — prevents 401 errors mid\-flow by proactively logging out.
* **bcrypt password hashing** — 10 salt rounds.
* **Rate limiting** — 10 login attempts per 15 min, 5 registrations per hour (per IP).
* **Anti\-enumeration** — login returns identical error for "user not found" and "wrong password".
* **Strong password policy** — 8\+ characters, uppercase, lowercase, digit required.
* **Role\-based authorization** — middleware guards on every endpoint. JWT role cannot be modified client\-side.
* **IDOR protection** — applicants can only access their own applications/documents.
* **Input validation** — comprehensive server\-side validation on all fields (type, range, format).
* **File security** — MIME\-type check \+ magic\-byte validation to prevent disguised file uploads.
* **Helmet** — sets secure HTTP headers.
* **Parameterized SQL** — all database queries use parameterized statements (no string interpolation).
* **Filename sanitization** — uploaded filenames sanitized to prevent path traversal.

### Application Workflow (State Machine)

Status transitions are strictly forward\-only:

```
SUBMITTED → UNDER_REVIEW → APPROVED
                         → REJECTED
```

* No backward transitions allowed (e.g., cannot go from UNDER\_REVIEW back to SUBMITTED).
* Terminal states (APPROVED/REJECTED) cannot be changed.
* Each transition is recorded in `status_history` for audit trail.
* Rejection requires a mandatory comment.

### File Upload Architecture

* Files are stored on the local filesystem under `/uploads/`.
* File references are stored in the `documents` table linked to `applications`.
* The frontend uses a module\-level file store (`fileStore.js`) to carry `File` objects across React Router navigations without serialization.
* Upload happens after application creation in a two\-step process: POST application → POST document.

### Frontend UX Design

* **Two\-section form** with navigation indicator (step 1 / step 2).
* **Real\-time eligibility panel** in a sticky sidebar alongside the form.
* **Phone auto\-formatting** on registration and application form — digits auto\-formatted to \(XXX\) XXX\-XXXX, non\-digits blocked at input.
* **Inline field validation** on blur with specific error messages.
* **Pre\-submission review screen** showing all entered data and eligibility summary.
* **Success toast notifications** after application submission.
* **Loading spinners** for all async operations.
* **Responsive design** — works on desktop and mobile.
* **Consistent status badges** across all views (Submitted/Under Review/Approved/Rejected).

## Features Implemented

* [x] Landing page with program information and how\-it\-works section
* [x] Applicant registration with strong password validation and phone auto\-formatting \((XXX) XXX\-XXXX\)
* [x] Login with anti\-enumeration and rate limiting
* [x] JWT authentication with 30\-minute expiry and client\-side expiry check
* [x] Role\-based routing and authorization (APPLICANT vs REVIEWER)
* [x] Two\-section grant application form (22\+ fields with inline validation)
* [x] Real\-time eligibility engine (6 rules, three\-state indicators)
* [x] File upload with MIME \+ magic\-byte validation (PDF, JPG, PNG — max 5 MB)
* [x] Pre\-submit review screen with eligibility summary
* [x] Success notifications after submission
* [x] Applicant dashboard with status badges and award amounts
* [x] Application detail view with eligibility breakdown and award info
* [x] Reviewer dashboard with summary stats, status \+ eligibility filters
* [x] Reviewer application detail with full eligibility and applicant info
* [x] Approve workflow with award calculation breakdown modal
* [x] Reject workflow with required comment
* [x] Award calculation engine (5 factors, formula\-based, verified against spec)
* [x] Forward\-only status state machine with audit trail
* [x] Document download for reviewers and applicants
* [x] Comprehensive server\-side input validation
* [x] Responsive design (mobile\-friendly all pages)

## Database Schema

| Table | Purpose |
|:------|:--------|
| `users` | Applicant and reviewer accounts (email, hashed password, role) |
| `applications` | Grant applications with all form fields, eligibility results, award data |
| `documents` | Uploaded file metadata (linked to applications) |
| `status_history` | Audit trail of all status transitions with timestamps and comments |

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|:-------|:---------|:-----|:-----|:------------|
| POST | /api/auth/register | — | — | Register new applicant |
| POST | /api/auth/login | — | — | Login (applicant or reviewer) |
| GET | /api/applications | JWT | APPLICANT | List own applications |
| GET | /api/applications/all | JWT | REVIEWER | List all applications (filterable) |
| GET | /api/applications/stats | JWT | REVIEWER | Dashboard summary statistics |
| GET | /api/applications/:id | JWT | Both | View single application detail |
| POST | /api/applications | JWT | APPLICANT | Submit new application |
| POST | /api/applications/:id/documents | JWT | APPLICANT | Upload supporting document |
| GET | /api/applications/:id/documents | JWT | Both | Download document |
| PATCH | /api/applications/:id/status | JWT | REVIEWER | Approve/reject/move to review |
| POST | /api/applications/:id/award | JWT | REVIEWER | Preview award calculation |

## Known Limitations

* JWT tokens expire in 30 minutes — user must log in again after expiry
* File uploads stored on local filesystem (not cloud storage)
* No email notifications on status changes
* No admin reporting/analytics page
* No password reset flow
* Single database file (SQLite) — not suitable for high\-concurrency production

## AI Tool Usage

Cursor AI was used throughout development as a coding assistant. Here is how AI was leveraged:

### Code Generation

* Initial scaffolding of React components and Express routes from the challenge specification.
* Database schema design and seed script generation.
* CSS styling for the landing page, forms, dashboards, and responsive layouts.

### Business Logic Verification

* The eligibility engine was implemented and then verified against the sample data in Appendix A of the spec (Youth Forward Inc. → $24,000 award).
* Edge cases were identified through AI\-assisted analysis (e.g., `0` values being falsily coerced in JavaScript, leading to a fix using explicit `isProvided` helper functions).
* All six eligibility rules and five award factors were cross\-checked against the spec document.

### Testing & Bug Discovery

* A comprehensive test suite (`backend/test_suite.js`, 250\+ test cases) was generated covering unit tests, integration tests, edge cases, and security scenarios.
* A dedicated registration test suite (`backend/test_register.js`, 223 test cases) covers the happy path, JWT payload integrity, full name, email, password strength, confirm\-password, role enforcement, and edge cases.
* AI helped identify a critical bug where `File` objects were lost during React Router navigation (fixed with a module\-level file store).
* Rate limiter interaction with test ordering was identified and resolved (restart server between runs to reset in\-memory limiter).

### Refactoring

* Route files were refactored into a clean Route → Controller → Service architecture.
* Inline styles were extracted to CSS utility classes.
* Field validation was centralized using a validator pattern for DRY onBlur validation.

### What Was NOT AI\-Generated

* All business requirements were manually read and understood from the challenge specification.
* Design decisions (JWT payload minimization, forward\-only state machine, dual eligibility engine deployment) were made based on engineering judgment.
* Every line of generated code was reviewed, understood, and modified where needed.

# Nayra Connect - Legal Aid Clinic Case Allocator

> **Software Engineering and Agile Practices College Project Review**  
> **Repository:** [https://github.com/KingSalvatore7000/Nayra-Connect.git](https://github.com/KingSalvatore7000/Nayra-Connect.git)  
> **Release Tag:** `review2-demo`

---

## 1. Product Overview

**Nayra Connect** is a full-stack Legal Aid Clinic Case Allocation and Management platform engineered to bridge the access-to-justice gap. It automates the assignment of walk-in legal cases (bail petitions, criminal defense, family disputes, labor disputes, consumer grievances, and property claims) to volunteer lawyers based on verified specializations and real-time workload capacity.

### Core Value Proposition
- **Pure Allocation Engine**: Deterministic, explainable matching algorithm weighting workload capacity (`0.6`) and availability fit (`0.4`), with capacity boundary guards and zero database latency.
- **Proactive TAT Risk Monitoring**: Rule-based Target Turnaround Time (TAT) risk engine that flags cases approaching or breaching deadlines without opaque machine learning models.
- **Conflict-Free 30-Minute Consultations**: Automated calendar reservation engine detecting 30-minute time conflicts per lawyer (HTTP 409).
- **Role-Based Access Control**:
  - **Clinic Coordinator**: Case intake, automatic & manual assignment overrides, lawyer capacity management, and visual analytics dashboard.
  - **Volunteer Lawyer**: Dedicated dashboard viewing only assigned cases, consultation schedules, and case notes.
- **Zero-Setup Modular Database**: Portable SQL architecture powered by SQLite (`better-sqlite3`) by default, seamlessly swappable with MySQL (`mysql2`) via `.env`.

---

## 2. Tech Stack

- **Runtime & Web Framework**: Node.js (v20+), Express.js (REST APIs, pure JSON responses)
- **Database Layer**: SQLite via `better-sqlite3` behind an abstracted query interface (`db/index.js`), with portable SQL statements compatible with MySQL (`DB_CLIENT=mysql`)
- **Authentication**: `bcryptjs` password hashing, stateless JSON Web Tokens (JWT) via `Authorization: Bearer <token>`, role-based middleware
- **Frontend Architecture**: Plain HTML5, Vanilla CSS3, Vanilla JavaScript served statically from `/public`, Chart.js for workload and status visualizations
- **Testing & Quality Assurance**:
  - **Unit & Integration Tests**: Jest (v29) + Supertest (v7)
  - **Code Coverage**: Built-in Jest coverage engine (`docs/coverage.txt`)
  - **Static Code Analysis**: ESLint with `complexity` rule (`docs/complexity.txt`)
  - **End-to-End Automation**: Selenium WebDriver (JavaScript / Headless Chrome)

---

## 3. Agile Milestone Progression

This project was built strictly across 9 ordered Agile milestones with continuous commits and pushes to `origin main`:

| Milestone | Commit Tag | Description |
|---|---|---|
| **Milestone 1** | `NC-1` | Scaffold repository, database abstraction layer, portable SQL schema, seed script, and README stub. |
| **Milestone 2** | `NC-2` | Stateless authentication layer with bcrypt hashing, JWT issuance, and granular role authorization middleware. |
| **Milestone 3** | `NC-3` | Volunteer lawyer roster API and walk-in case intake API with strict payload validation. |
| **Milestone 4** | `NC-4` | Pure case allocation scoring engine, tie-breaking logic, and coordinator override endpoint. |
| **Milestone 5** | `NC-5` | Comprehensive Jest + Supertest test suite with code coverage analysis (`docs/coverage.txt`) and defect log. |
| **Milestone 6** | `NC-6` | Responsive frontend client with intake form, live allocation feedback modal, and lawyer roster manager. |
| **Milestone 7** | `NC-7` | Rule-based TAT risk calculation engine, 30-minute consultation scheduler, and Chart.js analytics dashboard. |
| **Milestone 8** | `NC-8` | ESLint cyclomatic complexity audit (`docs/complexity.txt`) and Selenium WebDriver UI automation test. |
| **Milestone 9** | `NC-9` | Complete project documentation, execution matrices, demo script, and release tag `review2-demo`. |

---

## 4. Folder Structure

```
nayra-connect/
├── db/
│   ├── index.js                  # Modular DB wrapper (SQLite / MySQL)
│   ├── schema.sql                # Portable DDL schema definition
│   └── seed.js                   # Seed script populating demo dataset
├── docs/
│   ├── complexity.txt            # ESLint cyclomatic complexity audit report
│   ├── coverage.txt              # Jest code coverage execution report
│   ├── defect-log.md             # Real-time defect log and root cause fixes
│   └── test-cases.md             # Positive, negative, and boundary test matrix
├── public/
│   ├── css/style.css             # Design system, layout, and component styles
│   ├── js/
│   │   ├── auth.js               # Client authentication and quick-fill helper
│   │   ├── cases.js              # Cases table rendering, search, and modals
│   │   ├── common.js             # JWT token helpers, apiRequest wrapper, toasts
│   │   ├── dashboard.js          # Chart.js charts and at-risk metrics
│   │   ├── intake.js             # Intake form validation and allocation modal
│   │   └── lawyers.js            # Lawyer roster cards and capacity updater
│   ├── cases.html                # Cases table with filters and action modals
│   ├── dashboard.html            # Analytics dashboard with Chart.js
│   ├── index.html                # Root router redirecting by auth status
│   ├── intake.html               # Walk-in case intake form
│   ├── lawyers.html              # Volunteer lawyers roster
│   └── login.html                # Login interface with demo selectors
├── src/
│   ├── config/index.js           # Centralized environment configuration
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   ├── roles.js              # Role-based authorization middleware
│   │   └── validate.js           # Case intake validation and enums
│   ├── routes/
│   │   ├── auth.js               # /api/auth routes (login, register, me)
│   │   ├── cases.js              # /api/cases routes (intake, assign, schedule, status)
│   │   ├── dashboard.js          # /api/dashboard routes (summary metrics)
│   │   └── lawyers.js            # /api/lawyers routes (list, create, update)
│   ├── services/
│   │   ├── allocator.js          # Pure allocation scoring engine
│   │   ├── riskService.js        # Rule-based TAT risk service
│   │   └── scheduler.js          # 30-min slot conflict scheduler
│   ├── app.js                    # Express application configuration
│   └── server.js                 # HTTP listener and DB bootstrapper
├── tests/
│   ├── integration/
│   │   ├── auth.test.js          # Authentication API integration tests
│   │   ├── cases.test.js         # Case intake & override integration tests
│   │   ├── dashboardAndSchedule.test.js # Dashboard & scheduling tests
│   │   └── lawyers.test.js       # Lawyer roster integration tests
│   ├── ui/
│   │   └── caseIntake.test.js    # Selenium WebDriver E2E automation test
│   └── unit/
│       ├── allocator.test.js     # Allocation scoring unit tests
│       ├── riskService.test.js   # TAT risk ratio unit tests
│       └── scheduler.test.js     # 30-min window conflict unit tests
├── .env.example                  # Environment configuration template
├── .eslintrc.json                # ESLint complexity rule configuration
├── .gitignore                    # Secrets, DB files, and node_modules exclusions
└── package.json                  # NPM dependencies and scripts
```

---

## 5. Quick Start & Setup

### Prerequisites
- Node.js (version 20.x or later)
- Google Chrome (for Selenium UI automation)

### 1. Clone & Install
```bash
git clone https://github.com/KingSalvatore7000/Nayra-Connect.git
cd Nayra-Connect
npm install
```

### 2. Configure Environment
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=nayra_jwt_secret_key_college_review_2026
DB_CLIENT=sqlite
DB_PATH=./db/nayra.db
```

### 3. Seed Database
```bash
npm run seed
```

### 4. Run Application Server
```bash
npm start
```
The application will be live at `http://localhost:3000`.

---

## 6. Seeded Demo Credentials

| Role | Name | Email | Password | Specializations | Capacity |
|---|---|---|---|---|---|
| **Coordinator** | Clinic Coordinator | `coordinator@nayra.test` | `Coordinator@123` | *All administrative permissions* | — |
| **Lawyer 1** | Adv. Priya Sharma | `lawyer1@nayra.test` | `Lawyer@123` | Bail, Criminal | 4 cases |
| **Lawyer 2** | Adv. Rahul Verma | `lawyer2@nayra.test` | `Lawyer@123` | Family, Property | 5 cases |
| **Lawyer 3** | Adv. Ananya Iyer | `lawyer3@nayra.test` | `Lawyer@123` | Labor, Consumer | 3 cases |
| **Lawyer 4** | Adv. Vikram Malhotra | `lawyer4@nayra.test` | `Lawyer@123` | Bail, Criminal, Property | 6 cases |
| **Lawyer 5** | Adv. Sunita Rao | `lawyer5@nayra.test` | `Lawyer@123` | Family, Labor | 4 cases |
| **Lawyer 6** | Adv. Arjun Nair | `lawyer6@nayra.test` | `Lawyer@123` | Consumer, Bail | 5 cases |
| **Lawyer 7** | Adv. Meera Joshi | `lawyer7@nayra.test` | `Lawyer@123` | Criminal *(On leave / Inactive)* | 2 cases |

---

## 7. API Specification

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials and returns JWT + user profile. |
| `POST` | `/api/auth/register` | Coordinator | Registers a new user/lawyer account. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated profile. |
| `GET` | `/api/lawyers` | Authenticated | Lists all lawyers with workload, capacity, and specializations. |
| `POST` | `/api/lawyers` | Coordinator | Creates a new volunteer lawyer profile. |
| `PATCH` | `/api/lawyers/:id` | Coordinator | Modifies lawyer capacity, availability, or specializations. |
| `POST` | `/api/cases` | Authenticated | Validates intake and automatically allocates a suitable lawyer. |
| `GET` | `/api/cases` | Authenticated | Coordinator views all cases; Lawyer views own assigned cases. |
| `GET` | `/api/cases/:id` | Authenticated | Returns individual case details with TAT risk metrics. |
| `PATCH` | `/api/cases/:id/assign` | Coordinator | Overrides case assignment with a specific lawyer ID or unassigns. |
| `PATCH` | `/api/cases/:id/schedule`| Authenticated | Schedules a 30-min consultation slot (rejects conflicts with 409). |
| `PATCH` | `/api/cases/:id/status` | Authenticated | Updates case status (`New`, `Allocated`, `Scheduled`, `Closed`). |
| `GET` | `/api/dashboard/summary`| Coordinator | Aggregates status counts, lawyer loads, and at-risk cases. |

---

## 8. Allocation & Risk Algorithms

### Allocation Engine (`src/services/allocator.js`)
1. **Eligibility Filter**: Lawyer must be `available === true`, specialize in `case_type`, have `capacity > 0`, and `openCases < capacity`.
2. **Workload Score**:
   $$\text{Score} = 0.6 \times \left(1 - \frac{\text{openCases}}{\text{capacity}}\right) + 0.4 \times \text{availabilityFit}$$
3. **Deterministic Tie-Breaking**: Highest score $\rightarrow$ Lowest `openCases` $\rightarrow$ Lowest lawyer `id`.
4. **Safety Guards**: Lawyers with $\text{capacity} \le 0$ are excluded defensively to prevent division-by-zero.

### Risk Service (`src/services/riskService.js`)
Evaluates turnaround time ratio $\text{ratio} = \frac{\text{daysElapsed}}{\text{target\_days}}$:
- **Low Risk**: $\text{ratio} < 0.5$ (Green badge)
- **Medium Risk**: $0.5 \le \text{ratio} < 0.8$ (Amber badge)
- **High Risk**: $\text{ratio} \ge 0.8$ or $\text{daysElapsed} \ge \text{target\_days}$ (Red badge)
- **Exempt**: Cases marked as `Closed` are never at risk (`None`).

---

## 9. Quality Assurance & Test Verification

### Execute Test Suite
```bash
# Run unit and integration tests (70 tests across 7 suites)
npm test

# Generate code coverage report (saved to docs/coverage.txt)
npm run test:coverage

# Run ESLint cyclomatic complexity audit
npm run lint

# Run Selenium WebDriver UI automation test
npm run test:ui
```

### Coverage Summary (`docs/coverage.txt`)
- **Statements Coverage**: **88.67%**
- **Lines Coverage**: **89.13%**
- **Functions Coverage**: **97.36%**
- **Allocation Engine (`allocator.js`)**: **100% Statements, 100% Branches, 100% Functions, 100% Lines**

### Complexity Summary (`docs/complexity.txt`)
- ESLint complexity threshold: `max: 10`
- `allocateCase()` cyclomatic complexity: **9** (optimal, 0 linter errors)

---

## 10. 8-Minute College Project Review Demo Script

Follow this step-by-step sequence during the project review:

### Minute 1: System Architecture & Seeding (Terminal)
1. Open terminal and run `npm run seed`.
2. Highlight the clean SQLite database reset and seeded dataset: 1 coordinator, 7 volunteer lawyers with diverse specializations, and 10 realistic walk-in cases spanning different turnaround stages.
3. Start the application: `npm start`.

### Minute 2: Authentication & Role-Based Access (`http://localhost:3000`)
1. Open `http://localhost:3000`. You are redirected to `login.html`.
2. Click the quick-fill button **"Coordinator"** (`coordinator@nayra.test` / `Coordinator@123`).
3. Click **Sign In**. Observe immediate redirection to the **Clinic Dashboard** (`dashboard.html`).

### Minute 3: Analytics Dashboard & TAT Risk Monitoring
1. Point out the real-time KPI cards: Total Cases, Active Cases, Unassigned Cases, and At-Risk Cases.
2. Review the **Chart.js Bar Chart** comparing active caseloads against total lawyer capacity.
3. Review the **Case Status Distribution Donut Chart**.
4. Scroll to the **At-Risk & Overdue Cases Table**:
   - Show Case #6 (Mohammad Irfan, Bail): 4 days elapsed against a 3-day target $\rightarrow$ flagged as **OVERDUE** (Red badge).
   - Show Case #7 (Geeta Shinde, Criminal): 6 days elapsed against a 7-day target $\rightarrow$ flagged as **HIGH RISK** (86% TAT elapsed).

### Minute 4: Walk-in Case Intake & Automated Allocation
1. Click **"+ Walk-In Intake"** in the navigation bar (`intake.html`).
2. Fill out a sample urgent walk-in client:
   - **Client Name**: `Amal John`
   - **Phone**: `9876543210`
   - **Case Category**: `Bail Application (Target TAT: 3 days)`
   - **Priority**: `High Urgency`
   - **Summary**: `Urgent bail petition for detained shopkeeper.`
3. Click **"Submit & Auto-Allocate"**.
4. Show the immediate pop-up modal: The allocation engine calculated workloads and assigned the case to an available bail specialist (`Adv. Arjun Nair` or `Adv. Priya Sharma`).

### Minute 5: Cases Roster, Filtering & Coordinator Override
1. Click **"View All Cases"** (`cases.html`).
2. Demonstrate real-time search: Type `Amal John` in the search bar.
3. Demonstrate category filter: Select `Bail` to show only bail matters.
4. Demonstrate **Manual Override**:
   - Click **"🔄 Reassign"** on a case.
   - Select another lawyer from the dropdown (e.g. `Adv. Vikram Malhotra`).
   - Click **"Confirm Assignment"**. The table immediately updates with the new lawyer name.

### Minute 6: 30-Minute Conflict-Free Consultation Scheduling
1. On an allocated case, click **"📅 Schedule"**.
2. Pick a consultation date/time (e.g. tomorrow at 10:00 AM) and confirm. The case status transitions to `Scheduled`.
3. Demonstrate conflict detection: Attempt to schedule another case for the *same lawyer* within 15 minutes of that time $\rightarrow$ the system catches the conflict and shows HTTP 409 error toast: `"Consultation slot conflict: this lawyer already has a consultation scheduled within 30 minutes of that time"`.

### Minute 7: Volunteer Lawyer View
1. Click **"Logout"** in the top navigation.
2. Click **"Lawyer 1 (Priya)"** demo quick-fill (`lawyer1@nayra.test` / `Lawyer@123`) and log in.
3. Note the restricted view:
   - The coordinator-only navigation items (Dashboard, Intake, Lawyers roster) are hidden.
   - The table shows **only cases assigned to Adv. Priya Sharma**.
   - Attempting to access another lawyer's case is blocked with HTTP 403 Forbidden.

### Minute 8: Testing, Code Quality & Defect Log
1. Switch back to the terminal.
2. Run `npm test`: Show all **7 test suites and 70 tests passing**.
3. Run `npm run test:coverage`: Point out **88%+ test coverage** and **100% coverage on `allocator.js`**.
4. Run `npm run lint`: Show that ESLint passes with **0 complexity violations** (`allocateCase` complexity: 9).
5. Run `npm run test:ui`: Watch the **Selenium WebDriver automated headless browser test** execute the complete login, intake, and cases table verification end-to-end.
6. Open `docs/defect-log.md` and show the recorded defect (`DEF-001`), root cause, and verified fix.

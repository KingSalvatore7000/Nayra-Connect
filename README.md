# Nayra Connect - Legal Aid Clinic Case Allocator

Nayra Connect is a full-stack Legal Aid Clinic Case Allocator built for a college Software Engineering and Agile Practices project review. It automates matching walk-in legal cases to volunteer lawyers based on specialization and workload capacity, while proactively tracking Target Turnaround Time (TAT) risk levels.

## Key Features
- **Intelligent Case Allocation**: Pure scoring algorithm balancing lawyer workload capacity and specialization fit.
- **Role-Based Workflows**: Distinct views for Clinic Coordinators (system overview, case intake, manual override) and Volunteer Lawyers (personal roster).
- **TAT Risk Engine**: Rule-based tracking flagging overdue or at-risk cases without opaque ML models.
- **Conflict-Free Scheduling**: 30-minute consultation scheduling with conflict prevention.
- **Modular Data Layer**: Default zero-setup SQLite (`better-sqlite3`) swappable with MySQL (`mysql2`).

## Tech Stack
- **Backend**: Node.js, Express, REST APIs
- **Database**: SQLite (`better-sqlite3`) / MySQL
- **Auth**: bcrypt password hashing, JWT authorization
- **Frontend**: Plain HTML5, Vanilla CSS, Vanilla JavaScript, Chart.js
- **Quality Assurance**: Jest, Supertest, ESLint complexity rule, Selenium WebDriver

## Quick Start
```bash
# Install dependencies
npm install

# Seed demo dataset
npm run seed

# Start application server
npm start
```

## Milestone Progression
- [x] **NC-1**: Scaffold, schema, DB layer, seed script, README stub
- [ ] **NC-2**: Auth with bcrypt, JWT and role middleware
- [ ] **NC-3**: Lawyers API and case intake API with validation
- [ ] **NC-4**: Allocation engine, override endpoint, wired into intake
- [ ] **NC-5**: Jest + Supertest tests for auth, allocator, intake, with coverage
- [ ] **NC-6**: Frontend pages
- [ ] **NC-7**: Dashboard, risk service, scheduler
- [ ] **NC-8**: ESLint complexity report and Selenium UI test
- [ ] **NC-9**: Final documentation, test-case sheet, defect log and tagged release

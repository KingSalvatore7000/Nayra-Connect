-- Nayra Connect Database Schema (Portable for SQLite & MySQL)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK(role IN ('coordinator', 'lawyer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lawyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 5,
  available BOOLEAN NOT NULL DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lawyer_specializations (
  lawyer_id INTEGER NOT NULL,
  case_type VARCHAR(50) NOT NULL,
  PRIMARY KEY (lawyer_id, case_type),
  FOREIGN KEY (lawyer_id) REFERENCES lawyers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  case_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK(priority IN ('Low', 'Medium', 'High')),
  status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Allocated', 'Unassigned', 'Scheduled', 'Closed')),
  lawyer_id INTEGER NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  target_days INTEGER NOT NULL,
  consultation_at TIMESTAMP NULL,
  FOREIGN KEY (lawyer_id) REFERENCES lawyers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer ON cases(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_created ON cases(created_at);

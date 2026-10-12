# Nayra Connect - Agile Defect Log

This log records real defects discovered during development and testing phases, detailing severity, root cause, implementation fix, and retest verification.

| Defect ID | Description | Severity | Module | Root Cause | Fix Applied | Retest Result |
|---|---|---|---|---|---|---|
| DEF-001 | Primary key AUTOINCREMENT offsets persisted across sequential test suite re-seeds | Medium | Database / Testing | `DELETE FROM` statements in `db/seed.js` cleared table data but left SQLite's internal `sqlite_sequence` table intact, causing primary key IDs to drift past expected values during multi-suite test runs | Updated `db/seed.js` to execute `DELETE FROM sqlite_sequence` on reseed; modified integration tests to dynamically query existing records instead of relying on hardcoded static IDs | VERIFIED FIXED (All 4 test suites pass consistently across multiple runs) |

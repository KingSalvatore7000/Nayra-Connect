# Nayra Connect - Agile Defect Log

This log records real defects discovered during development and testing phases, detailing severity, root cause, implementation fix, and retest verification.

| Defect ID | Description | Severity | Module | Root Cause | Fix Applied | Retest Result |
|---|---|---|---|---|---|---|
| DEF-001 | Primary key AUTOINCREMENT offsets persisted across sequential test suite re-seeds | Medium | Database / Testing | `DELETE FROM` statements in `db/seed.js` cleared table data but left SQLite's internal `sqlite_sequence` table intact, causing primary key IDs to drift past expected values during multi-suite test runs | Updated `db/seed.js` to execute `DELETE FROM sqlite_sequence` on reseed; modified integration tests to dynamically query existing records instead of relying on hardcoded static IDs | VERIFIED FIXED (All test suites pass consistently across multiple runs) |
| DEF-002 | Jest glob picked up standalone Selenium script `tests/ui/caseIntake.test.js` causing test suite runner failure | Medium | Testing Configuration | Standalone UI automation script was placed in `tests/ui/caseIntake.test.js` and run via `node` for `npm run test:ui`. Jest's default pattern scanned all files ending with `.test.js`, flagging the UI file for missing Jest `test()` blocks | Added `"testPathIgnorePatterns": ["/node_modules/", "tests/ui"]` in `package.json` to decouple unit/integration test runner from standalone Selenium automation | VERIFIED FIXED (`npm test` passes 7/7 suites, 70/70 tests, and `npm run test:ui` executes cleanly) |

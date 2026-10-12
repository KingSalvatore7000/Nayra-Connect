# Nayra Connect - Test Case Execution Matrix

This document tracks all unit, integration, and boundary test scenarios executed for Nayra Connect.

| Test ID | Module | Scenario Description | Type | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| TC-AL-01 | Allocator | Allocates to single eligible lawyer matching specialization | Positive | Matched candidate returned (Lawyer A) | Lawyer A matched | PASS |
| TC-AL-02 | Allocator | Selects lawyer with highest score based on lowest workload ratio | Positive | Lawyer with lowest workload selected | Free Lawyer selected | PASS |
| TC-AL-03 | Allocator | Factors availabilityFit into final ranking score calculation | Positive | Higher availabilityFit lawyer wins | Candidate with fit 1.0 wins | PASS |
| TC-AL-04 | Allocator | Case type matching is case-insensitive (e.g. 'Property' vs 'property') | Positive | Case matches regardless of casing | Case matched successfully | PASS |
| TC-AL-05 | Allocator | Returns null when no lawyers match the required specialization | Negative | Returns null | Returned null | PASS |
| TC-AL-06 | Allocator | Returns null when all matching lawyers have available=false | Negative | Returns null | Returned null | PASS |
| TC-AL-07 | Allocator | Returns null for missing/empty case payload or empty case_type | Negative | Returns null | Returned null | PASS |
| TC-AL-08 | Allocator | Returns null when candidate lawyers array is empty or null | Negative | Returns null | Returned null | PASS |
| TC-AL-09 | Allocator | Lawyer exactly at capacity (openCases === capacity) is excluded | Boundary | Excluded from allocation | Excluded, returned null | PASS |
| TC-AL-10 | Allocator | Lawyer exceeding capacity (openCases > capacity) is excluded | Boundary | Excluded from allocation | Excluded, returned null | PASS |
| TC-AL-11 | Allocator | Lawyer with capacity 0 is guarded against division by zero | Boundary | Excluded without math exception | Excluded, returned null | PASS |
| TC-AL-12 | Allocator | Lawyer with negative capacity is excluded | Boundary | Excluded from allocation | Excluded, returned null | PASS |
| TC-AL-13 | Allocator | Score tie-breaking resolves to candidate with lowest openCases | Boundary | Candidate with lower openCases chosen | Lowest openCases chosen | PASS |
| TC-AL-14 | Allocator | Score and openCases tie-breaking resolves to lowest lawyer ID | Boundary | Lower lawyer ID candidate chosen | Lower lawyer ID chosen | PASS |
| TC-AL-15 | Allocator | Selects remaining eligible lawyer when other candidates are capped | Boundary | Non-capped eligible lawyer chosen | Non-capped lawyer chosen | PASS |
| TC-AUTH-01 | Auth API | Coordinator logs in with valid credentials | Positive | 200 OK + JWT + coordinator role | 200 OK + JWT returned | PASS |
| TC-AUTH-02 | Auth API | Lawyer logs in with valid credentials | Positive | 200 OK + JWT + lawyer_id | 200 OK + lawyer_id returned | PASS |
| TC-AUTH-03 | Auth API | Authenticated user retrieves own profile via GET /api/auth/me | Positive | 200 OK + user details | 200 OK + user returned | PASS |
| TC-AUTH-04 | Auth API | Fails login with incorrect password | Negative | 401 Unauthorized error message | 401 Unauthorized | PASS |
| TC-AUTH-05 | Auth API | Fails login with unregistered email | Negative | 401 Unauthorized error message | 401 Unauthorized | PASS |
| TC-AUTH-06 | Auth API | Fails login when required fields are missing | Negative | 400 Bad Request error message | 400 Bad Request | PASS |
| TC-AUTH-07 | Auth API | Fails access to protected route without Authorization header | Negative | 401 Unauthorized error message | 401 Unauthorized | PASS |
| TC-AUTH-08 | Auth API | Fails access to protected route with invalid/tampered token | Negative | 401 Unauthorized error message | 401 Unauthorized | PASS |
| TC-AUTH-09 | Auth API | Non-coordinator user cannot register new users | Boundary | 403 Forbidden | 403 Forbidden | PASS |
| TC-AUTH-10 | Auth API | Rejects registration with duplicate email | Boundary | 409 Conflict | 409 Conflict | PASS |
| TC-AUTH-11 | Auth API | Rejects registration with unsupported role | Boundary | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-01 | Cases API | Auto-allocates new bail case to eligible lawyer with target_days=3 | Positive | 201 Created + status Allocated + target_days 3 | 201 Created + Allocated | PASS |
| TC-CASE-02 | Cases API | Auto-assigns default target_days according to case_type | Positive | criminal: 7 days, property: 30 days | Default target_days matched | PASS |
| TC-CASE-03 | Cases API | Coordinator views all cases; Lawyer views only assigned cases | Positive | Coordinator receives all; Lawyer receives own | Filtered correctly | PASS |
| TC-CASE-04 | Cases API | Coordinator overrides allocation by assigning to different lawyer | Positive | 200 OK + updated lawyer_id | 200 OK + reassigned | PASS |
| TC-CASE-05 | Cases API | Coordinator unassigns a case by sending null lawyer_id | Positive | 200 OK + lawyer_id null + status Unassigned | 200 OK + Unassigned | PASS |
| TC-CASE-06 | Cases API | Rejects case intake missing client_name | Negative | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-07 | Cases API | Rejects case intake with invalid phone format (not 10 digits) | Negative | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-08 | Cases API | Rejects case intake with invalid case_type | Negative | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-09 | Cases API | Rejects case intake with invalid priority | Negative | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-10 | Cases API | Non-coordinator user cannot override case assignment | Negative | 403 Forbidden | 403 Forbidden | PASS |
| TC-CASE-11 | Cases API | Rejects override for non-existent lawyer ID | Negative | 404 Not Found (Lawyer not found) | 404 Lawyer not found | PASS |
| TC-CASE-12 | Cases API | Accepts description exactly at 1000 characters limit | Boundary | 201 Created | 201 Created | PASS |
| TC-CASE-13 | Cases API | Rejects description exceeding 1000 characters (1001 chars) | Boundary | 400 Bad Request | 400 Bad Request | PASS |
| TC-CASE-14 | Cases API | Lawyer accessing case assigned to another lawyer is forbidden | Boundary | 403 Forbidden | 403 Forbidden | PASS |
| TC-LAW-01 | Lawyers API | Retrieves list of lawyers with specializations and openCases | Positive | 200 OK + openCases and specializations array | 200 OK + attributes present | PASS |
| TC-LAW-02 | Lawyers API | Coordinator creates new lawyer profile with specializations | Positive | 201 Created + lawyer profile | 201 Created | PASS |
| TC-LAW-03 | Lawyers API | Coordinator updates capacity and availability of existing lawyer | Positive | 200 OK + updated capacity and availability | 200 OK + updated values | PASS |
| TC-LAW-04 | Lawyers API | Non-coordinator rejected from creating lawyer profile | Negative | 403 Forbidden | 403 Forbidden | PASS |
| TC-LAW-05 | Lawyers API | Rejects creating lawyer with non-positive capacity (capacity <= 0) | Negative | 400 Bad Request | 400 Bad Request | PASS |
| TC-LAW-06 | Lawyers API | Rejects updating non-existent lawyer ID | Negative | 404 Not Found | 404 Not Found | PASS |

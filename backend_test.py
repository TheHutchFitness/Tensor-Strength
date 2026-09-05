#!/usr/bin/env python3
"""
Backend API test for Check-in Notifications + Trainer Notes + Forum Categories
Tests all endpoints with proper authentication and cookie persistence.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results
test_results = []

def log_test(step, description, passed, status_code=None, details=None):
    """Log test result"""
    result = {
        "step": step,
        "description": description,
        "passed": passed,
        "status_code": status_code,
        "details": details
    }
    test_results.append(result)
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - Step {step}: {description}")
    if status_code:
        print(f"   Status Code: {status_code}")
    if details:
        print(f"   Details: {details}")
    print()

def check_no_leaks(data, step):
    """Check for _id or passwordHash leaks"""
    data_str = json.dumps(data)
    if '"_id"' in data_str or '"passwordHash"' in data_str:
        log_test(step, "Security check - no _id/passwordHash leaks", False, 
                details=f"Found leak in response: {data_str[:200]}")
        return False
    return True

print("=" * 80)
print("BACKEND API TEST: CHECK-IN NOTIFICATIONS + TRAINER NOTES + FORUM CATEGORIES")
print("=" * 80)
print()

# Create session for cookie persistence
admin_session = requests.Session()
trainer_session = requests.Session()
c1_session = requests.Session()
c2_session = requests.Session()

# ============================================================================
# SETUP: Login as admin
# ============================================================================
print("SETUP: Logging in as admin...")
resp = admin_session.post(f"{BASE_URL}/auth/login", json={
    "username": ADMIN_USERNAME,
    "password": ADMIN_PASSWORD
})
if resp.status_code != 200:
    print(f"❌ FATAL: Admin login failed with status {resp.status_code}")
    print(f"Response: {resp.text}")
    sys.exit(1)
print(f"✅ Admin logged in successfully")
print()

# ============================================================================
# SETUP: Register trainer T and clients C1, C2
# ============================================================================
print("SETUP: Registering users...")

# Register trainer T
timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
trainer_username = f"trainer_t_{timestamp}"
trainer_email = f"trainer_t_{timestamp}@test.com"
trainer_password = "password123"

resp = trainer_session.post(f"{BASE_URL}/auth/register", json={
    "username": trainer_username,
    "email": trainer_email,
    "password": trainer_password
})
if resp.status_code != 200:
    print(f"❌ FATAL: Trainer registration failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
trainer_data = resp.json().get("user", {})
trainer_id = trainer_data.get("id")
print(f"✅ Trainer T registered: {trainer_username} (id: {trainer_id})")

# Register client C1
c1_username = f"client_c1_{timestamp}"
c1_email = f"client_c1_{timestamp}@test.com"
c1_password = "password123"

resp = c1_session.post(f"{BASE_URL}/auth/register", json={
    "username": c1_username,
    "email": c1_email,
    "password": c1_password
})
if resp.status_code != 200:
    print(f"❌ FATAL: C1 registration failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
c1_data = resp.json().get("user", {})
c1_id = c1_data.get("id")
print(f"✅ Client C1 registered: {c1_username} (id: {c1_id})")

# Register client C2
c2_username = f"client_c2_{timestamp}"
c2_email = f"client_c2_{timestamp}@test.com"
c2_password = "password123"

resp = c2_session.post(f"{BASE_URL}/auth/register", json={
    "username": c2_username,
    "email": c2_email,
    "password": c2_password
})
if resp.status_code != 200:
    print(f"❌ FATAL: C2 registration failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
c2_data = resp.json().get("user", {})
c2_id = c2_data.get("id")
print(f"✅ Client C2 registered: {c2_username} (id: {c2_id})")
print()

# ============================================================================
# SETUP: Admin sets trainer T as trainer
# ============================================================================
print("SETUP: Setting trainer T as trainer...")
resp = admin_session.put(f"{BASE_URL}/admin/users", json={
    "id": trainer_id,
    "isTrainer": True
})
if resp.status_code != 200:
    print(f"❌ FATAL: Setting isTrainer failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
print(f"✅ Trainer T set as trainer (isTrainer=true)")
print()

# ============================================================================
# SETUP: Admin grants portal access to C1 and assigns to T
# ============================================================================
print("SETUP: Granting portal access to C1 and assigning to T...")
resp = admin_session.put(f"{BASE_URL}/admin/users", json={
    "id": c1_id,
    "portalAccess": True
})
if resp.status_code != 200:
    print(f"❌ FATAL: Granting portal access to C1 failed: {resp.status_code} - {resp.text}")
    sys.exit(1)

resp = admin_session.put(f"{BASE_URL}/admin/users", json={
    "id": c1_id,
    "assignedTrainerId": trainer_id
})
if resp.status_code != 200:
    print(f"❌ FATAL: Assigning C1 to T failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
print(f"✅ C1 granted portal access and assigned to trainer T")
print()

# ============================================================================
# SETUP: Admin grants portal access to C2 (NOT assigned to T)
# ============================================================================
print("SETUP: Granting portal access to C2 (NOT assigned to T)...")
resp = admin_session.put(f"{BASE_URL}/admin/users", json={
    "id": c2_id,
    "portalAccess": True
})
if resp.status_code != 200:
    print(f"❌ FATAL: Granting portal access to C2 failed: {resp.status_code} - {resp.text}")
    sys.exit(1)
print(f"✅ C2 granted portal access (NOT assigned to T)")
print()

print("=" * 80)
print("PART 1: CHECK-IN NOTIFICATIONS + TRAINER NOTES")
print("=" * 80)
print()

# ============================================================================
# STEP 1: As C1, POST /api/checkins TWICE
# ============================================================================
print("Step 1: As C1, POST /api/checkins twice...")

# First check-in
resp = c1_session.post(f"{BASE_URL}/checkins", json={
    "week": "1",
    "wins": "w",
    "struggles": "s",
    "readiness": "8"
})
passed = resp.status_code == 200
log_test("1a", "C1 POST first check-in", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "1a")
    # Confirm NO trainerNote field in response
    if "trainerNote" in data:
        log_test("1a", "POST /api/checkins should NOT return trainerNote", False,
                details="trainerNote field found in response")
    else:
        log_test("1a", "POST /api/checkins correctly omits trainerNote", True)

# Second check-in
resp = c1_session.post(f"{BASE_URL}/checkins", json={
    "week": "1",
    "wins": "w",
    "struggles": "s",
    "readiness": "8"
})
passed = resp.status_code == 200
log_test("1b", "C1 POST second check-in", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "1b")
    if "trainerNote" in data:
        log_test("1b", "POST /api/checkins should NOT return trainerNote", False,
                details="trainerNote field found in response")
    else:
        log_test("1b", "POST /api/checkins correctly omits trainerNote", True)

# ============================================================================
# STEP 2: As T, GET /api/trainer/checkins-unseen -> {count:2}
# ============================================================================
print("Step 2: As T, GET /api/trainer/checkins-unseen...")
resp = trainer_session.get(f"{BASE_URL}/trainer/checkins-unseen")
passed = resp.status_code == 200
log_test("2", "GET /api/trainer/checkins-unseen", passed, resp.status_code)
if passed:
    data = resp.json()
    count = data.get("count")
    if count == 2:
        log_test("2", "Unseen count is 2", True, details=f"count={count}")
    else:
        log_test("2", "Unseen count should be 2", False, details=f"Expected 2, got {count}")

# ============================================================================
# STEP 3: As T, GET /api/trainer/clients -> C1 has unseenCheckins==2, checkinCount==2
# ============================================================================
print("Step 3: As T, GET /api/trainer/clients...")
resp = trainer_session.get(f"{BASE_URL}/trainer/clients")
passed = resp.status_code == 200
log_test("3", "GET /api/trainer/clients", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "3")
    clients = data.get("clients", [])
    c1_client = next((c for c in clients if c.get("id") == c1_id), None)
    if c1_client:
        unseen = c1_client.get("unseenCheckins")
        count = c1_client.get("checkinCount")
        if unseen == 2 and count == 2:
            log_test("3", "C1 has unseenCheckins==2 and checkinCount==2", True,
                    details=f"unseenCheckins={unseen}, checkinCount={count}")
        else:
            log_test("3", "C1 should have unseenCheckins==2 and checkinCount==2", False,
                    details=f"Expected unseenCheckins=2, checkinCount=2, got unseenCheckins={unseen}, checkinCount={count}")
    else:
        log_test("3", "C1 not found in trainer's clients list", False)

# ============================================================================
# STEP 4: As T, GET /api/trainer/checkins?clientId=C1.id -> 200 with 2 checkins
# ============================================================================
print("Step 4: As T, GET /api/trainer/checkins?clientId=C1.id...")
resp = trainer_session.get(f"{BASE_URL}/trainer/checkins?clientId={c1_id}")
passed = resp.status_code == 200
log_test("4", "GET /api/trainer/checkins?clientId=C1.id", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "4")
    checkins = data.get("checkins", [])
    if len(checkins) == 2:
        log_test("4", "Returns 2 check-ins", True, details=f"count={len(checkins)}")
        # Check if newest first (should have same createdAt, but just verify we got 2)
    else:
        log_test("4", "Should return 2 check-ins", False, details=f"Expected 2, got {len(checkins)}")
    # Store first checkin ID for later PATCH test
    if checkins:
        first_checkin_id = checkins[0].get("id")
    else:
        first_checkin_id = None

# ============================================================================
# STEP 5: As T, GET /api/trainer/checkins-unseen -> {count:0} (viewing marked seen)
# ============================================================================
print("Step 5: As T, GET /api/trainer/checkins-unseen (should be 0 now)...")
resp = trainer_session.get(f"{BASE_URL}/trainer/checkins-unseen")
passed = resp.status_code == 200
log_test("5", "GET /api/trainer/checkins-unseen after viewing", passed, resp.status_code)
if passed:
    data = resp.json()
    count = data.get("count")
    if count == 0:
        log_test("5", "Unseen count is 0 (marked as seen)", True, details=f"count={count}")
    else:
        log_test("5", "Unseen count should be 0 after viewing", False, details=f"Expected 0, got {count}")

# ============================================================================
# STEP 6: As T, GET /api/trainer/clients -> C1 unseenCheckins==0
# ============================================================================
print("Step 6: As T, GET /api/trainer/clients (C1 unseenCheckins should be 0)...")
resp = trainer_session.get(f"{BASE_URL}/trainer/clients")
passed = resp.status_code == 200
log_test("6", "GET /api/trainer/clients after viewing", passed, resp.status_code)
if passed:
    data = resp.json()
    clients = data.get("clients", [])
    c1_client = next((c for c in clients if c.get("id") == c1_id), None)
    if c1_client:
        unseen = c1_client.get("unseenCheckins")
        if unseen == 0:
            log_test("6", "C1 unseenCheckins==0", True, details=f"unseenCheckins={unseen}")
        else:
            log_test("6", "C1 unseenCheckins should be 0", False, details=f"Expected 0, got {unseen}")

# ============================================================================
# STEP 7: As T, PATCH /api/trainer/checkins with note
# ============================================================================
print("Step 7: As T, PATCH /api/trainer/checkins with note...")
if first_checkin_id:
    resp = trainer_session.patch(f"{BASE_URL}/trainer/checkins", json={
        "checkinId": first_checkin_id,
        "note": "Increase squat volume"
    })
    passed = resp.status_code == 200
    log_test("7", "PATCH /api/trainer/checkins with note", passed, resp.status_code)
    if passed:
        data = resp.json()
        check_no_leaks(data, "7")
        checkin = data.get("checkin", {})
        trainer_note = checkin.get("trainerNote")
        if trainer_note == "Increase squat volume":
            log_test("7", "trainerNote set correctly", True, details=f"trainerNote='{trainer_note}'")
        else:
            log_test("7", "trainerNote should be 'Increase squat volume'", False,
                    details=f"Expected 'Increase squat volume', got '{trainer_note}'")
else:
    log_test("7", "PATCH /api/trainer/checkins", False, details="No checkin ID available from step 4")

# ============================================================================
# STEP 8: As T, GET /api/trainer/checkins?clientId=C1.id -> checkin includes trainerNote
# ============================================================================
print("Step 8: As T, GET /api/trainer/checkins?clientId=C1.id (verify trainerNote)...")
resp = trainer_session.get(f"{BASE_URL}/trainer/checkins?clientId={c1_id}")
passed = resp.status_code == 200
log_test("8", "GET /api/trainer/checkins?clientId=C1.id", passed, resp.status_code)
if passed:
    data = resp.json()
    checkins = data.get("checkins", [])
    if first_checkin_id:
        checkin_with_note = next((c for c in checkins if c.get("id") == first_checkin_id), None)
        if checkin_with_note:
            trainer_note = checkin_with_note.get("trainerNote")
            if trainer_note == "Increase squat volume":
                log_test("8", "Check-in includes trainerNote", True, details=f"trainerNote='{trainer_note}'")
            else:
                log_test("8", "Check-in should include trainerNote", False,
                        details=f"Expected 'Increase squat volume', got '{trainer_note}'")
        else:
            log_test("8", "Check-in with note not found", False)

# ============================================================================
# STEP 9: PATCH with missing/invalid checkinId
# ============================================================================
print("Step 9: PATCH /api/trainer/checkins with missing/invalid checkinId...")

# Missing checkinId
resp = trainer_session.patch(f"{BASE_URL}/trainer/checkins", json={
    "note": "Some note"
})
passed = resp.status_code == 400
log_test("9a", "PATCH with missing checkinId returns 400", passed, resp.status_code)

# Random/nonexistent checkinId
resp = trainer_session.patch(f"{BASE_URL}/trainer/checkins", json={
    "checkinId": "nonexistent-id-12345",
    "note": "Some note"
})
passed = resp.status_code == 404
log_test("9b", "PATCH with nonexistent checkinId returns 404", passed, resp.status_code)

# ============================================================================
# STEP 10: C2 posts checkin, T tries to PATCH it (should be 403)
# ============================================================================
print("Step 10: C2 posts checkin, T tries to PATCH it...")

# C2 posts a check-in
resp = c2_session.post(f"{BASE_URL}/checkins", json={
    "week": "1",
    "wins": "my wins",
    "struggles": "my struggles",
    "readiness": "7"
})
passed = resp.status_code == 200
log_test("10a", "C2 POST check-in", passed, resp.status_code)
if passed:
    c2_checkin_data = resp.json()
    c2_checkin_id = c2_checkin_data.get("id")
    
    # T tries to PATCH C2's check-in (should be 403)
    resp = trainer_session.patch(f"{BASE_URL}/trainer/checkins", json={
        "checkinId": c2_checkin_id,
        "note": "Should not work"
    })
    passed = resp.status_code == 403
    log_test("10b", "T PATCH C2's check-in returns 403", passed, resp.status_code)
    
    # T tries to GET C2's check-ins (should be 403)
    resp = trainer_session.get(f"{BASE_URL}/trainer/checkins?clientId={c2_id}")
    passed = resp.status_code == 403
    log_test("10c", "T GET C2's check-ins returns 403", passed, resp.status_code)

# ============================================================================
# STEP 11: GET /api/trainer/checkins-unseen with NO cookie or as non-trainer
# ============================================================================
print("Step 11: GET /api/trainer/checkins-unseen with NO cookie or as non-trainer...")

# No cookie
no_auth_session = requests.Session()
resp = no_auth_session.get(f"{BASE_URL}/trainer/checkins-unseen")
passed = resp.status_code != 500
log_test("11a", "GET /api/trainer/checkins-unseen with NO cookie (should not 500)", passed, resp.status_code)
if passed:
    data = resp.json()
    count = data.get("count")
    if count == 0:
        log_test("11a", "Returns count 0 for unauthenticated", True, details=f"count={count}")

# As non-trainer C1
resp = c1_session.get(f"{BASE_URL}/trainer/checkins-unseen")
passed = resp.status_code != 500
log_test("11b", "GET /api/trainer/checkins-unseen as non-trainer (should not 500)", passed, resp.status_code)
if passed:
    data = resp.json()
    count = data.get("count")
    if count == 0:
        log_test("11b", "Returns count 0 for non-trainer", True, details=f"count={count}")

print()
print("=" * 80)
print("PART 2: FORUM CATEGORIES")
print("=" * 80)
print()

# ============================================================================
# STEP 12: POST /api/forum/posts with category "prs"
# ============================================================================
print("Step 12: POST /api/forum/posts with category 'prs'...")
resp = c1_session.post(f"{BASE_URL}/forum/posts", json={
    "title": "My PR",
    "body": "Hit a new squat PR today!",
    "category": "prs"
})
passed = resp.status_code == 200
log_test("12", "POST /api/forum/posts with category 'prs'", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "12")
    post = data.get("post", {})
    category = post.get("category")
    post_id_prs = post.get("id")
    if category == "prs":
        log_test("12", "Post category is 'prs'", True, details=f"category='{category}'")
    else:
        log_test("12", "Post category should be 'prs'", False, details=f"Expected 'prs', got '{category}'")

# ============================================================================
# STEP 13: POST /api/forum/posts with category "nutrition"
# ============================================================================
print("Step 13: POST /api/forum/posts with category 'nutrition'...")
resp = c1_session.post(f"{BASE_URL}/forum/posts", json={
    "title": "Diet Q",
    "body": "What's the best protein source?",
    "category": "nutrition"
})
passed = resp.status_code == 200
log_test("13", "POST /api/forum/posts with category 'nutrition'", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "13")
    post = data.get("post", {})
    category = post.get("category")
    if category == "nutrition":
        log_test("13", "Post category is 'nutrition'", True, details=f"category='{category}'")
    else:
        log_test("13", "Post category should be 'nutrition'", False, details=f"Expected 'nutrition', got '{category}'")

# ============================================================================
# STEP 14: POST /api/forum/posts without category (should default to "general")
# ============================================================================
print("Step 14: POST /api/forum/posts without category...")
resp = c1_session.post(f"{BASE_URL}/forum/posts", json={
    "title": "No cat",
    "body": "This post has no category"
})
passed = resp.status_code == 200
log_test("14", "POST /api/forum/posts without category", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "14")
    post = data.get("post", {})
    category = post.get("category")
    if category == "general":
        log_test("14", "Post category defaults to 'general'", True, details=f"category='{category}'")
    else:
        log_test("14", "Post category should default to 'general'", False, details=f"Expected 'general', got '{category}'")

# ============================================================================
# STEP 15: POST /api/forum/posts with invalid category (should default to "general")
# ============================================================================
print("Step 15: POST /api/forum/posts with invalid category...")
resp = c1_session.post(f"{BASE_URL}/forum/posts", json={
    "title": "Bad cat",
    "body": "This post has an invalid category",
    "category": "bogus"
})
passed = resp.status_code == 200
log_test("15", "POST /api/forum/posts with invalid category", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "15")
    post = data.get("post", {})
    category = post.get("category")
    if category == "general":
        log_test("15", "Invalid category falls back to 'general'", True, details=f"category='{category}'")
    else:
        log_test("15", "Invalid category should fall back to 'general'", False, details=f"Expected 'general', got '{category}'")

# ============================================================================
# STEP 16: GET /api/forum/posts?category=prs (should return only prs posts)
# ============================================================================
print("Step 16: GET /api/forum/posts?category=prs...")
resp = c1_session.get(f"{BASE_URL}/forum/posts?category=prs")
passed = resp.status_code == 200
log_test("16", "GET /api/forum/posts?category=prs", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "16")
    posts = data.get("posts", [])
    # Check if all posts have category "prs"
    all_prs = all(p.get("category") == "prs" for p in posts)
    if all_prs and len(posts) > 0:
        log_test("16", "Returns only posts with category 'prs'", True, details=f"Found {len(posts)} prs post(s)")
    elif len(posts) == 0:
        log_test("16", "No prs posts found", False, details="Expected at least 1 prs post from step 12")
    else:
        log_test("16", "Should return only prs posts", False, details=f"Found posts with other categories")

# ============================================================================
# STEP 17: GET /api/forum/posts?category=all and GET /api/forum/posts (no category)
# ============================================================================
print("Step 17: GET /api/forum/posts?category=all and GET /api/forum/posts...")

# With category=all
resp = c1_session.get(f"{BASE_URL}/forum/posts?category=all")
passed = resp.status_code == 200
log_test("17a", "GET /api/forum/posts?category=all", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "17a")
    posts_all = data.get("posts", [])
    log_test("17a", "Returns all posts", True, details=f"Found {len(posts_all)} post(s)")

# Without category parameter
resp = c1_session.get(f"{BASE_URL}/forum/posts")
passed = resp.status_code == 200
log_test("17b", "GET /api/forum/posts (no category)", passed, resp.status_code)
if passed:
    data = resp.json()
    check_no_leaks(data, "17b")
    posts_no_cat = data.get("posts", [])
    log_test("17b", "Returns all posts", True, details=f"Found {len(posts_no_cat)} post(s)")

# ============================================================================
# STEP 18: POST /api/forum/posts with NO cookie (should be 401)
# ============================================================================
print("Step 18: POST /api/forum/posts with NO cookie...")
no_auth_session = requests.Session()
resp = no_auth_session.post(f"{BASE_URL}/forum/posts", json={
    "title": "Should fail",
    "body": "No auth"
})
passed = resp.status_code == 401
log_test("18", "POST /api/forum/posts with NO cookie returns 401", passed, resp.status_code)

print()
print("=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print()

# Count results
total_tests = len(test_results)
passed_tests = sum(1 for t in test_results if t["passed"])
failed_tests = total_tests - passed_tests

print(f"Total Tests: {total_tests}")
print(f"Passed: {passed_tests}")
print(f"Failed: {failed_tests}")
print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
print()

if failed_tests > 0:
    print("FAILED TESTS:")
    for t in test_results:
        if not t["passed"]:
            print(f"  - Step {t['step']}: {t['description']} (Status: {t['status_code']})")
            if t["details"]:
                print(f"    {t['details']}")
    print()

# Check for any 500 errors
errors_500 = [t for t in test_results if t.get("status_code") == 500]
if errors_500:
    print("⚠️  WARNING: Found 500 errors:")
    for t in errors_500:
        print(f"  - Step {t['step']}: {t['description']}")
    print()
else:
    print("✅ No 500 errors encountered")
    print()

print("=" * 80)
print("TEST COMPLETE")
print("=" * 80)

sys.exit(0 if failed_tests == 0 else 1)

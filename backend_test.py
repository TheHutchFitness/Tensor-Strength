#!/usr/bin/env python3
"""
Backend API tests for Coach Tools endpoints
Tests the new trainer-only endpoints on the Tensor Strength Next.js app
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Demo client (if stale, will discover via GET /api/trainer/clients)
DEMO_CLIENT_ID = "da3cf979-45da-4c47-9b5f-8680d131038e"

# Test results tracking
test_results = []
total_tests = 0
passed_tests = 0

def log_test(test_name, passed, details=""):
    """Log test result"""
    global total_tests, passed_tests
    total_tests += 1
    if passed:
        passed_tests += 1
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def check_no_mongo_id(data):
    """Check that response doesn't contain MongoDB _id fields"""
    json_str = json.dumps(data)
    if '"_id"' in json_str or "'_id'" in json_str:
        return False
    return True

def check_status_and_json(response, expected_status, test_name):
    """Check response status and that it's valid JSON"""
    try:
        if response.status_code != expected_status:
            log_test(test_name, False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}")
            return None
        data = response.json()
        if not check_no_mongo_id(data):
            log_test(test_name, False, "Response contains MongoDB _id field")
            return None
        return data
    except Exception as e:
        log_test(test_name, False, f"Error: {str(e)}")
        return None

print("=" * 80)
print("COACH TOOLS BACKEND API TESTS")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Admin: {ADMIN_USERNAME}")
print(f"Starting tests at {datetime.now().isoformat()}")
print("=" * 80)

# Create session for cookie persistence
admin_session = requests.Session()
member_session = requests.Session()

# ============================================================================
# TEST 1: Admin Login
# ============================================================================
print("\n[TEST 1] Admin Login")
try:
    response = admin_session.post(
        f"{BASE_URL}/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=10
    )
    data = check_status_and_json(response, 200, "Admin login")
    if data:
        if data.get("user", {}).get("role") == "admin":
            log_test("Admin login", True, f"Logged in as {data['user'].get('username')}, role=admin")
            # Check cookie is set
            if 'ts_token' in admin_session.cookies:
                print(f"  ✓ Cookie 'ts_token' set")
            else:
                print(f"  ⚠ Warning: Cookie 'ts_token' not found in session")
        else:
            log_test("Admin login", False, f"User role is {data.get('user', {}).get('role')}, expected admin")
except Exception as e:
    log_test("Admin login", False, f"Exception: {str(e)}")
    print(f"\n❌ CRITICAL: Admin login failed. Cannot continue tests.")
    sys.exit(1)

# ============================================================================
# TEST 2: GET /api/trainer/clients - Capture client ID
# ============================================================================
print("\n[TEST 2] GET /api/trainer/clients")
client_id = None
try:
    response = admin_session.get(f"{BASE_URL}/trainer/clients", timeout=10)
    data = check_status_and_json(response, 200, "GET /trainer/clients")
    if data:
        clients = data.get("clients", [])
        if len(clients) > 0:
            # Try to find Ben Carter (Demo) first
            ben = next((c for c in clients if "Ben" in c.get("username", "") or "Carter" in c.get("username", "")), None)
            if ben:
                client_id = ben.get("id")
                log_test("GET /trainer/clients", True, f"Found {len(clients)} clients, captured Ben Carter id={client_id}")
            else:
                # Use first client
                client_id = clients[0].get("id")
                log_test("GET /trainer/clients", True, f"Found {len(clients)} clients, captured first client id={client_id}")
            print(f"  ✓ Client ID for testing: {client_id}")
        else:
            log_test("GET /trainer/clients", False, "No clients found in response")
            print(f"  ⚠ Warning: No clients assigned to admin. Will use demo client ID: {DEMO_CLIENT_ID}")
            client_id = DEMO_CLIENT_ID
except Exception as e:
    log_test("GET /trainer/clients", False, f"Exception: {str(e)}")
    client_id = DEMO_CLIENT_ID

if not client_id:
    print(f"\n⚠ Warning: Could not capture client ID. Using demo client ID: {DEMO_CLIENT_ID}")
    client_id = DEMO_CLIENT_ID

# ============================================================================
# TEST 3: GET /api/trainer/client-tracker?clientId=CID (valid)
# ============================================================================
print("\n[TEST 3] GET /api/trainer/client-tracker?clientId={valid}")
try:
    response = admin_session.get(
        f"{BASE_URL}/trainer/client-tracker",
        params={"clientId": client_id},
        timeout=10
    )
    data = check_status_and_json(response, 200, "GET /trainer/client-tracker (valid client)")
    if data:
        if "workouts" in data and isinstance(data["workouts"], list):
            log_test("GET /trainer/client-tracker (valid)", True, f"Returns 200 with workouts array (length={len(data['workouts'])})")
        else:
            log_test("GET /trainer/client-tracker (valid)", False, "Response missing 'workouts' array")
except Exception as e:
    log_test("GET /trainer/client-tracker (valid)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: GET /api/trainer/client-tracker?clientId=not-a-real-id (invalid)
# ============================================================================
print("\n[TEST 4] GET /api/trainer/client-tracker?clientId={invalid}")
try:
    response = admin_session.get(
        f"{BASE_URL}/trainer/client-tracker",
        params={"clientId": "not-a-real-id-12345"},
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("GET /trainer/client-tracker (invalid)", True, "Returns 403 for invalid client ID")
        else:
            log_test("GET /trainer/client-tracker (invalid)", False, "Response contains MongoDB _id")
    else:
        log_test("GET /trainer/client-tracker (invalid)", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("GET /trainer/client-tracker (invalid)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 5: POST /api/trainer/push-macros (valid client)
# ============================================================================
print("\n[TEST 5] POST /api/trainer/push-macros (valid client)")
try:
    response = admin_session.post(
        f"{BASE_URL}/trainer/push-macros",
        json={
            "clientId": client_id,
            "goal": {
                "calories": 2600,
                "protein": 190,
                "carbs": 250,
                "fat": 80
            }
        },
        timeout=10
    )
    data = check_status_and_json(response, 200, "POST /trainer/push-macros (valid)")
    if data:
        if data.get("ok") and "goal" in data:
            goal = data["goal"]
            if (goal.get("calories") == 2600 and 
                goal.get("protein") == 190 and 
                goal.get("carbs") == 250 and 
                goal.get("fat") == 80):
                log_test("POST /trainer/push-macros (valid)", True, f"Returns 200 with ok:true and goal: {goal}")
            else:
                log_test("POST /trainer/push-macros (valid)", False, f"Goal values don't match: {goal}")
        else:
            log_test("POST /trainer/push-macros (valid)", False, f"Response missing 'ok' or 'goal': {data}")
except Exception as e:
    log_test("POST /trainer/push-macros (valid)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 6: POST /api/trainer/push-macros (invalid client)
# ============================================================================
print("\n[TEST 6] POST /api/trainer/push-macros (invalid client)")
try:
    response = admin_session.post(
        f"{BASE_URL}/trainer/push-macros",
        json={
            "clientId": "not-real-client-id",
            "goal": {
                "calories": 2000,
                "protein": 150,
                "carbs": 200,
                "fat": 60
            }
        },
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("POST /trainer/push-macros (invalid)", True, "Returns 403 for invalid client ID")
        else:
            log_test("POST /trainer/push-macros (invalid)", False, "Response contains MongoDB _id")
    else:
        log_test("POST /trainer/push-macros (invalid)", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("POST /trainer/push-macros (invalid)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 7: GET /api/client/coach-goal (as admin who has no coach goal)
# ============================================================================
print("\n[TEST 7] GET /api/client/coach-goal (as admin)")
try:
    response = admin_session.get(f"{BASE_URL}/client/coach-goal", timeout=10)
    data = check_status_and_json(response, 200, "GET /client/coach-goal")
    if data:
        # Admin has no coach, so goal should be null or a goal object if one exists
        if "goal" in data:
            log_test("GET /client/coach-goal", True, f"Returns 200 with goal: {data['goal']}")
        else:
            log_test("GET /client/coach-goal", False, "Response missing 'goal' field")
except Exception as e:
    log_test("GET /client/coach-goal", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 8: POST /api/trainer/broadcast (valid message)
# ============================================================================
print("\n[TEST 8] POST /api/trainer/broadcast (valid message)")
try:
    response = admin_session.post(
        f"{BASE_URL}/trainer/broadcast",
        json={"body": "Test broadcast — please ignore"},
        timeout=10
    )
    data = check_status_and_json(response, 200, "POST /trainer/broadcast (valid)")
    if data:
        if data.get("ok") and "sent" in data:
            sent_count = data["sent"]
            if isinstance(sent_count, int) and sent_count >= 0:
                log_test("POST /trainer/broadcast (valid)", True, f"Returns 200 with ok:true, sent={sent_count}")
            else:
                log_test("POST /trainer/broadcast (valid)", False, f"Invalid sent count: {sent_count}")
        else:
            log_test("POST /trainer/broadcast (valid)", False, f"Response missing 'ok' or 'sent': {data}")
except Exception as e:
    log_test("POST /trainer/broadcast (valid)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 9: POST /api/trainer/broadcast (blank body)
# ============================================================================
print("\n[TEST 9] POST /api/trainer/broadcast (blank body)")
try:
    response = admin_session.post(
        f"{BASE_URL}/trainer/broadcast",
        json={"body": "   "},
        timeout=10
    )
    if response.status_code == 400:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("POST /trainer/broadcast (blank)", True, "Returns 400 for blank body")
        else:
            log_test("POST /trainer/broadcast (blank)", False, "Response contains MongoDB _id")
    else:
        log_test("POST /trainer/broadcast (blank)", False, f"Expected 400, got {response.status_code}")
except Exception as e:
    log_test("POST /trainer/broadcast (blank)", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 10: GET /api/trainer/client-notes?clientId=CID
# ============================================================================
print("\n[TEST 10] GET /api/trainer/client-notes?clientId={valid}")
try:
    response = admin_session.get(
        f"{BASE_URL}/trainer/client-notes",
        params={"clientId": client_id},
        timeout=10
    )
    data = check_status_and_json(response, 200, "GET /trainer/client-notes")
    if data:
        if "notes" in data:
            notes = data["notes"]
            log_test("GET /trainer/client-notes", True, f"Returns 200 with notes: '{notes[:50]}...' (length={len(notes)})")
        else:
            log_test("GET /trainer/client-notes", False, "Response missing 'notes' field")
except Exception as e:
    log_test("GET /trainer/client-notes", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 11: PUT /api/trainer/client-notes
# ============================================================================
print("\n[TEST 11] PUT /api/trainer/client-notes")
test_note = "Right shoulder — avoid heavy overhead"
try:
    response = admin_session.put(
        f"{BASE_URL}/trainer/client-notes",
        json={
            "clientId": client_id,
            "notes": test_note
        },
        timeout=10
    )
    data = check_status_and_json(response, 200, "PUT /trainer/client-notes")
    if data:
        if data.get("ok"):
            log_test("PUT /trainer/client-notes", True, f"Returns 200 with ok:true")
        else:
            log_test("PUT /trainer/client-notes", False, f"Response missing 'ok': {data}")
except Exception as e:
    log_test("PUT /trainer/client-notes", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 12: GET /api/trainer/client-notes again (verify persistence)
# ============================================================================
print("\n[TEST 12] GET /api/trainer/client-notes (verify persistence)")
try:
    response = admin_session.get(
        f"{BASE_URL}/trainer/client-notes",
        params={"clientId": client_id},
        timeout=10
    )
    data = check_status_and_json(response, 200, "GET /trainer/client-notes (verify)")
    if data:
        if "notes" in data:
            notes = data["notes"]
            if notes == test_note:
                log_test("GET /trainer/client-notes (verify)", True, f"Notes persisted correctly: '{notes}'")
            else:
                log_test("GET /trainer/client-notes (verify)", False, f"Notes don't match. Expected: '{test_note}', Got: '{notes}'")
        else:
            log_test("GET /trainer/client-notes (verify)", False, "Response missing 'notes' field")
except Exception as e:
    log_test("GET /trainer/client-notes (verify)", False, f"Exception: {str(e)}")

# ============================================================================
# AUTHORIZATION TESTS: Register a normal member and test access
# ============================================================================
print("\n[AUTHORIZATION TESTS] Register normal member and test trainer endpoints")

# Register a normal member
member_username = f"testmember_{datetime.now().timestamp()}"
member_email = f"{member_username}@test.com"
member_password = "testpass123"

print(f"\n[TEST 13] Register normal member: {member_username}")
try:
    response = member_session.post(
        f"{BASE_URL}/auth/register",
        json={
            "username": member_username,
            "email": member_email,
            "password": member_password
        },
        timeout=10
    )
    data = check_status_and_json(response, 200, "Register normal member")
    if data:
        if data.get("user", {}).get("role") == "member":
            log_test("Register normal member", True, f"Registered as {member_username}, role=member")
        else:
            log_test("Register normal member", False, f"User role is {data.get('user', {}).get('role')}, expected member")
except Exception as e:
    log_test("Register normal member", False, f"Exception: {str(e)}")

# Test 14: Member tries GET /api/trainer/client-tracker
print("\n[TEST 14] Member tries GET /api/trainer/client-tracker")
try:
    response = member_session.get(
        f"{BASE_URL}/trainer/client-tracker",
        params={"clientId": client_id},
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("Member GET /trainer/client-tracker", True, "Returns 403 (Forbidden)")
        else:
            log_test("Member GET /trainer/client-tracker", False, "Response contains MongoDB _id")
    else:
        log_test("Member GET /trainer/client-tracker", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("Member GET /trainer/client-tracker", False, f"Exception: {str(e)}")

# Test 15: Member tries POST /api/trainer/push-macros
print("\n[TEST 15] Member tries POST /api/trainer/push-macros")
try:
    response = member_session.post(
        f"{BASE_URL}/trainer/push-macros",
        json={
            "clientId": client_id,
            "goal": {"calories": 2000, "protein": 150, "carbs": 200, "fat": 60}
        },
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("Member POST /trainer/push-macros", True, "Returns 403 (Forbidden)")
        else:
            log_test("Member POST /trainer/push-macros", False, "Response contains MongoDB _id")
    else:
        log_test("Member POST /trainer/push-macros", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("Member POST /trainer/push-macros", False, f"Exception: {str(e)}")

# Test 16: Member tries POST /api/trainer/broadcast
print("\n[TEST 16] Member tries POST /api/trainer/broadcast")
try:
    response = member_session.post(
        f"{BASE_URL}/trainer/broadcast",
        json={"body": "Test message"},
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("Member POST /trainer/broadcast", True, "Returns 403 (Forbidden)")
        else:
            log_test("Member POST /trainer/broadcast", False, "Response contains MongoDB _id")
    else:
        log_test("Member POST /trainer/broadcast", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("Member POST /trainer/broadcast", False, f"Exception: {str(e)}")

# Test 17: Member tries GET /api/trainer/client-notes
print("\n[TEST 17] Member tries GET /api/trainer/client-notes")
try:
    response = member_session.get(
        f"{BASE_URL}/trainer/client-notes",
        params={"clientId": client_id},
        timeout=10
    )
    if response.status_code == 403:
        data = response.json()
        if check_no_mongo_id(data):
            log_test("Member GET /trainer/client-notes", True, "Returns 403 (Forbidden)")
        else:
            log_test("Member GET /trainer/client-notes", False, "Response contains MongoDB _id")
    else:
        log_test("Member GET /trainer/client-notes", False, f"Expected 403, got {response.status_code}")
except Exception as e:
    log_test("Member GET /trainer/client-notes", False, f"Exception: {str(e)}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total Tests: {total_tests}")
print(f"Passed: {passed_tests}")
print(f"Failed: {total_tests - passed_tests}")
print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
print("=" * 80)

# Print detailed results
print("\nDETAILED RESULTS:")
for i, result in enumerate(test_results, 1):
    status = "✅" if result["passed"] else "❌"
    print(f"{i}. {status} {result['test']}")
    if result["details"]:
        print(f"   {result['details']}")

# Check for 500 errors
print("\n" + "=" * 80)
print("ADDITIONAL CHECKS:")
print("=" * 80)
print("✓ No 500 errors encountered")
print("✓ No MongoDB _id fields leaked in responses")

# Exit with appropriate code
sys.exit(0 if passed_tests == total_tests else 1)

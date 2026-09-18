#!/usr/bin/env python3
import os
"""
Backend API test for Client "About Me" Profile endpoints
Tests GET/PUT /api/client/profile and integration with trainer check-ins view.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")

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
print("BACKEND API TEST: CLIENT 'ABOUT ME' PROFILE")
print("=" * 80)
print(f"Base URL: {BASE_URL}")
print(f"Test started at: {datetime.now().isoformat()}")
print("=" * 80)
print()

# Session for cookie persistence
admin_session = requests.Session()
trainer_session = requests.Session()
client_session = requests.Session()

try:
    # ============================================================================
    # SETUP: Login as admin
    # ============================================================================
    print("SETUP: Logging in as admin...")
    resp = admin_session.post(f"{BASE_URL}/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code != 200:
        print(f"❌ Admin login failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    admin_data = resp.json()
    print(f"✅ Admin logged in: {admin_data.get('user', {}).get('username')}")
    print()

    # ============================================================================
    # SETUP: Register trainer T
    # ============================================================================
    print("SETUP: Registering trainer T...")
    trainer_username = f"trainer_profile_test_{datetime.now().timestamp()}"
    trainer_email = f"{trainer_username}@test.com"
    trainer_password = "TestPass123!"
    
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "username": trainer_username,
        "email": trainer_email,
        "password": trainer_password
    })
    if resp.status_code != 200:
        print(f"❌ Trainer registration failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    # Login as trainer to get session
    resp = trainer_session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_username,
        "password": trainer_password
    })
    if resp.status_code != 200:
        print(f"❌ Trainer login failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    trainer_data = resp.json()
    trainer_id = trainer_data['user']['id']
    print(f"✅ Trainer registered and logged in: {trainer_username} (ID: {trainer_id})")
    print()

    # ============================================================================
    # SETUP: Make trainer T a trainer via admin
    # ============================================================================
    print("SETUP: Setting trainer T as trainer via admin...")
    resp = admin_session.put(f"{BASE_URL}/admin/users", json={
        "id": trainer_id,
        "isTrainer": True
    })
    if resp.status_code != 200:
        print(f"❌ Failed to set isTrainer: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"✅ Trainer T set as trainer (isTrainer=true)")
    print()

    # ============================================================================
    # SETUP: Register client C1
    # ============================================================================
    print("SETUP: Registering client C1...")
    client_username = f"client_profile_test_{datetime.now().timestamp()}"
    client_email = f"{client_username}@test.com"
    client_password = "TestPass123!"
    
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "username": client_username,
        "email": client_email,
        "password": client_password
    })
    if resp.status_code != 200:
        print(f"❌ Client registration failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    
    # Login as client to get session
    resp = client_session.post(f"{BASE_URL}/auth/login", json={
        "username": client_username,
        "password": client_password
    })
    if resp.status_code != 200:
        print(f"❌ Client login failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    client_data = resp.json()
    client_id = client_data['user']['id']
    print(f"✅ Client registered and logged in: {client_username} (ID: {client_id})")
    print()

    # ============================================================================
    # SETUP: Grant client C1 portal access via admin
    # ============================================================================
    print("SETUP: Granting client C1 portal access via admin...")
    resp = admin_session.put(f"{BASE_URL}/admin/users", json={
        "id": client_id,
        "portalAccess": True
    })
    if resp.status_code != 200:
        print(f"❌ Failed to grant portal access: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"✅ Client C1 granted portal access")
    print()

    # ============================================================================
    # SETUP: Assign client C1 to trainer T via admin
    # ============================================================================
    print("SETUP: Assigning client C1 to trainer T via admin...")
    resp = admin_session.put(f"{BASE_URL}/admin/users", json={
        "id": client_id,
        "assignedTrainerId": trainer_id
    })
    if resp.status_code != 200:
        print(f"❌ Failed to assign client to trainer: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print(f"✅ Client C1 assigned to trainer T")
    print()

    print("=" * 80)
    print("STARTING TESTS")
    print("=" * 80)
    print()

    # ============================================================================
    # TEST 1: As C1, GET /api/client/profile -> 200 with { profile: null } initially
    # ============================================================================
    print("TEST 1: GET /api/client/profile initially returns null")
    resp = client_session.get(f"{BASE_URL}/client/profile")
    
    passed = (
        resp.status_code == 200 and
        'profile' in resp.json() and
        resp.json()['profile'] is None
    )
    
    log_test(
        "1",
        "GET /api/client/profile initially returns { profile: null }",
        passed,
        resp.status_code,
        f"Response: {resp.json()}"
    )
    
    if passed:
        check_no_leaks(resp.json(), "1")

    # ============================================================================
    # TEST 2: As C1, PUT /api/client/profile with all fields -> 200
    # ============================================================================
    print("TEST 2: PUT /api/client/profile with complete profile data")
    profile_data = {
        "squat": "315",
        "bench": "225",
        "deadlift": "405",
        "overheadPress": "135",
        "diet": "Keto",
        "gym": "Iron House",
        "workoutsPerWeek": "4",
        "activityLevel": "Very active",
        "restingHeartRate": "58",
        "currentCalories": "2600",
        "notes": "tweaky left shoulder"
    }
    
    resp = client_session.put(f"{BASE_URL}/client/profile", json=profile_data)
    
    passed = resp.status_code == 200
    if passed:
        data = resp.json()
        profile = data.get('profile', {})
        passed = (
            profile.get('squat') == "315" and
            profile.get('bench') == "225" and
            profile.get('deadlift') == "405" and
            profile.get('overheadPress') == "135" and
            profile.get('diet') == "Keto" and
            profile.get('gym') == "Iron House" and
            profile.get('workoutsPerWeek') == "4" and
            profile.get('activityLevel') == "Very active" and
            profile.get('restingHeartRate') == "58" and
            profile.get('currentCalories') == "2600" and
            profile.get('notes') == "tweaky left shoulder"
        )
    
    log_test(
        "2",
        "PUT /api/client/profile saves all profile fields correctly",
        passed,
        resp.status_code,
        f"Response: {resp.json() if resp.status_code == 200 else resp.text}"
    )
    
    if passed:
        check_no_leaks(resp.json(), "2")

    # ============================================================================
    # TEST 3: As C1, GET /api/client/profile -> 200 returns saved profile
    # ============================================================================
    print("TEST 3: GET /api/client/profile returns saved profile")
    resp = client_session.get(f"{BASE_URL}/client/profile")
    
    passed = resp.status_code == 200
    if passed:
        data = resp.json()
        profile = data.get('profile', {})
        passed = (
            profile is not None and
            profile.get('squat') == "315" and
            profile.get('bench') == "225" and
            profile.get('deadlift') == "405" and
            profile.get('overheadPress') == "135" and
            profile.get('diet') == "Keto" and
            profile.get('gym') == "Iron House" and
            profile.get('workoutsPerWeek') == "4" and
            profile.get('activityLevel') == "Very active" and
            profile.get('restingHeartRate') == "58" and
            profile.get('currentCalories') == "2600" and
            profile.get('notes') == "tweaky left shoulder"
        )
    
    log_test(
        "3",
        "GET /api/client/profile returns the saved profile with all fields",
        passed,
        resp.status_code,
        f"Profile squat: {profile.get('squat')}, diet: {profile.get('diet')}, gym: {profile.get('gym')}"
    )
    
    if passed:
        check_no_leaks(resp.json(), "3")

    # ============================================================================
    # TEST 4: As C1, POST /api/checkins -> 200
    # ============================================================================
    print("TEST 4: Client C1 submits a check-in")
    resp = client_session.post(f"{BASE_URL}/checkins", json={
        "week": "1",
        "wins": "hit all sessions this week",
        "readiness": "8"
    })
    
    passed = resp.status_code == 200
    
    log_test(
        "4",
        "POST /api/checkins as C1 returns 200",
        passed,
        resp.status_code,
        f"Response: {resp.json() if resp.status_code == 200 else resp.text}"
    )
    
    if passed:
        check_no_leaks(resp.json(), "4")

    # ============================================================================
    # TEST 5: As T, GET /api/trainer/checkins?clientId=C1.id -> includes profile
    # ============================================================================
    print("TEST 5: Trainer T views C1's check-ins and sees profile")
    resp = trainer_session.get(f"{BASE_URL}/trainer/checkins", params={"clientId": client_id})
    
    passed = resp.status_code == 200
    if passed:
        data = resp.json()
        client_obj = data.get('client', {})
        client_profile = client_obj.get('profile')
        
        passed = (
            client_profile is not None and
            isinstance(client_profile, dict) and
            client_profile.get('squat') == "315" and
            client_profile.get('diet') == "Keto" and
            client_profile.get('gym') == "Iron House" and
            client_profile.get('bench') == "225" and
            client_profile.get('deadlift') == "405" and
            client_profile.get('overheadPress') == "135" and
            client_profile.get('workoutsPerWeek') == "4" and
            client_profile.get('activityLevel') == "Very active" and
            client_profile.get('restingHeartRate') == "58" and
            client_profile.get('currentCalories') == "2600" and
            client_profile.get('notes') == "tweaky left shoulder"
        )
    
    log_test(
        "5",
        "GET /api/trainer/checkins includes client profile with all About Me fields",
        passed,
        resp.status_code,
        f"Client profile squat: {client_profile.get('squat') if client_profile else 'N/A'}, diet: {client_profile.get('diet') if client_profile else 'N/A'}"
    )
    
    if passed:
        check_no_leaks(resp.json(), "5")

    # ============================================================================
    # TEST 6: GET /api/client/profile with NO cookie -> 401
    # ============================================================================
    print("TEST 6: GET /api/client/profile without auth cookie returns 401")
    resp = requests.get(f"{BASE_URL}/client/profile")
    
    passed = resp.status_code == 401
    
    log_test(
        "6",
        "GET /api/client/profile without auth cookie returns 401",
        passed,
        resp.status_code,
        f"Response: {resp.json() if resp.status_code != 500 else resp.text}"
    )

    # ============================================================================
    # TEST 7: PUT /api/client/profile with NO cookie -> 401
    # ============================================================================
    print("TEST 7: PUT /api/client/profile without auth cookie returns 401")
    resp = requests.put(f"{BASE_URL}/client/profile", json={
        "squat": "300",
        "bench": "200"
    })
    
    passed = resp.status_code == 401
    
    log_test(
        "7",
        "PUT /api/client/profile without auth cookie returns 401",
        passed,
        resp.status_code,
        f"Response: {resp.json() if resp.status_code != 500 else resp.text}"
    )

    # ============================================================================
    # FINAL SUMMARY
    # ============================================================================
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t['passed'])
    failed_tests = total_tests - passed_tests
    
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
    print()
    
    if failed_tests > 0:
        print("FAILED TESTS:")
        for t in test_results:
            if not t['passed']:
                print(f"  - Step {t['step']}: {t['description']}")
                if t['details']:
                    print(f"    Details: {t['details']}")
        print()
    
    print("=" * 80)
    print(f"Test completed at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    # Exit with appropriate code
    sys.exit(0 if failed_tests == 0 else 1)

except Exception as e:
    print()
    print("=" * 80)
    print(f"❌ TEST SUITE ERROR: {str(e)}")
    print("=" * 80)
    import traceback
    traceback.print_exc()
    sys.exit(1)

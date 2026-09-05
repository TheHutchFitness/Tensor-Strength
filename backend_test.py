#!/usr/bin/env python3
"""
Backend API test suite for Tensor Strength nutrition-sync endpoints.
Tests the NEW nutrition-sync backend endpoints in /app/app/api/[[...path]]/route.js
"""

import requests
import json
import os
from datetime import datetime

# Load environment variables
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results tracking
test_results = []

def log_test(step, description, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - Step {step}: {description}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({
        'step': step,
        'description': description,
        'passed': passed,
        'details': details
    })

def check_no_leaks(data):
    """Check for _id or passwordHash leaks in response"""
    json_str = json.dumps(data)
    has_id = '"_id"' in json_str
    has_hash = 'passwordHash' in json_str
    return not (has_id or has_hash)

def main():
    print("=" * 80)
    print("NUTRITION-SYNC BACKEND API TESTS")
    print("=" * 80)
    print(f"API URL: {API_URL}")
    print()

    # Session for cookies
    admin_session = requests.Session()
    trainer_session = requests.Session()
    c1_session = requests.Session()
    c2_session = requests.Session()
    no_auth_session = requests.Session()

    try:
        # ============ SETUP ============
        print("\n--- SETUP: Admin Login ---")
        r = admin_session.post(f"{API_URL}/auth/login", json={
            'username': ADMIN_USERNAME,
            'password': ADMIN_PASSWORD
        })
        if r.status_code != 200:
            print(f"❌ Admin login failed: {r.status_code} - {r.text}")
            return
        print(f"✅ Admin logged in successfully")
        admin_user = r.json().get('user', {})
        print(f"   Admin ID: {admin_user.get('id')}")

        # Register Trainer T
        print("\n--- SETUP: Register Trainer T ---")
        r = trainer_session.post(f"{API_URL}/auth/register", json={
            'username': f'trainer_nutrition_{datetime.now().timestamp()}',
            'email': f'trainer_nutrition_{datetime.now().timestamp()}@test.com',
            'password': 'password123'
        })
        if r.status_code != 200:
            print(f"❌ Trainer registration failed: {r.status_code} - {r.text}")
            return
        trainer = r.json().get('user', {})
        print(f"✅ Trainer registered: {trainer.get('username')} (ID: {trainer.get('id')})")

        # Make T a trainer via admin
        print("\n--- SETUP: Make T a trainer ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': trainer['id'],
            'isTrainer': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to make T a trainer: {r.status_code} - {r.text}")
            return
        print(f"✅ T is now a trainer")

        # Register Client C1
        print("\n--- SETUP: Register Client C1 ---")
        r = c1_session.post(f"{API_URL}/auth/register", json={
            'username': f'client1_nutrition_{datetime.now().timestamp()}',
            'email': f'client1_nutrition_{datetime.now().timestamp()}@test.com',
            'password': 'password123'
        })
        if r.status_code != 200:
            print(f"❌ C1 registration failed: {r.status_code} - {r.text}")
            return
        c1 = r.json().get('user', {})
        print(f"✅ C1 registered: {c1.get('username')} (ID: {c1.get('id')})")

        # Give C1 portal access
        print("\n--- SETUP: Give C1 portal access ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'portalAccess': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to give C1 portal access: {r.status_code} - {r.text}")
            return
        print(f"✅ C1 has portal access")

        # Assign C1 to T
        print("\n--- SETUP: Assign C1 to T ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'assignedTrainerId': trainer['id']
        })
        if r.status_code != 200:
            print(f"❌ Failed to assign C1 to T: {r.status_code} - {r.text}")
            return
        print(f"✅ C1 assigned to T")

        # Register Client C2
        print("\n--- SETUP: Register Client C2 ---")
        r = c2_session.post(f"{API_URL}/auth/register", json={
            'username': f'client2_nutrition_{datetime.now().timestamp()}',
            'email': f'client2_nutrition_{datetime.now().timestamp()}@test.com',
            'password': 'password123'
        })
        if r.status_code != 200:
            print(f"❌ C2 registration failed: {r.status_code} - {r.text}")
            return
        c2 = r.json().get('user', {})
        print(f"✅ C2 registered: {c2.get('username')} (ID: {c2.get('id')})")

        # Give C2 portal access but NOT assign to T
        print("\n--- SETUP: Give C2 portal access (NOT assigned to T) ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c2['id'],
            'portalAccess': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to give C2 portal access: {r.status_code} - {r.text}")
            return
        print(f"✅ C2 has portal access (NOT assigned to T)")

        print("\n" + "=" * 80)
        print("NUTRITION-SYNC ENDPOINT TESTS")
        print("=" * 80)

        # ============ TEST 1: C1 PUT nutrition with valid data ============
        print("\n--- Test 1: C1 PUT /api/client/nutrition with valid data ---")
        r = c1_session.put(f"{API_URL}/client/nutrition", json={
            'date': '2026-01-15',
            'totals': {
                'cal': 2100,
                'p': 180,
                'c': 190,
                'f': 60
            },
            'goal': {
                'calories': 2200,
                'protein': 170,
                'carbs': 220,
                'fat': 70
            },
            'supplements': ['Creatine', 'Vitamin D3']
        })
        passed = r.status_code == 200 and r.json().get('ok') == True
        log_test(1, "C1 PUT /api/client/nutrition with valid data", passed, 
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 2: C1 PUT nutrition again for SAME date (upsert) ============
        print("\n--- Test 2: C1 PUT /api/client/nutrition again for SAME date (upsert) ---")
        r = c1_session.put(f"{API_URL}/client/nutrition", json={
            'date': '2026-01-15',
            'totals': {
                'cal': 2400,  # Changed from 2100
                'p': 180,
                'c': 190,
                'f': 60
            },
            'goal': {
                'calories': 2200,
                'protein': 170,
                'carbs': 220,
                'fat': 70
            },
            'supplements': ['Creatine', 'Vitamin D3']
        })
        passed = r.status_code == 200 and r.json().get('ok') == True
        log_test(2, "C1 PUT /api/client/nutrition again for SAME date (upsert)", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 3: C1 PUT nutrition with NO date ============
        print("\n--- Test 3: C1 PUT /api/client/nutrition with NO date ---")
        r = c1_session.put(f"{API_URL}/client/nutrition", json={
            'totals': {
                'cal': 2100,
                'p': 180,
                'c': 190,
                'f': 60
            },
            'goal': {
                'calories': 2200,
                'protein': 170,
                'carbs': 220,
                'fat': 70
            },
            'supplements': ['Creatine']
        })
        passed = r.status_code == 400
        log_test(3, "C1 PUT /api/client/nutrition with NO date -> 400", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 4: PUT nutrition with NO cookie ============
        print("\n--- Test 4: PUT /api/client/nutrition with NO cookie ---")
        r = no_auth_session.put(f"{API_URL}/client/nutrition", json={
            'date': '2026-01-15',
            'totals': {
                'cal': 2100,
                'p': 180,
                'c': 190,
                'f': 60
            }
        })
        passed = r.status_code == 401
        log_test(4, "PUT /api/client/nutrition with NO cookie -> 401", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 5: T GET client-nutrition for C1 with date ============
        print("\n--- Test 5: T GET /api/trainer/client-nutrition?clientId=C1&date=2026-01-15 ---")
        r = trainer_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c1['id'],
            'date': '2026-01-15'
        })
        passed = False
        if r.status_code == 200:
            data = r.json()
            day = data.get('day')
            recent = data.get('recent', [])
            # Check that day.totals.cal == 2400 (the upserted value)
            if day and day.get('totals', {}).get('cal') == 2400:
                # Check goal and supplements
                if (day.get('goal', {}).get('calories') == 2200 and 
                    day.get('supplements') == ['Creatine', 'Vitamin D3']):
                    passed = True
                    log_test(5, "T GET /api/trainer/client-nutrition with date -> 200 with correct data", True,
                             f"Status: {r.status_code}, day.totals.cal: {day.get('totals', {}).get('cal')}, "
                             f"day.goal.calories: {day.get('goal', {}).get('calories')}, "
                             f"day.supplements: {day.get('supplements')}, recent count: {len(recent)}")
                else:
                    log_test(5, "T GET /api/trainer/client-nutrition with date -> 200 but incorrect data", False,
                             f"Status: {r.status_code}, day: {day}")
            else:
                log_test(5, "T GET /api/trainer/client-nutrition with date -> 200 but day.totals.cal != 2400", False,
                         f"Status: {r.status_code}, day: {day}")
        else:
            log_test(5, "T GET /api/trainer/client-nutrition with date -> wrong status", False,
                     f"Status: {r.status_code}, Response: {r.text}")

        # ============ TEST 6: C1 PUT another day, then T GET without date param ============
        print("\n--- Test 6: C1 PUT another day (2026-01-16) ---")
        r = c1_session.put(f"{API_URL}/client/nutrition", json={
            'date': '2026-01-16',
            'totals': {
                'cal': 1900,
                'p': 160,
                'c': 180,
                'f': 50
            },
            'goal': {
                'calories': 2200,
                'protein': 170,
                'carbs': 220,
                'fat': 70
            },
            'supplements': ['Creatine']
        })
        if r.status_code != 200:
            print(f"❌ Failed to PUT 2026-01-16: {r.status_code} - {r.text}")
        else:
            print(f"✅ C1 PUT 2026-01-16 successful")

        print("\n--- Test 6 (cont): T GET /api/trainer/client-nutrition?clientId=C1 (NO date param) ---")
        r = trainer_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c1['id']
        })
        passed = False
        if r.status_code == 200:
            data = r.json()
            recent = data.get('recent', [])
            # Check that recent array contains BOTH 2026-01-15 and 2026-01-16
            dates_in_recent = [entry.get('date') for entry in recent if entry]
            if '2026-01-15' in dates_in_recent and '2026-01-16' in dates_in_recent:
                # Check that most recent is first (2026-01-16 should come before 2026-01-15)
                if len(recent) >= 2 and recent[0].get('date') == '2026-01-16':
                    passed = True
                    log_test(6, "T GET /api/trainer/client-nutrition without date -> 200 with recent array containing both dates", True,
                             f"Status: {r.status_code}, recent dates: {dates_in_recent}, most recent first: {recent[0].get('date')}")
                else:
                    log_test(6, "T GET /api/trainer/client-nutrition without date -> 200 but recent not sorted correctly", False,
                             f"Status: {r.status_code}, recent: {recent}")
            else:
                log_test(6, "T GET /api/trainer/client-nutrition without date -> 200 but recent missing dates", False,
                         f"Status: {r.status_code}, dates in recent: {dates_in_recent}")
        else:
            log_test(6, "T GET /api/trainer/client-nutrition without date -> wrong status", False,
                     f"Status: {r.status_code}, Response: {r.text}")

        # ============ TEST 7: T GET without clientId ============
        print("\n--- Test 7: T GET /api/trainer/client-nutrition without clientId ---")
        r = trainer_session.get(f"{API_URL}/trainer/client-nutrition")
        passed = r.status_code == 400
        log_test(7, "T GET /api/trainer/client-nutrition without clientId -> 400", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 8: T GET for C2 (not assigned to T) ============
        print("\n--- Test 8: T GET /api/trainer/client-nutrition?clientId=C2 (C2 not assigned to T) ---")
        r = trainer_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c2['id']
        })
        passed = r.status_code == 403
        log_test(8, "T GET /api/trainer/client-nutrition for C2 (not assigned) -> 403", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 9: C1 (non-trainer) GET client-nutrition ============
        print("\n--- Test 9: C1 (non-trainer) GET /api/trainer/client-nutrition ---")
        r = c1_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c1['id']
        })
        passed = r.status_code == 403
        log_test(9, "C1 (non-trainer) GET /api/trainer/client-nutrition -> 403", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 10: GET with NO cookie ============
        print("\n--- Test 10: GET /api/trainer/client-nutrition with NO cookie ---")
        r = no_auth_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c1['id']
        })
        passed = r.status_code == 403
        log_test(10, "GET /api/trainer/client-nutrition with NO cookie -> 403", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 11: Check for no 500s and no leaks ============
        print("\n--- Test 11: Verify no 500 errors and no _id/passwordHash leaks ---")
        has_500 = any(result['details'].startswith('Status: 500') for result in test_results)
        
        # Check for leaks in all responses
        all_no_leaks = True
        print("   Checking for _id/passwordHash leaks in all responses...")
        
        # Re-run a few key endpoints to check for leaks
        r = trainer_session.get(f"{API_URL}/trainer/client-nutrition", params={
            'clientId': c1['id'],
            'date': '2026-01-15'
        })
        if r.status_code == 200:
            if not check_no_leaks(r.json()):
                all_no_leaks = False
                print(f"   ❌ Leak detected in GET /api/trainer/client-nutrition response")
        
        r = c1_session.put(f"{API_URL}/client/nutrition", json={
            'date': '2026-01-17',
            'totals': {'cal': 2000, 'p': 150, 'c': 200, 'f': 60},
            'goal': {'calories': 2200, 'protein': 170, 'carbs': 220, 'fat': 70}
        })
        if r.status_code == 200:
            if not check_no_leaks(r.json()):
                all_no_leaks = False
                print(f"   ❌ Leak detected in PUT /api/client/nutrition response")
        
        passed = not has_500 and all_no_leaks
        log_test(11, "No 500 errors and no _id/passwordHash leaks", passed,
                 f"Has 500 errors: {has_500}, All responses clean: {all_no_leaks}")

        # ============ SUMMARY ============
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(test_results)
        passed_tests = sum(1 for r in test_results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        print("\n--- Detailed Results ---")
        for result in test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} Step {result['step']}: {result['description']}")
        
        if failed_tests > 0:
            print("\n--- Failed Tests Details ---")
            for result in test_results:
                if not result['passed']:
                    print(f"\nStep {result['step']}: {result['description']}")
                    print(f"  {result['details']}")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

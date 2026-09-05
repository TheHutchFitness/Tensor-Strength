#!/usr/bin/env python3
"""
Backend API test suite for NEW features:
1. Admin-assisted password reset (PUT /api/admin/users with newPassword)
2. Coach meal templates (POST/GET/DELETE /api/trainer/meals, GET /api/client/meals)
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
    print("ADMIN PASSWORD RESET + COACH MEAL TEMPLATES BACKEND API TESTS")
    print("=" * 80)
    print(f"API URL: {API_URL}")
    print()

    # Sessions for cookies
    admin_session = requests.Session()
    trainer_session = requests.Session()
    c1_session = requests.Session()
    c2_session = requests.Session()
    no_auth_session = requests.Session()

    # Store original passwords
    c1_original_password = None
    c1_email = None

    try:
        # ============ SETUP ============
        print("\n" + "=" * 80)
        print("SETUP: Admin Login")
        print("=" * 80)
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
        print("\n" + "=" * 80)
        print("SETUP: Register Trainer T")
        print("=" * 80)
        trainer_username = f'trainer_meals_{int(datetime.now().timestamp())}'
        trainer_email = f'trainer_meals_{int(datetime.now().timestamp())}@tensorstrength.com'
        trainer_password = 'TrainerPass123!'
        r = trainer_session.post(f"{API_URL}/auth/register", json={
            'username': trainer_username,
            'email': trainer_email,
            'password': trainer_password
        })
        if r.status_code != 200:
            print(f"❌ Trainer registration failed: {r.status_code} - {r.text}")
            return
        trainer = r.json().get('user', {})
        print(f"✅ Trainer registered: {trainer.get('username')} (ID: {trainer.get('id')})")

        # Make T a trainer via admin
        print("\n--- Make T a trainer ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': trainer['id'],
            'isTrainer': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to make T a trainer: {r.status_code} - {r.text}")
            return
        print(f"✅ T is now a trainer")

        # Register Client C1
        print("\n" + "=" * 80)
        print("SETUP: Register Client C1")
        print("=" * 80)
        c1_username = f'client1_meals_{int(datetime.now().timestamp())}'
        c1_email = f'client1_meals_{int(datetime.now().timestamp())}@tensorstrength.com'
        c1_original_password = 'ClientPass123!'
        r = c1_session.post(f"{API_URL}/auth/register", json={
            'username': c1_username,
            'email': c1_email,
            'password': c1_original_password
        })
        if r.status_code != 200:
            print(f"❌ C1 registration failed: {r.status_code} - {r.text}")
            return
        c1 = r.json().get('user', {})
        print(f"✅ C1 registered: {c1.get('username')} (ID: {c1.get('id')})")
        print(f"   C1 email: {c1_email}")
        print(f"   C1 original password: {c1_original_password}")

        # Give C1 portal access and assign to T
        print("\n--- Give C1 portal access ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'portalAccess': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to give C1 portal access: {r.status_code} - {r.text}")
            return
        print(f"✅ C1 has portal access")

        print("\n--- Assign C1 to trainer T ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'assignedTrainerId': trainer['id']
        })
        if r.status_code != 200:
            print(f"❌ Failed to assign C1 to T: {r.status_code} - {r.text}")
            return
        print(f"✅ C1 assigned to trainer T")

        # Register Client C2
        print("\n" + "=" * 80)
        print("SETUP: Register Client C2 (NOT assigned to T)")
        print("=" * 80)
        c2_username = f'client2_meals_{int(datetime.now().timestamp())}'
        c2_email = f'client2_meals_{int(datetime.now().timestamp())}@tensorstrength.com'
        c2_password = 'ClientPass456!'
        r = c2_session.post(f"{API_URL}/auth/register", json={
            'username': c2_username,
            'email': c2_email,
            'password': c2_password
        })
        if r.status_code != 200:
            print(f"❌ C2 registration failed: {r.status_code} - {r.text}")
            return
        c2 = r.json().get('user', {})
        print(f"✅ C2 registered: {c2.get('username')} (ID: {c2.get('id')})")

        # Give C2 portal access but NOT assign to T
        print("\n--- Give C2 portal access (but NOT assign to T) ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c2['id'],
            'portalAccess': True
        })
        if r.status_code != 200:
            print(f"❌ Failed to give C2 portal access: {r.status_code} - {r.text}")
            return
        print(f"✅ C2 has portal access (NOT assigned to T)")

        # ============ PART 1: ADMIN-ASSISTED PASSWORD RESET ============
        print("\n" + "=" * 80)
        print("PART 1: ADMIN-ASSISTED PASSWORD RESET")
        print("=" * 80)

        # Test 1: Admin resets C1's password
        print("\n--- Test 1: Admin resets C1's password to 'NewPass123' ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'newPassword': 'NewPass123'
        })
        passed = r.status_code == 200
        log_test(1, "Admin PUT /api/admin/users with newPassword='NewPass123'", passed, 
                 f"Status: {r.status_code}, Response: {r.text[:200]}")
        if not passed:
            print(f"❌ Test 1 failed, cannot continue")
            return

        # Test 2: Verify reset worked - login with NEW password
        print("\n--- Test 2: Verify C1 can login with NEW password ---")
        new_session = requests.Session()
        r = new_session.post(f"{API_URL}/auth/login", json={
            'username': c1_email,
            'password': 'NewPass123'
        })
        passed = r.status_code == 200
        log_test(2, "Login with NEW password 'NewPass123' succeeds", passed,
                 f"Status: {r.status_code}, Response: {r.text[:200]}")
        if not passed:
            print(f"❌ Test 2 failed - new password doesn't work")

        # Test 3: Verify old password no longer works
        print("\n--- Test 3: Verify C1's ORIGINAL password no longer works ---")
        old_session = requests.Session()
        r = old_session.post(f"{API_URL}/auth/login", json={
            'username': c1_email,
            'password': c1_original_password
        })
        passed = r.status_code == 401
        log_test(3, "Login with ORIGINAL password returns 401", passed,
                 f"Status: {r.status_code}, Expected: 401")
        if not passed:
            print(f"⚠️ Warning: Old password still works (should be rejected)")

        # Test 4: Admin tries to set password too short
        print("\n--- Test 4: Admin tries to set password too short (< 6 chars) ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'newPassword': 'abc'
        })
        passed = r.status_code == 400
        log_test(4, "Admin PUT with newPassword='abc' (too short) returns 400", passed,
                 f"Status: {r.status_code}, Expected: 400, Response: {r.text[:200]}")

        # Test 5: Non-admin tries to reset password
        print("\n--- Test 5: Non-admin (C2) tries to reset C1's password ---")
        r = c2_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'newPassword': 'Hacked123'
        })
        passed = r.status_code == 403
        log_test(5, "Non-admin PUT /api/admin/users returns 403", passed,
                 f"Status: {r.status_code}, Expected: 403")

        # Test 6: Check response doesn't leak passwordHash or _id
        print("\n--- Test 6: Verify PUT response doesn't leak passwordHash or _id ---")
        r = admin_session.put(f"{API_URL}/admin/users", json={
            'id': c1['id'],
            'newPassword': 'AnotherPass123'
        })
        if r.status_code == 200:
            data = r.json()
            no_leaks = check_no_leaks(data)
            log_test(6, "PUT response doesn't leak passwordHash or _id", no_leaks,
                     f"Response keys: {list(data.keys())}")
        else:
            log_test(6, "PUT response doesn't leak passwordHash or _id", False,
                     f"Status: {r.status_code}")

        # ============ PART 2: COACH MEAL TEMPLATES ============
        print("\n" + "=" * 80)
        print("PART 2: COACH MEAL TEMPLATES")
        print("=" * 80)

        # Test 7: Trainer creates meal for C1
        print("\n--- Test 7: Trainer T creates meal for C1 ---")
        r = trainer_session.post(f"{API_URL}/trainer/meals", json={
            'name': 'Post-workout shake',
            'clientId': c1['id'],
            'items': [
                {'name': 'Whey', 'label': '1 scoop', 'cal': 120, 'p': 24, 'c': 3, 'f': 1},
                {'name': 'Banana', 'label': '1', 'cal': 105, 'p': 1, 'c': 27, 'f': 0}
            ]
        })
        passed = r.status_code == 200
        meal_c1_id = None
        if passed:
            data = r.json()
            meal_c1_id = data.get('id')
            has_items = 'items' in data and len(data['items']) == 2
            passed = passed and has_items and meal_c1_id
            log_test(7, "Trainer POST /api/trainer/meals for C1 returns 200 with id + items", passed,
                     f"Status: {r.status_code}, meal_id: {meal_c1_id}, items_count: {len(data.get('items', []))}")
        else:
            log_test(7, "Trainer POST /api/trainer/meals for C1 returns 200 with id + items", False,
                     f"Status: {r.status_code}, Response: {r.text[:200]}")

        # Test 8: Trainer creates broadcast meal (clientId=null)
        print("\n--- Test 8: Trainer T creates broadcast meal (clientId=null) ---")
        r = trainer_session.post(f"{API_URL}/trainer/meals", json={
            'name': 'Team Breakfast',
            'clientId': None,
            'items': [
                {'name': 'Oats', 'label': '1 cup', 'cal': 150, 'p': 5, 'c': 27, 'f': 3}
            ]
        })
        passed = r.status_code == 200
        meal_broadcast_id = None
        if passed:
            data = r.json()
            meal_broadcast_id = data.get('id')
            has_items = 'items' in data and len(data['items']) == 1
            passed = passed and has_items and meal_broadcast_id
            log_test(8, "Trainer POST /api/trainer/meals with clientId=null (broadcast) returns 200", passed,
                     f"Status: {r.status_code}, meal_id: {meal_broadcast_id}")
        else:
            log_test(8, "Trainer POST /api/trainer/meals with clientId=null (broadcast) returns 200", False,
                     f"Status: {r.status_code}, Response: {r.text[:200]}")

        # Test 9: Trainer tries to create meal for C2 (not assigned)
        print("\n--- Test 9: Trainer T tries to create meal for C2 (not assigned) ---")
        r = trainer_session.post(f"{API_URL}/trainer/meals", json={
            'name': 'X',
            'clientId': c2['id'],
            'items': []
        })
        passed = r.status_code == 400
        log_test(9, "Trainer POST /api/trainer/meals for unassigned client returns 400", passed,
                 f"Status: {r.status_code}, Expected: 400, Response: {r.text[:200]}")

        # Test 10: Trainer tries to create meal without name
        print("\n--- Test 10: Trainer T tries to create meal without name ---")
        r = trainer_session.post(f"{API_URL}/trainer/meals", json={
            'clientId': c1['id'],
            'items': []
        })
        passed = r.status_code == 400
        log_test(10, "Trainer POST /api/trainer/meals without name returns 400", passed,
                 f"Status: {r.status_code}, Expected: 400")

        # Test 11: C1 gets meals (should see both C1-specific and broadcast)
        print("\n--- Test 11: C1 GET /api/client/meals (should see 2 meals) ---")
        r = c1_session.get(f"{API_URL}/client/meals")
        passed = r.status_code == 200
        if passed:
            data = r.json()
            meals = data.get('meals', [])
            has_both = len(meals) == 2
            meal_names = [m.get('name') for m in meals]
            has_c1_meal = 'Post-workout shake' in meal_names
            has_broadcast = 'Team Breakfast' in meal_names
            passed = has_both and has_c1_meal and has_broadcast
            log_test(11, "C1 GET /api/client/meals returns BOTH C1-specific and broadcast meals", passed,
                     f"Status: {r.status_code}, meals_count: {len(meals)}, names: {meal_names}")
        else:
            log_test(11, "C1 GET /api/client/meals returns BOTH C1-specific and broadcast meals", False,
                     f"Status: {r.status_code}")

        # Test 12: C2 gets meals (should see neither - not assigned to T)
        print("\n--- Test 12: C2 GET /api/client/meals (should see 0 meals) ---")
        r = c2_session.get(f"{API_URL}/client/meals")
        passed = r.status_code == 200
        if passed:
            data = r.json()
            meals = data.get('meals', [])
            passed = len(meals) == 0
            log_test(12, "C2 GET /api/client/meals returns empty (not assigned to T)", passed,
                     f"Status: {r.status_code}, meals_count: {len(meals)}")
        else:
            log_test(12, "C2 GET /api/client/meals returns empty (not assigned to T)", False,
                     f"Status: {r.status_code}")

        # Test 13: Trainer lists meals and deletes one
        print("\n--- Test 13: Trainer T lists meals and deletes one ---")
        r = trainer_session.get(f"{API_URL}/trainer/meals")
        passed = r.status_code == 200
        if passed:
            data = r.json()
            meals = data.get('meals', [])
            passed = len(meals) >= 2
            log_test("13a", "Trainer GET /api/trainer/meals lists meals", passed,
                     f"Status: {r.status_code}, meals_count: {len(meals)}")
            
            # Delete one meal
            if meal_c1_id:
                print(f"\n--- Test 13b: Delete meal {meal_c1_id} ---")
                r = trainer_session.delete(f"{API_URL}/trainer/meals?id={meal_c1_id}")
                passed = r.status_code == 200 and r.json().get('ok') == True
                log_test("13b", "Trainer DELETE /api/trainer/meals returns {ok:true}", passed,
                         f"Status: {r.status_code}, Response: {r.json()}")
        else:
            log_test("13a", "Trainer GET /api/trainer/meals lists meals", False,
                     f"Status: {r.status_code}")

        # Test 14: Non-trainer tries to create meal
        print("\n--- Test 14: Non-trainer C1 tries to POST /api/trainer/meals ---")
        r = c1_session.post(f"{API_URL}/trainer/meals", json={
            'name': 'Hacked meal',
            'items': []
        })
        passed = r.status_code == 403
        log_test(14, "Non-trainer POST /api/trainer/meals returns 403", passed,
                 f"Status: {r.status_code}, Expected: 403")

        # Test 14b: No cookie GET /api/trainer/meals
        print("\n--- Test 14b: GET /api/trainer/meals with NO cookie ---")
        r = no_auth_session.get(f"{API_URL}/trainer/meals")
        passed = r.status_code == 403
        log_test("14b", "GET /api/trainer/meals with NO cookie returns 403", passed,
                 f"Status: {r.status_code}, Expected: 403")

        # Test 15: GET /api/client/meals with NO cookie (should not 500)
        print("\n--- Test 15: GET /api/client/meals with NO cookie (should not 500) ---")
        r = no_auth_session.get(f"{API_URL}/client/meals")
        passed = r.status_code in [200, 401] and r.status_code != 500
        if r.status_code == 200:
            data = r.json()
            meals = data.get('meals', [])
            passed = passed and len(meals) == 0
            log_test(15, "GET /api/client/meals with NO cookie returns safe response (not 500)", passed,
                     f"Status: {r.status_code}, meals: {meals}")
        else:
            log_test(15, "GET /api/client/meals with NO cookie returns safe response (not 500)", passed,
                     f"Status: {r.status_code}")

        # ============ SUMMARY ============
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(test_results)
        passed_tests = sum(1 for t in test_results if t['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for t in test_results:
                if not t['passed']:
                    print(f"  - Step {t['step']}: {t['description']}")
                    if t['details']:
                        print(f"    {t['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")

        print("\n" + "=" * 80)
        print("DETAILED TEST RESULTS BY STEP")
        print("=" * 80)
        print("\n=== PART 1: ADMIN-ASSISTED PASSWORD RESET ===")
        print("Step 1: Admin resets C1's password - ", "✅ PASS" if test_results[0]['passed'] else "❌ FAIL")
        print("Step 2: Login with NEW password succeeds - ", "✅ PASS" if test_results[1]['passed'] else "❌ FAIL")
        print("Step 3: Login with OLD password returns 401 - ", "✅ PASS" if test_results[2]['passed'] else "❌ FAIL")
        print("Step 4: Password too short returns 400 - ", "✅ PASS" if test_results[3]['passed'] else "❌ FAIL")
        print("Step 5: Non-admin reset returns 403 - ", "✅ PASS" if test_results[4]['passed'] else "❌ FAIL")
        print("Step 6: No passwordHash/_id leaks - ", "✅ PASS" if test_results[5]['passed'] else "❌ FAIL")
        
        print("\n=== PART 2: COACH MEAL TEMPLATES ===")
        print("Step 7: Create meal for C1 - ", "✅ PASS" if test_results[6]['passed'] else "❌ FAIL")
        print("Step 8: Create broadcast meal - ", "✅ PASS" if test_results[7]['passed'] else "❌ FAIL")
        print("Step 9: Create meal for unassigned client returns 400 - ", "✅ PASS" if test_results[8]['passed'] else "❌ FAIL")
        print("Step 10: Create meal without name returns 400 - ", "✅ PASS" if test_results[9]['passed'] else "❌ FAIL")
        print("Step 11: C1 sees both meals - ", "✅ PASS" if test_results[10]['passed'] else "❌ FAIL")
        print("Step 12: C2 sees no meals - ", "✅ PASS" if test_results[11]['passed'] else "❌ FAIL")
        
        # Find test 13a and 13b
        test_13a = next((t for t in test_results if t['step'] == '13a'), None)
        test_13b = next((t for t in test_results if t['step'] == '13b'), None)
        print("Step 13a: Trainer lists meals - ", "✅ PASS" if test_13a and test_13a['passed'] else "❌ FAIL")
        print("Step 13b: Trainer deletes meal - ", "✅ PASS" if test_13b and test_13b['passed'] else "❌ FAIL")
        
        test_14 = next((t for t in test_results if t['step'] == 14), None)
        test_14b = next((t for t in test_results if t['step'] == '14b'), None)
        print("Step 14: Non-trainer POST returns 403 - ", "✅ PASS" if test_14 and test_14['passed'] else "❌ FAIL")
        print("Step 14b: No cookie GET returns 403 - ", "✅ PASS" if test_14b and test_14b['passed'] else "❌ FAIL")
        
        test_15 = next((t for t in test_results if t['step'] == 15), None)
        print("Step 15: No cookie client/meals safe - ", "✅ PASS" if test_15 and test_15['passed'] else "❌ FAIL")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

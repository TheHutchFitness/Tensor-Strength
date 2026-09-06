#!/usr/bin/env python3
"""
Backend API test for 6 new endpoints:
1. GET /api/trainer/activity
2. GET/PUT /api/trainer/client-goals
3. GET /api/admin/analytics
4. GET /api/admin/revenue
5. GET/PUT /api/announcement
6. POST /api/admin/bulk-assign
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials from .env
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Demo client ID from review request
DEMO_CLIENT_ID = "da3cf979-45da-4c47-9b5f-8680d131038e"

def print_test(num, desc):
    print(f"\n{'='*80}")
    print(f"TEST {num}: {desc}")
    print('='*80)

def print_result(success, message):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"{status}: {message}")

def check_no_id_leak(data):
    """Check if response contains MongoDB _id field"""
    if isinstance(data, dict):
        if '_id' in data:
            return False
        for value in data.values():
            if not check_no_id_leak(value):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_no_id_leak(item):
                return False
    return True

def main():
    print("Starting backend API tests for 6 new endpoints...")
    print(f"Base URL: {BASE_URL}")
    
    # Create session for admin
    admin_session = requests.Session()
    
    # Create session for member
    member_session = requests.Session()
    
    test_count = 0
    passed_count = 0
    
    try:
        # ============================================================
        # SETUP: Admin login
        # ============================================================
        print_test("SETUP", "Admin login")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text[:200]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('user', {}).get('role') == 'admin':
                print_result(True, f"Admin login successful, role={data['user']['role']}")
                admin_id = data['user']['id']
            else:
                print_result(False, f"Admin login returned wrong role: {data.get('user', {}).get('role')}")
                sys.exit(1)
        else:
            print_result(False, f"Admin login failed with status {resp.status_code}")
            sys.exit(1)
        
        # ============================================================
        # SETUP: Get a valid client ID (use demo client or get from /api/trainer/clients)
        # ============================================================
        print_test("SETUP", "Get valid client ID")
        resp = admin_session.get(f"{BASE_URL}/trainer/clients")
        print(f"Status: {resp.status_code}")
        
        client_id = None
        if resp.status_code == 200:
            data = resp.json()
            clients = data.get('clients', [])
            print(f"Found {len(clients)} clients")
            if len(clients) > 0:
                client_id = clients[0]['id']
                print_result(True, f"Using client ID: {client_id}")
            else:
                # Try using the demo client ID from review request
                client_id = DEMO_CLIENT_ID
                print_result(True, f"No clients found, using demo client ID: {client_id}")
        else:
            client_id = DEMO_CLIENT_ID
            print_result(True, f"Could not fetch clients, using demo client ID: {client_id}")
        
        # ============================================================
        # TEST 1: GET /api/trainer/activity
        # ============================================================
        test_count += 1
        print_test(1, "GET /api/trainer/activity as admin")
        
        try:
            resp = admin_session.get(f"{BASE_URL}/trainer/activity")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if 'clients' in data and isinstance(data['clients'], list):
                    # Check structure of first client if any
                    if len(data['clients']) > 0:
                        client = data['clients'][0]
                        required_fields = ['id', 'username', 'workoutCount', 'lastWorkout', 'lastNutrition', 'lastCheckin']
                        has_all_fields = all(field in client for field in required_fields)
                        
                        if has_all_fields:
                            if check_no_id_leak(data):
                                print_result(True, f"Returns 200 with clients array ({len(data['clients'])} clients), all required fields present, no _id leaks")
                                passed_count += 1
                            else:
                                print_result(False, "Response contains MongoDB _id leak")
                        else:
                            missing = [f for f in required_fields if f not in client]
                            print_result(False, f"Client missing required fields: {missing}")
                    else:
                        if check_no_id_leak(data):
                            print_result(True, "Returns 200 with empty clients array, no _id leaks")
                            passed_count += 1
                        else:
                            print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response missing 'clients' array: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 2a: GET /api/trainer/client-goals?clientId=<CID>
        # ============================================================
        test_count += 1
        print_test("2a", f"GET /api/trainer/client-goals?clientId={client_id}")
        
        try:
            resp = admin_session.get(f"{BASE_URL}/trainer/client-goals?clientId={client_id}")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if 'goals' in data and isinstance(data['goals'], list):
                    if check_no_id_leak(data):
                        print_result(True, f"Returns 200 with goals array ({len(data['goals'])} goals), no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response missing 'goals' array: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 2b: PUT /api/trainer/client-goals with goals
        # ============================================================
        test_count += 1
        print_test("2b", f"PUT /api/trainer/client-goals with clientId={client_id}")
        
        try:
            goal_data = {
                "clientId": client_id,
                "goals": [
                    {
                        "label": "Squat 1RM",
                        "target": 405,
                        "current": 365,
                        "unit": "lb"
                    }
                ]
            }
            resp = admin_session.put(f"{BASE_URL}/trainer/client-goals", json=goal_data)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and 'goals' in data and isinstance(data['goals'], list):
                    if len(data['goals']) > 0:
                        goal = data['goals'][0]
                        if (goal.get('label') == 'Squat 1RM' and 
                            goal.get('target') == 405 and 
                            goal.get('current') == 365 and 
                            goal.get('unit') == 'lb' and
                            'id' in goal):
                            if check_no_id_leak(data):
                                print_result(True, f"Returns 200 with ok:true, goals array with id assigned, no _id leaks")
                                passed_count += 1
                            else:
                                print_result(False, "Response contains MongoDB _id leak")
                        else:
                            print_result(False, f"Goal data mismatch: {goal}")
                    else:
                        print_result(False, "Goals array is empty")
                else:
                    print_result(False, f"Response missing ok or goals: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 2c: GET /api/trainer/client-goals again to verify persistence
        # ============================================================
        test_count += 1
        print_test("2c", f"GET /api/trainer/client-goals?clientId={client_id} again (verify persistence)")
        
        try:
            resp = admin_session.get(f"{BASE_URL}/trainer/client-goals?clientId={client_id}")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if 'goals' in data and isinstance(data['goals'], list) and len(data['goals']) > 0:
                    goal = data['goals'][0]
                    if (goal.get('label') == 'Squat 1RM' and 
                        goal.get('target') == 405 and 
                        goal.get('current') == 365 and 
                        goal.get('unit') == 'lb' and
                        'id' in goal):
                        if check_no_id_leak(data):
                            print_result(True, f"Goals persisted correctly with id={goal['id']}, no _id leaks")
                            passed_count += 1
                        else:
                            print_result(False, "Response contains MongoDB _id leak")
                    else:
                        print_result(False, f"Goal data mismatch after persistence: {goal}")
                else:
                    print_result(False, f"Goals not persisted: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 3: GET /api/admin/analytics
        # ============================================================
        test_count += 1
        print_test(3, "GET /api/admin/analytics")
        
        try:
            resp = admin_session.get(f"{BASE_URL}/admin/analytics")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                required_fields = ['totalMembers', 'portalAccess', 'trainers', 'newLast30', 
                                 'activeSubscribers', 'forumPosts', 'checkins', 'signupsByWeek']
                has_all_fields = all(field in data for field in required_fields)
                
                if has_all_fields:
                    # Check that numeric fields are numbers
                    numeric_fields = ['totalMembers', 'portalAccess', 'trainers', 'newLast30', 
                                    'activeSubscribers', 'forumPosts', 'checkins']
                    all_numeric = all(isinstance(data[field], int) for field in numeric_fields)
                    
                    # Check signupsByWeek is array of 8 items with label and count
                    signups_valid = (isinstance(data['signupsByWeek'], list) and 
                                   len(data['signupsByWeek']) == 8 and
                                   all('label' in item and 'count' in item for item in data['signupsByWeek']))
                    
                    if all_numeric and signups_valid:
                        if check_no_id_leak(data):
                            print_result(True, f"Returns 200 with all numeric fields and signupsByWeek array (8 items), no _id leaks")
                            passed_count += 1
                        else:
                            print_result(False, "Response contains MongoDB _id leak")
                    else:
                        if not all_numeric:
                            print_result(False, "Some numeric fields are not numbers")
                        if not signups_valid:
                            print_result(False, f"signupsByWeek invalid: {data['signupsByWeek']}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    print_result(False, f"Response missing required fields: {missing}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 4: GET /api/admin/revenue
        # ============================================================
        test_count += 1
        print_test(4, "GET /api/admin/revenue")
        
        try:
            resp = admin_session.get(f"{BASE_URL}/admin/revenue")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if ('activeSubscribers' in data and isinstance(data['activeSubscribers'], int) and
                    'byPlan' in data and isinstance(data['byPlan'], list)):
                    # Check byPlan structure if not empty
                    byplan_valid = True
                    if len(data['byPlan']) > 0:
                        byplan_valid = all('plan' in item and 'count' in item for item in data['byPlan'])
                    
                    if byplan_valid:
                        if check_no_id_leak(data):
                            print_result(True, f"Returns 200 with activeSubscribers={data['activeSubscribers']}, byPlan array ({len(data['byPlan'])} plans), no _id leaks")
                            passed_count += 1
                        else:
                            print_result(False, "Response contains MongoDB _id leak")
                    else:
                        print_result(False, f"byPlan structure invalid: {data['byPlan']}")
                else:
                    print_result(False, f"Response missing activeSubscribers or byPlan: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 5a: GET /api/announcement (no auth)
        # ============================================================
        test_count += 1
        print_test("5a", "GET /api/announcement (no auth - public)")
        
        try:
            # Use a new session without auth
            resp = requests.get(f"{BASE_URL}/announcement")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if 'enabled' in data and 'message' in data and 'updatedAt' in data:
                    if check_no_id_leak(data):
                        print_result(True, f"Returns 200 with enabled={data['enabled']}, message='{data['message'][:50]}...', updatedAt={data['updatedAt']}, no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response missing required fields: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 5b: PUT /api/admin/announcement (set enabled=true)
        # ============================================================
        test_count += 1
        print_test("5b", "PUT /api/admin/announcement with enabled=true")
        
        try:
            announcement_data = {
                "enabled": True,
                "message": "Test banner"
            }
            resp = admin_session.put(f"{BASE_URL}/admin/announcement", json=announcement_data)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and data.get('enabled') == True and data.get('message') == 'Test banner':
                    if check_no_id_leak(data):
                        print_result(True, f"Returns 200 with ok=true, enabled=true, message='Test banner', no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response data mismatch: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 5c: GET /api/announcement again (verify persistence)
        # ============================================================
        test_count += 1
        print_test("5c", "GET /api/announcement again (verify enabled=true, message='Test banner')")
        
        try:
            resp = requests.get(f"{BASE_URL}/announcement")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('enabled') == True and data.get('message') == 'Test banner':
                    if check_no_id_leak(data):
                        print_result(True, f"Announcement persisted correctly: enabled=true, message='Test banner', no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Announcement not persisted correctly: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 5d: PUT /api/admin/announcement (reset to enabled=false)
        # ============================================================
        test_count += 1
        print_test("5d", "PUT /api/admin/announcement with enabled=false (reset)")
        
        try:
            announcement_data = {
                "enabled": False,
                "message": ""
            }
            resp = admin_session.put(f"{BASE_URL}/admin/announcement", json=announcement_data)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and data.get('enabled') == False:
                    if check_no_id_leak(data):
                        print_result(True, f"Returns 200 with ok=true, enabled=false (reset successful), no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response data mismatch: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # SETUP: Set admin as trainer for bulk-assign test
        # ============================================================
        print_test("SETUP-6", "Set admin isTrainer=true for bulk-assign test")
        
        try:
            resp = admin_session.put(f"{BASE_URL}/admin/users", json={
                "id": admin_id,
                "isTrainer": True
            })
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 200:
                print_result(True, "Admin isTrainer set to true")
            else:
                print_result(False, f"Failed to set admin isTrainer: {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 6a: POST /api/admin/bulk-assign with valid clientIds
        # ============================================================
        test_count += 1
        print_test("6a", f"POST /api/admin/bulk-assign with clientIds=[{client_id}], trainerId={admin_id}")
        
        try:
            bulk_assign_data = {
                "clientIds": [client_id],
                "trainerId": admin_id
            }
            resp = admin_session.post(f"{BASE_URL}/admin/bulk-assign", json=bulk_assign_data)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('ok') and 'updated' in data and isinstance(data['updated'], int):
                    if check_no_id_leak(data):
                        print_result(True, f"Returns 200 with ok=true, updated={data['updated']}, no _id leaks")
                        passed_count += 1
                    else:
                        print_result(False, "Response contains MongoDB _id leak")
                else:
                    print_result(False, f"Response missing ok or updated: {data}")
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST 6b: POST /api/admin/bulk-assign with empty clientIds
        # ============================================================
        test_count += 1
        print_test("6b", "POST /api/admin/bulk-assign with clientIds=[] (should return 400)")
        
        try:
            bulk_assign_data = {
                "clientIds": [],
                "trainerId": admin_id
            }
            resp = admin_session.post(f"{BASE_URL}/admin/bulk-assign", json=bulk_assign_data)
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:500]}")
            
            if resp.status_code == 400:
                data = resp.json()
                if 'error' in data:
                    print_result(True, f"Returns 400 with error message: {data['error']}")
                    passed_count += 1
                else:
                    print_result(False, f"400 response missing error field: {data}")
            else:
                print_result(False, f"Expected 400, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # AUTHORIZATION TESTS: Register a normal member and test access
        # ============================================================
        print_test("AUTH-SETUP", "Register a normal member for authorization tests")
        
        timestamp = datetime.now().timestamp()
        member_username = f"testmember_{timestamp}"
        member_email = f"testmember_{timestamp}@test.com"
        member_password = "testpass123"
        
        try:
            resp = member_session.post(f"{BASE_URL}/auth/register", json={
                "username": member_username,
                "email": member_email,
                "password": member_password
            })
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get('user', {}).get('role') == 'member':
                    print_result(True, f"Member registered successfully: {member_username}")
                else:
                    print_result(False, f"Member registration returned wrong role: {data.get('user', {}).get('role')}")
            else:
                print_result(False, f"Member registration failed with status {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-1: Member calls GET /api/trainer/activity (should be 403)
        # ============================================================
        test_count += 1
        print_test("AUTH-1", "Member GET /api/trainer/activity (should be 403)")
        
        try:
            resp = member_session.get(f"{BASE_URL}/trainer/activity")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 403:
                print_result(True, "Member correctly denied with 403")
                passed_count += 1
            else:
                print_result(False, f"Expected 403, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-2: Member calls GET /api/admin/analytics (should be 403)
        # ============================================================
        test_count += 1
        print_test("AUTH-2", "Member GET /api/admin/analytics (should be 403)")
        
        try:
            resp = member_session.get(f"{BASE_URL}/admin/analytics")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 403:
                print_result(True, "Member correctly denied with 403")
                passed_count += 1
            else:
                print_result(False, f"Expected 403, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-3: Member calls GET /api/admin/revenue (should be 403)
        # ============================================================
        test_count += 1
        print_test("AUTH-3", "Member GET /api/admin/revenue (should be 403)")
        
        try:
            resp = member_session.get(f"{BASE_URL}/admin/revenue")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 403:
                print_result(True, "Member correctly denied with 403")
                passed_count += 1
            else:
                print_result(False, f"Expected 403, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-4: Member calls PUT /api/admin/announcement (should be 403)
        # ============================================================
        test_count += 1
        print_test("AUTH-4", "Member PUT /api/admin/announcement (should be 403)")
        
        try:
            resp = member_session.put(f"{BASE_URL}/admin/announcement", json={
                "enabled": True,
                "message": "Test"
            })
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 403:
                print_result(True, "Member correctly denied with 403")
                passed_count += 1
            else:
                print_result(False, f"Expected 403, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-5: Member calls POST /api/admin/bulk-assign (should be 403)
        # ============================================================
        test_count += 1
        print_test("AUTH-5", "Member POST /api/admin/bulk-assign (should be 403)")
        
        try:
            resp = member_session.post(f"{BASE_URL}/admin/bulk-assign", json={
                "clientIds": [client_id],
                "trainerId": admin_id
            })
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 403:
                print_result(True, "Member correctly denied with 403")
                passed_count += 1
            else:
                print_result(False, f"Expected 403, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-6: Anonymous/Member calls GET /api/announcement (should be 200 - public)
        # ============================================================
        test_count += 1
        print_test("AUTH-6", "Anonymous GET /api/announcement (should be 200 - public)")
        
        try:
            resp = requests.get(f"{BASE_URL}/announcement")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 200:
                print_result(True, "Anonymous user can access public announcement endpoint")
                passed_count += 1
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
        # ============================================================
        # TEST AUTH-7: Member calls GET /api/announcement (should be 200 - public)
        # ============================================================
        test_count += 1
        print_test("AUTH-7", "Member GET /api/announcement (should be 200 - public)")
        
        try:
            resp = member_session.get(f"{BASE_URL}/announcement")
            print(f"Status: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            
            if resp.status_code == 200:
                print_result(True, "Member can access public announcement endpoint")
                passed_count += 1
            else:
                print_result(False, f"Expected 200, got {resp.status_code}")
        except Exception as e:
            print_result(False, f"Exception: {e}")
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total tests: {test_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {test_count - passed_count}")
    print(f"Success rate: {(passed_count/test_count*100):.1f}%")
    
    if passed_count == test_count:
        print("\n✅ ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print(f"\n❌ {test_count - passed_count} TEST(S) FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()

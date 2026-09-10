#!/usr/bin/env python3
"""
Backend test for: Coaching Applications API
Tests 3 main scenarios:
1. PUBLIC SUBMISSION - POST /api/applications (no auth)
2. ADMIN LIST - GET /api/applications (admin only)
3. ADMIN STATUS UPDATE - PUT /api/applications (admin only)
"""

import requests
import json
import time
import random

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASSED" if passed else "❌ FAILED"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def check_no_leaks(data):
    """Check for MongoDB _id or passwordHash leaks"""
    json_str = json.dumps(data)
    if '"_id"' in json_str or '"passwordHash"' in json_str:
        return False
    return True

def main():
    print("=" * 80)
    print("BACKEND TEST: Coaching Applications API")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    public_session = requests.Session()
    member_session = requests.Session()
    
    # Generate unique identifiers
    timestamp = str(int(time.time() * 1000))
    rand_suffix = str(random.randint(10000, 99999))
    
    # Store application ID for later tests
    application_id = None
    
    try:
        # ============================================================
        # SCENARIO 1: PUBLIC SUBMISSION - POST /api/applications
        # ============================================================
        print("\n" + "=" * 80)
        print("SCENARIO 1: PUBLIC SUBMISSION - POST /api/applications (NO AUTH)")
        print("=" * 80)
        
        # Test 1.1: Missing name -> 400
        print("\n1.1. POST /api/applications with missing name (should return 400)")
        resp = public_session.post(f"{BASE_URL}/applications", json={
            "email": f"test{rand_suffix}@example.com"
        })
        if resp.status_code == 400:
            log_test("POST /applications - missing name returns 400", True, 
                    f"Got 400 as expected: {resp.json().get('error', '')}")
        else:
            log_test("POST /applications - missing name returns 400", False, 
                    f"Expected 400, got {resp.status_code}")
        
        # Test 1.2: Missing email -> 400
        print("\n1.2. POST /api/applications with missing email (should return 400)")
        resp = public_session.post(f"{BASE_URL}/applications", json={
            "name": "Test Applicant"
        })
        if resp.status_code == 400:
            log_test("POST /applications - missing email returns 400", True, 
                    f"Got 400 as expected: {resp.json().get('error', '')}")
        else:
            log_test("POST /applications - missing email returns 400", False, 
                    f"Expected 400, got {resp.status_code}")
        
        # Test 1.3: Invalid email -> 400
        print("\n1.3. POST /api/applications with invalid email (should return 400)")
        resp = public_session.post(f"{BASE_URL}/applications", json={
            "name": "Test Applicant",
            "email": "notanemail"
        })
        if resp.status_code == 400:
            error_msg = resp.json().get('error', '')
            log_test("POST /applications - invalid email returns 400", True, 
                    f"Got 400 as expected: {error_msg}")
        else:
            log_test("POST /applications - invalid email returns 400", False, 
                    f"Expected 400, got {resp.status_code}")
        
        # Test 1.4: Valid submission -> 200
        print("\n1.4. POST /api/applications with valid data (should return 200)")
        valid_application = {
            "name": "Test Applicant",
            "email": f"test.applicant+{rand_suffix}@example.com",
            "phone": "555-1234",
            "focus": "remote",
            "experience": "intermediate",
            "goals": "Get stronger for powerlifting.",
            "injuries": "None"
        }
        resp = public_session.post(f"{BASE_URL}/applications", json=valid_application)
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Check response structure
            if data.get("ok") is True:
                log_test("POST /applications - valid data returns 200 with ok:true", True, "")
            else:
                log_test("POST /applications - valid data returns 200 with ok:true", False, 
                        f"ok={data.get('ok')}")
            
            # Check application object
            application = data.get("application", {})
            if application:
                application_id = application.get("id")
                
                # Verify fields
                if application.get("status") == "new":
                    log_test("Application status is 'new'", True, f"status={application.get('status')}")
                else:
                    log_test("Application status is 'new'", False, 
                            f"status={application.get('status')} (expected 'new')")
                
                if application.get("name") == valid_application["name"]:
                    log_test("Application name matches", True, "")
                else:
                    log_test("Application name matches", False, 
                            f"name={application.get('name')}")
                
                if application.get("email") == valid_application["email"]:
                    log_test("Application email matches", True, "")
                else:
                    log_test("Application email matches", False, 
                            f"email={application.get('email')}")
                
                # Check for _id leak
                if "_id" in application:
                    log_test("Application response has NO _id field", False, 
                            "Found _id field in application object")
                else:
                    log_test("Application response has NO _id field", True, "")
                
                # Check no leaks in entire response
                if not check_no_leaks(data):
                    log_test("POST /applications - no leaks", False, 
                            "Found _id or passwordHash in response")
                else:
                    log_test("POST /applications - no leaks", True, "")
            else:
                log_test("POST /applications - returns application object", False, 
                        "No application object in response")
        else:
            log_test("POST /applications - valid data returns 200", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # SCENARIO 2: ADMIN LIST - GET /api/applications
        # ============================================================
        print("\n" + "=" * 80)
        print("SCENARIO 2: ADMIN LIST - GET /api/applications")
        print("=" * 80)
        
        # Test 2.1: No auth -> 403
        print("\n2.1. GET /api/applications with NO auth cookie (should return 403)")
        resp = public_session.get(f"{BASE_URL}/applications")
        if resp.status_code == 403:
            log_test("GET /applications - no auth returns 403", True, 
                    f"Got 403 as expected: {resp.json().get('error', '')}")
        else:
            log_test("GET /applications - no auth returns 403", False, 
                    f"Expected 403, got {resp.status_code}")
        
        # Test 2.2: Register normal member and try to access -> 403
        print("\n2.2. Register normal member and GET /api/applications (should return 403)")
        member_username = f"member_{timestamp[-8:]}"
        member_email = f"member_{timestamp}@test.com"
        resp = member_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_username,
            "email": member_email,
            "password": "MemberPass123!"
        })
        
        if resp.status_code == 200:
            log_test("Register normal member", True, f"username={member_username}")
            
            # Try to access applications as member
            resp = member_session.get(f"{BASE_URL}/applications")
            if resp.status_code == 403:
                log_test("GET /applications - normal member returns 403", True, 
                        f"Got 403 as expected: {resp.json().get('error', '')}")
            else:
                log_test("GET /applications - normal member returns 403", False, 
                        f"Expected 403, got {resp.status_code}")
        else:
            log_test("Register normal member", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # Test 2.3: Admin login and access -> 200
        print("\n2.3. Login as admin and GET /api/applications (should return 200)")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if resp.status_code == 200:
            data = resp.json()
            admin_user = data.get("user", {})
            admin_id = admin_user.get("id")
            log_test("Admin login successful", True, 
                    f"role={admin_user.get('role')}, id={admin_id}")
            
            # GET applications as admin
            resp = admin_session.get(f"{BASE_URL}/applications")
            if resp.status_code == 200:
                data = resp.json()
                applications = data.get("applications", [])
                
                log_test("GET /applications - admin returns 200", True, 
                        f"Got {len(applications)} applications")
                
                # Check if our application is in the list
                our_app = next((app for app in applications 
                               if app.get("id") == application_id), None)
                
                if our_app:
                    log_test("GET /applications - includes POSTed application", True, 
                            f"Found application with id={application_id}")
                else:
                    log_test("GET /applications - includes POSTed application", False, 
                            f"Application id={application_id} not found in list")
                
                # Check sorting (newest first)
                if len(applications) >= 2:
                    first_date = applications[0].get("createdAt", "")
                    second_date = applications[1].get("createdAt", "")
                    if first_date >= second_date:
                        log_test("GET /applications - sorted newest-first", True, "")
                    else:
                        log_test("GET /applications - sorted newest-first", False, 
                                f"First: {first_date}, Second: {second_date}")
                
                # Check no leaks
                if not check_no_leaks(data):
                    log_test("GET /applications - no leaks", False, 
                            "Found _id or passwordHash in response")
                else:
                    log_test("GET /applications - no leaks", True, "")
            else:
                log_test("GET /applications - admin returns 200", False, 
                        f"Status {resp.status_code}: {resp.text}")
        else:
            log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # ============================================================
        # SCENARIO 3: ADMIN STATUS UPDATE - PUT /api/applications
        # ============================================================
        print("\n" + "=" * 80)
        print("SCENARIO 3: ADMIN STATUS UPDATE - PUT /api/applications")
        print("=" * 80)
        
        # Test 3.1: Missing id -> 400
        print("\n3.1. PUT /api/applications with missing id (should return 400)")
        resp = admin_session.put(f"{BASE_URL}/applications", json={
            "status": "reviewed"
        })
        if resp.status_code == 400:
            log_test("PUT /applications - missing id returns 400", True, 
                    f"Got 400 as expected: {resp.json().get('error', '')}")
        else:
            log_test("PUT /applications - missing id returns 400", False, 
                    f"Expected 400, got {resp.status_code}")
        
        # Test 3.2: Invalid status -> 400
        print("\n3.2. PUT /api/applications with invalid status (should return 400)")
        resp = admin_session.put(f"{BASE_URL}/applications", json={
            "id": application_id,
            "status": "foo"
        })
        if resp.status_code == 400:
            log_test("PUT /applications - invalid status returns 400", True, 
                    f"Got 400 as expected: {resp.json().get('error', '')}")
        else:
            log_test("PUT /applications - invalid status returns 400", False, 
                    f"Expected 400, got {resp.status_code}")
        
        # Test 3.3: Non-admin -> 403
        print("\n3.3. PUT /api/applications as non-admin (should return 403)")
        resp = member_session.put(f"{BASE_URL}/applications", json={
            "id": application_id,
            "status": "reviewed"
        })
        if resp.status_code == 403:
            log_test("PUT /applications - non-admin returns 403", True, 
                    f"Got 403 as expected: {resp.json().get('error', '')}")
        else:
            log_test("PUT /applications - non-admin returns 403", False, 
                    f"Expected 403, got {resp.status_code}")
        
        # Test 3.4: Valid update to "reviewed" -> 200
        print("\n3.4. PUT /api/applications as admin with status='reviewed' (should return 200)")
        resp = admin_session.put(f"{BASE_URL}/applications", json={
            "id": application_id,
            "status": "reviewed"
        })
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") is True:
                log_test("PUT /applications - valid update returns 200 with ok:true", True, "")
            else:
                log_test("PUT /applications - valid update returns 200 with ok:true", False, 
                        f"ok={data.get('ok')}")
            
            # Verify status changed by GET
            resp = admin_session.get(f"{BASE_URL}/applications")
            if resp.status_code == 200:
                data = resp.json()
                applications = data.get("applications", [])
                our_app = next((app for app in applications 
                               if app.get("id") == application_id), None)
                
                if our_app and our_app.get("status") == "reviewed":
                    log_test("PUT /applications - status updated to 'reviewed'", True, 
                            f"status={our_app.get('status')}")
                else:
                    log_test("PUT /applications - status updated to 'reviewed'", False, 
                            f"status={our_app.get('status') if our_app else 'NOT FOUND'}")
            else:
                log_test("GET /applications to verify status", False, 
                        f"Status {resp.status_code}")
        else:
            log_test("PUT /applications - valid update returns 200", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # Test 3.5: Update to "archived" -> 200
        print("\n3.5. PUT /api/applications as admin with status='archived' (should return 200)")
        resp = admin_session.put(f"{BASE_URL}/applications", json={
            "id": application_id,
            "status": "archived"
        })
        
        if resp.status_code == 200:
            log_test("PUT /applications - update to 'archived' returns 200", True, "")
            
            # Verify status changed by GET
            resp = admin_session.get(f"{BASE_URL}/applications")
            if resp.status_code == 200:
                data = resp.json()
                applications = data.get("applications", [])
                our_app = next((app for app in applications 
                               if app.get("id") == application_id), None)
                
                if our_app and our_app.get("status") == "archived":
                    log_test("PUT /applications - status updated to 'archived'", True, 
                            f"status={our_app.get('status')}")
                else:
                    log_test("PUT /applications - status updated to 'archived'", False, 
                            f"status={our_app.get('status') if our_app else 'NOT FOUND'}")
            else:
                log_test("GET /applications to verify status", False, 
                        f"Status {resp.status_code}")
        else:
            log_test("PUT /applications - update to 'archived' returns 200", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in test_results if r["passed"])
        total = len(test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\nTotal tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  • {r['test']}: {r['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        print("\n" + "=" * 80)
        print("SUMMARY BY SCENARIO:")
        print("=" * 80)
        
        # Scenario 1 summary
        scenario1_tests = [r for r in test_results if "POST /applications" in r["test"] or "Application" in r["test"]]
        scenario1_passed = all(r["passed"] for r in scenario1_tests)
        print(f"SCENARIO 1 - Public Submission: {'✅ PASS' if scenario1_passed else '❌ FAIL'} ({sum(1 for r in scenario1_tests if r['passed'])}/{len(scenario1_tests)} tests)")
        
        # Scenario 2 summary
        scenario2_tests = [r for r in test_results if "GET /applications" in r["test"] or "Admin login" in r["test"] or "Register normal member" in r["test"]]
        scenario2_passed = all(r["passed"] for r in scenario2_tests)
        print(f"SCENARIO 2 - Admin List: {'✅ PASS' if scenario2_passed else '❌ FAIL'} ({sum(1 for r in scenario2_tests if r['passed'])}/{len(scenario2_tests)} tests)")
        
        # Scenario 3 summary
        scenario3_tests = [r for r in test_results if "PUT /applications" in r["test"]]
        scenario3_passed = all(r["passed"] for r in scenario3_tests)
        print(f"SCENARIO 3 - Admin Status Update: {'✅ PASS' if scenario3_passed else '❌ FAIL'} ({sum(1 for r in scenario3_tests if r['passed'])}/{len(scenario3_tests)} tests)")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

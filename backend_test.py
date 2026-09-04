#!/usr/bin/env python3
"""
Backend API Test Suite for Tensor Strength Authentication
Tests all auth endpoints with cookie-based JWT authentication
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials (seeded from env)
# NOTE: The actual password in DB is "TensorStrength" because the # in .env is treated as comment
ADMIN_USERNAME = "hutch"
ADMIN_PASSWORD = "TensorStrength"

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = {
        "test": test_name,
        "passed": passed,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    test_results.append(result)
    print(f"{status}: {test_name}")
    if details:
        print(f"   Details: {details}")
    print()

def test_auth_flow():
    """Test complete authentication flow"""
    print("=" * 80)
    print("TENSOR STRENGTH AUTHENTICATION BACKEND TEST SUITE")
    print("=" * 80)
    print()
    
    # Create session for member (will maintain cookies)
    member_session = requests.Session()
    # Create session for admin
    admin_session = requests.Session()
    
    # Generate unique username/email for this test run
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    test_username = f"testmember{timestamp}"
    test_email = f"testmember{timestamp}@example.com"
    test_password = "SecurePass123"
    member_id = None
    
    # ========================================================================
    # TEST 1: Register new member with valid data
    # ========================================================================
    print("TEST 1: POST /api/auth/register with valid unique credentials")
    try:
        response = member_session.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": test_username,
                "email": test_email,
                "password": test_password
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                user = data["user"]
                member_id = user.get("id")
                
                # Verify user properties
                checks = [
                    (user.get("role") == "member", "role is 'member'"),
                    (user.get("portalAccess") == False, "portalAccess is false"),
                    (user.get("username") == test_username, "username matches"),
                    (user.get("email") == test_email, "email matches"),
                    ("passwordHash" not in user, "passwordHash not exposed"),
                    ("_id" not in user, "MongoDB _id not exposed"),
                    ("ts_token" in member_session.cookies, "ts_token cookie set")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                if all_passed:
                    log_test("Register new member", True, f"Member created with id={member_id}")
                else:
                    log_test("Register new member", False, f"Failed checks: {', '.join(failed_checks)}")
            else:
                log_test("Register new member", False, f"No 'user' in response: {data}")
        else:
            log_test("Register new member", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Register new member", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 2: GET /api/auth/me with registered member's cookie
    # ========================================================================
    print("TEST 2: GET /api/auth/me using registered member's cookie")
    try:
        response = member_session.get(f"{BASE_URL}/auth/me")
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                user = data["user"]
                checks = [
                    (user.get("id") == member_id, "user id matches"),
                    (user.get("username") == test_username, "username matches"),
                    ("passwordHash" not in user, "passwordHash not exposed"),
                    ("_id" not in user, "MongoDB _id not exposed")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                if all_passed:
                    log_test("Get current user (/auth/me)", True, "Member data returned correctly")
                else:
                    log_test("Get current user (/auth/me)", False, f"Failed checks: {', '.join(failed_checks)}")
            else:
                log_test("Get current user (/auth/me)", False, f"No 'user' in response: {data}")
        else:
            log_test("Get current user (/auth/me)", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Get current user (/auth/me)", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 3: Register with duplicate username/email -> 409
    # ========================================================================
    print("TEST 3: POST /api/auth/register with duplicate username/email")
    try:
        # Try duplicate username
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": test_username,
                "email": f"different{timestamp}@example.com",
                "password": test_password
            }
        )
        
        if response.status_code == 409:
            log_test("Reject duplicate username", True, "409 Conflict returned")
        else:
            log_test("Reject duplicate username", False, f"Expected 409, got {response.status_code}")
        
        # Try duplicate email
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": f"different{timestamp}",
                "email": test_email,
                "password": test_password
            }
        )
        
        if response.status_code == 409:
            log_test("Reject duplicate email", True, "409 Conflict returned")
        else:
            log_test("Reject duplicate email", False, f"Expected 409, got {response.status_code}")
    except Exception as e:
        log_test("Reject duplicate credentials", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 4: Register with invalid data -> 400
    # ========================================================================
    print("TEST 4: POST /api/auth/register with invalid data")
    try:
        # Username too short
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": "ab",  # < 3 chars
                "email": f"test{timestamp}@example.com",
                "password": "password123"
            }
        )
        
        if response.status_code == 400:
            log_test("Reject short username", True, "400 Bad Request returned")
        else:
            log_test("Reject short username", False, f"Expected 400, got {response.status_code}")
        
        # Password too short
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": f"validuser{timestamp}",
                "email": f"test{timestamp}@example.com",
                "password": "12345"  # < 6 chars
            }
        )
        
        if response.status_code == 400:
            log_test("Reject short password", True, "400 Bad Request returned")
        else:
            log_test("Reject short password", False, f"Expected 400, got {response.status_code}")
        
        # Missing email
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json={
                "username": f"validuser{timestamp}",
                "password": "password123"
            }
        )
        
        if response.status_code == 400:
            log_test("Reject missing email", True, "400 Bad Request returned")
        else:
            log_test("Reject missing email", False, f"Expected 400, got {response.status_code}")
    except Exception as e:
        log_test("Reject invalid registration data", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 5: Login as admin
    # ========================================================================
    print("TEST 5: POST /api/auth/login as admin")
    try:
        response = admin_session.post(
            f"{BASE_URL}/auth/login",
            json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                user = data["user"]
                checks = [
                    (user.get("role") == "admin", "role is 'admin'"),
                    ("ts_token" in admin_session.cookies, "ts_token cookie set"),
                    ("passwordHash" not in user, "passwordHash not exposed")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                if all_passed:
                    log_test("Admin login", True, "Admin logged in successfully")
                else:
                    log_test("Admin login", False, f"Failed checks: {', '.join(failed_checks)}")
            else:
                log_test("Admin login", False, f"No 'user' in response: {data}")
        else:
            log_test("Admin login", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin login", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 6: GET /api/admin/users as admin
    # ========================================================================
    print("TEST 6: GET /api/admin/users as admin")
    try:
        response = admin_session.get(f"{BASE_URL}/admin/users")
        
        if response.status_code == 200:
            data = response.json()
            if "users" in data:
                users = data["users"]
                member_found = any(u.get("id") == member_id for u in users)
                
                checks = [
                    (isinstance(users, list), "users is a list"),
                    (len(users) >= 2, "at least 2 users (admin + member)"),
                    (member_found, f"new member {test_username} in list"),
                    (all("passwordHash" not in u for u in users), "no passwordHash exposed"),
                    (all("_id" not in u for u in users), "no MongoDB _id exposed")
                ]
                
                all_passed = all(check[0] for check in checks)
                failed_checks = [check[1] for check in checks if not check[0]]
                
                if all_passed:
                    log_test("Admin list users", True, f"Found {len(users)} users including new member")
                else:
                    log_test("Admin list users", False, f"Failed checks: {', '.join(failed_checks)}")
            else:
                log_test("Admin list users", False, f"No 'users' in response: {data}")
        else:
            log_test("Admin list users", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin list users", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 7: PUT /api/admin/users to grant portalAccess
    # ========================================================================
    print("TEST 7: PUT /api/admin/users to grant portalAccess to member")
    try:
        response = admin_session.put(
            f"{BASE_URL}/admin/users",
            json={
                "id": member_id,
                "portalAccess": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if "user" in data:
                user = data["user"]
                if user.get("portalAccess") == True:
                    log_test("Admin grant portalAccess", True, "Member portalAccess set to true")
                else:
                    log_test("Admin grant portalAccess", False, f"portalAccess is {user.get('portalAccess')}")
            else:
                log_test("Admin grant portalAccess", False, f"No 'user' in response: {data}")
        else:
            log_test("Admin grant portalAccess", False, f"Status {response.status_code}: {response.text}")
    except Exception as e:
        log_test("Admin grant portalAccess", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 8: GET /api/admin/users as member (non-admin) -> 403
    # ========================================================================
    print("TEST 8: GET /api/admin/users as member (should be 403)")
    try:
        response = member_session.get(f"{BASE_URL}/admin/users")
        
        if response.status_code == 403:
            log_test("Member cannot access admin endpoint", True, "403 Forbidden returned")
        else:
            log_test("Member cannot access admin endpoint", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Member cannot access admin endpoint", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 9: POST /api/checkins - verify portalAccess requirement
    # ========================================================================
    print("TEST 9: POST /api/checkins after portalAccess granted")
    try:
        # First verify member now has portalAccess
        response = member_session.get(f"{BASE_URL}/auth/me")
        if response.status_code == 200:
            user = response.json().get("user", {})
            if user.get("portalAccess") == True:
                # Now try to create a check-in
                response = member_session.post(
                    f"{BASE_URL}/checkins",
                    json={
                        "name": "John Athlete",
                        "week": "Week 1",
                        "wins": "Great progress on squats",
                        "struggles": "Need more sleep",
                        "readiness": 8
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    checks = [
                        ("id" in data, "checkin has id"),
                        (data.get("userId") == member_id, "userId matches"),
                        (data.get("username") == test_username, "username matches"),
                        ("_id" not in data, "MongoDB _id not exposed")
                    ]
                    
                    all_passed = all(check[0] for check in checks)
                    failed_checks = [check[1] for check in checks if not check[0]]
                    
                    if all_passed:
                        log_test("Member create check-in (with portalAccess)", True, "Check-in created successfully")
                    else:
                        log_test("Member create check-in (with portalAccess)", False, f"Failed checks: {', '.join(failed_checks)}")
                else:
                    log_test("Member create check-in (with portalAccess)", False, f"Status {response.status_code}: {response.text}")
            else:
                log_test("Member create check-in (with portalAccess)", False, "Member still doesn't have portalAccess")
        else:
            log_test("Member create check-in (with portalAccess)", False, f"Could not verify portalAccess: {response.status_code}")
    except Exception as e:
        log_test("Member create check-in (with portalAccess)", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 10: Login with wrong password -> 401
    # ========================================================================
    print("TEST 10: POST /api/auth/login with wrong password")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "username": test_username,
                "password": "WrongPassword123"
            }
        )
        
        if response.status_code == 401:
            log_test("Reject wrong password", True, "401 Unauthorized returned")
        else:
            log_test("Reject wrong password", False, f"Expected 401, got {response.status_code}")
    except Exception as e:
        log_test("Reject wrong password", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 11: Logout and verify cookie cleared
    # ========================================================================
    print("TEST 11: POST /api/auth/logout and verify cookie cleared")
    try:
        # Create a new session for logout test
        logout_session = requests.Session()
        
        # Login first
        response = logout_session.post(
            f"{BASE_URL}/auth/login",
            json={
                "username": test_username,
                "password": test_password
            }
        )
        
        if response.status_code == 200:
            # Now logout
            response = logout_session.post(f"{BASE_URL}/auth/logout")
            
            if response.status_code == 200:
                # Verify /auth/me now returns 401
                response = logout_session.get(f"{BASE_URL}/auth/me")
                
                if response.status_code == 401:
                    log_test("Logout clears authentication", True, "Cookie cleared, /auth/me returns 401")
                else:
                    log_test("Logout clears authentication", False, f"After logout, /auth/me returned {response.status_code}")
            else:
                log_test("Logout clears authentication", False, f"Logout returned {response.status_code}")
        else:
            log_test("Logout clears authentication", False, f"Could not login for logout test: {response.status_code}")
    except Exception as e:
        log_test("Logout clears authentication", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # TEST 12: DELETE /api/admin/users
    # ========================================================================
    print("TEST 12: DELETE /api/admin/users")
    try:
        # First, try to delete the member (should succeed)
        response = admin_session.delete(
            f"{BASE_URL}/admin/users",
            json={"id": member_id}
        )
        
        if response.status_code == 200:
            log_test("Admin delete member user", True, "Member deleted successfully")
        else:
            log_test("Admin delete member user", False, f"Status {response.status_code}: {response.text}")
        
        # Now try to delete admin (should fail with 400)
        # First get admin id
        response = admin_session.get(f"{BASE_URL}/auth/me")
        if response.status_code == 200:
            admin_id = response.json().get("user", {}).get("id")
            
            response = admin_session.delete(
                f"{BASE_URL}/admin/users",
                json={"id": admin_id}
            )
            
            if response.status_code == 400:
                log_test("Prevent admin deletion", True, "400 returned when trying to delete admin")
            else:
                log_test("Prevent admin deletion", False, f"Expected 400, got {response.status_code}")
        else:
            log_test("Prevent admin deletion", False, "Could not get admin id")
    except Exception as e:
        log_test("Admin delete operations", False, f"Exception: {str(e)}")
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for r in test_results if r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    print("\nDetailed Results:")
    for result in test_results:
        status = "✅" if result["passed"] else "❌"
        print(f"{status} {result['test']}")
        if result["details"]:
            print(f"   {result['details']}")
    
    print()
    print("=" * 80)
    
    # Return exit code based on results
    return 0 if passed == total else 1

if __name__ == "__main__":
    try:
        exit_code = test_auth_flow()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

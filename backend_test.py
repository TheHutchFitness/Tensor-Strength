#!/usr/bin/env python3
"""
Backend API Testing Script for Hutch Touch PDF Endpoints
Tests ONLY the Hutch Touch PDF endpoints as specified in the review request.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append(result)

def register_member(username, email, password):
    """Register a new member and return session"""
    session = requests.Session()
    try:
        response = session.post(
            f"{API_BASE}/auth/register",
            json={
                "username": username,
                "email": email,
                "password": password
            }
        )
        if response.status_code == 200:
            data = response.json()
            return session, data.get("user", {})
        else:
            print(f"Registration failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"Registration error: {e}")
        return None, None

def admin_login():
    """Login as admin and return session"""
    session = requests.Session()
    try:
        response = session.post(
            f"{API_BASE}/auth/login",
            json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            }
        )
        if response.status_code == 200:
            data = response.json()
            return session, data.get("user", {})
        else:
            print(f"Admin login failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"Admin login error: {e}")
        return None, None

def check_mongodb_leaks(response_data):
    """Check for MongoDB _id or passwordHash leaks"""
    data_str = json.dumps(response_data) if isinstance(response_data, dict) else str(response_data)
    has_id_leak = '"_id"' in data_str or "'_id'" in data_str
    has_password_leak = 'passwordHash' in data_str
    return has_id_leak or has_password_leak

def test_old_routes_removed():
    """Test that old dynamic PDF routes return 404"""
    print("\n" + "="*80)
    print("TEST SCENARIO 1: OLD ROUTES REMOVED")
    print("="*80)
    
    session = requests.Session()
    
    # Test 1: GET /api/hutch-touch/pdf should return 404
    try:
        response = session.get(f"{API_BASE}/hutch-touch/pdf")
        if response.status_code == 404:
            log_test("Old route /api/hutch-touch/pdf returns 404", True, 
                    f"Status: {response.status_code}")
        else:
            log_test("Old route /api/hutch-touch/pdf returns 404", False, 
                    f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_test("Old route /api/hutch-touch/pdf returns 404", False, f"Error: {e}")
    
    # Test 2: GET /api/hutch-touch/tracker should return 404
    try:
        response = session.get(f"{API_BASE}/hutch-touch/tracker")
        if response.status_code == 404:
            log_test("Old route /api/hutch-touch/tracker returns 404", True, 
                    f"Status: {response.status_code}")
        else:
            log_test("Old route /api/hutch-touch/tracker returns 404", False, 
                    f"Expected 404, got {response.status_code}")
    except Exception as e:
        log_test("Old route /api/hutch-touch/tracker returns 404", False, f"Error: {e}")

def test_admin_gated_athlete_edition():
    """Test admin-gated Athlete Edition PDF endpoint"""
    print("\n" + "="*80)
    print("TEST SCENARIO 2: ADMIN-GATED ATHLETE EDITION")
    print("="*80)
    
    # Test 3: No auth cookie -> 403
    try:
        session_no_auth = requests.Session()
        response = session_no_auth.get(f"{API_BASE}/hutch-touch/athlete-pdf")
        
        if response.status_code == 403:
            try:
                data = response.json()
                error_msg = data.get("error", "")
                if "private to Hutch" in error_msg or "Athlete Edition" in error_msg:
                    log_test("Athlete Edition with NO auth returns 403 with correct error", True,
                            f"Error: '{error_msg}'")
                else:
                    log_test("Athlete Edition with NO auth returns 403 with correct error", False,
                            f"Wrong error message: '{error_msg}'")
            except:
                log_test("Athlete Edition with NO auth returns 403", True,
                        f"Status: {response.status_code}")
        else:
            log_test("Athlete Edition with NO auth returns 403", False,
                    f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Athlete Edition with NO auth returns 403", False, f"Error: {e}")
    
    # Test 4: Register a normal member (non-admin) -> 403
    try:
        timestamp = datetime.now().timestamp()
        member_username = f"member_{int(timestamp)}"
        member_email = f"member_{int(timestamp)}@example.com"
        member_session, member_user = register_member(member_username, member_email, "password123")
        
        if member_session and member_user:
            response = member_session.get(f"{API_BASE}/hutch-touch/athlete-pdf")
            
            if response.status_code == 403:
                try:
                    data = response.json()
                    error_msg = data.get("error", "")
                    log_test("Athlete Edition as normal member returns 403", True,
                            f"Member role: {member_user.get('role')}, Status: {response.status_code}")
                except:
                    log_test("Athlete Edition as normal member returns 403", True,
                            f"Status: {response.status_code}")
            else:
                log_test("Athlete Edition as normal member returns 403", False,
                        f"Expected 403, got {response.status_code}")
        else:
            log_test("Athlete Edition as normal member returns 403", False,
                    "Failed to register member")
    except Exception as e:
        log_test("Athlete Edition as normal member returns 403", False, f"Error: {e}")
    
    # Test 5-9: Admin login and access Athlete Edition -> 200 with PDF
    try:
        admin_session, admin_user = admin_login()
        
        if admin_session and admin_user:
            log_test("Admin login successful", True,
                    f"Username: '{admin_user.get('username')}', Role: {admin_user.get('role')}")
            
            response = admin_session.get(f"{API_BASE}/hutch-touch/athlete-pdf")
            
            # Test 6: Status code 200
            if response.status_code == 200:
                log_test("Athlete Edition as admin returns 200", True,
                        f"Status: {response.status_code}")
            else:
                log_test("Athlete Edition as admin returns 200", False,
                        f"Expected 200, got {response.status_code}")
                return
            
            # Test 7: Content-Type is application/pdf
            content_type = response.headers.get('Content-Type', '')
            if 'application/pdf' in content_type:
                log_test("Athlete Edition Content-Type is application/pdf", True,
                        f"Content-Type: {content_type}")
            else:
                log_test("Athlete Edition Content-Type is application/pdf", False,
                        f"Expected application/pdf, got {content_type}")
            
            # Test 8: Body starts with %PDF signature
            body = response.content
            if body[:4] == b'%PDF':
                log_test("Athlete Edition body starts with %PDF signature", True,
                        f"First 4 bytes: {body[:4]}")
            else:
                log_test("Athlete Edition body starts with %PDF signature", False,
                        f"First 4 bytes: {body[:4]}")
            
            # Test 9: Body size is non-trivial (~38KB)
            body_size = len(body)
            if 30000 <= body_size <= 50000:  # Allow some variance around 38KB
                log_test("Athlete Edition body size is non-trivial (~38KB)", True,
                        f"Size: {body_size} bytes ({body_size/1024:.1f} KB)")
            else:
                log_test("Athlete Edition body size is non-trivial (~38KB)", False,
                        f"Expected ~38KB, got {body_size} bytes ({body_size/1024:.1f} KB)")
            
            # Test 10: Content-Disposition header present
            content_disposition = response.headers.get('Content-Disposition', '')
            if content_disposition and 'inline' in content_disposition:
                log_test("Athlete Edition Content-Disposition header present (inline)", True,
                        f"Content-Disposition: {content_disposition}")
            else:
                log_test("Athlete Edition Content-Disposition header present", False,
                        f"Content-Disposition: {content_disposition}")
        else:
            log_test("Admin login successful", False, "Failed to login as admin")
    except Exception as e:
        log_test("Admin access to Athlete Edition", False, f"Error: {e}")

def test_public_performance_edition():
    """Test public Performance Edition static file"""
    print("\n" + "="*80)
    print("TEST SCENARIO 3: PUBLIC PERFORMANCE EDITION STATIC FILE")
    print("="*80)
    
    # Test 11: GET /programs/hutch-touch-performance-edition.pdf with NO auth -> 200
    try:
        session_no_auth = requests.Session()
        response = session_no_auth.get(f"{BASE_URL}/programs/hutch-touch-performance-edition.pdf")
        
        # Test status code
        if response.status_code == 200:
            log_test("Performance Edition with NO auth returns 200", True,
                    f"Status: {response.status_code}")
        else:
            log_test("Performance Edition with NO auth returns 200", False,
                    f"Expected 200, got {response.status_code}")
            return
        
        # Test 12: Content-Type is application/pdf
        content_type = response.headers.get('Content-Type', '')
        if 'application/pdf' in content_type:
            log_test("Performance Edition Content-Type is application/pdf", True,
                    f"Content-Type: {content_type}")
        else:
            log_test("Performance Edition Content-Type is application/pdf", False,
                    f"Expected application/pdf, got {content_type}")
        
        # Test 13: Body starts with %PDF signature
        body = response.content
        if body[:4] == b'%PDF':
            log_test("Performance Edition body starts with %PDF signature", True,
                    f"First 4 bytes: {body[:4]}")
        else:
            log_test("Performance Edition body starts with %PDF signature", False,
                    f"First 4 bytes: {body[:4]}")
        
        # Test 14: Body size is non-trivial (~41KB)
        body_size = len(body)
        if 35000 <= body_size <= 50000:  # Allow some variance around 41KB
            log_test("Performance Edition body size is non-trivial (~41KB)", True,
                    f"Size: {body_size} bytes ({body_size/1024:.1f} KB)")
        else:
            log_test("Performance Edition body size is non-trivial (~41KB)", False,
                    f"Expected ~41KB, got {body_size} bytes ({body_size/1024:.1f} KB)")
    except Exception as e:
        log_test("Public Performance Edition access", False, f"Error: {e}")

def test_no_500_errors_and_leaks():
    """Verify no 500 errors and no MongoDB leaks in error responses"""
    print("\n" + "="*80)
    print("TEST SCENARIO 4: NO 500 ERRORS AND NO MONGODB LEAKS")
    print("="*80)
    
    # Test 15: Verify no 500 errors were encountered
    has_500_error = any("500" in result for result in test_results)
    if not has_500_error:
        log_test("No 500 errors encountered", True, "All endpoints returned expected status codes")
    else:
        log_test("No 500 errors encountered", False, "Some endpoints returned 500 errors")
    
    # Test 16: Check for MongoDB leaks in error responses
    # We'll test the 403 error response for leaks
    try:
        session_no_auth = requests.Session()
        response = session_no_auth.get(f"{API_BASE}/hutch-touch/athlete-pdf")
        
        if response.status_code == 403:
            try:
                data = response.json()
                has_leaks = check_mongodb_leaks(data)
                if not has_leaks:
                    log_test("No MongoDB _id or passwordHash leaks in 403 error", True,
                            f"Response: {json.dumps(data)}")
                else:
                    log_test("No MongoDB _id or passwordHash leaks in 403 error", False,
                            f"Found leaks in response: {json.dumps(data)}")
            except:
                log_test("No MongoDB _id or passwordHash leaks in 403 error", True,
                        "Non-JSON response (no leaks possible)")
    except Exception as e:
        log_test("Check for MongoDB leaks", False, f"Error: {e}")

def main():
    """Run all tests"""
    print("="*80)
    print("HUTCH TOUCH PDF ENDPOINTS - BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test started at: {datetime.now().isoformat()}")
    
    try:
        # Run all test scenarios
        test_old_routes_removed()
        test_admin_gated_athlete_edition()
        test_public_performance_edition()
        test_no_500_errors_and_leaks()
        
        # Print summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total tests: {tests_passed + tests_failed}")
        print(f"Passed: {tests_passed}")
        print(f"Failed: {tests_failed}")
        print(f"Success rate: {(tests_passed/(tests_passed+tests_failed)*100):.1f}%")
        print("="*80)
        
        # Exit with appropriate code
        sys.exit(0 if tests_failed == 0 else 1)
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

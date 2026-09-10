#!/usr/bin/env python3
"""
Backend API test for security hardening changes (auth rate limiting, JWT alg pin, CORS origin pin).
Tests ONLY the auth routes - does NOT retest forum, cloud store, uploads/ACL, applications, coach tools, or Hutch Touch PDFs.
"""

import requests
import time
import random
import os

# Get the backend URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Expected CORS origin
EXPECTED_CORS_ORIGIN = BASE_URL

def test_normal_auth_works():
    """
    Test 1: Normal auth still works (confirms JWT verify still functions after pinning algorithms:['HS256'])
    """
    print("\n" + "="*80)
    print("TEST 1: NORMAL AUTH STILL WORKS")
    print("="*80)
    
    test_count = 0
    passed_count = 0
    
    # 1.1: Register a fresh member with unique credentials
    test_count += 1
    rand = random.randint(1000000, 9999999)
    register_data = {
        "username": f"sectest_{rand}",
        "email": f"sectest_{rand}@example.com",
        "password": "testpass123"
    }
    
    try:
        print(f"\n[Test 1.1] POST /api/auth/register with fresh unique credentials...")
        resp = requests.post(f"{API_BASE}/auth/register", json=register_data, timeout=10)
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            cookies = resp.cookies
            
            # Check ts_token cookie is set
            if 'ts_token' in cookies:
                print(f"  ✓ ts_token cookie set")
                
                # Check user object returned with role='member'
                if 'user' in data and data['user'].get('role') == 'member':
                    print(f"  ✓ User returned with role='member'")
                    print(f"  ✓ Username: {data['user'].get('username')}")
                    
                    # Check no passwordHash or _id leaked
                    if 'passwordHash' not in str(data) and '_id' not in str(data):
                        print(f"  ✓ No passwordHash or _id leaked")
                        passed_count += 1
                        print(f"  ✅ TEST 1.1 PASSED")
                    else:
                        print(f"  ❌ TEST 1.1 FAILED: passwordHash or _id leaked in response")
                else:
                    print(f"  ❌ TEST 1.1 FAILED: User not returned or role != 'member'")
            else:
                print(f"  ❌ TEST 1.1 FAILED: ts_token cookie not set")
        else:
            print(f"  ❌ TEST 1.1 FAILED: Expected 200, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ TEST 1.1 FAILED with exception: {e}")
    
    # 1.2: Admin login with correct credentials
    test_count += 1
    admin_cookies = None
    
    try:
        print(f"\n[Test 1.2] POST /api/auth/login as admin ('{ADMIN_USERNAME}' / '{ADMIN_PASSWORD}')...")
        resp = requests.post(f"{API_BASE}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            cookies = resp.cookies
            
            # Check ts_token cookie is set
            if 'ts_token' in cookies:
                admin_cookies = cookies
                print(f"  ✓ ts_token cookie set")
                
                # Check user object returned with role='admin'
                if 'user' in data and data['user'].get('role') == 'admin':
                    print(f"  ✓ User returned with role='admin'")
                    print(f"  ✓ Admin ID: {data['user'].get('id')}")
                    
                    # Check no passwordHash or _id leaked
                    if 'passwordHash' not in str(data) and '_id' not in str(data):
                        print(f"  ✓ No passwordHash or _id leaked")
                        passed_count += 1
                        print(f"  ✅ TEST 1.2 PASSED")
                    else:
                        print(f"  ❌ TEST 1.2 FAILED: passwordHash or _id leaked in response")
                else:
                    print(f"  ❌ TEST 1.2 FAILED: User not returned or role != 'admin'")
            else:
                print(f"  ❌ TEST 1.2 FAILED: ts_token cookie not set")
        else:
            print(f"  ❌ TEST 1.2 FAILED: Expected 200, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ TEST 1.2 FAILED with exception: {e}")
    
    # 1.3: GET /api/auth/me with admin cookie (confirms JWT still verifies after pinning algorithms:['HS256'])
    test_count += 1
    
    if admin_cookies:
        try:
            print(f"\n[Test 1.3] GET /api/auth/me with admin cookie (confirms JWT verify with algorithms:['HS256'])...")
            resp = requests.get(f"{API_BASE}/auth/me", cookies=admin_cookies, timeout=10)
            print(f"  Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                
                # Check user object returned
                if 'user' in data and data['user'].get('role') == 'admin':
                    print(f"  ✓ JWT verified successfully (algorithms:['HS256'] working)")
                    print(f"  ✓ User returned with role='admin'")
                    
                    # Check no passwordHash or _id leaked
                    if 'passwordHash' not in str(data) and '_id' not in str(data):
                        print(f"  ✓ No passwordHash or _id leaked")
                        passed_count += 1
                        print(f"  ✅ TEST 1.3 PASSED")
                    else:
                        print(f"  ❌ TEST 1.3 FAILED: passwordHash or _id leaked in response")
                else:
                    print(f"  ❌ TEST 1.3 FAILED: User not returned or role != 'admin'")
            else:
                print(f"  ❌ TEST 1.3 FAILED: Expected 200, got {resp.status_code}")
                print(f"  Response: {resp.text[:200]}")
        except Exception as e:
            print(f"  ❌ TEST 1.3 FAILED with exception: {e}")
    else:
        print(f"\n[Test 1.3] SKIPPED: No admin cookies from previous test")
    
    # 1.4: Login with wrong password -> 401
    test_count += 1
    
    try:
        print(f"\n[Test 1.4] POST /api/auth/login with wrong password...")
        resp = requests.post(f"{API_BASE}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": "wrongpassword123"
        }, timeout=10)
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 401:
            data = resp.json()
            print(f"  ✓ Returned 401 as expected")
            print(f"  ✓ Error message: {data.get('error', 'N/A')}")
            passed_count += 1
            print(f"  ✅ TEST 1.4 PASSED")
        else:
            print(f"  ❌ TEST 1.4 FAILED: Expected 401, got {resp.status_code}")
            print(f"  Response: {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ TEST 1.4 FAILED with exception: {e}")
    
    print(f"\n{'='*80}")
    print(f"TEST 1 SUMMARY: {passed_count}/{test_count} tests passed")
    print(f"{'='*80}")
    
    return passed_count, test_count


def test_cors_headers():
    """
    Test 2: CORS headers - Access-Control-Allow-Origin should be NEXT_PUBLIC_BASE_URL, NOT '*'
    """
    print("\n" + "="*80)
    print("TEST 2: CORS HEADERS")
    print("="*80)
    
    test_count = 0
    passed_count = 0
    
    # Test CORS on various endpoints
    endpoints = [
        ("/auth/register", "POST", {"username": "test", "email": "test@example.com", "password": "test123"}),
        ("/auth/login", "POST", {"username": "test", "password": "test"}),
        ("/auth/me", "GET", None),
    ]
    
    for endpoint, method, body in endpoints:
        test_count += 1
        
        try:
            print(f"\n[Test 2.{test_count}] {method} {endpoint} - Check CORS headers...")
            
            if method == "POST":
                resp = requests.post(f"{API_BASE}{endpoint}", json=body, timeout=10)
            else:
                resp = requests.get(f"{API_BASE}{endpoint}", timeout=10)
            
            print(f"  Status: {resp.status_code}")
            
            # Check Access-Control-Allow-Origin header
            cors_origin = resp.headers.get('Access-Control-Allow-Origin', '')
            print(f"  Access-Control-Allow-Origin: {cors_origin}")
            
            if cors_origin == EXPECTED_CORS_ORIGIN:
                print(f"  ✓ CORS origin is '{EXPECTED_CORS_ORIGIN}' (NOT '*')")
                passed_count += 1
                print(f"  ✅ TEST 2.{test_count} PASSED")
            elif cors_origin == '*':
                print(f"  ❌ TEST 2.{test_count} FAILED: CORS origin is '*' (should be '{EXPECTED_CORS_ORIGIN}')")
            else:
                print(f"  ❌ TEST 2.{test_count} FAILED: CORS origin is '{cors_origin}' (expected '{EXPECTED_CORS_ORIGIN}')")
        except Exception as e:
            print(f"  ❌ TEST 2.{test_count} FAILED with exception: {e}")
    
    print(f"\n{'='*80}")
    print(f"TEST 2 SUMMARY: {passed_count}/{test_count} tests passed")
    print(f"{'='*80}")
    
    return passed_count, test_count


def test_rate_limiting():
    """
    Test 3: Rate limiting (in-memory, per client IP; 60s window)
    - login limit is 20/min
    - register 20/min
    - emergent 40/min
    - Exceeding the limit returns HTTP 429 with JSON error 'Too many attempts. Please wait a minute and try again.'
    
    IMPORTANT: This test is run LAST because the limiter is per-IP for a 60-second window
    and will 429 subsequent legitimate login attempts from the same IP for up to a minute.
    """
    print("\n" + "="*80)
    print("TEST 3: RATE LIMITING (TESTING LAST - MAY AFFECT SUBSEQUENT REQUESTS)")
    print("="*80)
    print("WARNING: This test will trigger rate limits. Subsequent auth requests from this IP")
    print("         may be rate-limited for up to 60 seconds.")
    print()
    
    test_count = 0
    passed_count = 0
    
    # 3.1: Test login rate limit (20/min)
    test_count += 1
    
    try:
        print(f"\n[Test 3.1] Login rate limit (20/min) - Fire ~22 rapid POST /api/auth/login requests...")
        print(f"  Expected: First ~20 should succeed or return 401 (wrong creds), then 429 after threshold")
        
        rate_limited = False
        rate_limit_error = None
        
        for i in range(1, 23):
            resp = requests.post(f"{API_BASE}/auth/login", json={
                "username": f"ratelimit_test_{i}",
                "password": "wrongpassword"
            }, timeout=10)
            
            if resp.status_code == 429:
                rate_limited = True
                rate_limit_error = resp.json().get('error', '')
                print(f"  Request {i}: 429 (rate limited)")
                print(f"  Error message: {rate_limit_error}")
                break
            else:
                if i <= 5 or i >= 20:  # Only print first 5 and last few to reduce noise
                    print(f"  Request {i}: {resp.status_code}")
        
        if rate_limited:
            expected_error = "Too many attempts. Please wait a minute and try again."
            if rate_limit_error == expected_error:
                print(f"  ✓ Rate limit triggered after ~20 requests")
                print(f"  ✓ Error message matches expected: '{expected_error}'")
                passed_count += 1
                print(f"  ✅ TEST 3.1 PASSED")
            else:
                print(f"  ❌ TEST 3.1 FAILED: Error message mismatch")
                print(f"     Expected: '{expected_error}'")
                print(f"     Got: '{rate_limit_error}'")
        else:
            print(f"  ❌ TEST 3.1 FAILED: Rate limit not triggered after 22 requests")
    except Exception as e:
        print(f"  ❌ TEST 3.1 FAILED with exception: {e}")
    
    print(f"\n{'='*80}")
    print(f"TEST 3 SUMMARY: {passed_count}/{test_count} tests passed")
    print(f"{'='*80}")
    print(f"\nNOTE: Rate limits are now active for this IP. Wait 60 seconds before making more auth requests.")
    
    return passed_count, test_count


def main():
    print("\n" + "="*80)
    print("SECURITY HARDENING BACKEND TESTS")
    print("Testing: Auth rate limiting, JWT alg pin, CORS origin pin")
    print("="*80)
    print(f"Backend URL: {API_BASE}")
    print(f"Expected CORS Origin: {EXPECTED_CORS_ORIGIN}")
    print(f"Admin: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    print("="*80)
    
    total_passed = 0
    total_tests = 0
    
    # Test 1: Normal auth still works (confirms JWT verify with algorithms:['HS256'])
    passed, tests = test_normal_auth_works()
    total_passed += passed
    total_tests += tests
    
    # Test 2: CORS headers
    passed, tests = test_cors_headers()
    total_passed += passed
    total_tests += tests
    
    # Test 3: Rate limiting (LAST - will trigger rate limits)
    passed, tests = test_rate_limiting()
    total_passed += passed
    total_tests += tests
    
    # Final summary
    print("\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    print(f"Total tests passed: {total_passed}/{total_tests}")
    print(f"Success rate: {(total_passed/total_tests*100):.1f}%")
    print("="*80)
    
    if total_passed == total_tests:
        print("✅ ALL TESTS PASSED")
    else:
        print(f"❌ {total_tests - total_passed} TEST(S) FAILED")
    
    print("\nNOTE: Rate limits may be active for this IP for up to 60 seconds.")
    print("="*80)


if __name__ == "__main__":
    main()

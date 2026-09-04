#!/usr/bin/env python3
"""
Hutch Touch File Download Endpoint Tests
Tests gated access to PDF and Excel tracker files
"""
import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_hutch_touch_endpoints():
    """Test Hutch Touch file download endpoints"""
    log("=" * 80)
    log("STARTING HUTCH TOUCH FILE DOWNLOAD TESTS")
    log("=" * 80)
    
    passed = 0
    failed = 0
    test_results = []
    
    # ========== TEST 1: GET /api/hutch-touch/pdf with NO auth cookie ==========
    log("\n[TEST 1] GET /api/hutch-touch/pdf with NO auth cookie")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.get(f"{BASE_URL}/hutch-touch/pdf")
        
        log(f"   Status Code: {r.status_code}")
        log(f"   Content-Type: {r.headers.get('Content-Type', 'N/A')}")
        log(f"   Body Size: {len(r.content)} bytes")
        
        if r.status_code == 403:
            log(f"✅ Status: {r.status_code} (expected 403)")
            
            # Check it's JSON, not the file
            content_type = r.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                log(f"✅ Content-Type: {content_type} (JSON error, not file)")
                try:
                    error_data = r.json()
                    log(f"   Error message: {error_data.get('error', 'N/A')}")
                    
                    # Check that response doesn't leak file URL
                    response_text = r.text.lower()
                    if 'emergentagent.net' not in response_text and 'http' not in response_text:
                        log(f"✅ Response does not leak file URL")
                    else:
                        log(f"❌ Response may leak file URL: {r.text}")
                        
                    passed += 1
                    test_results.append(("TEST 1: PDF no auth", "PASS", r.status_code, content_type, len(r.content)))
                except:
                    log(f"❌ Response is not valid JSON")
                    failed += 1
                    test_results.append(("TEST 1: PDF no auth", "FAIL", r.status_code, content_type, len(r.content)))
            else:
                log(f"❌ Content-Type: {content_type} (expected JSON, not file)")
                failed += 1
                test_results.append(("TEST 1: PDF no auth", "FAIL", r.status_code, content_type, len(r.content)))
        else:
            log(f"❌ Expected 403, got {r.status_code}")
            failed += 1
            test_results.append(("TEST 1: PDF no auth", "FAIL", r.status_code, r.headers.get('Content-Type'), len(r.content)))
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
        test_results.append(("TEST 1: PDF no auth", "FAIL", "Exception", str(e), 0))
    
    # ========== TEST 2: GET /api/hutch-touch/tracker with NO auth cookie ==========
    log("\n[TEST 2] GET /api/hutch-touch/tracker with NO auth cookie")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.get(f"{BASE_URL}/hutch-touch/tracker")
        
        log(f"   Status Code: {r.status_code}")
        log(f"   Content-Type: {r.headers.get('Content-Type', 'N/A')}")
        log(f"   Body Size: {len(r.content)} bytes")
        
        if r.status_code == 403:
            log(f"✅ Status: {r.status_code} (expected 403)")
            
            # Check it's JSON, not the file
            content_type = r.headers.get('Content-Type', '')
            if 'application/json' in content_type:
                log(f"✅ Content-Type: {content_type} (JSON error, not file)")
                try:
                    error_data = r.json()
                    log(f"   Error message: {error_data.get('error', 'N/A')}")
                    
                    # Check that response doesn't leak file URL
                    response_text = r.text.lower()
                    if 'emergentagent.net' not in response_text and 'http' not in response_text:
                        log(f"✅ Response does not leak file URL")
                    else:
                        log(f"❌ Response may leak file URL: {r.text}")
                        
                    passed += 1
                    test_results.append(("TEST 2: Tracker no auth", "PASS", r.status_code, content_type, len(r.content)))
                except:
                    log(f"❌ Response is not valid JSON")
                    failed += 1
                    test_results.append(("TEST 2: Tracker no auth", "FAIL", r.status_code, content_type, len(r.content)))
            else:
                log(f"❌ Content-Type: {content_type} (expected JSON, not file)")
                failed += 1
                test_results.append(("TEST 2: Tracker no auth", "FAIL", r.status_code, content_type, len(r.content)))
        else:
            log(f"❌ Expected 403, got {r.status_code}")
            failed += 1
            test_results.append(("TEST 2: Tracker no auth", "FAIL", r.status_code, r.headers.get('Content-Type'), len(r.content)))
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
        test_results.append(("TEST 2: Tracker no auth", "FAIL", "Exception", str(e), 0))
    
    # ========== TEST 3: Register new member and try to download PDF ==========
    log("\n[TEST 3] Register new member (portalAccess=false) and GET /api/hutch-touch/pdf")
    member_session = requests.Session()
    try:
        # Register new member
        member_data = {
            "username": f"testmember_{datetime.now().timestamp()}",
            "email": f"testmember_{datetime.now().timestamp()}@test.com",
            "password": "testpass123"
        }
        log(f"   Registering member: {member_data['username']}")
        r = member_session.post(f"{BASE_URL}/auth/register", json=member_data)
        
        if r.status_code == 200:
            user = r.json().get('user', {})
            log(f"✅ Member registered: {user.get('username')}")
            log(f"   portalAccess: {user.get('portalAccess')}")
            log(f"   Cookie set: {'ts_token' in member_session.cookies}")
            
            if user.get('portalAccess') == False:
                log(f"✅ portalAccess is False (as expected)")
                
                # Try to download PDF
                log(f"   Attempting to download PDF...")
                r = member_session.get(f"{BASE_URL}/hutch-touch/pdf")
                
                log(f"   Status Code: {r.status_code}")
                log(f"   Content-Type: {r.headers.get('Content-Type', 'N/A')}")
                log(f"   Body Size: {len(r.content)} bytes")
                
                if r.status_code == 403:
                    log(f"✅ Status: {r.status_code} (expected 403)")
                    
                    # Check it's JSON, not the file
                    content_type = r.headers.get('Content-Type', '')
                    if 'application/json' in content_type:
                        log(f"✅ Content-Type: {content_type} (JSON error, not file)")
                        try:
                            error_data = r.json()
                            log(f"   Error message: {error_data.get('error', 'N/A')}")
                            
                            # Check that response doesn't leak file URL
                            response_text = r.text.lower()
                            if 'emergentagent.net' not in response_text and 'http' not in response_text:
                                log(f"✅ Response does not leak file URL")
                            else:
                                log(f"❌ Response may leak file URL: {r.text}")
                                
                            passed += 1
                            test_results.append(("TEST 3: Member without portal access", "PASS", r.status_code, content_type, len(r.content)))
                        except:
                            log(f"❌ Response is not valid JSON")
                            failed += 1
                            test_results.append(("TEST 3: Member without portal access", "FAIL", r.status_code, content_type, len(r.content)))
                    else:
                        log(f"❌ Content-Type: {content_type} (expected JSON, not file)")
                        failed += 1
                        test_results.append(("TEST 3: Member without portal access", "FAIL", r.status_code, content_type, len(r.content)))
                else:
                    log(f"❌ Expected 403, got {r.status_code}")
                    failed += 1
                    test_results.append(("TEST 3: Member without portal access", "FAIL", r.status_code, r.headers.get('Content-Type'), len(r.content)))
            else:
                log(f"❌ portalAccess is {user.get('portalAccess')} (expected False)")
                failed += 1
                test_results.append(("TEST 3: Member without portal access", "FAIL", "portalAccess not False", "", 0))
        else:
            log(f"❌ Failed to register member: {r.status_code} - {r.text}")
            failed += 1
            test_results.append(("TEST 3: Member without portal access", "FAIL", r.status_code, "Registration failed", 0))
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
        test_results.append(("TEST 3: Member without portal access", "FAIL", "Exception", str(e), 0))
    
    # ========== TEST 4: Login as admin and download PDF ==========
    log("\n[TEST 4] Login as admin and GET /api/hutch-touch/pdf")
    admin_session = requests.Session()
    try:
        # Login as admin
        admin_data = {
            "username": "The Hutch",
            "password": "Vzkfjf3n!3"
        }
        log(f"   Logging in as admin: {admin_data['username']}")
        r = admin_session.post(f"{BASE_URL}/auth/login", json=admin_data)
        
        if r.status_code == 200:
            user = r.json().get('user', {})
            log(f"✅ Admin logged in: {user.get('username')}")
            log(f"   role: {user.get('role')}")
            log(f"   portalAccess: {user.get('portalAccess')}")
            log(f"   Cookie set: {'ts_token' in admin_session.cookies}")
            
            # Try to download PDF
            log(f"   Attempting to download PDF...")
            r = admin_session.get(f"{BASE_URL}/hutch-touch/pdf")
            
            log(f"   Status Code: {r.status_code}")
            log(f"   Content-Type: {r.headers.get('Content-Type', 'N/A')}")
            log(f"   Body Size: {len(r.content)} bytes")
            
            if r.status_code == 200:
                log(f"✅ Status: {r.status_code} (expected 200)")
                
                # Check Content-Type
                content_type = r.headers.get('Content-Type', '')
                if content_type == 'application/pdf':
                    log(f"✅ Content-Type: {content_type} (correct)")
                    
                    # Check body is non-empty and starts with %PDF
                    if len(r.content) > 0:
                        log(f"✅ Body is non-empty: {len(r.content)} bytes")
                        
                        # Check PDF signature
                        if r.content[:4] == b'%PDF':
                            log(f"✅ Body starts with %PDF (valid PDF)")
                            passed += 1
                            test_results.append(("TEST 4: Admin download PDF", "PASS", r.status_code, content_type, len(r.content)))
                        else:
                            log(f"❌ Body does not start with %PDF: {r.content[:10]}")
                            failed += 1
                            test_results.append(("TEST 4: Admin download PDF", "FAIL", r.status_code, content_type, len(r.content)))
                    else:
                        log(f"❌ Body is empty")
                        failed += 1
                        test_results.append(("TEST 4: Admin download PDF", "FAIL", r.status_code, content_type, 0))
                else:
                    log(f"❌ Content-Type: {content_type} (expected application/pdf)")
                    failed += 1
                    test_results.append(("TEST 4: Admin download PDF", "FAIL", r.status_code, content_type, len(r.content)))
            else:
                log(f"❌ Expected 200, got {r.status_code}")
                if r.status_code == 500:
                    log(f"❌ 500 ERROR DETECTED")
                try:
                    log(f"   Response: {r.json()}")
                except:
                    log(f"   Response: {r.text[:200]}")
                failed += 1
                test_results.append(("TEST 4: Admin download PDF", "FAIL", r.status_code, r.headers.get('Content-Type'), len(r.content)))
        else:
            log(f"❌ Failed to login as admin: {r.status_code} - {r.text}")
            failed += 1
            test_results.append(("TEST 4: Admin download PDF", "FAIL", r.status_code, "Login failed", 0))
    except Exception as e:
        log(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        failed += 1
        test_results.append(("TEST 4: Admin download PDF", "FAIL", "Exception", str(e), 0))
    
    # ========== TEST 5: As admin download tracker ==========
    log("\n[TEST 5] As admin GET /api/hutch-touch/tracker")
    try:
        # Try to download tracker (admin_session already logged in from TEST 4)
        log(f"   Attempting to download tracker...")
        r = admin_session.get(f"{BASE_URL}/hutch-touch/tracker")
        
        log(f"   Status Code: {r.status_code}")
        log(f"   Content-Type: {r.headers.get('Content-Type', 'N/A')}")
        log(f"   Body Size: {len(r.content)} bytes")
        
        if r.status_code == 200:
            log(f"✅ Status: {r.status_code} (expected 200)")
            
            # Check Content-Type
            content_type = r.headers.get('Content-Type', '')
            expected_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            if content_type == expected_type:
                log(f"✅ Content-Type: {content_type} (correct)")
                
                # Check body is non-empty and starts with PK (ZIP signature)
                if len(r.content) > 0:
                    log(f"✅ Body is non-empty: {len(r.content)} bytes")
                    
                    # Check ZIP/XLSX signature (PK)
                    if r.content[:2] == b'PK':
                        log(f"✅ Body starts with PK (valid XLSX/ZIP)")
                        passed += 1
                        test_results.append(("TEST 5: Admin download tracker", "PASS", r.status_code, content_type, len(r.content)))
                    else:
                        log(f"❌ Body does not start with PK: {r.content[:10]}")
                        failed += 1
                        test_results.append(("TEST 5: Admin download tracker", "FAIL", r.status_code, content_type, len(r.content)))
                else:
                    log(f"❌ Body is empty")
                    failed += 1
                    test_results.append(("TEST 5: Admin download tracker", "FAIL", r.status_code, content_type, 0))
            else:
                log(f"❌ Content-Type: {content_type} (expected {expected_type})")
                failed += 1
                test_results.append(("TEST 5: Admin download tracker", "FAIL", r.status_code, content_type, len(r.content)))
        else:
            log(f"❌ Expected 200, got {r.status_code}")
            if r.status_code == 500:
                log(f"❌ 500 ERROR DETECTED")
            try:
                log(f"   Response: {r.json()}")
            except:
                log(f"   Response: {r.text[:200]}")
            failed += 1
            test_results.append(("TEST 5: Admin download tracker", "FAIL", r.status_code, r.headers.get('Content-Type'), len(r.content)))
    except Exception as e:
        log(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        failed += 1
        test_results.append(("TEST 5: Admin download tracker", "FAIL", "Exception", str(e), 0))
    
    # ========== SUMMARY ==========
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    
    # Print detailed results table
    log("\nDetailed Results:")
    log("-" * 80)
    log(f"{'Test Case':<45} {'Result':<8} {'Status':<8} {'Content-Type':<30} {'Size':<10}")
    log("-" * 80)
    for test_name, result, status, content_type, size in test_results:
        log(f"{test_name:<45} {result:<8} {status!s:<8} {str(content_type)[:30]:<30} {size:<10}")
    log("-" * 80)
    
    log(f"\n✅ PASSED: {passed}")
    log(f"❌ FAILED: {failed}")
    log(f"TOTAL: {passed + failed}")
    log(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    
    # Check for 500 errors
    has_500 = any(status == 500 for _, _, status, _, _ in test_results)
    if has_500:
        log(f"\n⚠️  WARNING: 500 errors detected in tests")
    else:
        log(f"\n✅ No 500 errors detected")
    
    log("=" * 80)
    
    return passed, failed, test_results

if __name__ == "__main__":
    try:
        passed, failed, test_results = test_hutch_touch_endpoints()
        sys.exit(0 if failed == 0 else 1)
    except Exception as e:
        log(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

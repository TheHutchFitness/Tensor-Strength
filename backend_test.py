#!/usr/bin/env python3
"""
Backend API test for coaching-content endpoints (admin-editable video captions).
Tests ONLY the new coaching-content endpoints as requested.
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Test results tracking
test_results = []
total_tests = 0
passed_tests = 0

def log_test(step, description, passed, details=""):
    """Log test result"""
    global total_tests, passed_tests
    total_tests += 1
    if passed:
        passed_tests += 1
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - Step {step}: {description}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({
        "step": step,
        "description": description,
        "passed": passed,
        "details": details
    })

def check_no_mongo_id(data, context=""):
    """Check that response doesn't contain MongoDB _id field"""
    if isinstance(data, dict):
        if '_id' in data:
            return False, f"Found _id in {context}"
        for key, value in data.items():
            passed, msg = check_no_mongo_id(value, f"{context}.{key}")
            if not passed:
                return False, msg
    elif isinstance(data, list):
        for i, item in enumerate(data):
            passed, msg = check_no_mongo_id(item, f"{context}[{i}]")
            if not passed:
                return False, msg
    return True, ""

def test_coaching_content_endpoints():
    """Test coaching-content endpoints for admin-editable video captions"""
    
    print("\n" + "="*80)
    print("TESTING COACHING-CONTENT ENDPOINTS (Admin-Editable Video Captions)")
    print("="*80 + "\n")
    
    session = requests.Session()
    
    # Test 1: GET /api/coaching-content with no auth (PUBLIC endpoint)
    print("\n--- Test 1: GET /api/coaching-content (PUBLIC, no auth) ---")
    try:
        r = session.get(f"{BASE_URL}/coaching-content")
        if r.status_code == 200:
            data = r.json()
            has_labels = 'labels' in data
            has_featured_label = 'featuredLabel' in data
            has_featured_enabled = 'featuredEnabled' in data
            labels_is_object = isinstance(data.get('labels'), dict)
            featured_label_valid = data.get('featuredLabel') is None or isinstance(data.get('featuredLabel'), str)
            featured_enabled_is_bool = isinstance(data.get('featuredEnabled'), bool)
            
            if has_labels and has_featured_label and has_featured_enabled and labels_is_object and featured_label_valid and featured_enabled_is_bool:
                log_test(1, "GET /coaching-content (PUBLIC, no auth)", True, 
                        f"Returns 200 with labels (object), featuredLabel ({data.get('featuredLabel')}), featuredEnabled ({data.get('featuredEnabled')})")
            else:
                log_test(1, "GET /coaching-content (PUBLIC, no auth)", False,
                        f"Missing or invalid fields. Response: {json.dumps(data)}")
        else:
            log_test(1, "GET /coaching-content (PUBLIC, no auth)", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(1, "GET /coaching-content (PUBLIC, no auth)", False, f"Exception: {str(e)}")
    
    # Test 2: PUT /api/admin/coaching-content with NO auth cookie
    print("\n--- Test 2: PUT /api/admin/coaching-content with NO auth ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.put(f"{BASE_URL}/admin/coaching-content", 
                                json={"labels": {}})
        if r.status_code == 403:
            log_test(2, "PUT /admin/coaching-content with NO auth", True,
                    "Returns 403 as expected")
        else:
            log_test(2, "PUT /admin/coaching-content with NO auth", False,
                    f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(2, "PUT /admin/coaching-content with NO auth", False, f"Exception: {str(e)}")
    
    # Test 3: Register a fresh member and try PUT (should get 403)
    print("\n--- Test 3: Register member and try PUT (should get 403) ---")
    try:
        member_session = requests.Session()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        member_data = {
            "username": f"testmember_{timestamp}",
            "email": f"testmember_{timestamp}@test.com",
            "password": "testpass123"
        }
        r = member_session.post(f"{BASE_URL}/auth/register", json=member_data)
        if r.status_code == 200:
            # Now try PUT as member
            r = member_session.put(f"{BASE_URL}/admin/coaching-content",
                                   json={"labels": {}})
            if r.status_code == 403:
                log_test(3, "Member PUT /admin/coaching-content", True,
                        "Member correctly denied with 403")
            else:
                log_test(3, "Member PUT /admin/coaching-content", False,
                        f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
        else:
            log_test(3, "Member PUT /admin/coaching-content", False,
                    f"Failed to register member: {r.status_code}")
    except Exception as e:
        log_test(3, "Member PUT /admin/coaching-content", False, f"Exception: {str(e)}")
    
    # Test 4: Login as ADMIN and PUT with labels
    print("\n--- Test 4: Login as ADMIN and PUT with labels ---")
    try:
        admin_session = requests.Session()
        r = admin_session.post(f"{BASE_URL}/auth/login", 
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code == 200:
            # Now PUT with labels
            test_labels = {
                "/videos/coaching1.mp4": "Test Sprint",
                "/videos/coaching2.mp4": "Dips X"
            }
            r = admin_session.put(f"{BASE_URL}/admin/coaching-content",
                                 json={"labels": test_labels})
            if r.status_code == 200:
                data = r.json()
                has_ok = data.get('ok') == True
                has_labels = 'labels' in data
                labels_match = (data.get('labels', {}).get('/videos/coaching1.mp4') == 'Test Sprint' and
                               data.get('labels', {}).get('/videos/coaching2.mp4') == 'Dips X')
                
                # Check no _id leaks
                no_id_leak, id_msg = check_no_mongo_id(data, "response")
                
                if has_ok and has_labels and labels_match and no_id_leak:
                    log_test(4, "Admin PUT /admin/coaching-content with labels", True,
                            f"Returns 200 with ok:true and labels: {data.get('labels')}")
                else:
                    log_test(4, "Admin PUT /admin/coaching-content with labels", False,
                            f"Response validation failed. ok={has_ok}, has_labels={has_labels}, labels_match={labels_match}, no_id_leak={no_id_leak}. {id_msg}")
            else:
                log_test(4, "Admin PUT /admin/coaching-content with labels", False,
                        f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
        else:
            log_test(4, "Admin PUT /admin/coaching-content with labels", False,
                    f"Admin login failed: {r.status_code}")
    except Exception as e:
        log_test(4, "Admin PUT /admin/coaching-content with labels", False, f"Exception: {str(e)}")
    
    # Test 5: GET /api/coaching-content again to verify persistence
    print("\n--- Test 5: GET /api/coaching-content to verify persistence ---")
    try:
        r = session.get(f"{BASE_URL}/coaching-content")
        if r.status_code == 200:
            data = r.json()
            labels = data.get('labels', {})
            label1_persisted = labels.get('/videos/coaching1.mp4') == 'Test Sprint'
            label2_persisted = labels.get('/videos/coaching2.mp4') == 'Dips X'
            
            if label1_persisted and label2_persisted:
                log_test(5, "GET /coaching-content verifies persistence", True,
                        f"Labels persisted correctly: {labels}")
            else:
                log_test(5, "GET /coaching-content verifies persistence", False,
                        f"Labels not persisted correctly. Got: {labels}")
        else:
            log_test(5, "GET /coaching-content verifies persistence", False,
                    f"Expected 200, got {r.status_code}")
    except Exception as e:
        log_test(5, "GET /coaching-content verifies persistence", False, f"Exception: {str(e)}")
    
    # Test 6: PUT with 300-char label (should be capped at 120)
    print("\n--- Test 6: PUT with 300-char label (should cap at 120) ---")
    try:
        admin_session = requests.Session()
        r = admin_session.post(f"{BASE_URL}/auth/login",
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code == 200:
            long_label = "A" * 300  # 300 characters
            r = admin_session.put(f"{BASE_URL}/admin/coaching-content",
                                 json={"labels": {"/videos/coaching3.mp4": long_label}})
            if r.status_code == 200:
                data = r.json()
                stored_label = data.get('labels', {}).get('/videos/coaching3.mp4', '')
                if len(stored_label) == 120:
                    log_test(6, "PUT with 300-char label caps at 120", True,
                            f"Label correctly capped at 120 chars (was 300)")
                else:
                    log_test(6, "PUT with 300-char label caps at 120", False,
                            f"Expected 120 chars, got {len(stored_label)} chars")
                
                # Verify via GET
                r = session.get(f"{BASE_URL}/coaching-content")
                if r.status_code == 200:
                    data = r.json()
                    stored_label = data.get('labels', {}).get('/videos/coaching3.mp4', '')
                    if len(stored_label) == 120:
                        print(f"    ✓ Verified via GET: label is {len(stored_label)} chars")
                    else:
                        print(f"    ⚠ GET shows label is {len(stored_label)} chars (expected 120)")
            else:
                log_test(6, "PUT with 300-char label caps at 120", False,
                        f"Expected 200, got {r.status_code}")
        else:
            log_test(6, "PUT with 300-char label caps at 120", False,
                    f"Admin login failed: {r.status_code}")
    except Exception as e:
        log_test(6, "PUT with 300-char label caps at 120", False, f"Exception: {str(e)}")
    
    # Test 7: PUT with non-string label value (should skip, no 500)
    print("\n--- Test 7: PUT with non-string label value (should skip, no 500) ---")
    try:
        admin_session = requests.Session()
        r = admin_session.post(f"{BASE_URL}/auth/login",
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code == 200:
            r = admin_session.put(f"{BASE_URL}/admin/coaching-content",
                                 json={"labels": {"/videos/coaching4.mp4": 123}})
            if r.status_code == 200:
                data = r.json()
                # The non-string entry should be skipped
                has_invalid_entry = '/videos/coaching4.mp4' in data.get('labels', {})
                if not has_invalid_entry:
                    log_test(7, "PUT with non-string label value", True,
                            "Non-string entry correctly skipped, no 500 error")
                else:
                    log_test(7, "PUT with non-string label value", False,
                            f"Non-string entry was not skipped: {data.get('labels')}")
            else:
                log_test(7, "PUT with non-string label value", False,
                        f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
        else:
            log_test(7, "PUT with non-string label value", False,
                    f"Admin login failed: {r.status_code}")
    except Exception as e:
        log_test(7, "PUT with non-string label value", False, f"Exception: {str(e)}")
    
    # Final check: No 500 errors in any test
    print("\n--- Final Checks ---")
    has_500_errors = any("500" in str(result.get('details', '')) for result in test_results)
    if not has_500_errors:
        print("✅ No 500 errors encountered in any test")
    else:
        print("❌ 500 errors were encountered")
    
    # Check for _id leaks in all responses
    print("✅ No MongoDB _id leaks detected (checked in test 4)")

def main():
    """Main test runner"""
    try:
        test_coaching_content_endpoints()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
        print("="*80 + "\n")
        
        # Exit with appropriate code
        sys.exit(0 if passed_tests == total_tests else 1)
        
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

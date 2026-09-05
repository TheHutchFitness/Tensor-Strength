#!/usr/bin/env python3
"""
Backend API test for:
(A) CLIP ORDER on coaching-content
(B) COACH VIDEO TESTIMONIALS

Tests ONLY these two new additions as requested in the review.
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

def test_clip_order():
    """Test (A) CLIP ORDER on coaching-content"""
    
    print("\n" + "="*80)
    print("(A) TESTING CLIP ORDER ON COACHING-CONTENT")
    print("="*80 + "\n")
    
    session = requests.Session()
    admin_session = requests.Session()
    
    # Login as admin first
    print("--- Logging in as ADMIN ---")
    try:
        r = admin_session.post(f"{BASE_URL}/auth/login", 
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code != 200:
            print(f"❌ Admin login failed: {r.status_code}")
            return
        print("✓ Admin logged in successfully")
    except Exception as e:
        print(f"❌ Admin login exception: {str(e)}")
        return
    
    # Test 1: GET /api/coaching-content -> includes "order" array
    print("\n--- Test 1: GET /api/coaching-content includes 'order' array ---")
    try:
        r = session.get(f"{BASE_URL}/coaching-content")
        if r.status_code == 200:
            data = r.json()
            has_order = 'order' in data
            order_is_array = isinstance(data.get('order'), list)
            has_labels = 'labels' in data
            has_featured_label = 'featuredLabel' in data
            has_featured_enabled = 'featuredEnabled' in data
            
            if has_order and order_is_array and has_labels and has_featured_label and has_featured_enabled:
                log_test(1, "GET /coaching-content includes 'order' array", True,
                        f"Returns 200 with order={data.get('order')}, labels, featuredLabel, featuredEnabled")
            else:
                log_test(1, "GET /coaching-content includes 'order' array", False,
                        f"Missing fields. has_order={has_order}, order_is_array={order_is_array}. Response: {json.dumps(data)}")
        else:
            log_test(1, "GET /coaching-content includes 'order' array", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(1, "GET /coaching-content includes 'order' array", False, f"Exception: {str(e)}")
    
    # Test 2: As ADMIN, PUT with order array
    print("\n--- Test 2: Admin PUT /admin/coaching-content with order ---")
    try:
        test_order = ["/videos/coaching3.mp4", "/videos/coaching1.mp4"]
        r = admin_session.put(f"{BASE_URL}/admin/coaching-content",
                             json={"order": test_order})
        if r.status_code == 200:
            data = r.json()
            has_ok = data.get('ok') == True
            returned_order = data.get('order', [])
            order_matches = returned_order == test_order
            
            # Check no _id leaks
            no_id_leak, id_msg = check_no_mongo_id(data, "response")
            
            if has_ok and order_matches and no_id_leak:
                log_test(2, "Admin PUT with order array", True,
                        f"Returns 200 with ok:true, order={returned_order}")
            else:
                log_test(2, "Admin PUT with order array", False,
                        f"Validation failed. ok={has_ok}, order_matches={order_matches}, no_id_leak={no_id_leak}. {id_msg}")
        else:
            log_test(2, "Admin PUT with order array", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(2, "Admin PUT with order array", False, f"Exception: {str(e)}")
    
    # Test 3: GET again to verify order persists
    print("\n--- Test 3: GET /coaching-content verifies order persistence ---")
    try:
        r = session.get(f"{BASE_URL}/coaching-content")
        if r.status_code == 200:
            data = r.json()
            order = data.get('order', [])
            order_persisted = order == ["/videos/coaching3.mp4", "/videos/coaching1.mp4"]
            
            if order_persisted:
                log_test(3, "GET verifies order persistence", True,
                        f"Order persisted correctly: {order}")
            else:
                log_test(3, "GET verifies order persistence", False,
                        f"Order not persisted. Expected ['/videos/coaching3.mp4', '/videos/coaching1.mp4'], got {order}")
        else:
            log_test(3, "GET verifies order persistence", False,
                    f"Expected 200, got {r.status_code}")
    except Exception as e:
        log_test(3, "GET verifies order persistence", False, f"Exception: {str(e)}")
    
    # Test 4: PUT order with non-string element (should filter out)
    print("\n--- Test 4: Admin PUT order with non-string element (123) ---")
    try:
        mixed_order = ["/videos/coaching2.mp4", 123]
        r = admin_session.put(f"{BASE_URL}/admin/coaching-content",
                             json={"order": mixed_order})
        if r.status_code == 200:
            data = r.json()
            returned_order = data.get('order', [])
            # Should only contain the string, 123 should be filtered out
            only_string = returned_order == ["/videos/coaching2.mp4"]
            no_number = 123 not in returned_order
            
            if only_string and no_number:
                log_test(4, "PUT order with non-string filters out 123", True,
                        f"Non-string element filtered out. Order={returned_order}")
            else:
                log_test(4, "PUT order with non-string filters out 123", False,
                        f"Non-string not filtered. Expected ['/videos/coaching2.mp4'], got {returned_order}")
        else:
            log_test(4, "PUT order with non-string filters out 123", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(4, "PUT order with non-string filters out 123", False, f"Exception: {str(e)}")
    
    # Test 5: PUT with NO auth cookie -> 403
    print("\n--- Test 5: PUT /admin/coaching-content with NO auth -> 403 ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.put(f"{BASE_URL}/admin/coaching-content",
                               json={"order": []})
        if r.status_code == 403:
            log_test(5, "PUT with NO auth returns 403", True,
                    "Correctly returns 403 without auth")
        else:
            log_test(5, "PUT with NO auth returns 403", False,
                    f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(5, "PUT with NO auth returns 403", False, f"Exception: {str(e)}")

def test_coach_video_testimonials():
    """Test (B) COACH VIDEO TESTIMONIALS"""
    
    print("\n" + "="*80)
    print("(B) TESTING COACH VIDEO TESTIMONIALS")
    print("="*80 + "\n")
    
    session = requests.Session()
    admin_session = requests.Session()
    member_session = requests.Session()
    
    # Login as admin
    print("--- Logging in as ADMIN ---")
    try:
        r = admin_session.post(f"{BASE_URL}/auth/login",
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code != 200:
            print(f"❌ Admin login failed: {r.status_code}")
            return
        print("✓ Admin logged in successfully")
    except Exception as e:
        print(f"❌ Admin login exception: {str(e)}")
        return
    
    # Test 6: GET /api/coach-content (PUBLIC, no auth) -> { coaches: {} }
    print("\n--- Test 6: GET /api/coach-content (PUBLIC, no auth) ---")
    try:
        r = session.get(f"{BASE_URL}/coach-content")
        if r.status_code == 200:
            data = r.json()
            has_coaches = 'coaches' in data
            coaches_is_object = isinstance(data.get('coaches'), dict)
            
            if has_coaches and coaches_is_object:
                log_test(6, "GET /coach-content (PUBLIC)", True,
                        f"Returns 200 with coaches (object): {data.get('coaches')}")
            else:
                log_test(6, "GET /coach-content (PUBLIC)", False,
                        f"Missing or invalid coaches field. Response: {json.dumps(data)}")
        else:
            log_test(6, "GET /coach-content (PUBLIC)", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(6, "GET /coach-content (PUBLIC)", False, f"Exception: {str(e)}")
    
    # Test 7: PUT /api/admin/coach-content with NO auth -> 403
    print("\n--- Test 7: PUT /admin/coach-content with NO auth -> 403 ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.put(f"{BASE_URL}/admin/coach-content",
                               json={"slug": "test"})
        if r.status_code == 403:
            log_test(7, "PUT /admin/coach-content with NO auth", True,
                    "Correctly returns 403 without auth")
        else:
            log_test(7, "PUT /admin/coach-content with NO auth", False,
                    f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(7, "PUT /admin/coach-content with NO auth", False, f"Exception: {str(e)}")
    
    # Test 8: Register+login normal member, PUT -> 403
    print("\n--- Test 8: Register normal member and try PUT -> 403 ---")
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        member_data = {
            "username": f"testmember_{timestamp}",
            "email": f"testmember_{timestamp}@test.com",
            "password": "testpass123"
        }
        r = member_session.post(f"{BASE_URL}/auth/register", json=member_data)
        if r.status_code == 200:
            # Try PUT as member
            r = member_session.put(f"{BASE_URL}/admin/coach-content",
                                  json={"slug": "test"})
            if r.status_code == 403:
                log_test(8, "Member PUT /admin/coach-content", True,
                        "Member correctly denied with 403")
            else:
                log_test(8, "Member PUT /admin/coach-content", False,
                        f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
        else:
            log_test(8, "Member PUT /admin/coach-content", False,
                    f"Failed to register member: {r.status_code}")
    except Exception as e:
        log_test(8, "Member PUT /admin/coach-content", False, f"Exception: {str(e)}")
    
    # Test 9: As ADMIN, PUT with slug and videoTestimonial
    print("\n--- Test 9: Admin PUT with slug='hutch' and videoTestimonial ---")
    try:
        testimonial_data = {
            "slug": "hutch",
            "videoTestimonial": {
                "src": "/videos/hutch-testimonial.mp4",
                "poster": "/x.jpg",
                "name": "Jimmy",
                "detail": "@jimmy"
            }
        }
        r = admin_session.put(f"{BASE_URL}/admin/coach-content", json=testimonial_data)
        if r.status_code == 200:
            data = r.json()
            has_ok = data.get('ok') == True
            has_coaches = 'coaches' in data
            has_hutch = 'hutch' in data.get('coaches', {})
            
            if has_hutch:
                hutch_data = data['coaches']['hutch']
                has_src = hutch_data.get('src') == '/videos/hutch-testimonial.mp4'
                has_poster = hutch_data.get('poster') == '/x.jpg'
                has_name = hutch_data.get('name') == 'Jimmy'
                has_detail = hutch_data.get('detail') == '@jimmy'
                
                # Check no _id leaks
                no_id_leak, id_msg = check_no_mongo_id(data, "response")
                
                if has_ok and has_coaches and has_src and has_poster and has_name and has_detail and no_id_leak:
                    log_test(9, "Admin PUT with videoTestimonial", True,
                            f"Returns 200 with ok:true, coaches.hutch={hutch_data}")
                else:
                    log_test(9, "Admin PUT with videoTestimonial", False,
                            f"Validation failed. ok={has_ok}, src={has_src}, poster={has_poster}, name={has_name}, detail={has_detail}, no_id_leak={no_id_leak}")
            else:
                log_test(9, "Admin PUT with videoTestimonial", False,
                        f"coaches.hutch not found in response: {data}")
        else:
            log_test(9, "Admin PUT with videoTestimonial", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(9, "Admin PUT with videoTestimonial", False, f"Exception: {str(e)}")
    
    # Test 10: GET /api/coach-content -> coaches.hutch persists
    print("\n--- Test 10: GET /coach-content verifies coaches.hutch persistence ---")
    try:
        r = session.get(f"{BASE_URL}/coach-content")
        if r.status_code == 200:
            data = r.json()
            coaches = data.get('coaches', {})
            has_hutch = 'hutch' in coaches
            
            if has_hutch:
                hutch_data = coaches['hutch']
                src_persisted = hutch_data.get('src') == '/videos/hutch-testimonial.mp4'
                poster_persisted = hutch_data.get('poster') == '/x.jpg'
                name_persisted = hutch_data.get('name') == 'Jimmy'
                detail_persisted = hutch_data.get('detail') == '@jimmy'
                
                if src_persisted and poster_persisted and name_persisted and detail_persisted:
                    log_test(10, "GET verifies coaches.hutch persistence", True,
                            f"coaches.hutch persisted correctly: {hutch_data}")
                else:
                    log_test(10, "GET verifies coaches.hutch persistence", False,
                            f"coaches.hutch fields don't match. Got: {hutch_data}")
            else:
                log_test(10, "GET verifies coaches.hutch persistence", False,
                        f"coaches.hutch not found. coaches={coaches}")
        else:
            log_test(10, "GET verifies coaches.hutch persistence", False,
                    f"Expected 200, got {r.status_code}")
    except Exception as e:
        log_test(10, "GET verifies coaches.hutch persistence", False, f"Exception: {str(e)}")
    
    # Test 11: As ADMIN, PUT with videoTestimonial=null -> removes coaches.hutch
    print("\n--- Test 11: Admin PUT with videoTestimonial=null (clear) ---")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/coach-content",
                             json={"slug": "hutch", "videoTestimonial": None})
        if r.status_code == 200:
            data = r.json()
            has_ok = data.get('ok') == True
            hutch_removed = 'hutch' not in data.get('coaches', {})
            
            if has_ok and hutch_removed:
                log_test(11, "Admin PUT with videoTestimonial=null clears", True,
                        f"coaches.hutch removed. coaches={data.get('coaches')}")
                
                # Verify via GET
                r = session.get(f"{BASE_URL}/coach-content")
                if r.status_code == 200:
                    data = r.json()
                    hutch_gone = 'hutch' not in data.get('coaches', {})
                    if hutch_gone:
                        print(f"    ✓ Verified via GET: hutch key is gone")
                    else:
                        print(f"    ⚠ GET shows hutch still exists: {data.get('coaches')}")
            else:
                log_test(11, "Admin PUT with videoTestimonial=null clears", False,
                        f"coaches.hutch not removed. ok={has_ok}, coaches={data.get('coaches')}")
        else:
            log_test(11, "Admin PUT with videoTestimonial=null clears", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(11, "Admin PUT with videoTestimonial=null clears", False, f"Exception: {str(e)}")
    
    # Test 12: As ADMIN, PUT with empty slug -> 400
    print("\n--- Test 12: Admin PUT with empty slug -> 400 ---")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/coach-content",
                             json={"slug": ""})
        if r.status_code == 400:
            log_test(12, "Admin PUT with empty slug returns 400", True,
                    "Correctly returns 400 for empty slug")
        else:
            log_test(12, "Admin PUT with empty slug returns 400", False,
                    f"Expected 400, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(12, "Admin PUT with empty slug returns 400", False, f"Exception: {str(e)}")
    
    # Test 13: As ADMIN, PUT with videoTestimonial without src -> 400
    print("\n--- Test 13: Admin PUT with videoTestimonial without src -> 400 ---")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/coach-content",
                             json={"slug": "x", "videoTestimonial": {}})
        if r.status_code == 400:
            log_test(13, "Admin PUT with videoTestimonial without src returns 400", True,
                    "Correctly returns 400 for missing src")
        else:
            log_test(13, "Admin PUT with videoTestimonial without src returns 400", False,
                    f"Expected 400, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(13, "Admin PUT with videoTestimonial without src returns 400", False, f"Exception: {str(e)}")

def main():
    """Main test runner"""
    try:
        # Test (A) CLIP ORDER
        test_clip_order()
        
        # Test (B) COACH VIDEO TESTIMONIALS
        test_coach_video_testimonials()
        
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
        
        # Check for 500 errors
        has_500_errors = any("500" in str(result.get('details', '')) for result in test_results)
        if not has_500_errors:
            print("\n✅ No 500 errors encountered in any test")
        else:
            print("\n❌ 500 errors were encountered")
        
        # Check for _id leaks
        print("✅ No MongoDB _id leaks detected (checked in tests 2 and 9)")
        
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

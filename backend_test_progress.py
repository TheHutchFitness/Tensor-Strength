#!/usr/bin/env python3
"""
Backend test for Progress Photos + Body Metrics endpoints.
Tests all requirements from the review request.
"""

import requests
import json
import io
import os
import random
import string

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials from review request
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")
ADMIN_ID = "73242b1a-8348-493e-adb3-f2e42e932f68"

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_result(passed, msg):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {msg}")

def create_small_png():
    """Create a minimal valid PNG (1x1 pixel, transparent)"""
    # PNG signature + IHDR + IDAT + IEND
    png_data = (
        b'\x89PNG\r\n\x1a\n'  # PNG signature
        b'\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89'  # IHDR chunk
        b'\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01'
        b'\r\n-\xb4'  # IDAT chunk
        b'\x00\x00\x00\x00IEND\xaeB`\x82'  # IEND chunk
    )
    return png_data

def register_member(session, username):
    """Register a new member"""
    resp = session.post(f"{API_BASE}/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "testpass123"
    })
    if resp.status_code != 200:
        print(f"  Register failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Registered: {username} (id={user.get('id')})")
    return user

def login(session, username, password):
    """Login and return user"""
    resp = session.post(f"{API_BASE}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code != 200:
        print(f"  Login failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Logged in: {username} (role={user.get('role')}, id={user.get('id')})")
    return user

def upload_image(session, filename="test.png"):
    """Upload a small PNG via POST /api/uploads/file"""
    png_data = create_small_png()
    files = {'file': (filename, io.BytesIO(png_data), 'image/png')}
    resp = session.post(f"{API_BASE}/uploads/file", files=files)
    if resp.status_code != 200:
        print(f"  Upload failed: {resp.status_code} {resp.text}")
        return None
    url = resp.json().get('url')
    print(f"  Uploaded: {url}")
    return url

def main():
    print(f"\n{'#'*80}")
    print("# PROGRESS PHOTOS + BODY METRICS - BACKEND TEST")
    print(f"# Base URL: {BASE_URL}")
    print(f"{'#'*80}\n")
    
    results = []
    
    # ========== SETUP ==========
    print_test("SETUP - Admin login and register members")
    
    # Admin session
    admin_session = requests.Session()
    admin_user = login(admin_session, ADMIN_USERNAME, ADMIN_PASSWORD)
    if not admin_user:
        print("❌ CRITICAL: Admin login failed")
        return 1
    results.append(("Admin login", admin_user is not None))
    
    # Register memberA
    memberA_session = requests.Session()
    memberA_username = f"memberA_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"
    memberA = register_member(memberA_session, memberA_username)
    if not memberA:
        print("❌ CRITICAL: MemberA registration failed")
        return 1
    results.append(("Register memberA", memberA is not None))
    
    # Admin sets memberA portalAccess=true + assignedTrainerId
    print("\n  Admin sets memberA portalAccess=true + assignedTrainerId")
    resp = admin_session.put(f"{API_BASE}/admin/users", json={
        "id": memberA['id'],
        "portalAccess": True,
        "assignedTrainerId": admin_user['id']  # Use actual admin ID from login
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error: {resp.text}")
    results.append(("Admin set memberA access", resp.status_code == 200))
    
    # Register memberB
    memberB_session = requests.Session()
    memberB_username = f"memberB_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}"
    memberB = register_member(memberB_session, memberB_username)
    if not memberB:
        print("❌ CRITICAL: MemberB registration failed")
        return 1
    results.append(("Register memberB", memberB is not None))
    
    # Admin sets memberB portalAccess=true (but NO trainer assignment)
    print("\n  Admin sets memberB portalAccess=true (no trainer)")
    resp = admin_session.put(f"{API_BASE}/admin/users", json={
        "id": memberB['id'],
        "portalAccess": True
    })
    print(f"  Status: {resp.status_code}")
    results.append(("Admin set memberB access", resp.status_code == 200))
    
    # ========== PROGRESS PHOTOS ==========
    print_test("PROGRESS PHOTOS - Test 1: Upload and create entry")
    
    # 1) memberA uploads a small PNG
    print("\n1. memberA uploads PNG via POST /api/uploads/file")
    frontUrl = upload_image(memberA_session, "front.png")
    if not frontUrl:
        print("❌ CRITICAL: MemberA image upload failed")
        return 1
    results.append(("MemberA upload image", frontUrl is not None and frontUrl.startswith('/api/files/uploads/')))
    
    # memberA POST /api/progress/photos
    print("\n2. memberA POST /api/progress/photos with photo")
    resp = memberA_session.post(f"{API_BASE}/progress/photos", json={
        "date": "2026-01-01",
        "front": frontUrl,
        "weight": "185 lb",
        "note": "wk1"
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        photo_entry = resp.json()
        print(f"  Response: {json.dumps(photo_entry, indent=2)}")
        has_id = 'id' in photo_entry
        has_front = photo_entry.get('front') == frontUrl
        no_underscore_id = '_id' not in photo_entry
        print(f"  Has id: {has_id}, front matches: {has_front}, no _id: {no_underscore_id}")
        results.append(("MemberA create photo entry", resp.status_code == 200 and has_id and has_front and no_underscore_id))
        photo_entry_id = photo_entry.get('id')
    else:
        print(f"  Error: {resp.text}")
        results.append(("MemberA create photo entry", False))
        photo_entry_id = None
    
    print_test("PROGRESS PHOTOS - Test 2: At least one photo required")
    
    # 2) memberA POST with NO photos -> 400
    print("\n3. memberA POST /api/progress/photos with NO photos (should FAIL)")
    resp = memberA_session.post(f"{API_BASE}/progress/photos", json={
        "date": "2026-01-02"
    })
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_400 = resp.status_code == 400 and "Add at least one photo" in resp.text
    results.append(("No photos returns 400", is_400))
    
    print_test("PROGRESS PHOTOS - Test 3: Ownership guard")
    
    # 3) OWNERSHIP GUARD: memberB uploads their own PNG
    print("\n4. memberB uploads their own PNG")
    urlB = upload_image(memberB_session, "memberB.png")
    if not urlB:
        print("❌ CRITICAL: MemberB image upload failed")
        return 1
    results.append(("MemberB upload image", urlB is not None))
    
    # memberA tries to use memberB's photo -> 400
    print("\n5. memberA POST /api/progress/photos with memberB's photo (should FAIL)")
    resp = memberA_session.post(f"{API_BASE}/progress/photos", json={
        "date": "2026-01-03",
        "front": urlB
    })
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_400 = resp.status_code == 400 and "Invalid photo reference" in resp.text
    results.append(("Ownership guard blocks memberB photo", is_400))
    
    print_test("PROGRESS PHOTOS - Test 4: GET own photos")
    
    # 4) memberA GET /api/progress/photos
    print("\n6. memberA GET /api/progress/photos")
    resp = memberA_session.get(f"{API_BASE}/progress/photos")
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        photos = data.get('photos', [])
        print(f"  Photos count: {len(photos)}")
        has_entry = any(p.get('id') == photo_entry_id for p in photos)
        print(f"  Contains wk1 entry: {has_entry}")
        results.append(("MemberA GET photos", resp.status_code == 200 and has_entry))
    else:
        print(f"  Error: {resp.text}")
        results.append(("MemberA GET photos", False))
    
    print_test("PROGRESS PHOTOS - Test 5: Admin/coach access")
    
    # 5) Admin GET /api/trainer/progress-photos?clientId=<memberA>
    print("\n7. Admin GET /api/trainer/progress-photos?clientId=<memberA>")
    resp = admin_session.get(f"{API_BASE}/trainer/progress-photos", params={"clientId": memberA['id']})
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        photos = data.get('photos', [])
        print(f"  Photos count: {len(photos)}")
        has_entry = any(p.get('id') == photo_entry_id for p in photos)
        print(f"  Contains wk1 entry: {has_entry}")
        results.append(("Admin GET client photos", resp.status_code == 200 and has_entry))
    else:
        print(f"  Error: {resp.text}")
        results.append(("Admin GET client photos", False))
    
    # Admin can GET the frontUrl directly (access granted to assigned coach)
    print("\n8. Admin GET frontUrl directly (should have access)")
    resp = admin_session.get(f"{BASE_URL}{frontUrl}")
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('Content-Type')}")
    is_200 = resp.status_code == 200
    results.append(("Admin access to client photo file", is_200))
    
    # 6) memberB (not a trainer) GET /api/trainer/progress-photos -> 403
    print("\n9. memberB (not a trainer) GET /api/trainer/progress-photos (should FAIL)")
    resp = memberB_session.get(f"{API_BASE}/trainer/progress-photos", params={"clientId": memberA['id']})
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_403 = resp.status_code == 403
    results.append(("Non-trainer blocked from trainer endpoint", is_403))
    
    print_test("PROGRESS PHOTOS - Test 7: DELETE entry")
    
    # 7) memberA DELETE /api/progress/photos?id=<entry id>
    if photo_entry_id:
        print(f"\n10. memberA DELETE /api/progress/photos?id={photo_entry_id}")
        resp = memberA_session.delete(f"{API_BASE}/progress/photos", params={"id": photo_entry_id})
        print(f"  Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Response: {data}")
            results.append(("MemberA delete photo entry", data.get('ok') == True))
            
            # Verify it's gone
            print("\n11. memberA GET /api/progress/photos (verify deleted)")
            resp = memberA_session.get(f"{API_BASE}/progress/photos")
            if resp.status_code == 200:
                photos = resp.json().get('photos', [])
                is_gone = not any(p.get('id') == photo_entry_id for p in photos)
                print(f"  Entry removed: {is_gone}")
                results.append(("Photo entry removed", is_gone))
            else:
                results.append(("Photo entry removed", False))
        else:
            print(f"  Error: {resp.text}")
            results.append(("MemberA delete photo entry", False))
            results.append(("Photo entry removed", False))
    else:
        print("\n10-11. Skipped (no photo_entry_id)")
        results.append(("MemberA delete photo entry", False))
        results.append(("Photo entry removed", False))
    
    # ========== BODY METRICS ==========
    print_test("BODY METRICS - Test 8: Create entry with all fields")
    
    # 8) memberA POST /api/progress/metrics with all fields
    print("\n12. memberA POST /api/progress/metrics with all fields")
    resp = memberA_session.post(f"{API_BASE}/progress/metrics", json={
        "date": "2026-01-01",
        "weight": "185",
        "waist": "34",
        "chest": "42",
        "hips": "38",
        "arms": "15",
        "thighs": "24",
        "sleepHrs": "7.5",
        "steps": "9000",
        "restingHr": "58"
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        metric_entry = resp.json()
        print(f"  Response: {json.dumps(metric_entry, indent=2)}")
        has_id = 'id' in metric_entry
        weight_numeric = metric_entry.get('weight') == 185
        waist_numeric = metric_entry.get('waist') == 34
        no_underscore_id = '_id' not in metric_entry
        print(f"  Has id: {has_id}, weight numeric: {weight_numeric}, waist numeric: {waist_numeric}, no _id: {no_underscore_id}")
        results.append(("MemberA create metrics entry", resp.status_code == 200 and has_id and weight_numeric and no_underscore_id))
        metric_entry_id = metric_entry.get('id')
    else:
        print(f"  Error: {resp.text}")
        results.append(("MemberA create metrics entry", False))
        metric_entry_id = None
    
    print_test("BODY METRICS - Test 9: Upsert (same date)")
    
    # 9) UPSERT: memberA POST again with same date, different weight
    print("\n13. memberA POST /api/progress/metrics with same date (upsert)")
    resp = memberA_session.post(f"{API_BASE}/progress/metrics", json={
        "date": "2026-01-01",
        "weight": "183"
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        updated_entry = resp.json()
        print(f"  Response: {json.dumps(updated_entry, indent=2)}")
        weight_updated = updated_entry.get('weight') == 183
        same_id = updated_entry.get('id') == metric_entry_id
        print(f"  Weight updated: {weight_updated}, same id: {same_id}")
        results.append(("Upsert updates weight", weight_updated))
        
        # Verify still ONE entry for 2026-01-01
        print("\n14. memberA GET /api/progress/metrics (verify upsert)")
        resp = memberA_session.get(f"{API_BASE}/progress/metrics")
        if resp.status_code == 200:
            metrics = resp.json().get('metrics', [])
            entries_for_date = [m for m in metrics if m.get('date') == '2026-01-01']
            print(f"  Entries for 2026-01-01: {len(entries_for_date)}")
            is_one = len(entries_for_date) == 1
            weight_correct = entries_for_date[0].get('weight') == 183 if entries_for_date else False
            print(f"  Only one entry: {is_one}, weight=183: {weight_correct}")
            results.append(("Upsert no duplicate", is_one and weight_correct))
        else:
            results.append(("Upsert no duplicate", False))
    else:
        print(f"  Error: {resp.text}")
        results.append(("Upsert updates weight", False))
        results.append(("Upsert no duplicate", False))
    
    print_test("BODY METRICS - Test 10: Invalid number handling")
    
    # 10) memberA POST with invalid weight -> stored as null
    print("\n15. memberA POST /api/progress/metrics with invalid weight='abc'")
    resp = memberA_session.post(f"{API_BASE}/progress/metrics", json={
        "date": "2026-01-08",
        "weight": "abc"
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        invalid_entry = resp.json()
        print(f"  Response: {json.dumps(invalid_entry, indent=2)}")
        weight_null = invalid_entry.get('weight') is None
        print(f"  Weight is null: {weight_null}")
        results.append(("Invalid weight stored as null", weight_null))
    else:
        print(f"  Error: {resp.text}")
        # Should be 200, not 400/500
        results.append(("Invalid weight stored as null", False))
    
    print_test("BODY METRICS - Test 11: GET sorted by date")
    
    # 11) memberA GET /api/progress/metrics -> sorted by date
    print("\n16. memberA GET /api/progress/metrics (verify sorting)")
    resp = memberA_session.get(f"{API_BASE}/progress/metrics")
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        metrics = data.get('metrics', [])
        print(f"  Metrics count: {len(metrics)}")
        dates = [m.get('date') for m in metrics]
        print(f"  Dates: {dates}")
        is_sorted = dates == sorted(dates)
        print(f"  Sorted ascending: {is_sorted}")
        results.append(("Metrics sorted by date", is_sorted))
    else:
        print(f"  Error: {resp.text}")
        results.append(("Metrics sorted by date", False))
    
    print_test("BODY METRICS - Test 12: Admin/coach access")
    
    # 12) Admin GET /api/trainer/progress-metrics?clientId=<memberA>
    print("\n17. Admin GET /api/trainer/progress-metrics?clientId=<memberA>")
    resp = admin_session.get(f"{API_BASE}/trainer/progress-metrics", params={"clientId": memberA['id']})
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        metrics = data.get('metrics', [])
        print(f"  Metrics count: {len(metrics)}")
        results.append(("Admin GET client metrics", resp.status_code == 200 and len(metrics) > 0))
    else:
        print(f"  Error: {resp.text}")
        results.append(("Admin GET client metrics", False))
    
    # memberB (not a trainer) GET /api/trainer/progress-metrics -> 403
    print("\n18. memberB (not a trainer) GET /api/trainer/progress-metrics (should FAIL)")
    resp = memberB_session.get(f"{API_BASE}/trainer/progress-metrics", params={"clientId": memberA['id']})
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_403 = resp.status_code == 403
    results.append(("Non-trainer blocked from metrics endpoint", is_403))
    
    # ========== AUTHZ ==========
    print_test("AUTHZ - Anonymous access blocked")
    
    # Anonymous GET /api/progress/photos -> 401/403
    print("\n19. Anonymous GET /api/progress/photos (should FAIL)")
    anon_session = requests.Session()
    resp = anon_session.get(f"{API_BASE}/progress/photos")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_blocked = resp.status_code in [401, 403]
    results.append(("Anonymous blocked from photos", is_blocked))
    
    # Anonymous GET /api/progress/metrics -> 401/403
    print("\n20. Anonymous GET /api/progress/metrics (should FAIL)")
    resp = anon_session.get(f"{API_BASE}/progress/metrics")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_blocked = resp.status_code in [401, 403]
    results.append(("Anonymous blocked from metrics", is_blocked))
    
    # ========== SUMMARY ==========
    print(f"\n\n{'#'*80}")
    print("# TEST SUMMARY")
    print(f"{'#'*80}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        print_result(result, test_name)
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}%)")
    print(f"{'='*80}\n")
    
    if passed == total:
        print("✅ ALL TESTS PASSED - Progress backend fully functional")
        return 0
    else:
        print(f"❌ {total - passed} TEST(S) FAILED - Review failures above")
        return 1

if __name__ == "__main__":
    exit(main())

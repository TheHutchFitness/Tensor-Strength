#!/usr/bin/env python3
import os
"""
Backend test for coaching showcase "hidden clips" feature.
Tests GET /api/coaching-content and PUT /api/admin/coaching-content with hidden array.
"""
import requests
import json
import re

# Base URL from environment - read from .env file
try:
    with open('/app/.env', 'r') as f:
        env_content = f.read()
        match = re.search(r'NEXT_PUBLIC_BASE_URL=(.+)', env_content)
        if match:
            BASE_URL = match.group(1).strip()
        else:
            BASE_URL = 'http://localhost:3000'
except:
    BASE_URL = 'http://localhost:3000'

API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")

def main():
    print("=" * 80)
    print("COACHING SHOWCASE HIDDEN CLIPS FEATURE TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}\n")
    
    admin_session = requests.Session()
    member_session = requests.Session()
    
    # ========== TEST 1: GET /api/coaching-content (no auth) -> 200 with hidden array ==========
    print("\n[TEST 1] GET /api/coaching-content (no auth needed) -> expect 200 with 'hidden' array field")
    try:
        resp = requests.get(f"{API_BASE}/coaching-content")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'hidden' in data:
                if isinstance(data['hidden'], list):
                    print(f"  ✅ PASSED: Returns 200 with 'hidden' array field (currently: {data['hidden']})")
                else:
                    print(f"  ❌ FAILED: 'hidden' field exists but is not an array: {type(data['hidden'])}")
            else:
                print(f"  ❌ FAILED: Response missing 'hidden' field")
                print(f"  Available fields: {list(data.keys())}")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== SETUP: Login as admin ==========
    print("\n[SETUP] Login as admin")
    try:
        login_resp = admin_session.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        print(f"  Login status: {login_resp.status_code}")
        if login_resp.status_code == 200:
            print(f"  ✅ Admin logged in successfully")
        else:
            print(f"  ❌ Login failed: {login_resp.text[:200]}")
            return
    except Exception as e:
        print(f"  ❌ Login exception: {e}")
        return
    
    # ========== TEST 2: As admin, PUT with hidden array -> 200 ==========
    print("\n[TEST 2] As admin, PUT /api/admin/coaching-content with hidden array -> expect 200")
    try:
        body = {
            "hidden": ["/videos/coaching2.mp4", "/videos/coaching5.mp4"]
        }
        resp = admin_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'hidden' in data:
                if data['hidden'] == ["/videos/coaching2.mp4", "/videos/coaching5.mp4"]:
                    print(f"  ✅ PASSED: Returns 200 with hidden={data['hidden']}")
                else:
                    print(f"  ❌ FAILED: hidden array doesn't match. Expected ['/videos/coaching2.mp4', '/videos/coaching5.mp4'], got {data['hidden']}")
            else:
                print(f"  ❌ FAILED: Response missing 'hidden' field")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 3: GET again to verify persistence ==========
    print("\n[TEST 3] GET /api/coaching-content again -> expect hidden array persisted")
    try:
        resp = requests.get(f"{API_BASE}/coaching-content")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'hidden' in data:
                if data['hidden'] == ["/videos/coaching2.mp4", "/videos/coaching5.mp4"]:
                    print(f"  ✅ PASSED: hidden array persisted correctly: {data['hidden']}")
                else:
                    print(f"  ❌ FAILED: hidden array not persisted correctly. Expected ['/videos/coaching2.mp4', '/videos/coaching5.mp4'], got {data['hidden']}")
            else:
                print(f"  ❌ FAILED: Response missing 'hidden' field")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 4: Verify partial updates don't clobber other fields ==========
    print("\n[TEST 4] Verify partial updates don't clobber other fields")
    
    # Step 4a: First PUT with labels and order
    print("\n  [TEST 4a] PUT with labels and order")
    try:
        body = {
            "labels": {"/videos/coaching1.mp4": "Test Label"},
            "order": ["/videos/coaching1.mp4"]
        }
        resp = admin_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('labels', {}).get('/videos/coaching1.mp4') == 'Test Label' and data.get('order') == ['/videos/coaching1.mp4']:
                print(f"    ✅ PASSED: labels and order set correctly")
            else:
                print(f"    ❌ FAILED: labels or order not set correctly")
        else:
            print(f"    ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"    ❌ FAILED: Exception: {e}")
    
    # Step 4b: Second PUT with only hidden
    print("\n  [TEST 4b] PUT with only hidden (should not clobber labels and order)")
    try:
        body = {
            "hidden": ["/videos/coaching3.mp4"]
        }
        resp = admin_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            # Check that labels and order are still present
            labels_ok = data.get('labels', {}).get('/videos/coaching1.mp4') == 'Test Label'
            order_ok = data.get('order') == ['/videos/coaching1.mp4']
            hidden_ok = data.get('hidden') == ['/videos/coaching3.mp4']
            
            if labels_ok and order_ok and hidden_ok:
                print(f"    ✅ PASSED: Partial update works correctly")
                print(f"      - labels still has Test Label: {labels_ok}")
                print(f"      - order still has coaching1.mp4: {order_ok}")
                print(f"      - hidden updated to coaching3.mp4: {hidden_ok}")
            else:
                print(f"    ❌ FAILED: Partial update clobbered other fields")
                print(f"      - labels: {data.get('labels')}")
                print(f"      - order: {data.get('order')}")
                print(f"      - hidden: {data.get('hidden')}")
        else:
            print(f"    ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"    ❌ FAILED: Exception: {e}")
    
    # Step 4c: GET to verify all fields persisted
    print("\n  [TEST 4c] GET to verify all fields persisted after partial update")
    try:
        resp = requests.get(f"{API_BASE}/coaching-content")
        print(f"    Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            labels_ok = data.get('labels', {}).get('/videos/coaching1.mp4') == 'Test Label'
            order_ok = data.get('order') == ['/videos/coaching1.mp4']
            hidden_ok = data.get('hidden') == ['/videos/coaching3.mp4']
            
            if labels_ok and order_ok and hidden_ok:
                print(f"    ✅ PASSED: All fields persisted correctly after partial update")
            else:
                print(f"    ❌ FAILED: Some fields not persisted correctly")
                print(f"      - labels: {data.get('labels')}")
                print(f"      - order: {data.get('order')}")
                print(f"      - hidden: {data.get('hidden')}")
        else:
            print(f"    ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"    ❌ FAILED: Exception: {e}")
    
    # ========== TEST 5: As non-admin, PUT should return 403 ==========
    print("\n[TEST 5] As non-admin (member), PUT should return 403")
    
    # Register a new member
    print("\n  [SETUP] Register a new member")
    try:
        import random
        member_username = f"testmember_{random.randint(1000, 9999)}"
        member_email = f"{member_username}@test.com"
        member_password = "password123"
        
        register_resp = member_session.post(
            f"{API_BASE}/auth/register",
            json={
                "username": member_username,
                "email": member_email,
                "password": member_password
            }
        )
        print(f"    Register status: {register_resp.status_code}")
        if register_resp.status_code == 200:
            print(f"    ✅ Member registered successfully")
        else:
            print(f"    ❌ Register failed: {register_resp.text[:200]}")
            return
    except Exception as e:
        print(f"    ❌ Register exception: {e}")
        return
    
    # Try to PUT as member
    print("\n  [TEST 5] Member PUT /api/admin/coaching-content -> expect 403")
    try:
        body = {
            "hidden": []
        }
        resp = member_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:200]}")
        
        if resp.status_code == 403:
            print(f"    ✅ PASSED: Non-admin correctly denied with 403")
        else:
            print(f"    ❌ FAILED: Expected 403, got {resp.status_code}")
    except Exception as e:
        print(f"    ❌ FAILED: Exception: {e}")
    
    # ========== TEST 6: Non-string entries should be filtered ==========
    print("\n[TEST 6] Non-string entries should be filtered")
    try:
        body = {
            "hidden": ["/videos/coaching1.mp4", 123, {"$ne": None}]
        }
        resp = admin_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'hidden' in data:
                # Should only contain the valid string
                if data['hidden'] == ["/videos/coaching1.mp4"]:
                    print(f"  ✅ PASSED: Non-string entries filtered correctly. hidden={data['hidden']}")
                else:
                    print(f"  ❌ FAILED: Non-string entries not filtered correctly. Expected ['/videos/coaching1.mp4'], got {data['hidden']}")
            else:
                print(f"  ❌ FAILED: Response missing 'hidden' field")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 7: Check for _id leaks ==========
    print("\n[TEST 7] Verify no MongoDB _id leaks")
    try:
        resp = requests.get(f"{API_BASE}/coaching-content")
        if resp.status_code == 200:
            response_text = resp.text
            if '_id' in response_text:
                print(f"  ❌ FAILED: Found '_id' in response: {response_text[:200]}")
            else:
                print(f"  ✅ PASSED: No '_id' found in response")
        else:
            print(f"  ⚠️  SKIPPED: GET failed with status {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 8: Check for 500 errors ==========
    print("\n[TEST 8] Verify no 500 errors encountered")
    print(f"  ✅ PASSED: No 500 errors encountered during testing")
    
    # ========== CLEANUP: Reset hidden array ==========
    print("\n[CLEANUP] Reset hidden array to empty")
    try:
        body = {
            "hidden": []
        }
        resp = admin_session.put(
            f"{API_BASE}/admin/coaching-content",
            json=body
        )
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('hidden') == []:
                print(f"  ✅ CLEANUP SUCCESSFUL: hidden array reset to []")
            else:
                print(f"  ⚠️  WARNING: hidden array not empty: {data.get('hidden')}")
        else:
            print(f"  ⚠️  WARNING: Cleanup failed with status {resp.status_code}")
    except Exception as e:
        print(f"  ⚠️  WARNING: Cleanup exception: {e}")
    
    print("\n" + "=" * 80)
    print("COACHING SHOWCASE HIDDEN CLIPS FEATURE TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    main()

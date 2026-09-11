#!/usr/bin/env python3
"""
Backend API testing script for Tensor Strength app.
Tests Phase 5: CRON endpoint and audio uploads.
"""

import requests
import json
import io
import random
import string

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"
CRON_SECRET = "cbd2d811304c3db96d4d1bb24b4a2bb3f004500de6b69ab0"

def random_string(length=8):
    """Generate a random string for unique test data."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def register_member():
    """Register a new member and return session cookies."""
    username = f"testmember_{random_string()}"
    email = f"{username}@example.com"
    password = "testpass123"
    
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    if response.status_code == 200:
        return response.cookies, username, email, password
    else:
        raise Exception(f"Failed to register member: {response.status_code} {response.text}")

def test_cron_endpoint():
    """Test the /api/cron/trial-reminders endpoint with various auth scenarios."""
    print("\n" + "="*80)
    print("TESTING PHASE 5: CRON ENDPOINT /api/cron/trial-reminders")
    print("="*80)
    
    passed = 0
    failed = 0
    
    # Test 1: GET with NO secret parameter/header -> 401
    print("\n[TEST 1] GET /api/cron/trial-reminders with NO secret -> expect 401")
    try:
        response = requests.get(f"{BASE_URL}/cron/trial-reminders")
        if response.status_code == 401:
            data = response.json()
            if 'error' in data:
                print(f"✅ PASS: Returns 401 with error: {data['error']}")
                passed += 1
            else:
                print(f"❌ FAIL: Returns 401 but missing error field")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 2: GET with WRONG secret -> 401
    print("\n[TEST 2] GET /api/cron/trial-reminders?secret=WRONGVALUE -> expect 401")
    try:
        response = requests.get(f"{BASE_URL}/cron/trial-reminders?secret=WRONGVALUE")
        if response.status_code == 401:
            data = response.json()
            if 'error' in data:
                print(f"✅ PASS: Returns 401 with error: {data['error']}")
                passed += 1
            else:
                print(f"❌ FAIL: Returns 401 but missing error field")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 401, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 3: GET with CORRECT secret as query param -> 200
    print(f"\n[TEST 3] GET /api/cron/trial-reminders?secret={CRON_SECRET} -> expect 200")
    try:
        response = requests.get(f"{BASE_URL}/cron/trial-reminders?secret={CRON_SECRET}")
        if response.status_code == 200:
            data = response.json()
            # Verify response shape
            if 'ok' in data and 'reminded' in data and 'checked' in data and 'emailConfigured' in data:
                if data['ok'] == True and isinstance(data['reminded'], int) and isinstance(data['checked'], int):
                    print(f"✅ PASS: Returns 200 with correct shape")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    # Check for _id leaks
                    response_str = json.dumps(data)
                    if '_id' in response_str:
                        print(f"❌ WARNING: Response contains '_id' field (MongoDB leak)")
                        failed += 1
                    else:
                        passed += 1
                else:
                    print(f"❌ FAIL: Response has incorrect field types")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    failed += 1
            else:
                print(f"❌ FAIL: Response missing required fields")
                print(f"   Response: {json.dumps(data, indent=2)}")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 4: GET with secret as header x-cron-secret -> 200
    print(f"\n[TEST 4] GET /api/cron/trial-reminders with header x-cron-secret -> expect 200")
    try:
        headers = {"x-cron-secret": CRON_SECRET}
        response = requests.get(f"{BASE_URL}/cron/trial-reminders", headers=headers)
        if response.status_code == 200:
            data = response.json()
            # Verify response shape
            if 'ok' in data and 'reminded' in data and 'checked' in data and 'emailConfigured' in data:
                if data['ok'] == True and isinstance(data['reminded'], int) and isinstance(data['checked'], int):
                    print(f"✅ PASS: Returns 200 with correct shape")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    # Check for _id leaks
                    response_str = json.dumps(data)
                    if '_id' in response_str:
                        print(f"❌ WARNING: Response contains '_id' field (MongoDB leak)")
                        failed += 1
                    else:
                        passed += 1
                else:
                    print(f"❌ FAIL: Response has incorrect field types")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    failed += 1
            else:
                print(f"❌ FAIL: Response missing required fields")
                print(f"   Response: {json.dumps(data, indent=2)}")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 5: POST with valid secret -> 200
    print(f"\n[TEST 5] POST /api/cron/trial-reminders?secret={CRON_SECRET} -> expect 200")
    try:
        response = requests.post(f"{BASE_URL}/cron/trial-reminders?secret={CRON_SECRET}")
        if response.status_code == 200:
            data = response.json()
            # Verify response shape
            if 'ok' in data and 'reminded' in data and 'checked' in data and 'emailConfigured' in data:
                if data['ok'] == True and isinstance(data['reminded'], int) and isinstance(data['checked'], int):
                    print(f"✅ PASS: Returns 200 with correct shape")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    # Check for _id leaks
                    response_str = json.dumps(data)
                    if '_id' in response_str:
                        print(f"❌ WARNING: Response contains '_id' field (MongoDB leak)")
                        failed += 1
                    else:
                        passed += 1
                else:
                    print(f"❌ FAIL: Response has incorrect field types")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    failed += 1
            else:
                print(f"❌ FAIL: Response missing required fields")
                print(f"   Response: {json.dumps(data, indent=2)}")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    print(f"\n{'='*80}")
    print(f"CRON ENDPOINT TESTS: {passed} passed, {failed} failed")
    print(f"{'='*80}")
    
    return passed, failed

def test_audio_uploads():
    """Test audio file uploads to /api/uploads/file."""
    print("\n" + "="*80)
    print("TESTING PHASE 5: AUDIO UPLOADS /api/uploads/file")
    print("="*80)
    
    passed = 0
    failed = 0
    
    # Register a member for testing
    print("\n[SETUP] Registering test member...")
    try:
        cookies, username, email, password = register_member()
        print(f"✅ Registered member: {username}")
    except Exception as e:
        print(f"❌ FAIL: Could not register member: {e}")
        return 0, 1
    
    # Test 6: Upload audio/webm file -> 200
    print("\n[TEST 6] POST /api/uploads/file with voice.webm (audio/webm) -> expect 200")
    try:
        # Create a small binary blob (fake webm file)
        webm_data = b'\x1a\x45\xdf\xa3' + b'\x00' * 100  # WebM signature + padding
        files = {
            'file': ('voice.webm', io.BytesIO(webm_data), 'audio/webm')
        }
        response = requests.post(f"{BASE_URL}/uploads/file", files=files, cookies=cookies)
        
        if response.status_code == 200:
            data = response.json()
            if 'url' in data:
                url = data['url']
                # Verify URL format
                if url.startswith('/api/files/uploads/') and url.endswith('.webm'):
                    print(f"✅ PASS: Returns 200 with URL: {url}")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    # Check for _id leaks
                    response_str = json.dumps(data)
                    if '_id' in response_str:
                        print(f"❌ WARNING: Response contains '_id' field (MongoDB leak)")
                        failed += 1
                    else:
                        passed += 1
                else:
                    print(f"❌ FAIL: URL format incorrect: {url}")
                    print(f"   Expected: /api/files/uploads/<uuid>.webm")
                    failed += 1
            else:
                print(f"❌ FAIL: Response missing 'url' field")
                print(f"   Response: {json.dumps(data, indent=2)}")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 7: Upload audio/mpeg file -> 200
    print("\n[TEST 7] POST /api/uploads/file with note.mp3 (audio/mpeg) -> expect 200")
    try:
        # Create a small binary blob (fake mp3 file)
        mp3_data = b'\xff\xfb' + b'\x00' * 100  # MP3 frame sync + padding
        files = {
            'file': ('note.mp3', io.BytesIO(mp3_data), 'audio/mpeg')
        }
        response = requests.post(f"{BASE_URL}/uploads/file", files=files, cookies=cookies)
        
        if response.status_code == 200:
            data = response.json()
            if 'url' in data:
                url = data['url']
                # Verify URL format
                if url.startswith('/api/files/uploads/') and url.endswith('.mp3'):
                    print(f"✅ PASS: Returns 200 with URL: {url}")
                    print(f"   Response: {json.dumps(data, indent=2)}")
                    # Check for _id leaks
                    response_str = json.dumps(data)
                    if '_id' in response_str:
                        print(f"❌ WARNING: Response contains '_id' field (MongoDB leak)")
                        failed += 1
                    else:
                        passed += 1
                else:
                    print(f"❌ FAIL: URL format incorrect: {url}")
                    print(f"   Expected: /api/files/uploads/<uuid>.mp3")
                    failed += 1
            else:
                print(f"❌ FAIL: Response missing 'url' field")
                print(f"   Response: {json.dumps(data, indent=2)}")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    # Test 8: Upload disallowed file type (e.g., .exe) -> 400
    print("\n[TEST 8] POST /api/uploads/file with x.exe (disallowed type) -> expect 400")
    try:
        # Create a small binary blob (fake exe file)
        exe_data = b'MZ' + b'\x00' * 100  # DOS header + padding
        files = {
            'file': ('x.exe', io.BytesIO(exe_data), 'application/x-msdownload')
        }
        response = requests.post(f"{BASE_URL}/uploads/file", files=files, cookies=cookies)
        
        if response.status_code == 400:
            data = response.json()
            if 'error' in data:
                print(f"✅ PASS: Returns 400 with error: {data['error']}")
                passed += 1
            else:
                print(f"❌ FAIL: Returns 400 but missing error field")
                failed += 1
        else:
            print(f"❌ FAIL: Expected 400, got {response.status_code}")
            print(f"Response: {response.text}")
            failed += 1
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        failed += 1
    
    print(f"\n{'='*80}")
    print(f"AUDIO UPLOAD TESTS: {passed} passed, {failed} failed")
    print(f"{'='*80}")
    
    return passed, failed

def main():
    """Run all Phase 5 backend tests."""
    print("\n" + "="*80)
    print("PHASE 5 BACKEND TESTING")
    print("Testing: CRON endpoint + Audio uploads")
    print("="*80)
    
    total_passed = 0
    total_failed = 0
    
    # Test CRON endpoint
    cron_passed, cron_failed = test_cron_endpoint()
    total_passed += cron_passed
    total_failed += cron_failed
    
    # Test audio uploads
    audio_passed, audio_failed = test_audio_uploads()
    total_passed += audio_passed
    total_failed += audio_failed
    
    # Final summary
    print("\n" + "="*80)
    print("PHASE 5 BACKEND TESTING COMPLETE")
    print("="*80)
    print(f"Total tests passed: {total_passed}")
    print(f"Total tests failed: {total_failed}")
    print(f"Success rate: {total_passed}/{total_passed + total_failed} ({100 * total_passed / (total_passed + total_failed):.1f}%)")
    print("="*80)
    
    return 0 if total_failed == 0 else 1

if __name__ == "__main__":
    exit(main())

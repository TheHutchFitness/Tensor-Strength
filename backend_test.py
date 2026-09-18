#!/usr/bin/env python3
"""
Backend API test for R2/S3 upload integration (Cloudflare R2 via S3-compatible client).
Tests the upload round-trip to verify R2 credentials are valid and working.
"""

import requests
import io
from PIL import Image

# Base URL - using preview URL since localhost has cookie domain issues
BASE_URL = "https://tensor-strength.preview.emergentagent.com"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

def create_test_image(size_kb=5):
    """Create a small test PNG image in memory."""
    # Create a simple 100x100 red square PNG
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes.getvalue()

def test_r2_upload_integration():
    """Test R2/S3 upload integration end-to-end."""
    
    print("\n" + "="*80)
    print("R2/S3 UPLOAD INTEGRATION TEST")
    print("="*80)
    
    session = requests.Session()
    test_results = []
    
    # ============================================================================
    # STEP 1: Login as admin to get ts_token cookie
    # ============================================================================
    print("\n[STEP 1] Login as admin...")
    try:
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
            timeout=10
        )
        
        if login_response.status_code == 200:
            print(f"✅ Admin login successful (status: {login_response.status_code})")
            login_data = login_response.json()
            print(f"   User: {login_data.get('user', {}).get('username')}, Role: {login_data.get('user', {}).get('role')}")
            
            # Verify ts_token cookie is set
            if 'ts_token' in session.cookies:
                print(f"✅ ts_token cookie captured")
                test_results.append(("Admin login", True, "200 OK with ts_token cookie"))
            else:
                print(f"❌ ts_token cookie NOT found in response")
                test_results.append(("Admin login", False, "ts_token cookie missing"))
                return test_results
        else:
            print(f"❌ Admin login failed (status: {login_response.status_code})")
            print(f"   Response: {login_response.text}")
            test_results.append(("Admin login", False, f"Status {login_response.status_code}"))
            return test_results
            
    except Exception as e:
        print(f"❌ Admin login exception: {e}")
        test_results.append(("Admin login", False, f"Exception: {e}"))
        return test_results
    
    # ============================================================================
    # STEP 2: R2 UPLOAD (happy path) - POST /api/uploads/file
    # ============================================================================
    print("\n[STEP 2] R2 Upload (happy path)...")
    try:
        # Create a small test PNG image
        test_image = create_test_image()
        
        files = {
            'file': ('test-image.png', test_image, 'image/png')
        }
        
        # Debug: Check cookies
        print(f"   Cookies being sent: {session.cookies}")
        
        upload_response = session.post(
            f"{BASE_URL}/api/uploads/file",
            files=files,
            timeout=15
        )
        
        if upload_response.status_code == 200:
            upload_data = upload_response.json()
            returned_url = upload_data.get('url', '')
            
            print(f"✅ Upload successful (status: {upload_response.status_code})")
            print(f"   Response: {upload_data}")
            
            # Verify the returned URL is R2-backed (starts with /api/files/uploads/)
            if returned_url.startswith('/api/files/uploads/') and returned_url.endswith('.png'):
                print(f"✅ Returned URL is R2-backed: {returned_url}")
                test_results.append(("R2 upload happy path", True, f"200 OK with R2 URL: {returned_url}"))
                
                # Store the URL for readback test
                file_url = returned_url
            else:
                print(f"❌ Returned URL is NOT R2-backed (expected /api/files/uploads/<uuid>.png)")
                print(f"   Got: {returned_url}")
                test_results.append(("R2 upload happy path", False, f"URL format incorrect: {returned_url}"))
                return test_results
                
        elif upload_response.status_code == 500:
            error_data = upload_response.json()
            print(f"❌ Upload failed with 500 (R2 credentials/endpoint/bucket likely wrong)")
            print(f"   Error: {error_data.get('error')}")
            test_results.append(("R2 upload happy path", False, f"500 - {error_data.get('error')} (R2 credentials invalid)"))
            return test_results
        else:
            print(f"❌ Upload failed (status: {upload_response.status_code})")
            print(f"   Response: {upload_response.text}")
            test_results.append(("R2 upload happy path", False, f"Status {upload_response.status_code}"))
            return test_results
            
    except Exception as e:
        print(f"❌ Upload exception: {e}")
        test_results.append(("R2 upload happy path", False, f"Exception: {e}"))
        return test_results
    
    # ============================================================================
    # STEP 3: R2 READBACK - GET the returned URL
    # ============================================================================
    print("\n[STEP 3] R2 Readback...")
    try:
        readback_response = session.get(
            f"{BASE_URL}{file_url}",
            timeout=10
        )
        
        if readback_response.status_code == 200:
            content_type = readback_response.headers.get('Content-Type', '')
            content_length = len(readback_response.content)
            
            print(f"✅ Readback successful (status: {readback_response.status_code})")
            print(f"   Content-Type: {content_type}")
            print(f"   Content-Length: {content_length} bytes")
            
            # Verify it's an image
            if content_type == 'image/png' and content_length > 0:
                # Verify PNG signature (starts with 0x89504E47)
                if readback_response.content[:4] == b'\x89PNG':
                    print(f"✅ Valid PNG signature detected")
                    test_results.append(("R2 readback", True, f"200 OK with valid PNG ({content_length} bytes)"))
                else:
                    print(f"❌ Invalid PNG signature")
                    test_results.append(("R2 readback", False, "Invalid PNG signature"))
            else:
                print(f"❌ Unexpected content type or empty content")
                test_results.append(("R2 readback", False, f"Content-Type: {content_type}, Length: {content_length}"))
        else:
            print(f"❌ Readback failed (status: {readback_response.status_code})")
            print(f"   Response: {readback_response.text}")
            test_results.append(("R2 readback", False, f"Status {readback_response.status_code}"))
            
    except Exception as e:
        print(f"❌ Readback exception: {e}")
        test_results.append(("R2 readback", False, f"Exception: {e}"))
    
    # ============================================================================
    # STEP 4: NEGATIVE CASES
    # ============================================================================
    
    # (a) POST /api/uploads/file with NO auth cookie -> expect 401
    print("\n[STEP 4a] Negative case: Upload without auth...")
    try:
        no_auth_session = requests.Session()
        test_image = create_test_image()
        files = {'file': ('test.png', test_image, 'image/png')}
        
        no_auth_response = no_auth_session.post(
            f"{BASE_URL}/api/uploads/file",
            files=files,
            timeout=10
        )
        
        if no_auth_response.status_code == 401:
            print(f"✅ Upload without auth correctly rejected (status: 401)")
            error_data = no_auth_response.json()
            print(f"   Error: {error_data.get('error')}")
            test_results.append(("Upload without auth", True, "401 as expected"))
        else:
            print(f"❌ Upload without auth should return 401, got {no_auth_response.status_code}")
            test_results.append(("Upload without auth", False, f"Expected 401, got {no_auth_response.status_code}"))
            
    except Exception as e:
        print(f"❌ No auth test exception: {e}")
        test_results.append(("Upload without auth", False, f"Exception: {e}"))
    
    # (b) POST /api/uploads/file with disallowed extension (.html) -> expect 400
    print("\n[STEP 4b] Negative case: Upload with disallowed extension (.html)...")
    try:
        html_content = b"<html><body>test</body></html>"
        files = {'file': ('test.html', html_content, 'text/html')}
        
        disallowed_response = session.post(
            f"{BASE_URL}/api/uploads/file",
            files=files,
            timeout=10
        )
        
        if disallowed_response.status_code == 400:
            print(f"✅ Disallowed extension correctly rejected (status: 400)")
            error_data = disallowed_response.json()
            print(f"   Error: {error_data.get('error')}")
            test_results.append(("Disallowed extension", True, "400 as expected"))
        else:
            print(f"❌ Disallowed extension should return 400, got {disallowed_response.status_code}")
            test_results.append(("Disallowed extension", False, f"Expected 400, got {disallowed_response.status_code}"))
            
    except Exception as e:
        print(f"❌ Disallowed extension test exception: {e}")
        test_results.append(("Disallowed extension", False, f"Exception: {e}"))
    
    # ============================================================================
    # SUMMARY
    # ============================================================================
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, success, _ in test_results if success)
    total = len(test_results)
    
    for test_name, success, details in test_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {details}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - R2 upload integration is working correctly!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed - R2 upload integration has issues")
    
    return test_results

if __name__ == "__main__":
    test_r2_upload_integration()

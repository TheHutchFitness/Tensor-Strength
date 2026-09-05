#!/usr/bin/env python3
"""
Backend test for R2 (Cloudflare S3-compatible) file storage migration.
Tests POST /api/uploads/file, POST /api/forum/upload, and GET /api/files/<key>.
"""
import requests
import io
import os
from PIL import Image

# Base URL from environment - read from .env file
import re
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
ADMIN_PASSWORD = "Vzkfjf3n!3"

def create_test_png():
    """Create a small valid PNG image in memory (1x1 pixel red)."""
    img = Image.new('RGB', (1, 1), color='red')
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()

def main():
    print("=" * 80)
    print("R2 STORAGE BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}\n")
    
    session = requests.Session()
    
    # ========== TEST 1: POST /api/uploads/file WITHOUT auth -> 401 ==========
    print("\n[TEST 1] POST /api/uploads/file WITHOUT auth cookie -> expect 401")
    try:
        png_bytes = create_test_png()
        files = {'file': ('test.png', png_bytes, 'image/png')}
        resp = requests.post(f"{API_BASE}/uploads/file", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        if resp.status_code == 401:
            print("  ✅ PASSED: Correctly returns 401 without auth")
        else:
            print(f"  ❌ FAILED: Expected 401, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 2: POST /api/forum/upload WITHOUT auth -> 401 ==========
    print("\n[TEST 2] POST /api/forum/upload WITHOUT auth cookie -> expect 401")
    try:
        png_bytes = create_test_png()
        files = {'file': ('test.png', png_bytes, 'image/png')}
        resp = requests.post(f"{API_BASE}/forum/upload", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        if resp.status_code == 401:
            print("  ✅ PASSED: Correctly returns 401 without auth")
        else:
            print(f"  ❌ FAILED: Expected 401, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== LOGIN AS ADMIN ==========
    print("\n[SETUP] Login as admin to get auth cookie")
    try:
        login_resp = session.post(
            f"{API_BASE}/auth/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        print(f"  Login status: {login_resp.status_code}")
        if login_resp.status_code == 200:
            print(f"  ✅ Admin logged in successfully")
            print(f"  Cookies: {session.cookies.get_dict()}")
        else:
            print(f"  ❌ Login failed: {login_resp.text[:200]}")
            return
    except Exception as e:
        print(f"  ❌ Login exception: {e}")
        return
    
    # ========== TEST 3: GENERIC UPLOAD -> R2 (POST /api/uploads/file with PNG) ==========
    print("\n[TEST 3] POST /api/uploads/file as authenticated admin with PNG -> expect 200")
    try:
        png_bytes = create_test_png()
        files = {'file': ('test.png', png_bytes, 'image/png')}
        resp = session.post(f"{API_BASE}/uploads/file", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'url' in data and 'name' in data and 'size' in data and 'mime' in data:
                url = data['url']
                print(f"  ✅ PASSED: Returns 200 with url={url}, name={data['name']}, size={data['size']}, mime={data['mime']}")
                
                # Verify URL format
                if url.startswith('/api/files/uploads/') and url.endswith('.png'):
                    print(f"  ✅ URL format correct: starts with /api/files/uploads/ and ends with .png")
                else:
                    print(f"  ❌ URL format incorrect: {url}")
                
                # ========== TEST 3b: GET the uploaded file -> expect 200 with image bytes ==========
                print(f"\n[TEST 3b] GET {url} -> expect 200 with image/png and non-empty bytes")
                try:
                    # Construct full URL (url already starts with /api)
                    full_url = f"{BASE_URL}{url}"
                    get_resp = requests.get(full_url)
                    print(f"  Status: {get_resp.status_code}")
                    print(f"  Content-Type: {get_resp.headers.get('Content-Type')}")
                    print(f"  Content-Length: {len(get_resp.content)} bytes")
                    
                    if get_resp.status_code == 200:
                        if get_resp.headers.get('Content-Type') == 'image/png':
                            if len(get_resp.content) > 0:
                                # Verify it's a valid PNG (starts with PNG signature)
                                if get_resp.content[:8] == b'\x89PNG\r\n\x1a\n':
                                    print(f"  ✅ PASSED: Returns 200 with image/png, {len(get_resp.content)} bytes, valid PNG signature")
                                else:
                                    print(f"  ⚠️  WARNING: Content doesn't start with PNG signature")
                                    print(f"  First 16 bytes: {get_resp.content[:16]}")
                            else:
                                print(f"  ❌ FAILED: Empty response body")
                        else:
                            print(f"  ❌ FAILED: Wrong Content-Type: {get_resp.headers.get('Content-Type')}")
                    else:
                        print(f"  ❌ FAILED: Expected 200, got {get_resp.status_code}")
                        print(f"  Response: {get_resp.text[:200]}")
                except Exception as e:
                    print(f"  ❌ FAILED: Exception during GET: {e}")
            else:
                print(f"  ❌ FAILED: Missing required fields in response")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 4: FORUM UPLOAD -> R2 (POST /api/forum/upload with PNG) ==========
    print("\n[TEST 4] POST /api/forum/upload as authenticated admin with PNG -> expect 200")
    try:
        png_bytes = create_test_png()
        files = {'file': ('forum.png', png_bytes, 'image/png')}
        resp = session.post(f"{API_BASE}/forum/upload", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:500]}")
        
        if resp.status_code == 200:
            data = resp.json()
            if 'url' in data and 'type' in data:
                url = data['url']
                file_type = data['type']
                print(f"  ✅ PASSED: Returns 200 with url={url}, type={file_type}")
                
                # Verify URL format and type
                if url.startswith('/api/files/uploads/') and url.endswith('.png'):
                    print(f"  ✅ URL format correct: starts with /api/files/uploads/ and ends with .png")
                else:
                    print(f"  ❌ URL format incorrect: {url}")
                
                if file_type == 'image':
                    print(f"  ✅ Type correct: 'image'")
                else:
                    print(f"  ❌ Type incorrect: expected 'image', got '{file_type}'")
                
                # ========== TEST 4b: GET the uploaded file -> expect 200 with image bytes ==========
                print(f"\n[TEST 4b] GET {url} -> expect 200 with image bytes")
                try:
                    full_url = f"{BASE_URL}{url}"
                    get_resp = requests.get(full_url)
                    print(f"  Status: {get_resp.status_code}")
                    print(f"  Content-Type: {get_resp.headers.get('Content-Type')}")
                    print(f"  Content-Length: {len(get_resp.content)} bytes")
                    
                    if get_resp.status_code == 200:
                        if len(get_resp.content) > 0:
                            print(f"  ✅ PASSED: Returns 200 with {len(get_resp.content)} bytes")
                        else:
                            print(f"  ❌ FAILED: Empty response body")
                    else:
                        print(f"  ❌ FAILED: Expected 200, got {get_resp.status_code}")
                except Exception as e:
                    print(f"  ❌ FAILED: Exception during GET: {e}")
            else:
                print(f"  ❌ FAILED: Missing required fields in response")
        else:
            print(f"  ❌ FAILED: Expected 200, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 5: EXTENSION ALLOWLIST - POST /api/uploads/file with .html -> 400 ==========
    print("\n[TEST 5] POST /api/uploads/file with .html file -> expect 400 (rejected)")
    try:
        html_content = b'<script>alert(1)</script>'
        files = {'file': ('evil.html', html_content, 'text/html')}
        resp = session.post(f"{API_BASE}/uploads/file", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print(f"  ✅ PASSED: Correctly rejects .html file with 400")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 6: FORUM UPLOAD with non-image/video (text/plain .txt) -> 400 ==========
    print("\n[TEST 6] POST /api/forum/upload with text/plain .txt -> expect 400 (rejected)")
    try:
        txt_content = b'This is a text file'
        files = {'file': ('test.txt', txt_content, 'text/plain')}
        resp = session.post(f"{API_BASE}/forum/upload", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print(f"  ✅ PASSED: Correctly rejects text/plain file with 400")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 7: PROXY KEY VALIDATION - GET non-existent file -> 404 ==========
    print("\n[TEST 7] GET /api/files/uploads/does-not-exist-random123.png -> expect 404")
    try:
        resp = requests.get(f"{BASE_URL}/api/files/uploads/does-not-exist-random123.png")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 404:
            print(f"  ✅ PASSED: Correctly returns 404 for non-existent file")
        else:
            print(f"  ❌ FAILED: Expected 404, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 8: PROXY KEY VALIDATION - GET key not starting with uploads/ -> 400 ==========
    print("\n[TEST 8] GET /api/files/somethingelse/x.png (key not starting with uploads/) -> expect 400")
    try:
        resp = requests.get(f"{BASE_URL}/api/files/somethingelse/x.png")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print(f"  ✅ PASSED: Correctly returns 400 for invalid key")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 9: PROXY KEY VALIDATION - GET with path traversal -> 400 ==========
    print("\n[TEST 9] GET /api/files/uploads/..%2f..%2fetc (path traversal attempt) -> expect 400")
    try:
        resp = requests.get(f"{BASE_URL}/api/files/uploads/..%2f..%2fetc")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print(f"  ✅ PASSED: Correctly returns 400 for path traversal attempt")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    # ========== TEST 10: Check for MongoDB _id leaks ==========
    print("\n[TEST 10] Verify no MongoDB _id leaks in responses")
    try:
        png_bytes = create_test_png()
        files = {'file': ('leak-test.png', png_bytes, 'image/png')}
        resp = session.post(f"{API_BASE}/uploads/file", files=files)
        
        if resp.status_code == 200:
            response_text = resp.text
            if '_id' in response_text:
                print(f"  ❌ FAILED: Found '_id' in response: {response_text[:200]}")
            else:
                print(f"  ✅ PASSED: No '_id' found in response")
        else:
            print(f"  ⚠️  SKIPPED: Upload failed with status {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
    
    print("\n" + "=" * 80)
    print("R2 STORAGE BACKEND TEST COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    main()

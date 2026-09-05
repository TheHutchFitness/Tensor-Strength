#!/usr/bin/env python3
"""
Backend ACL test for R2 file-serving proxy in Tensor Strength Next.js app.
Tests the NEW access-control rules on durable R2 storage.
"""
import requests
import io
import json
import random
import string
from PIL import Image

# Base URL from environment
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

def random_username():
    """Generate a random username."""
    return 'testuser_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def random_email():
    """Generate a random email."""
    return random_username() + '@test.com'

def register_user(session, username=None, email=None, password='TestPass123'):
    """Register a new user and return the user object."""
    if not username:
        username = random_username()
    if not email:
        email = random_email()
    
    resp = session.post(
        f"{API_BASE}/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    if resp.status_code == 200:
        data = resp.json()
        return data.get('user')
    else:
        print(f"  ⚠️  Registration failed: {resp.status_code} - {resp.text[:200]}")
        return None

def login_user(session, username, password):
    """Login a user."""
    resp = session.post(
        f"{API_BASE}/auth/login",
        json={"username": username, "password": password}
    )
    return resp.status_code == 200

def get_user_id(session):
    """Get current user's ID via /auth/me."""
    resp = session.get(f"{API_BASE}/auth/me")
    if resp.status_code == 200:
        data = resp.json()
        return data.get('user', {}).get('id')
    return None

def main():
    print("=" * 80)
    print("R2 ACL (ACCESS CONTROL) BACKEND TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}\n")
    
    test_results = []
    
    # ========== SCENARIO 1: ANONYMOUS BLOCKED ==========
    print("\n" + "=" * 80)
    print("SCENARIO 1: ANONYMOUS BLOCKED")
    print("=" * 80)
    print("GET /api/files/uploads/anything.png with NO cookie -> expect 401")
    try:
        resp = requests.get(f"{BASE_URL}/api/files/uploads/anything.png")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        if resp.status_code == 401:
            print("  ✅ PASSED: Anonymous access correctly blocked with 401")
            test_results.append(("Scenario 1: Anonymous blocked", "PASS"))
        else:
            print(f"  ❌ FAILED: Expected 401, got {resp.status_code}")
            test_results.append(("Scenario 1: Anonymous blocked", "FAIL"))
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        test_results.append(("Scenario 1: Anonymous blocked", "FAIL"))
    
    # ========== SCENARIO 2: PRIVATE FILE, OWNER OK ==========
    print("\n" + "=" * 80)
    print("SCENARIO 2: PRIVATE FILE, OWNER OK")
    print("=" * 80)
    
    # Register memberA
    session_a = requests.Session()
    print("Registering memberA...")
    member_a = register_user(session_a)
    if not member_a:
        print("  ❌ FAILED: Could not register memberA")
        test_results.append(("Scenario 2: Private file owner OK", "FAIL"))
    else:
        print(f"  ✅ memberA registered: {member_a.get('username')} (id: {member_a.get('id')})")
        
        # Upload a private file (no visibility field = defaults to private)
        print("\nUploading private file as memberA (no visibility field)...")
        try:
            png_bytes = create_test_png()
            files = {'file': ('private.png', png_bytes, 'image/png')}
            resp = session_a.post(f"{API_BASE}/uploads/file", files=files)
            print(f"  Status: {resp.status_code}")
            print(f"  Response: {resp.text[:300]}")
            
            if resp.status_code == 200:
                data = resp.json()
                private_url = data.get('url')
                print(f"  ✅ Upload successful, URL: {private_url}")
                
                # Try to GET the file as memberA (owner)
                print(f"\nGET {private_url} as memberA (owner) -> expect 200")
                full_url = f"{BASE_URL}{private_url}"
                get_resp = session_a.get(full_url)
                print(f"  Status: {get_resp.status_code}")
                print(f"  Content-Type: {get_resp.headers.get('Content-Type')}")
                print(f"  Content-Length: {len(get_resp.content)} bytes")
                
                if get_resp.status_code == 200 and len(get_resp.content) > 0:
                    print("  ✅ PASSED: Owner can access their private file")
                    test_results.append(("Scenario 2: Private file owner OK", "PASS"))
                else:
                    print(f"  ❌ FAILED: Expected 200 with content, got {get_resp.status_code}")
                    test_results.append(("Scenario 2: Private file owner OK", "FAIL"))
            else:
                print(f"  ❌ FAILED: Upload failed with {resp.status_code}")
                test_results.append(("Scenario 2: Private file owner OK", "FAIL"))
                private_url = None
        except Exception as e:
            print(f"  ❌ FAILED: Exception: {e}")
            test_results.append(("Scenario 2: Private file owner OK", "FAIL"))
            private_url = None
    
    # ========== SCENARIO 3: PRIVATE FILE, UNRELATED MEMBER FORBIDDEN ==========
    print("\n" + "=" * 80)
    print("SCENARIO 3: PRIVATE FILE, UNRELATED MEMBER FORBIDDEN")
    print("=" * 80)
    
    # Register memberB (no relationship to memberA)
    session_b = requests.Session()
    print("Registering memberB (unrelated to memberA)...")
    member_b = register_user(session_b)
    if not member_b:
        print("  ❌ FAILED: Could not register memberB")
        test_results.append(("Scenario 3: Unrelated member forbidden", "FAIL"))
    else:
        print(f"  ✅ memberB registered: {member_b.get('username')} (id: {member_b.get('id')})")
        
        if private_url:
            # Try to GET memberA's private file as memberB
            print(f"\nGET {private_url} as memberB (unrelated) -> expect 403")
            full_url = f"{BASE_URL}{private_url}"
            get_resp = session_b.get(full_url)
            print(f"  Status: {get_resp.status_code}")
            print(f"  Response: {get_resp.text[:200]}")
            
            if get_resp.status_code == 403:
                print("  ✅ PASSED: Unrelated member correctly denied with 403")
                test_results.append(("Scenario 3: Unrelated member forbidden", "PASS"))
            else:
                print(f"  ❌ FAILED: Expected 403, got {get_resp.status_code}")
                test_results.append(("Scenario 3: Unrelated member forbidden", "FAIL"))
        else:
            print("  ⚠️  SKIPPED: No private URL from scenario 2")
            test_results.append(("Scenario 3: Unrelated member forbidden", "SKIP"))
    
    # ========== SCENARIO 4: PRIVATE FILE, ASSIGNED TRAINER OK ==========
    print("\n" + "=" * 80)
    print("SCENARIO 4: PRIVATE FILE, ASSIGNED TRAINER OK")
    print("=" * 80)
    
    # Login as admin to set memberB as trainer and assign to memberA
    admin_session = requests.Session()
    print("Logging in as admin...")
    if not login_user(admin_session, ADMIN_USERNAME, ADMIN_PASSWORD):
        print("  ❌ FAILED: Could not login as admin")
        test_results.append(("Scenario 4: Assigned trainer OK", "FAIL"))
    else:
        print("  ✅ Admin logged in")
        
        # Get all users to find memberA and memberB IDs
        resp = admin_session.get(f"{API_BASE}/admin/users")
        if resp.status_code == 200:
            users = resp.json().get('users', [])
            member_a_id = member_a.get('id')
            member_b_id = member_b.get('id')
            
            # Set memberB as trainer
            print(f"\nSetting memberB (id: {member_b_id}) as trainer...")
            resp = admin_session.put(
                f"{API_BASE}/admin/users",
                json={"id": member_b_id, "isTrainer": True}
            )
            print(f"  Status: {resp.status_code}")
            if resp.status_code == 200:
                print("  ✅ memberB is now a trainer")
            else:
                print(f"  ❌ Failed to set memberB as trainer: {resp.text[:200]}")
            
            # Assign memberA to memberB (trainer)
            print(f"\nAssigning memberA (id: {member_a_id}) to trainer memberB...")
            resp = admin_session.put(
                f"{API_BASE}/admin/users",
                json={"id": member_a_id, "assignedTrainerId": member_b_id}
            )
            print(f"  Status: {resp.status_code}")
            if resp.status_code == 200:
                print("  ✅ memberA assigned to trainer memberB")
                
                # Re-login memberB to refresh session
                print("\nRe-logging in memberB to refresh session...")
                session_b = requests.Session()
                if login_user(session_b, member_b.get('username'), 'TestPass123'):
                    print("  ✅ memberB re-logged in")
                    
                    # Try to GET memberA's private file as memberB (now assigned trainer)
                    if private_url:
                        print(f"\nGET {private_url} as memberB (assigned trainer) -> expect 200")
                        full_url = f"{BASE_URL}{private_url}"
                        get_resp = session_b.get(full_url)
                        print(f"  Status: {get_resp.status_code}")
                        print(f"  Content-Type: {get_resp.headers.get('Content-Type')}")
                        print(f"  Content-Length: {len(get_resp.content)} bytes")
                        
                        if get_resp.status_code == 200 and len(get_resp.content) > 0:
                            print("  ✅ PASSED: Assigned trainer can access client's private file")
                            test_results.append(("Scenario 4: Assigned trainer OK", "PASS"))
                        else:
                            print(f"  ❌ FAILED: Expected 200 with content, got {get_resp.status_code}")
                            print(f"  Response: {get_resp.text[:200]}")
                            test_results.append(("Scenario 4: Assigned trainer OK", "FAIL"))
                    else:
                        print("  ⚠️  SKIPPED: No private URL from scenario 2")
                        test_results.append(("Scenario 4: Assigned trainer OK", "SKIP"))
                else:
                    print("  ❌ Failed to re-login memberB")
                    test_results.append(("Scenario 4: Assigned trainer OK", "FAIL"))
            else:
                print(f"  ❌ Failed to assign memberA to memberB: {resp.text[:200]}")
                test_results.append(("Scenario 4: Assigned trainer OK", "FAIL"))
        else:
            print(f"  ❌ Failed to get users: {resp.status_code}")
            test_results.append(("Scenario 4: Assigned trainer OK", "FAIL"))
    
    # ========== SCENARIO 5: PRIVATE FILE, ADMIN OK ==========
    print("\n" + "=" * 80)
    print("SCENARIO 5: PRIVATE FILE, ADMIN OK")
    print("=" * 80)
    
    if private_url:
        print(f"GET {private_url} as admin -> expect 200")
        full_url = f"{BASE_URL}{private_url}"
        get_resp = admin_session.get(full_url)
        print(f"  Status: {get_resp.status_code}")
        print(f"  Content-Type: {get_resp.headers.get('Content-Type')}")
        print(f"  Content-Length: {len(get_resp.content)} bytes")
        
        if get_resp.status_code == 200 and len(get_resp.content) > 0:
            print("  ✅ PASSED: Admin can access any private file")
            test_results.append(("Scenario 5: Admin OK", "PASS"))
        else:
            print(f"  ❌ FAILED: Expected 200 with content, got {get_resp.status_code}")
            test_results.append(("Scenario 5: Admin OK", "FAIL"))
    else:
        print("  ⚠️  SKIPPED: No private URL from scenario 2")
        test_results.append(("Scenario 5: Admin OK", "SKIP"))
    
    # ========== SCENARIO 6: PUBLIC FILE VISIBLE TO ANY MEMBER ==========
    print("\n" + "=" * 80)
    print("SCENARIO 6: PUBLIC FILE VISIBLE TO ANY MEMBER")
    print("=" * 80)
    
    # Upload a public file as memberA
    print("Uploading public file as memberA (visibility=public)...")
    try:
        png_bytes = create_test_png()
        files = {'file': ('public.png', png_bytes, 'image/png')}
        data = {'visibility': 'public'}
        resp = session_a.post(f"{API_BASE}/uploads/file", files=files, data=data)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:300]}")
        
        if resp.status_code == 200:
            data = resp.json()
            public_url = data.get('url')
            print(f"  ✅ Upload successful, URL: {public_url}")
            
            # Try to GET as unrelated memberB
            print(f"\nGET {public_url} as unrelated memberB -> expect 200")
            full_url = f"{BASE_URL}{public_url}"
            get_resp = session_b.get(full_url)
            print(f"  Status: {get_resp.status_code}")
            print(f"  Content-Length: {len(get_resp.content)} bytes")
            
            if get_resp.status_code == 200 and len(get_resp.content) > 0:
                print("  ✅ PASSED: Any member can access public file")
            else:
                print(f"  ❌ FAILED: Expected 200 with content, got {get_resp.status_code}")
            
            # Try to GET with NO cookie (anonymous)
            print(f"\nGET {public_url} with NO cookie -> expect 401")
            get_resp = requests.get(full_url)
            print(f"  Status: {get_resp.status_code}")
            print(f"  Response: {get_resp.text[:200]}")
            
            if get_resp.status_code == 401:
                print("  ✅ PASSED: Public file still requires login (401 for anonymous)")
                test_results.append(("Scenario 6: Public file visible to members", "PASS"))
            else:
                print(f"  ❌ FAILED: Expected 401, got {get_resp.status_code}")
                test_results.append(("Scenario 6: Public file visible to members", "FAIL"))
        else:
            print(f"  ❌ FAILED: Upload failed with {resp.status_code}")
            test_results.append(("Scenario 6: Public file visible to members", "FAIL"))
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        test_results.append(("Scenario 6: Public file visible to members", "FAIL"))
    
    # ========== SCENARIO 7: FORUM MEDIA PUBLIC TO MEMBERS ==========
    print("\n" + "=" * 80)
    print("SCENARIO 7: FORUM MEDIA PUBLIC TO MEMBERS")
    print("=" * 80)
    
    # Upload forum media as memberA
    print("Uploading forum media as memberA...")
    try:
        png_bytes = create_test_png()
        files = {'file': ('forum.png', png_bytes, 'image/png')}
        resp = session_a.post(f"{API_BASE}/forum/upload", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:300]}")
        
        if resp.status_code == 200:
            data = resp.json()
            forum_url = data.get('url')
            file_type = data.get('type')
            print(f"  ✅ Upload successful, URL: {forum_url}, type: {file_type}")
            
            # Try to GET as unrelated memberB
            print(f"\nGET {forum_url} as unrelated memberB -> expect 200")
            full_url = f"{BASE_URL}{forum_url}"
            get_resp = session_b.get(full_url)
            print(f"  Status: {get_resp.status_code}")
            print(f"  Content-Length: {len(get_resp.content)} bytes")
            
            if get_resp.status_code == 200 and len(get_resp.content) > 0:
                print("  ✅ PASSED: Any member can access forum media")
            else:
                print(f"  ❌ FAILED: Expected 200 with content, got {get_resp.status_code}")
            
            # Try to GET with NO cookie (anonymous)
            print(f"\nGET {forum_url} with NO cookie -> expect 401")
            get_resp = requests.get(full_url)
            print(f"  Status: {get_resp.status_code}")
            print(f"  Response: {get_resp.text[:200]}")
            
            if get_resp.status_code == 401:
                print("  ✅ PASSED: Forum media requires login (401 for anonymous)")
                test_results.append(("Scenario 7: Forum media public to members", "PASS"))
            else:
                print(f"  ❌ FAILED: Expected 401, got {get_resp.status_code}")
                test_results.append(("Scenario 7: Forum media public to members", "FAIL"))
        else:
            print(f"  ❌ FAILED: Upload failed with {resp.status_code}")
            test_results.append(("Scenario 7: Forum media public to members", "FAIL"))
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        test_results.append(("Scenario 7: Forum media public to members", "FAIL"))
    
    # ========== SCENARIO 8: REGRESSION TESTS ==========
    print("\n" + "=" * 80)
    print("SCENARIO 8: REGRESSION TESTS")
    print("=" * 80)
    
    regression_pass = True
    
    # Test 8a: Upload .html file -> 400
    print("\n8a: POST /api/uploads/file with .html file -> expect 400")
    try:
        html_content = b'<script>alert(1)</script>'
        files = {'file': ('evil.html', html_content, 'text/html')}
        resp = session_a.post(f"{API_BASE}/uploads/file", files=files)
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print("  ✅ PASSED: .html file correctly rejected with 400")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
            regression_pass = False
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        regression_pass = False
    
    # Test 8b: GET invalid key (not starting with uploads/) -> 400
    print("\n8b: GET /api/files/somethingelse/x.png -> expect 400")
    try:
        resp = session_a.get(f"{BASE_URL}/api/files/somethingelse/x.png")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 400:
            print("  ✅ PASSED: Invalid key correctly rejected with 400")
        else:
            print(f"  ❌ FAILED: Expected 400, got {resp.status_code}")
            regression_pass = False
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        regression_pass = False
    
    # Test 8c: GET non-existent file -> 404
    print("\n8c: GET /api/files/uploads/nonexistent-random123.png -> expect 404")
    try:
        rand_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
        resp = session_a.get(f"{BASE_URL}/api/files/uploads/nonexistent-{rand_id}.png")
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text[:200]}")
        
        if resp.status_code == 404:
            print("  ✅ PASSED: Non-existent file correctly returns 404")
        else:
            print(f"  ❌ FAILED: Expected 404, got {resp.status_code}")
            regression_pass = False
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        regression_pass = False
    
    # Test 8d: Check for MongoDB _id leaks
    print("\n8d: Check for MongoDB _id leaks in responses")
    try:
        png_bytes = create_test_png()
        files = {'file': ('leak-test.png', png_bytes, 'image/png')}
        resp = session_a.post(f"{API_BASE}/uploads/file", files=files)
        
        if resp.status_code == 200:
            response_text = resp.text
            if '_id' in response_text:
                print(f"  ❌ FAILED: Found '_id' in response: {response_text[:200]}")
                regression_pass = False
            else:
                print(f"  ✅ PASSED: No '_id' found in response")
        else:
            print(f"  ⚠️  SKIPPED: Upload failed with status {resp.status_code}")
    except Exception as e:
        print(f"  ❌ FAILED: Exception: {e}")
        regression_pass = False
    
    if regression_pass:
        test_results.append(("Scenario 8: Regression tests", "PASS"))
    else:
        test_results.append(("Scenario 8: Regression tests", "FAIL"))
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    for test_name, result in test_results:
        status_icon = "✅" if result == "PASS" else ("⚠️" if result == "SKIP" else "❌")
        print(f"{status_icon} {test_name}: {result}")
    
    passed = sum(1 for _, r in test_results if r == "PASS")
    failed = sum(1 for _, r in test_results if r == "FAIL")
    skipped = sum(1 for _, r in test_results if r == "SKIP")
    total = len(test_results)
    
    print(f"\nTotal: {total} scenarios")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    
    if failed == 0 and skipped == 0:
        print("\n🎉 ALL TESTS PASSED!")
    elif failed == 0:
        print(f"\n⚠️  All non-skipped tests passed ({passed}/{passed + skipped})")
    else:
        print(f"\n❌ SOME TESTS FAILED ({failed}/{total})")
    
    print("=" * 80)

if __name__ == '__main__':
    main()

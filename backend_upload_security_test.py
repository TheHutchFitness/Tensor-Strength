#!/usr/bin/env python3
"""
Backend API test suite for file upload security fix (SEC-001).
Tests the extension allowlist enforcement at POST /api/uploads/file
"""

import requests
import os
import io

# Load environment variables
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results tracking
test_results = []

def log_test(step, description, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - Step {step}: {description}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({
        'step': step,
        'description': description,
        'passed': passed,
        'details': details
    })

def main():
    print("=" * 80)
    print("FILE UPLOAD SECURITY FIX TESTS (SEC-001)")
    print("=" * 80)
    print(f"API URL: {API_URL}")
    print()

    # Session for cookies
    auth_session = requests.Session()
    no_auth_session = requests.Session()

    try:
        # ============ SETUP: Login ============
        print("\n--- SETUP: Admin Login ---")
        r = auth_session.post(f"{API_URL}/auth/login", json={
            'username': ADMIN_USERNAME,
            'password': ADMIN_PASSWORD
        })
        if r.status_code != 200:
            print(f"❌ Admin login failed: {r.status_code} - {r.text}")
            return
        print(f"✅ Admin logged in successfully")
        admin_user = r.json().get('user', {})
        print(f"   Admin ID: {admin_user.get('id')}")

        print("\n" + "=" * 80)
        print("FILE UPLOAD SECURITY TESTS")
        print("=" * 80)

        # ============ TEST 1: Upload .html file (should be blocked) ============
        print("\n--- Test 1: Upload .html file (should be blocked with 400) ---")
        files = {
            'file': ('evil.html', io.BytesIO(b'<script>alert(1)</script>'), 'text/html')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = (r.status_code == 400 and 
                  'not allowed' in r.json().get('error', '').lower())
        log_test(1, "Upload .html file -> 400 with error message", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 2: Upload .svg file (should be blocked) ============
        print("\n--- Test 2: Upload .svg file (should be blocked with 400) ---")
        files = {
            'file': ('evil.svg', io.BytesIO(b'<svg onload=alert(1)></svg>'), 'image/svg+xml')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = (r.status_code == 400 and 
                  'not allowed' in r.json().get('error', '').lower())
        log_test(2, "Upload .svg file -> 400 with error message", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 3: Upload .js file (should be blocked) ============
        print("\n--- Test 3: Upload .js file (should be blocked with 400) ---")
        files = {
            'file': ('evil.js', io.BytesIO(b'alert(1);'), 'application/javascript')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = (r.status_code == 400 and 
                  'not allowed' in r.json().get('error', '').lower())
        log_test(3, "Upload .js file -> 400 with error message", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 4: Upload .php file (should be blocked) ============
        print("\n--- Test 4: Upload .php file (should be blocked with 400) ---")
        files = {
            'file': ('evil.php', io.BytesIO(b'<?php echo "hacked"; ?>'), 'application/x-php')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = (r.status_code == 400 and 
                  'not allowed' in r.json().get('error', '').lower())
        log_test(4, "Upload .php file -> 400 with error message", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 5: Upload real PNG (should succeed) ============
        print("\n--- Test 5: Upload real PNG file (should succeed with 200) ---")
        # Create a minimal valid PNG (1x1 transparent pixel)
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
            0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
            0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,  # IEND chunk
            0x42, 0x60, 0x82
        ])
        files = {
            'file': ('ok.png', io.BytesIO(png_bytes), 'image/png')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = False
        if r.status_code == 200:
            data = r.json()
            url = data.get('url', '')
            name = data.get('name', '')
            size = data.get('size', 0)
            mime = data.get('mime', '')
            if url.endswith('.png') and 'url' in data and 'name' in data and 'size' in data and 'mime' in data:
                passed = True
                log_test(5, "Upload PNG file -> 200 with {url, name, size, mime} and url ends with .png", True,
                         f"Status: {r.status_code}, url: {url}, name: {name}, size: {size}, mime: {mime}")
            else:
                log_test(5, "Upload PNG file -> 200 but response missing fields or url doesn't end with .png", False,
                         f"Status: {r.status_code}, Response: {data}")
        else:
            log_test(5, "Upload PNG file -> wrong status", False,
                     f"Status: {r.status_code}, Response: {r.text}")

        # ============ TEST 6: Upload PDF (should succeed) ============
        print("\n--- Test 6: Upload PDF file (should succeed with 200) ---")
        # Create a minimal valid PDF
        pdf_bytes = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n203\n%%EOF'
        files = {
            'file': ('ok.pdf', io.BytesIO(pdf_bytes), 'application/pdf')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = False
        if r.status_code == 200:
            data = r.json()
            url = data.get('url', '')
            if url.endswith('.pdf') and 'url' in data and 'name' in data and 'size' in data and 'mime' in data:
                passed = True
                log_test(6, "Upload PDF file -> 200 with proper JSON and url ends with .pdf", True,
                         f"Status: {r.status_code}, url: {url}")
            else:
                log_test(6, "Upload PDF file -> 200 but response missing fields or url doesn't end with .pdf", False,
                         f"Status: {r.status_code}, Response: {data}")
        else:
            log_test(6, "Upload PDF file -> wrong status", False,
                     f"Status: {r.status_code}, Response: {r.text}")

        # ============ TEST 7: Upload .txt file (should succeed) ============
        print("\n--- Test 7: Upload .txt file (should succeed with 200) ---")
        files = {
            'file': ('ok.txt', io.BytesIO(b'This is a test text file.'), 'text/plain')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = False
        if r.status_code == 200:
            data = r.json()
            url = data.get('url', '')
            if url.endswith('.txt') and 'url' in data and 'name' in data and 'size' in data and 'mime' in data:
                passed = True
                log_test(7, "Upload .txt file -> 200 with proper JSON and url ends with .txt", True,
                         f"Status: {r.status_code}, url: {url}")
            else:
                log_test(7, "Upload .txt file -> 200 but response missing fields or url doesn't end with .txt", False,
                         f"Status: {r.status_code}, Response: {data}")
        else:
            log_test(7, "Upload .txt file -> wrong status", False,
                     f"Status: {r.status_code}, Response: {r.text}")

        # ============ TEST 8: Upload without auth (should be 401) ============
        print("\n--- Test 8: Upload file without auth cookie (should be 401) ---")
        files = {
            'file': ('test.png', io.BytesIO(png_bytes), 'image/png')
        }
        r = no_auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = r.status_code == 401
        log_test(8, "Upload file without auth -> 401", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 9: Upload with no 'file' field (should be 400) ============
        print("\n--- Test 9: POST /api/uploads/file with no 'file' field (should be 400) ---")
        # Send multipart form with a different field name (not 'file')
        files = {
            'notfile': ('test.txt', io.BytesIO(b'test'), 'text/plain')
        }
        r = auth_session.post(f"{API_URL}/uploads/file", files=files)
        passed = (r.status_code == 400 and 
                  'no file' in r.json().get('error', '').lower())
        log_test(9, "POST with no 'file' field -> 400 with 'No file provided' error", passed,
                 f"Status: {r.status_code}, Response: {r.json()}")

        # ============ TEST 10: Verify no 500 errors ============
        print("\n--- Test 10: Verify no 500 errors occurred ---")
        has_500 = any('Status: 500' in result['details'] for result in test_results)
        passed = not has_500
        log_test(10, "No 500 errors encountered", passed,
                 f"Has 500 errors: {has_500}")

        # ============ TEST 11: Verify no _id leaks ============
        print("\n--- Test 11: Verify no _id leaks in responses ---")
        has_id_leak = False
        for result in test_results:
            if '"_id"' in result['details'] or '_id:' in result['details']:
                has_id_leak = True
                break
        passed = not has_id_leak
        log_test(11, "No _id leaks in responses", passed,
                 f"Has _id leaks: {has_id_leak}")

        # ============ SUMMARY ============
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(test_results)
        passed_tests = sum(1 for r in test_results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        print("\n--- Detailed Results ---")
        for result in test_results:
            status = "✅" if result['passed'] else "❌"
            print(f"{status} Step {result['step']}: {result['description']}")
        
        if failed_tests > 0:
            print("\n--- Failed Tests Details ---")
            for result in test_results:
                if not result['passed']:
                    print(f"\nStep {result['step']}: {result['description']}")
                    print(f"  {result['details']}")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

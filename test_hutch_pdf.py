#!/usr/bin/env python3
import os
"""
Backend test for Hutch Touch PDF endpoint (GET /api/hutch-touch/pdf)
Tests:
1. AUTH GATING: No cookie -> 403/401, non-portal user -> 403
2. HAPPY PATH: Logged in as The Hutch (portalAccess) -> 200, valid PDF
3. CONTENT VERIFICATION: Extract PDF text and verify plyometrics content
"""

import requests
import json
import time
import io

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials (portal user with portalAccess)
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASSED" if passed else "❌ FAILED"
    result = f"{status}: {test_name}"
    if details:
        result += f" - {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def main():
    print("=" * 80)
    print("BACKEND TEST: Hutch Touch PDF Endpoint (GET /api/hutch-touch/pdf)")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    member_session = requests.Session()
    
    # Generate unique username for test member
    timestamp = str(int(time.time() * 1000))
    member_username = f"testmember_{timestamp}"
    member_email = f"testmember_{timestamp}@test.com"
    password = "TestPass123!"
    
    try:
        # ============================================================
        # TEST 1: AUTH GATING - No cookie -> 403/401
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST 1: AUTH GATING - No cookie")
        print("=" * 80)
        
        print("\n1. GET /api/hutch-touch/pdf with NO auth cookie")
        resp = requests.get(f"{BASE_URL}/hutch-touch/pdf")
        
        if resp.status_code in [401, 403]:
            # Check that response is JSON error, not the PDF file
            try:
                data = resp.json()
                if "error" in data:
                    log_test("No auth cookie returns 403/401 with JSON error", True, 
                            f"Status {resp.status_code}, error: {data.get('error')}")
                else:
                    log_test("No auth cookie returns 403/401 with JSON error", False, 
                            f"Status {resp.status_code} but no error field in JSON")
            except:
                log_test("No auth cookie returns 403/401 with JSON error", False, 
                        f"Status {resp.status_code} but response is not JSON")
        else:
            log_test("No auth cookie returns 403/401", False, 
                    f"Expected 401/403, got {resp.status_code}")
        
        # ============================================================
        # TEST 2: AUTH GATING - Non-portal user -> 403
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST 2: AUTH GATING - Non-portal user (portalAccess=false)")
        print("=" * 80)
        
        print(f"\n2a. Register new member (username: '{member_username}')")
        resp = member_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_username,
            "email": member_email,
            "password": password
        })
        
        if resp.status_code == 200:
            data = resp.json()
            member_user = data.get("user", {})
            member_id = member_user.get("id")
            portal_access = member_user.get("portalAccess")
            log_test("Register new member", True, 
                    f"id={member_id}, portalAccess={portal_access}")
            
            if portal_access != False:
                log_test("New member has portalAccess=false", False, 
                        f"Expected portalAccess=false, got {portal_access}")
        else:
            log_test("Register new member", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
        
        print("\n2b. GET /api/hutch-touch/pdf as member with portalAccess=false")
        resp = member_session.get(f"{BASE_URL}/hutch-touch/pdf")
        
        if resp.status_code == 403:
            try:
                data = resp.json()
                if "error" in data:
                    log_test("Non-portal user returns 403 with JSON error", True, 
                            f"error: {data.get('error')}")
                else:
                    log_test("Non-portal user returns 403 with JSON error", False, 
                            "Status 403 but no error field in JSON")
            except:
                log_test("Non-portal user returns 403 with JSON error", False, 
                        "Status 403 but response is not JSON")
        else:
            log_test("Non-portal user returns 403", False, 
                    f"Expected 403, got {resp.status_code}")
        
        # ============================================================
        # TEST 3: HAPPY PATH - Authenticated portal user
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST 3: HAPPY PATH - Authenticated portal user (The Hutch)")
        print("=" * 80)
        
        print(f"\n3a. Login as admin (username: '{ADMIN_USERNAME}', password: '{ADMIN_PASSWORD}')")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        
        if resp.status_code == 200:
            data = resp.json()
            admin_user = data.get("user", {})
            admin_id = admin_user.get("id")
            role = admin_user.get("role")
            portal_access = admin_user.get("portalAccess")
            log_test("Admin login", True, 
                    f"role={role}, portalAccess={portal_access}, id={admin_id}")
        else:
            log_test("Admin login", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
        
        print("\n3b. GET /api/hutch-touch/pdf as authenticated admin")
        resp = admin_session.get(f"{BASE_URL}/hutch-touch/pdf")
        
        if resp.status_code == 200:
            log_test("GET /api/hutch-touch/pdf returns 200", True, "")
            
            # Check Content-Type header
            content_type = resp.headers.get("Content-Type", "")
            if content_type == "application/pdf":
                log_test("Content-Type is application/pdf", True, f"Content-Type: {content_type}")
            else:
                log_test("Content-Type is application/pdf", False, 
                        f"Expected 'application/pdf', got '{content_type}'")
            
            # Check Content-Disposition header
            content_disposition = resp.headers.get("Content-Disposition", "")
            if content_disposition:
                log_test("Content-Disposition header present", True, 
                        f"Content-Disposition: {content_disposition}")
            else:
                log_test("Content-Disposition header present", False, 
                        "Content-Disposition header missing")
            
            # Check PDF signature and size
            pdf_bytes = resp.content
            pdf_size = len(pdf_bytes)
            
            if pdf_size > 5000:  # > 5 KB
                log_test("PDF size is non-trivial (> 5 KB)", True, 
                        f"Size: {pdf_size} bytes ({pdf_size / 1024:.1f} KB)")
            else:
                log_test("PDF size is non-trivial (> 5 KB)", False, 
                        f"Size: {pdf_size} bytes (too small)")
            
            # Check PDF signature (%PDF)
            if pdf_bytes[:4] == b'%PDF':
                log_test("PDF starts with %PDF signature", True, 
                        f"First 4 bytes: {pdf_bytes[:4]}")
            else:
                log_test("PDF starts with %PDF signature", False, 
                        f"First 4 bytes: {pdf_bytes[:20]}")
            
            # ============================================================
            # TEST 4: CONTENT VERIFICATION - Extract and verify text
            # ============================================================
            print("\n" + "=" * 80)
            print("TEST 4: CONTENT VERIFICATION - Extract PDF text")
            print("=" * 80)
            
            # Try to extract text from PDF
            try:
                # Try pypdf first (PyPDF2 successor)
                try:
                    from pypdf import PdfReader
                    pdf_lib = "pypdf"
                except ImportError:
                    try:
                        from PyPDF2 import PdfReader
                        pdf_lib = "PyPDF2"
                    except ImportError:
                        try:
                            import pdfplumber
                            pdf_lib = "pdfplumber"
                        except ImportError:
                            log_test("PDF text extraction library available", False, 
                                    "No PDF library found (pypdf, PyPDF2, or pdfplumber)")
                            pdf_lib = None
                
                if pdf_lib in ["pypdf", "PyPDF2"]:
                    print(f"\n4a. Extracting text using {pdf_lib}")
                    pdf_file = io.BytesIO(pdf_bytes)
                    reader = PdfReader(pdf_file)
                    page_count = len(reader.pages)
                    
                    log_test("PDF page count", True, f"Pages: {page_count}")
                    
                    # Extract all text
                    full_text = ""
                    for page in reader.pages:
                        full_text += page.extract_text() + "\n"
                    
                    # Convert to lowercase for case-insensitive matching
                    full_text_lower = full_text.lower()
                    
                    print(f"\n4b. Verifying plyometric exercises in PDF text")
                    
                    # Check for specific plyometric exercises
                    checks = [
                        ("Pogo Hops", "pogo hops"),
                        ("Box Jump", "box jump"),
                        ("Broad Jump OR Kettlebell Swing", ["broad jump", "kettlebell swing"]),
                        ("Plyo Push-Up OR Med-Ball", ["plyo push-up", "med-ball"]),
                        ("WEEK 1", "week 1"),
                        ("WEEK 8", "week 8"),
                        ("Front Squat", "front squat"),
                    ]
                    
                    found_strings = []
                    missing_strings = []
                    
                    for check_name, search_terms in checks:
                        if isinstance(search_terms, list):
                            # OR condition - check if any of the terms is found
                            found = any(term in full_text_lower for term in search_terms)
                            found_term = next((term for term in search_terms if term in full_text_lower), None)
                            if found:
                                found_strings.append(f"{check_name} (found: '{found_term}')")
                                log_test(f"PDF contains '{check_name}'", True, f"Found: '{found_term}'")
                            else:
                                missing_strings.append(check_name)
                                log_test(f"PDF contains '{check_name}'", False, 
                                        f"None of {search_terms} found in text")
                        else:
                            # Single term
                            if search_terms in full_text_lower:
                                found_strings.append(check_name)
                                log_test(f"PDF contains '{check_name}'", True, "")
                            else:
                                missing_strings.append(check_name)
                                log_test(f"PDF contains '{check_name}'", False, 
                                        f"'{search_terms}' not found in text")
                    
                    print(f"\n4c. Content verification summary:")
                    print(f"Found strings: {', '.join(found_strings)}")
                    if missing_strings:
                        print(f"Missing strings: {', '.join(missing_strings)}")
                    
                    # Overall content verification
                    if len(found_strings) >= 5:  # At least 5 out of 7 checks passed
                        log_test("Overall content verification", True, 
                                f"{len(found_strings)}/{len(checks)} checks passed")
                    else:
                        log_test("Overall content verification", False, 
                                f"Only {len(found_strings)}/{len(checks)} checks passed")
                    
                    # Print a sample of the extracted text for debugging
                    print(f"\n4d. Sample of extracted text (first 500 chars):")
                    print(full_text[:500])
                    
                elif pdf_lib == "pdfplumber":
                    print(f"\n4a. Extracting text using pdfplumber")
                    import pdfplumber
                    pdf_file = io.BytesIO(pdf_bytes)
                    
                    with pdfplumber.open(pdf_file) as pdf:
                        page_count = len(pdf.pages)
                        log_test("PDF page count", True, f"Pages: {page_count}")
                        
                        # Extract all text
                        full_text = ""
                        for page in pdf.pages:
                            full_text += page.extract_text() + "\n"
                        
                        # Convert to lowercase for case-insensitive matching
                        full_text_lower = full_text.lower()
                        
                        print(f"\n4b. Verifying plyometric exercises in PDF text")
                        
                        # Check for specific plyometric exercises
                        checks = [
                            ("Pogo Hops", "pogo hops"),
                            ("Box Jump", "box jump"),
                            ("Broad Jump OR Kettlebell Swing", ["broad jump", "kettlebell swing"]),
                            ("Plyo Push-Up OR Med-Ball", ["plyo push-up", "med-ball"]),
                            ("WEEK 1", "week 1"),
                            ("WEEK 8", "week 8"),
                            ("Front Squat", "front squat"),
                        ]
                        
                        found_strings = []
                        missing_strings = []
                        
                        for check_name, search_terms in checks:
                            if isinstance(search_terms, list):
                                # OR condition - check if any of the terms is found
                                found = any(term in full_text_lower for term in search_terms)
                                found_term = next((term for term in search_terms if term in full_text_lower), None)
                                if found:
                                    found_strings.append(f"{check_name} (found: '{found_term}')")
                                    log_test(f"PDF contains '{check_name}'", True, f"Found: '{found_term}'")
                                else:
                                    missing_strings.append(check_name)
                                    log_test(f"PDF contains '{check_name}'", False, 
                                            f"None of {search_terms} found in text")
                            else:
                                # Single term
                                if search_terms in full_text_lower:
                                    found_strings.append(check_name)
                                    log_test(f"PDF contains '{check_name}'", True, "")
                                else:
                                    missing_strings.append(check_name)
                                    log_test(f"PDF contains '{check_name}'", False, 
                                            f"'{search_terms}' not found in text")
                        
                        print(f"\n4c. Content verification summary:")
                        print(f"Found strings: {', '.join(found_strings)}")
                        if missing_strings:
                            print(f"Missing strings: {', '.join(missing_strings)}")
                        
                        # Overall content verification
                        if len(found_strings) >= 5:  # At least 5 out of 7 checks passed
                            log_test("Overall content verification", True, 
                                    f"{len(found_strings)}/{len(checks)} checks passed")
                        else:
                            log_test("Overall content verification", False, 
                                    f"Only {len(found_strings)}/{len(checks)} checks passed")
                        
                        # Print a sample of the extracted text for debugging
                        print(f"\n4d. Sample of extracted text (first 500 chars):")
                        print(full_text[:500])
                
            except Exception as e:
                log_test("PDF text extraction", False, f"Exception: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            log_test("GET /api/hutch-touch/pdf returns 200", False, 
                    f"Status {resp.status_code}: {resp.text[:200]}")
        
        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in test_results if r["passed"])
        total = len(test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\nTotal tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if total - passed > 0:
            print("\nFailed tests:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  ❌ {r['test']}: {r['details']}")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

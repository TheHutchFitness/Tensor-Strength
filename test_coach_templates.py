#!/usr/bin/env python3
import os
"""
Backend API test for COACH SAVED TEMPLATES endpoints.

Tests the new /api/trainer/templates GET and PUT endpoints.
"""

import requests
import json
import sys

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

def main():
    print("=" * 80)
    print("COACH SAVED TEMPLATES BACKEND TEST")
    print("=" * 80)
    print()

    # Session for cookie persistence
    session = requests.Session()

    # Admin credentials
    admin_username = "the hutch"
    admin_password = os.environ.get("TEST_ADMIN_PASSWORD", "")

    try:
        # ============================================================
        # TEST 1: GET /api/trainer/templates with NO auth -> 403
        # ============================================================
        print("\n--- TEST 1: GET /trainer/templates with NO auth ---")
        resp = requests.get(f"{BASE_URL}/trainer/templates")
        
        if resp.status_code == 403:
            log_test(1, "GET /trainer/templates with NO auth returns 403", True, 
                    f"Status: {resp.status_code}")
        else:
            log_test(1, "GET /trainer/templates with NO auth returns 403", False,
                    f"Expected 403, got {resp.status_code}. Response: {resp.text[:200]}")

        # ============================================================
        # TEST 2: Register + login a plain member; GET with that cookie -> 403
        # ============================================================
        print("\n--- TEST 2: Plain member GET /trainer/templates -> 403 ---")
        
        # Register a plain member
        import time
        member_username = f"plainmember_{int(time.time())}"
        member_email = f"{member_username}@test.com"
        member_password = "TestPass123"
        
        member_session = requests.Session()
        reg_resp = member_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_username,
            "email": member_email,
            "password": member_password
        })
        
        if reg_resp.status_code != 200:
            log_test(2, "Plain member GET /trainer/templates -> 403", False,
                    f"Failed to register member. Status: {reg_resp.status_code}, Response: {reg_resp.text[:200]}")
        else:
            # Try to GET /trainer/templates as plain member
            member_get_resp = member_session.get(f"{BASE_URL}/trainer/templates")
            
            if member_get_resp.status_code == 403:
                log_test(2, "Plain member GET /trainer/templates -> 403", True,
                        f"Status: {member_get_resp.status_code}, member is not trainer/admin")
            else:
                log_test(2, "Plain member GET /trainer/templates -> 403", False,
                        f"Expected 403, got {member_get_resp.status_code}. Response: {member_get_resp.text[:200]}")

        # ============================================================
        # TEST 3: As ADMIN, GET /trainer/templates -> 200 {templates: []}
        # ============================================================
        print("\n--- TEST 3: Admin GET /trainer/templates -> 200 with {templates: []} ---")
        
        # Admin login
        login_resp = session.post(f"{BASE_URL}/auth/login", json={
            "username": admin_username,
            "password": admin_password
        })
        
        if login_resp.status_code != 200:
            log_test(3, "Admin GET /trainer/templates -> 200 with {templates: []}", False,
                    f"Admin login failed. Status: {login_resp.status_code}, Response: {login_resp.text[:200]}")
        else:
            admin_data = login_resp.json()
            print(f"    Admin login successful: {admin_data.get('user', {}).get('username')}, role: {admin_data.get('user', {}).get('role')}")
            
            # GET /trainer/templates as admin
            get_resp = session.get(f"{BASE_URL}/trainer/templates")
            
            if get_resp.status_code == 200:
                get_data = get_resp.json()
                
                # Check structure
                has_templates = 'templates' in get_data
                is_array = isinstance(get_data.get('templates'), list)
                
                # Check for _id leaks
                no_id_leak, id_msg = check_no_mongo_id(get_data, "response")
                
                if has_templates and is_array and no_id_leak:
                    log_test(3, "Admin GET /trainer/templates -> 200 with {templates: []}", True,
                            f"Status: 200, templates is array with {len(get_data['templates'])} items, no _id leaks")
                else:
                    issues = []
                    if not has_templates:
                        issues.append("missing 'templates' field")
                    if not is_array:
                        issues.append("'templates' is not an array")
                    if not no_id_leak:
                        issues.append(f"_id leak: {id_msg}")
                    log_test(3, "Admin GET /trainer/templates -> 200 with {templates: []}", False,
                            f"Issues: {', '.join(issues)}")
            else:
                log_test(3, "Admin GET /trainer/templates -> 200 with {templates: []}", False,
                        f"Expected 200, got {get_resp.status_code}. Response: {get_resp.text[:200]}")

        # ============================================================
        # TEST 4: As ADMIN, PUT /trainer/templates with template data -> 200
        # ============================================================
        print("\n--- TEST 4: Admin PUT /trainer/templates with template data -> 200 ---")
        
        template_data = {
            "templates": [
                {
                    "id": "a1",
                    "name": "Push A",
                    "rows": [
                        {
                            "name": "Bench Press",
                            "sets": "3",
                            "reps": "8-12"
                        }
                    ]
                }
            ]
        }
        
        put_resp = session.put(f"{BASE_URL}/trainer/templates", json=template_data)
        
        if put_resp.status_code == 200:
            put_data = put_resp.json()
            
            # Check response structure
            has_ok = put_data.get('ok') == True
            has_templates = 'templates' in put_data
            templates_match = False
            
            if has_templates and isinstance(put_data['templates'], list) and len(put_data['templates']) > 0:
                saved_template = put_data['templates'][0]
                templates_match = (
                    saved_template.get('id') == 'a1' and
                    saved_template.get('name') == 'Push A' and
                    isinstance(saved_template.get('rows'), list) and
                    len(saved_template['rows']) > 0 and
                    saved_template['rows'][0].get('name') == 'Bench Press'
                )
            
            # Check for _id leaks
            no_id_leak, id_msg = check_no_mongo_id(put_data, "response")
            
            if has_ok and has_templates and templates_match and no_id_leak:
                log_test(4, "Admin PUT /trainer/templates with template data -> 200", True,
                        f"Status: 200, ok:true, templates echoed correctly (id:a1, name:Push A, rows with Bench Press), no _id leaks")
            else:
                issues = []
                if not has_ok:
                    issues.append("missing ok:true")
                if not has_templates:
                    issues.append("missing 'templates' field")
                if not templates_match:
                    issues.append("templates don't match expected data")
                if not no_id_leak:
                    issues.append(f"_id leak: {id_msg}")
                log_test(4, "Admin PUT /trainer/templates with template data -> 200", False,
                        f"Issues: {', '.join(issues)}. Response: {json.dumps(put_data)[:300]}")
        else:
            log_test(4, "Admin PUT /trainer/templates with template data -> 200", False,
                    f"Expected 200, got {put_resp.status_code}. Response: {put_resp.text[:200]}")

        # ============================================================
        # TEST 5: As ADMIN, GET /trainer/templates again -> templates persist
        # ============================================================
        print("\n--- TEST 5: Admin GET /trainer/templates again -> templates persist ---")
        
        get_resp2 = session.get(f"{BASE_URL}/trainer/templates")
        
        if get_resp2.status_code == 200:
            get_data2 = get_resp2.json()
            
            # Check if template persists
            has_templates = 'templates' in get_data2
            template_persists = False
            
            if has_templates and isinstance(get_data2['templates'], list) and len(get_data2['templates']) > 0:
                saved_template = get_data2['templates'][0]
                template_persists = (
                    saved_template.get('id') == 'a1' and
                    saved_template.get('name') == 'Push A' and
                    isinstance(saved_template.get('rows'), list) and
                    len(saved_template['rows']) > 0 and
                    saved_template['rows'][0].get('name') == 'Bench Press' and
                    saved_template['rows'][0].get('sets') == '3' and
                    saved_template['rows'][0].get('reps') == '8-12'
                )
            
            # Check for _id leaks
            no_id_leak, id_msg = check_no_mongo_id(get_data2, "response")
            
            if has_templates and template_persists and no_id_leak:
                log_test(5, "Admin GET /trainer/templates again -> templates persist", True,
                        f"Status: 200, template persists with id:a1, name:Push A, rows with Bench Press (sets:3, reps:8-12), no _id leaks")
            else:
                issues = []
                if not has_templates:
                    issues.append("missing 'templates' field")
                if not template_persists:
                    issues.append("template doesn't persist or data doesn't match")
                if not no_id_leak:
                    issues.append(f"_id leak: {id_msg}")
                log_test(5, "Admin GET /trainer/templates again -> templates persist", False,
                        f"Issues: {', '.join(issues)}. Response: {json.dumps(get_data2)[:300]}")
        else:
            log_test(5, "Admin GET /trainer/templates again -> templates persist", False,
                    f"Expected 200, got {get_resp2.status_code}. Response: {get_resp2.text[:200]}")

        # ============================================================
        # TEST 6: PUT /trainer/templates with NO auth -> 403
        # ============================================================
        print("\n--- TEST 6: PUT /trainer/templates with NO auth -> 403 ---")
        
        put_no_auth_resp = requests.put(f"{BASE_URL}/trainer/templates", json=template_data)
        
        if put_no_auth_resp.status_code == 403:
            log_test(6, "PUT /trainer/templates with NO auth -> 403", True,
                    f"Status: {put_no_auth_resp.status_code}")
        else:
            log_test(6, "PUT /trainer/templates with NO auth -> 403", False,
                    f"Expected 403, got {put_no_auth_resp.status_code}. Response: {put_no_auth_resp.text[:200]}")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
    print()

    if passed_tests == total_tests:
        print("✅ ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()

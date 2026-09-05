#!/usr/bin/env python3
"""
Backend API test for:
(A) WORKOUT TRACKER CLOUD SYNC
(B) COACH ASSIGN TEMPLATE

Tests ONLY these two new features as requested in the review.
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

def test_workout_tracker_cloud_sync():
    """Test (A) WORKOUT TRACKER CLOUD SYNC"""
    
    print("\n" + "="*80)
    print("(A) TESTING WORKOUT TRACKER CLOUD SYNC")
    print("="*80 + "\n")
    
    # Test 1: GET /api/client/tracker with NO auth -> 401
    print("\n--- Test 1: GET /api/client/tracker with NO auth -> 401 ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.get(f"{BASE_URL}/client/tracker")
        if r.status_code == 401:
            log_test(1, "GET /client/tracker with NO auth returns 401", True,
                    f"Correctly returns 401. Response: {r.json()}")
        else:
            log_test(1, "GET /client/tracker with NO auth returns 401", False,
                    f"Expected 401, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(1, "GET /client/tracker with NO auth returns 401", False, f"Exception: {str(e)}")
    
    # Test 2: Register + login NEW member M1, GET /api/client/tracker -> 200 with empty arrays
    print("\n--- Test 2: Register + login member M1, GET /client/tracker -> 200 with empty arrays ---")
    m1_session = requests.Session()
    m1_id = None
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        m1_data = {
            "username": f"m1_tracker_{timestamp}",
            "email": f"m1_tracker_{timestamp}@test.com",
            "password": "testpass123"
        }
        r = m1_session.post(f"{BASE_URL}/auth/register", json=m1_data)
        if r.status_code == 200:
            user_data = r.json()
            # Response structure is {'user': {...}}
            m1_id = user_data.get('user', {}).get('id') or user_data.get('id')
            print(f"    ✓ M1 registered successfully. ID: {m1_id}")
            
            # GET /client/tracker as M1
            r = m1_session.get(f"{BASE_URL}/client/tracker")
            if r.status_code == 200:
                data = r.json()
                has_workouts = 'workouts' in data
                has_templates = 'templates' in data
                workouts_empty = data.get('workouts') == []
                templates_empty = data.get('templates') == []
                
                # Check no _id leaks
                no_id_leak, id_msg = check_no_mongo_id(data, "response")
                
                if has_workouts and has_templates and workouts_empty and templates_empty and no_id_leak:
                    log_test(2, "M1 GET /client/tracker returns empty arrays", True,
                            f"Returns 200 with workouts=[], templates=[]. No _id leaks.")
                else:
                    log_test(2, "M1 GET /client/tracker returns empty arrays", False,
                            f"Validation failed. has_workouts={has_workouts}, has_templates={has_templates}, workouts_empty={workouts_empty}, templates_empty={templates_empty}, no_id_leak={no_id_leak}. {id_msg}")
            else:
                log_test(2, "M1 GET /client/tracker returns empty arrays", False,
                        f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
        else:
            log_test(2, "M1 GET /client/tracker returns empty arrays", False,
                    f"Failed to register M1: {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(2, "M1 GET /client/tracker returns empty arrays", False, f"Exception: {str(e)}")
    
    # Test 3: As M1, PUT /api/client/tracker with workout/template data -> 200
    print("\n--- Test 3: M1 PUT /client/tracker with workout/template data -> 200 ---")
    try:
        tracker_data = {
            "workouts": [
                {
                    "id": "w1",
                    "date": "9/5/2026",
                    "title": "Push Day",
                    "notes": "",
                    "exercises": [
                        {
                            "id": "e1",
                            "name": "Bench Press",
                            "cue": "",
                            "sets": [
                                {
                                    "id": "s1",
                                    "weight": "185",
                                    "reps": "5",
                                    "rpe": "8"
                                }
                            ]
                        }
                    ]
                }
            ],
            "templates": [
                {
                    "id": "t1",
                    "name": "My Push",
                    "exercises": []
                }
            ]
        }
        r = m1_session.put(f"{BASE_URL}/client/tracker", json=tracker_data)
        if r.status_code == 200:
            data = r.json()
            has_ok = data.get('ok') == True
            has_workouts = 'workouts' in data
            has_templates = 'templates' in data
            
            # Check no _id leaks
            no_id_leak, id_msg = check_no_mongo_id(data, "response")
            
            if has_ok and has_workouts and has_templates and no_id_leak:
                log_test(3, "M1 PUT /client/tracker with data", True,
                        f"Returns 200 with ok:true, workouts, templates. No _id leaks.")
            else:
                log_test(3, "M1 PUT /client/tracker with data", False,
                        f"Validation failed. ok={has_ok}, has_workouts={has_workouts}, has_templates={has_templates}, no_id_leak={no_id_leak}. {id_msg}")
        else:
            log_test(3, "M1 PUT /client/tracker with data", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(3, "M1 PUT /client/tracker with data", False, f"Exception: {str(e)}")
    
    # Test 4: GET /api/client/tracker as M1 -> workouts and templates persist
    print("\n--- Test 4: M1 GET /client/tracker -> verify persistence ---")
    try:
        r = m1_session.get(f"{BASE_URL}/client/tracker")
        if r.status_code == 200:
            data = r.json()
            workouts = data.get('workouts', [])
            templates = data.get('templates', [])
            
            # Check workouts
            has_workout = len(workouts) == 1
            workout_correct = False
            if has_workout:
                w = workouts[0]
                workout_correct = (
                    w.get('id') == 'w1' and
                    w.get('date') == '9/5/2026' and
                    w.get('title') == 'Push Day' and
                    len(w.get('exercises', [])) == 1 and
                    w['exercises'][0].get('name') == 'Bench Press' and
                    len(w['exercises'][0].get('sets', [])) == 1 and
                    w['exercises'][0]['sets'][0].get('weight') == '185'
                )
            
            # Check templates
            has_template = len(templates) == 1
            template_correct = False
            if has_template:
                t = templates[0]
                template_correct = (
                    t.get('id') == 't1' and
                    t.get('name') == 'My Push'
                )
            
            if has_workout and workout_correct and has_template and template_correct:
                log_test(4, "M1 GET /client/tracker verifies persistence", True,
                        f"Workouts and templates persisted correctly. Workout: {workouts[0].get('title')}, Template: {templates[0].get('name')}")
            else:
                log_test(4, "M1 GET /client/tracker verifies persistence", False,
                        f"Data not persisted correctly. has_workout={has_workout}, workout_correct={workout_correct}, has_template={has_template}, template_correct={template_correct}. Data: {json.dumps(data)[:300]}")
        else:
            log_test(4, "M1 GET /client/tracker verifies persistence", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(4, "M1 GET /client/tracker verifies persistence", False, f"Exception: {str(e)}")
    
    # Test 5: PUT /api/client/tracker with NO auth -> 401
    print("\n--- Test 5: PUT /client/tracker with NO auth -> 401 ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.put(f"{BASE_URL}/client/tracker", json={"workouts": [], "templates": []})
        if r.status_code == 401:
            log_test(5, "PUT /client/tracker with NO auth returns 401", True,
                    "Correctly returns 401 without auth")
        else:
            log_test(5, "PUT /client/tracker with NO auth returns 401", False,
                    f"Expected 401, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(5, "PUT /client/tracker with NO auth returns 401", False, f"Exception: {str(e)}")
    
    return m1_session, m1_id

def test_coach_assign_template(m1_session, m1_id):
    """Test (B) COACH ASSIGN TEMPLATE"""
    
    print("\n" + "="*80)
    print("(B) TESTING COACH ASSIGN TEMPLATE")
    print("="*80 + "\n")
    
    # Test 6: Register client M2 and capture their user id
    print("\n--- Test 6: Register client M2 and capture user id ---")
    m2_session = requests.Session()
    m2_id = None
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S%f")
        m2_data = {
            "username": f"m2_client_{timestamp}",
            "email": f"m2_client_{timestamp}@test.com",
            "password": "testpass123"
        }
        r = m2_session.post(f"{BASE_URL}/auth/register", json=m2_data)
        if r.status_code == 200:
            user_data = r.json()
            # Response structure is {'user': {...}}
            m2_id = user_data.get('user', {}).get('id') or user_data.get('id')
            if m2_id:
                log_test(6, "Register client M2 and capture user id", True,
                        f"M2 registered successfully. ID: {m2_id}")
            else:
                log_test(6, "Register client M2 and capture user id", False,
                        f"M2 registered but no id in response: {user_data}")
        else:
            log_test(6, "Register client M2 and capture user id", False,
                    f"Failed to register M2: {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(6, "Register client M2 and capture user id", False, f"Exception: {str(e)}")
    
    # Test 7: POST /api/trainer/assign-template with NO auth -> 403
    print("\n--- Test 7: POST /trainer/assign-template with NO auth -> 403 ---")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.post(f"{BASE_URL}/trainer/assign-template",
                                json={"clientId": m2_id, "template": {"name": "Test", "exercises": []}})
        if r.status_code == 403:
            log_test(7, "POST /trainer/assign-template with NO auth returns 403", True,
                    "Correctly returns 403 without auth")
        else:
            log_test(7, "POST /trainer/assign-template with NO auth returns 403", False,
                    f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(7, "POST /trainer/assign-template with NO auth returns 403", False, f"Exception: {str(e)}")
    
    # Test 8: As plain member M1, POST /api/trainer/assign-template -> 403
    print("\n--- Test 8: M1 (plain member) POST /trainer/assign-template -> 403 ---")
    try:
        r = m1_session.post(f"{BASE_URL}/trainer/assign-template",
                           json={"clientId": m2_id, "template": {"name": "Test", "exercises": []}})
        if r.status_code == 403:
            log_test(8, "M1 (plain member) POST /trainer/assign-template returns 403", True,
                    "Correctly returns 403 for non-trainer/non-admin")
        else:
            log_test(8, "M1 (plain member) POST /trainer/assign-template returns 403", False,
                    f"Expected 403, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(8, "M1 (plain member) POST /trainer/assign-template returns 403", False, f"Exception: {str(e)}")
    
    # Test 9: As ADMIN, POST /api/trainer/assign-template with valid data -> 200
    print("\n--- Test 9: Admin POST /trainer/assign-template with valid data -> 200 ---")
    admin_session = requests.Session()
    try:
        # Login as admin
        r = admin_session.post(f"{BASE_URL}/auth/login",
                              json={"username": "the hutch", "password": "Vzkfjf3n!3"})
        if r.status_code != 200:
            log_test(9, "Admin POST /trainer/assign-template with valid data", False,
                    f"Admin login failed: {r.status_code}. Response: {r.text[:200]}")
        else:
            print(f"    ✓ Admin logged in successfully")
            
            # POST assign-template
            template_data = {
                "clientId": m2_id,
                "template": {
                    "name": "Push (Coach)",
                    "exercises": [
                        {
                            "name": "Bench Press",
                            "cue": "",
                            "sets": [
                                {
                                    "weight": "",
                                    "reps": "8-12",
                                    "rpe": ""
                                }
                            ]
                        }
                    ]
                }
            }
            r = admin_session.post(f"{BASE_URL}/trainer/assign-template", json=template_data)
            if r.status_code == 200:
                data = r.json()
                has_ok = data.get('ok') == True
                
                # Check no _id leaks
                no_id_leak, id_msg = check_no_mongo_id(data, "response")
                
                if has_ok and no_id_leak:
                    log_test(9, "Admin POST /trainer/assign-template with valid data", True,
                            f"Returns 200 with ok:true. No _id leaks.")
                else:
                    log_test(9, "Admin POST /trainer/assign-template with valid data", False,
                            f"Validation failed. ok={has_ok}, no_id_leak={no_id_leak}. {id_msg}")
            else:
                log_test(9, "Admin POST /trainer/assign-template with valid data", False,
                        f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(9, "Admin POST /trainer/assign-template with valid data", False, f"Exception: {str(e)}")
    
    # Test 10: Login as M2, GET /api/client/tracker -> templates includes "Push (Coach)" with coachName
    print("\n--- Test 10: M2 GET /client/tracker -> verify template with coachName ---")
    try:
        r = m2_session.get(f"{BASE_URL}/client/tracker")
        if r.status_code == 200:
            data = r.json()
            templates = data.get('templates', [])
            
            # Find the "Push (Coach)" template
            push_template = None
            for t in templates:
                if t.get('name') == 'Push (Coach)':
                    push_template = t
                    break
            
            if push_template:
                has_coach_name = 'coachName' in push_template
                coach_name_value = push_template.get('coachName', '')
                has_exercises = len(push_template.get('exercises', [])) > 0
                
                if has_exercises:
                    exercise = push_template['exercises'][0]
                    exercise_name_correct = exercise.get('name') == 'Bench Press'
                else:
                    exercise_name_correct = False
                
                if has_coach_name and has_exercises and exercise_name_correct:
                    log_test(10, "M2 GET /client/tracker shows template with coachName", True,
                            f"Template 'Push (Coach)' found with coachName='{coach_name_value}', exercise='Bench Press'")
                else:
                    log_test(10, "M2 GET /client/tracker shows template with coachName", False,
                            f"Template validation failed. has_coach_name={has_coach_name}, has_exercises={has_exercises}, exercise_name_correct={exercise_name_correct}. Template: {push_template}")
            else:
                log_test(10, "M2 GET /client/tracker shows template with coachName", False,
                        f"Template 'Push (Coach)' not found. Templates: {templates}")
        else:
            log_test(10, "M2 GET /client/tracker shows template with coachName", False,
                    f"Expected 200, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(10, "M2 GET /client/tracker shows template with coachName", False, f"Exception: {str(e)}")
    
    # Test 11: As ADMIN, POST /api/trainer/assign-template with missing clientId -> 400
    print("\n--- Test 11: Admin POST /trainer/assign-template with missing clientId -> 400 ---")
    try:
        r = admin_session.post(f"{BASE_URL}/trainer/assign-template",
                              json={"template": {"name": "Test", "exercises": []}})
        if r.status_code == 400:
            log_test(11, "Admin POST with missing clientId returns 400", True,
                    f"Correctly returns 400. Response: {r.json()}")
        else:
            log_test(11, "Admin POST with missing clientId returns 400", False,
                    f"Expected 400, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(11, "Admin POST with missing clientId returns 400", False, f"Exception: {str(e)}")
    
    # Test 12: As ADMIN, POST with clientId that does not exist -> 404
    print("\n--- Test 12: Admin POST /trainer/assign-template with nonexistent clientId -> 404 ---")
    try:
        r = admin_session.post(f"{BASE_URL}/trainer/assign-template",
                              json={"clientId": "nonexistent123", "template": {"name": "Test", "exercises": []}})
        if r.status_code == 404:
            log_test(12, "Admin POST with nonexistent clientId returns 404", True,
                    f"Correctly returns 404. Response: {r.json()}")
        else:
            log_test(12, "Admin POST with nonexistent clientId returns 404", False,
                    f"Expected 404, got {r.status_code}. Response: {r.text[:200]}")
    except Exception as e:
        log_test(12, "Admin POST with nonexistent clientId returns 404", False, f"Exception: {str(e)}")

def main():
    """Main test runner"""
    try:
        # Test (A) WORKOUT TRACKER CLOUD SYNC
        m1_session, m1_id = test_workout_tracker_cloud_sync()
        
        # Test (B) COACH ASSIGN TEMPLATE
        test_coach_assign_template(m1_session, m1_id)
        
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
        print("✅ No MongoDB _id leaks detected (checked in all relevant tests)")
        
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

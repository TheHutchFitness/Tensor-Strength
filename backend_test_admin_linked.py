#!/usr/bin/env python3
"""
Backend test for: Admin (Hutch) linked to existing static Hutch profile
Tests the REFINED admin behavior where admin is LINKED to the existing static 'hutch' coach,
NOT its own separate DB trainer card.

Requirements:
1. Admin still has isTrainer === true AND slug === 'hutch' (linked to static profile)
2. Admin does NOT appear in GET /api/professionals (no duplicate public coach)
3. Client assignment still works (admin can be assigned as trainer)
"""

import requests
import json
import time

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

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

def check_no_leaks(data):
    """Check for MongoDB _id or passwordHash leaks"""
    json_str = json.dumps(data)
    if '"_id"' in json_str or '"passwordHash"' in json_str:
        return False
    return True

def main():
    print("=" * 80)
    print("BACKEND TEST: Admin (Hutch) linked to existing static Hutch profile")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    member_b_session = requests.Session()
    
    # Generate unique username for member B
    timestamp = str(int(time.time() * 1000))
    member_b_username = f"member_{timestamp[-8:]}"
    member_b_email = f"member_{timestamp}@test.com"
    password = "MemberPass123!"
    
    admin_id = None
    member_b_id = None
    
    try:
        # ============================================================
        # REQUIREMENT 1: ADMIN STILL A TRAINER + LINKED TO HUTCH
        # ============================================================
        print("\n" + "=" * 80)
        print("REQUIREMENT 1: ADMIN STILL A TRAINER + LINKED TO HUTCH")
        print("=" * 80)
        
        # Step 1: Login as admin
        print(f"\n1. Login as admin (username: '{ADMIN_USERNAME}', password: '{ADMIN_PASSWORD}')")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            admin_user = data.get("user", {})
            admin_id = admin_user.get("id")
            admin_role = admin_user.get("role")
            log_test("Admin login successful", True, f"role={admin_role}, id={admin_id}")
        else:
            log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
            print("\n❌ CRITICAL: Cannot proceed without admin login")
            return
        
        # Step 2: GET /api/admin/users and verify admin has isTrainer === true AND slug === 'hutch'
        print(f"\n2. GET /api/admin/users and verify admin has isTrainer === true AND slug === 'hutch'")
        resp = admin_session.get(f"{BASE_URL}/admin/users")
        if resp.status_code == 200:
            data = resp.json()
            users = data.get("users", [])
            
            # Find admin's own user record
            admin_record = next((u for u in users if u.get("role") == "admin"), None)
            
            if admin_record:
                is_trainer = admin_record.get("isTrainer")
                slug = admin_record.get("slug")
                
                if is_trainer is True:
                    log_test("Admin has isTrainer === true", True, f"isTrainer={is_trainer}")
                else:
                    log_test("Admin has isTrainer === true", False, f"Expected isTrainer=true, got {is_trainer}")
                
                if slug == "hutch":
                    log_test("Admin has slug === 'hutch'", True, f"slug='{slug}' (linked to static Hutch profile)")
                else:
                    log_test("Admin has slug === 'hutch'", False, f"Expected slug='hutch', got '{slug}'")
            else:
                log_test("Find admin record in users list", False, "Admin record not found")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /api/admin/users - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /api/admin/users - no leaks", True, "")
        else:
            log_test("GET /api/admin/users", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # REQUIREMENT 2: NO DUPLICATE PUBLIC COACH
        # ============================================================
        print("\n" + "=" * 80)
        print("REQUIREMENT 2: NO DUPLICATE PUBLIC COACH")
        print("=" * 80)
        
        # Step 3: GET /api/professionals (public, no auth) and verify admin does NOT appear
        print(f"\n3. GET /api/professionals (public endpoint, no auth) and verify admin does NOT appear")
        # Use a new session without auth cookie
        public_session = requests.Session()
        resp = public_session.get(f"{BASE_URL}/professionals")
        if resp.status_code == 200:
            data = resp.json()
            professionals = data.get("professionals", [])
            
            # Check if admin appears in the list (should NOT)
            admin_in_list = any(p.get("slug") == "hutch" for p in professionals)
            
            if not admin_in_list:
                log_test("Admin does NOT appear in /api/professionals", True, 
                        f"professionals list has {len(professionals)} entries, none with slug='hutch'")
            else:
                log_test("Admin does NOT appear in /api/professionals", False, 
                        "Found admin (slug='hutch') in professionals list - DUPLICATE COACH CARD!")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /api/professionals - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /api/professionals - no leaks", True, "")
        else:
            log_test("GET /api/professionals", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # REQUIREMENT 3: CLIENT ASSIGNMENT STILL WORKS
        # ============================================================
        print("\n" + "=" * 80)
        print("REQUIREMENT 3: CLIENT ASSIGNMENT STILL WORKS")
        print("=" * 80)
        
        # Step 4: Register a fresh member B
        print(f"\n4. Register fresh member B (username: '{member_b_username}')")
        resp = member_b_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_b_username,
            "email": member_b_email,
            "password": password
        })
        if resp.status_code == 200:
            data = resp.json()
            member_b_user = data.get("user", {})
            member_b_id = member_b_user.get("id")
            member_b_role = member_b_user.get("role")
            log_test("Register member B", True, f"role={member_b_role}, id={member_b_id}")
        else:
            log_test("Register member B", False, f"Status {resp.status_code}: {resp.text}")
            print("\n❌ CRITICAL: Cannot proceed without member B")
            return
        
        # Step 5: As admin, assign member B to admin as trainer
        print(f"\n5. As admin, PUT /api/admin/users to assign member B to admin as trainer")
        resp = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_b_id,
            "assignedTrainerId": admin_id
        })
        if resp.status_code == 200:
            data = resp.json()
            assigned_trainer_id = data.get("user", {}).get("assignedTrainerId")
            
            if assigned_trainer_id == admin_id:
                log_test("Assign member B to admin as trainer", True, 
                        f"assignedTrainerId={assigned_trainer_id} (matches admin id)")
            else:
                log_test("Assign member B to admin as trainer", False, 
                        f"Expected assignedTrainerId={admin_id}, got {assigned_trainer_id}")
        else:
            # Check if it's the old 400 error "Selected trainer is not a valid trainer"
            if resp.status_code == 400 and "not a valid trainer" in resp.text.lower():
                log_test("Assign member B to admin as trainer", False, 
                        f"Got 400 'Selected trainer is not a valid trainer' - BUG NOT FIXED!")
            else:
                log_test("Assign member B to admin as trainer", False, 
                        f"Status {resp.status_code}: {resp.text}")
        
        # Step 6: Re-GET /api/admin/users and confirm member B's assignedTrainerId === admin_id
        print(f"\n6. Re-GET /api/admin/users and confirm member B's assignedTrainerId persisted")
        resp = admin_session.get(f"{BASE_URL}/admin/users")
        if resp.status_code == 200:
            data = resp.json()
            users = data.get("users", [])
            
            # Find member B's record
            member_b_record = next((u for u in users if u.get("id") == member_b_id), None)
            
            if member_b_record:
                assigned_trainer_id = member_b_record.get("assignedTrainerId")
                
                if assigned_trainer_id == admin_id:
                    log_test("Member B's assignedTrainerId persisted", True, 
                            f"assignedTrainerId={assigned_trainer_id} (matches admin id)")
                else:
                    log_test("Member B's assignedTrainerId persisted", False, 
                            f"Expected assignedTrainerId={admin_id}, got {assigned_trainer_id}")
            else:
                log_test("Find member B record in users list", False, "Member B record not found")
        else:
            log_test("Re-GET /api/admin/users", False, f"Status {resp.status_code}: {resp.text}")
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # ============================================================
    # SUMMARY
    # ============================================================
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t["passed"])
    failed_tests = total_tests - passed_tests
    
    print(f"\nTotal tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    print(f"Success rate: {(passed_tests/total_tests*100):.1f}%")
    
    if failed_tests > 0:
        print("\n❌ FAILED TESTS:")
        for t in test_results:
            if not t["passed"]:
                print(f"  - {t['test']}: {t['details']}")
    
    print("\n" + "=" * 80)
    
    return failed_tests == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

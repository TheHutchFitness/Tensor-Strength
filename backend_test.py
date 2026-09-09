#!/usr/bin/env python3
"""
Backend test for: Admin (Hutch) acts as a trainer
Tests 3 specific requirements:
1. Admin has isTrainer === true (idempotent migration in ensureAdmin)
2. Admin can be assigned as trainer to clients (no 400 error)
3. Admin can edit trainer profile and appears in professionals list
"""

import requests
import json
import time

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"  # exact case as in .env
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
    print("BACKEND TEST: Admin (Hutch) acts as a trainer")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    member_b_session = requests.Session()
    
    # Generate unique username for member B
    timestamp = str(int(time.time() * 1000))
    member_b_username = f"client_{timestamp[-8:]}"
    member_b_email = f"client_{timestamp}@test.com"
    password = "ClientPass123!"
    
    try:
        # ============================================================
        # CHECK 1: ADMIN IS A TRAINER (isTrainer === true)
        # ============================================================
        print("\n" + "=" * 80)
        print("CHECK 1: ADMIN IS A TRAINER (isTrainer === true)")
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
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("Admin login response - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("Admin login response - no leaks", True, "")
        else:
            log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Step 2: GET /api/admin/users as admin and find admin's own record
        print(f"\n2. GET /api/admin/users and verify admin has isTrainer === true")
        resp = admin_session.get(f"{BASE_URL}/admin/users")
        if resp.status_code == 200:
            data = resp.json()
            users = data.get("users", [])
            
            # Find admin's own user record
            admin_record = next((u for u in users if u.get("id") == admin_id), None)
            
            if admin_record:
                is_trainer = admin_record.get("isTrainer")
                if is_trainer is True:
                    log_test("Admin has isTrainer === true", True, 
                            f"Admin record found with isTrainer={is_trainer}")
                else:
                    log_test("Admin has isTrainer === true", False, 
                            f"Admin record has isTrainer={is_trainer} (expected true)")
            else:
                log_test("Admin has isTrainer === true", False, 
                        f"Admin record not found in users list (id={admin_id})")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /admin/users - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /admin/users - no leaks", True, "")
        else:
            log_test("GET /admin/users", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # ============================================================
        # CHECK 2: ADMIN ASSIGNABLE AS A TRAINER TO CLIENTS
        # ============================================================
        print("\n" + "=" * 80)
        print("CHECK 2: ADMIN ASSIGNABLE AS A TRAINER TO CLIENTS")
        print("=" * 80)
        
        # Step 1: Register a fresh member B
        print(f"\n1. Register fresh member B (username: '{member_b_username}')")
        resp = member_b_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_b_username,
            "email": member_b_email,
            "password": password
        })
        if resp.status_code == 200:
            data = resp.json()
            member_b_user = data.get("user", {})
            member_b_id = member_b_user.get("id")
            log_test("Register member B", True, f"id={member_b_id}, role={member_b_user.get('role')}")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("Register member B - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("Register member B - no leaks", True, "")
        else:
            log_test("Register member B", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Step 2: As admin, assign admin as trainer to member B
        print(f"\n2. As admin, PUT /api/admin/users to assign admin as trainer to member B")
        print(f"   Body: {{id: '{member_b_id}', assignedTrainerId: '{admin_id}'}}")
        resp = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_b_id,
            "assignedTrainerId": admin_id
        })
        
        if resp.status_code == 200:
            data = resp.json()
            updated_user = data.get("user", {})
            assigned_trainer_id = updated_user.get("assignedTrainerId")
            
            if assigned_trainer_id == admin_id:
                log_test("Admin assigned as trainer to member B (200 OK)", True, 
                        f"assignedTrainerId={assigned_trainer_id} (matches admin id)")
            else:
                log_test("Admin assigned as trainer to member B (200 OK)", False, 
                        f"assignedTrainerId={assigned_trainer_id} (expected {admin_id})")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("PUT /admin/users assign trainer - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("PUT /admin/users assign trainer - no leaks", True, "")
        elif resp.status_code == 400:
            # This is the error we're testing for - should NOT happen
            error_msg = resp.json().get("error", "")
            log_test("Admin assigned as trainer to member B (200 OK)", False, 
                    f"Got 400 error: {error_msg} (This is the bug we're fixing!)")
        else:
            log_test("Admin assigned as trainer to member B (200 OK)", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # Step 3: Verify assignment by GET /api/admin/users again
        print(f"\n3. GET /api/admin/users again to confirm member B's assignedTrainerId === admin id")
        resp = admin_session.get(f"{BASE_URL}/admin/users")
        if resp.status_code == 200:
            data = resp.json()
            users = data.get("users", [])
            
            # Find member B's record
            member_b_record = next((u for u in users if u.get("id") == member_b_id), None)
            
            if member_b_record:
                assigned_trainer_id = member_b_record.get("assignedTrainerId")
                if assigned_trainer_id == admin_id:
                    log_test("Member B's assignedTrainerId === admin id", True, 
                            f"assignedTrainerId={assigned_trainer_id}")
                else:
                    log_test("Member B's assignedTrainerId === admin id", False, 
                            f"assignedTrainerId={assigned_trainer_id} (expected {admin_id})")
            else:
                log_test("Member B's assignedTrainerId === admin id", False, 
                        f"Member B record not found (id={member_b_id})")
        else:
            log_test("GET /admin/users to verify assignment", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # CHECK 3: ADMIN CAN EDIT TRAINER PROFILE
        # ============================================================
        print("\n" + "=" * 80)
        print("CHECK 3: ADMIN CAN EDIT TRAINER PROFILE")
        print("=" * 80)
        
        # Step 1: As admin, PUT /api/trainer/profile
        print(f"\n1. As admin, PUT /api/trainer/profile with photo/bio/trainerType")
        trainer_profile_data = {
            "photo": "https://example.com/hutch-photo.jpg",
            "bio": "Head coach and founder of Tensor Strength.",
            "trainerType": "Strength Coach"
        }
        resp = admin_session.put(f"{BASE_URL}/trainer/profile", json=trainer_profile_data)
        
        if resp.status_code == 200:
            data = resp.json()
            profile = data.get("profile", {})
            completed = data.get("completed")
            slug = data.get("slug")
            
            log_test("Admin PUT /api/trainer/profile (200 OK)", True, 
                    f"completed={completed}, slug={slug}")
            
            # Verify profile fields
            if profile.get("photo") == trainer_profile_data["photo"]:
                log_test("Trainer profile photo saved", True, f"photo={profile.get('photo')}")
            else:
                log_test("Trainer profile photo saved", False, 
                        f"photo={profile.get('photo')} (expected {trainer_profile_data['photo']})")
            
            if profile.get("bio") == trainer_profile_data["bio"]:
                log_test("Trainer profile bio saved", True, f"bio={profile.get('bio')}")
            else:
                log_test("Trainer profile bio saved", False, 
                        f"bio={profile.get('bio')} (expected {trainer_profile_data['bio']})")
            
            if profile.get("trainerType") == trainer_profile_data["trainerType"]:
                log_test("Trainer profile trainerType saved", True, 
                        f"trainerType={profile.get('trainerType')}")
            else:
                log_test("Trainer profile trainerType saved", False, 
                        f"trainerType={profile.get('trainerType')} (expected {trainer_profile_data['trainerType']})")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("PUT /trainer/profile - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("PUT /trainer/profile - no leaks", True, "")
        else:
            log_test("Admin PUT /api/trainer/profile (200 OK)", False, 
                    f"Status {resp.status_code}: {resp.text}")
            return
        
        # Step 2: GET /api/professionals (public) and confirm admin appears
        print(f"\n2. GET /api/professionals (public) and confirm admin appears in list")
        # Use a new session (no auth) to test public endpoint
        public_session = requests.Session()
        resp = public_session.get(f"{BASE_URL}/professionals")
        
        if resp.status_code == 200:
            data = resp.json()
            professionals = data.get("professionals", [])
            
            # Find admin in professionals list
            admin_professional = next((p for p in professionals 
                                      if p.get("slug") == slug), None)
            
            if admin_professional:
                log_test("Admin appears in /api/professionals list", True, 
                        f"Found admin with slug={slug}")
                
                # Verify profile fields in public list
                if admin_professional.get("photo") == trainer_profile_data["photo"]:
                    log_test("Admin professional photo correct", True, 
                            f"photo={admin_professional.get('photo')}")
                else:
                    log_test("Admin professional photo correct", False, 
                            f"photo={admin_professional.get('photo')}")
                
                if trainer_profile_data["bio"] in str(admin_professional.get("bio", [])):
                    log_test("Admin professional bio correct", True, 
                            f"bio contains expected text")
                else:
                    log_test("Admin professional bio correct", False, 
                            f"bio={admin_professional.get('bio')}")
                
                if admin_professional.get("title") == trainer_profile_data["trainerType"]:
                    log_test("Admin professional title correct", True, 
                            f"title={admin_professional.get('title')}")
                else:
                    log_test("Admin professional title correct", False, 
                            f"title={admin_professional.get('title')}")
            else:
                log_test("Admin appears in /api/professionals list", False, 
                        f"Admin not found in professionals list (slug={slug})")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /professionals - no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /professionals - no leaks", True, "")
        else:
            log_test("GET /api/professionals", False, 
                    f"Status {resp.status_code}: {resp.text}")
        
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
            print("\n❌ FAILED TESTS:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  • {r['test']}: {r['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")
        
        print("\n" + "=" * 80)
        print("SUMMARY OF 3 MAIN CHECKS:")
        print("=" * 80)
        
        # Check 1 summary
        check1_tests = [r for r in test_results if "isTrainer" in r["test"]]
        check1_passed = all(r["passed"] for r in check1_tests)
        print(f"CHECK 1 - Admin has isTrainer === true: {'✅ PASS' if check1_passed else '❌ FAIL'}")
        
        # Check 2 summary
        check2_tests = [r for r in test_results if "assigned" in r["test"].lower() or "assignedTrainerId" in r["test"]]
        check2_passed = all(r["passed"] for r in check2_tests)
        print(f"CHECK 2 - Admin assignable as trainer: {'✅ PASS' if check2_passed else '❌ FAIL'}")
        
        # Check 3 summary
        check3_tests = [r for r in test_results if "trainer/profile" in r["test"] or "professional" in r["test"].lower()]
        check3_passed = all(r["passed"] for r in check3_tests)
        print(f"CHECK 3 - Admin can edit trainer profile: {'✅ PASS' if check3_passed else '❌ FAIL'}")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

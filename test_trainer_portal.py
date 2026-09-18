#!/usr/bin/env python3
import os
"""
Backend API test suite for Tensor Strength Trainer Portal
Tests trainer assignment, client management, and check-in viewing
"""
import requests
import json
import sys
from datetime import datetime
import time

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def check_no_leaks(data, context=""):
    """Check that response doesn't leak _id or passwordHash"""
    data_str = json.dumps(data)
    if '"_id"' in data_str or '"passwordHash"' in data_str:
        log(f"❌ {context}: Response leaks _id or passwordHash!")
        return False
    return True

def test_trainer_portal():
    """Test all trainer portal endpoints"""
    log("=" * 80)
    log("STARTING TRAINER PORTAL BACKEND TESTS")
    log("=" * 80)
    
    passed = 0
    failed = 0
    
    # Create sessions for different users
    admin_session = requests.Session()
    trainer_session = requests.Session()
    client_session = requests.Session()
    
    # ========== STEP 1: Login as admin ==========
    log("\n[STEP 1] Login as admin")
    try:
        r = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": "The Hutch",
            "password": os.environ.get("TEST_ADMIN_PASSWORD", "")
        })
        if r.status_code == 200:
            admin_user = r.json().get('user', {})
            log(f"✅ Admin login successful: {admin_user.get('username')} (role={admin_user.get('role')})")
            log(f"   Cookie set: {'ts_token' in admin_session.cookies}")
            if not check_no_leaks(r.json(), "Admin login"):
                failed += 1
            else:
                passed += 1
        else:
            log(f"❌ Admin login failed: {r.status_code} - {r.text}")
            failed += 1
            return passed, failed
    except Exception as e:
        log(f"❌ Exception during admin login: {e}")
        failed += 1
        return passed, failed
    
    # ========== STEP 2: Register member A (trainer candidate) and member B (client) ==========
    log("\n[STEP 2] Register member A (trainer candidate) and member B (client)")
    
    # Register member A
    try:
        timestamp = datetime.now().timestamp()
        member_a_data = {
            "username": f"trainer_alex_{timestamp}",
            "email": f"trainer_alex_{timestamp}@tensorstrength.com",
            "password": "secure123"
        }
        r = requests.post(f"{BASE_URL}/auth/register", json=member_a_data)
        if r.status_code == 200:
            member_a = r.json().get('user', {})
            member_a_id = member_a.get('id')
            log(f"✅ Member A registered: {member_a.get('username')} (id={member_a_id})")
            log(f"   role={member_a.get('role')}, portalAccess={member_a.get('portalAccess')}, isTrainer={member_a.get('isTrainer')}")
            
            # Verify initial state
            if member_a.get('role') == 'member' and member_a.get('portalAccess') == False:
                log(f"✅ Member A has correct initial state")
            else:
                log(f"❌ Member A has incorrect initial state")
            
            if not check_no_leaks(r.json(), "Member A registration"):
                failed += 1
            else:
                passed += 1
        else:
            log(f"❌ Member A registration failed: {r.status_code} - {r.text}")
            failed += 1
            return passed, failed
    except Exception as e:
        log(f"❌ Exception during member A registration: {e}")
        failed += 1
        return passed, failed
    
    # Register member B
    try:
        member_b_data = {
            "username": f"client_bob_{timestamp}",
            "email": f"client_bob_{timestamp}@tensorstrength.com",
            "password": "secure456"
        }
        r = requests.post(f"{BASE_URL}/auth/register", json=member_b_data)
        if r.status_code == 200:
            member_b = r.json().get('user', {})
            member_b_id = member_b.get('id')
            log(f"✅ Member B registered: {member_b.get('username')} (id={member_b_id})")
            log(f"   role={member_b.get('role')}, portalAccess={member_b.get('portalAccess')}, isTrainer={member_b.get('isTrainer')}")
            
            if not check_no_leaks(r.json(), "Member B registration"):
                failed += 1
            else:
                passed += 1
        else:
            log(f"❌ Member B registration failed: {r.status_code} - {r.text}")
            failed += 1
            return passed, failed
    except Exception as e:
        log(f"❌ Exception during member B registration: {e}")
        failed += 1
        return passed, failed
    
    # ========== STEP 3: As admin, set member A as trainer ==========
    log("\n[STEP 3] As admin, PUT /api/admin/users to set member A as trainer")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_a_id,
            "isTrainer": True
        })
        if r.status_code == 200:
            updated_a = r.json().get('user', {})
            log(f"✅ Status: {r.status_code}")
            log(f"   Member A isTrainer: {updated_a.get('isTrainer')}")
            
            if updated_a.get('isTrainer') == True:
                log(f"✅ Member A successfully set as trainer")
                passed += 1
            else:
                log(f"❌ Member A isTrainer not set correctly: {updated_a.get('isTrainer')}")
                failed += 1
            
            if not check_no_leaks(r.json(), "Set isTrainer"):
                failed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 4: As admin, assign member B to trainer A ==========
    log("\n[STEP 4] As admin, PUT /api/admin/users to assign member B to trainer A")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_b_id,
            "assignedTrainerId": member_a_id
        })
        if r.status_code == 200:
            updated_b = r.json().get('user', {})
            log(f"✅ Status: {r.status_code}")
            log(f"   Member B assignedTrainerId: {updated_b.get('assignedTrainerId')}")
            
            if updated_b.get('assignedTrainerId') == member_a_id:
                log(f"✅ Member B successfully assigned to trainer A")
                passed += 1
            else:
                log(f"❌ Member B assignedTrainerId not set correctly: {updated_b.get('assignedTrainerId')}")
                failed += 1
            
            if not check_no_leaks(r.json(), "Assign trainer"):
                failed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 5: Try to assign to a non-trainer (should fail with 400) ==========
    log("\n[STEP 5] As admin, try to assign member B to a non-trainer user")
    try:
        # Register a fresh member who is NOT a trainer
        non_trainer_data = {
            "username": f"nontrainer_{timestamp}",
            "email": f"nontrainer_{timestamp}@test.com",
            "password": "secure789"
        }
        r = requests.post(f"{BASE_URL}/auth/register", json=non_trainer_data)
        if r.status_code == 200:
            non_trainer = r.json().get('user', {})
            non_trainer_id = non_trainer.get('id')
            log(f"   Registered non-trainer: {non_trainer.get('username')} (id={non_trainer_id})")
            
            # Try to assign B to this non-trainer
            r = admin_session.put(f"{BASE_URL}/admin/users", json={
                "id": member_b_id,
                "assignedTrainerId": non_trainer_id
            })
            if r.status_code == 400:
                log(f"✅ Status: {r.status_code} (expected 400)")
                log(f"   Error message: {r.json().get('error')}")
                passed += 1
            else:
                log(f"❌ Expected 400, got {r.status_code} - {r.text}")
                failed += 1
        else:
            log(f"❌ Failed to register non-trainer: {r.status_code}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 6: As member B (non-trainer), try to access /api/trainer/clients ==========
    log("\n[STEP 6] As member B (non-trainer), GET /api/trainer/clients")
    try:
        # Login as member B
        r = client_session.post(f"{BASE_URL}/auth/login", json={
            "username": member_b_data['username'],
            "password": member_b_data['password']
        })
        if r.status_code == 200:
            log(f"   Member B logged in")
            
            # Try to access trainer/clients
            r = client_session.get(f"{BASE_URL}/trainer/clients")
            if r.status_code == 403:
                log(f"✅ Status: {r.status_code} (expected 403)")
                log(f"   Error message: {r.json().get('error')}")
                passed += 1
            else:
                log(f"❌ Expected 403, got {r.status_code} - {r.text}")
                failed += 1
        else:
            log(f"❌ Member B login failed: {r.status_code}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 7: Login as trainer A and GET /api/trainer/clients ==========
    log("\n[STEP 7] Login as trainer A and GET /api/trainer/clients")
    try:
        # Login as member A (trainer)
        r = trainer_session.post(f"{BASE_URL}/auth/login", json={
            "username": member_a_data['username'],
            "password": member_a_data['password']
        })
        if r.status_code == 200:
            log(f"   Trainer A logged in")
            
            # Get clients list
            r = trainer_session.get(f"{BASE_URL}/trainer/clients")
            if r.status_code == 200:
                data = r.json()
                clients = data.get('clients', [])
                log(f"✅ Status: {r.status_code}")
                log(f"   Clients returned: {len(clients)}")
                
                # Check if member B is in the list
                client_ids = [c.get('id') for c in clients]
                if member_b_id in client_ids:
                    log(f"✅ Member B found in trainer A's client list")
                    
                    # Check for required fields
                    member_b_client = next(c for c in clients if c.get('id') == member_b_id)
                    if 'checkinCount' in member_b_client and 'lastCheckinAt' in member_b_client:
                        log(f"✅ Client has checkinCount ({member_b_client.get('checkinCount')}) and lastCheckinAt ({member_b_client.get('lastCheckinAt')})")
                    else:
                        log(f"❌ Client missing checkinCount or lastCheckinAt fields")
                    
                    passed += 1
                else:
                    log(f"❌ Member B not found in trainer A's client list")
                    failed += 1
                
                if not check_no_leaks(r.json(), "Trainer clients list"):
                    failed += 1
            else:
                log(f"❌ Status: {r.status_code} - {r.text}")
                failed += 1
        else:
            log(f"❌ Trainer A login failed: {r.status_code}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 8: Grant B portal access and create a check-in ==========
    log("\n[STEP 8] As admin, grant member B portalAccess and create a check-in")
    try:
        # Grant portal access
        r = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_b_id,
            "portalAccess": True
        })
        if r.status_code == 200:
            log(f"✅ Member B granted portalAccess")
            
            # Login as member B and create check-in
            r = client_session.post(f"{BASE_URL}/auth/login", json={
                "username": member_b_data['username'],
                "password": member_b_data['password']
            })
            if r.status_code == 200:
                log(f"   Member B logged in")
                
                # Create check-in
                r = client_session.post(f"{BASE_URL}/checkins", json={
                    "week": "1",
                    "wins": "hit all sessions",
                    "struggles": "sleep",
                    "readiness": "8"
                })
                if r.status_code == 200:
                    checkin = r.json()
                    log(f"✅ Check-in created: {checkin.get('id')}")
                    log(f"   week={checkin.get('week')}, wins={checkin.get('wins')}")
                    
                    if not check_no_leaks(r.json(), "Check-in creation"):
                        failed += 1
                    else:
                        passed += 1
                else:
                    log(f"❌ Check-in creation failed: {r.status_code} - {r.text}")
                    failed += 1
            else:
                log(f"❌ Member B re-login failed: {r.status_code}")
                failed += 1
        else:
            log(f"❌ Failed to grant portal access: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 9: As trainer A, GET /api/trainer/checkins?clientId=B.id ==========
    log("\n[STEP 9] As trainer A, GET /api/trainer/checkins?clientId=<B.id>")
    try:
        r = trainer_session.get(f"{BASE_URL}/trainer/checkins?clientId={member_b_id}")
        if r.status_code == 200:
            data = r.json()
            log(f"✅ Status: {r.status_code}")
            
            # Check response structure
            if 'client' in data and 'checkins' in data:
                client_info = data.get('client', {})
                checkins = data.get('checkins', [])
                
                log(f"   Client info: id={client_info.get('id')}, username={client_info.get('username')}, email={client_info.get('email')}")
                log(f"   Check-ins returned: {len(checkins)}")
                
                if len(checkins) >= 1:
                    log(f"✅ At least 1 check-in found")
                    log(f"   First check-in: week={checkins[0].get('week')}, wins={checkins[0].get('wins')}")
                    
                    # Verify newest-first sorting
                    if len(checkins) > 1:
                        dates = [c.get('createdAt') for c in checkins]
                        if dates == sorted(dates, reverse=True):
                            log(f"✅ Check-ins sorted newest-first")
                        else:
                            log(f"❌ Check-ins not sorted newest-first")
                else:
                    log(f"❌ No check-ins found")
                
                if not check_no_leaks(r.json(), "Trainer check-ins view"):
                    failed += 1
                else:
                    passed += 1
            else:
                log(f"❌ Response missing 'client' or 'checkins' fields")
                failed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 10: GET /api/trainer/checkins without clientId ==========
    log("\n[STEP 10] As trainer A, GET /api/trainer/checkins (no clientId query)")
    try:
        r = trainer_session.get(f"{BASE_URL}/trainer/checkins")
        if r.status_code == 400:
            log(f"✅ Status: {r.status_code} (expected 400)")
            log(f"   Error message: {r.json().get('error')}")
            passed += 1
        else:
            log(f"❌ Expected 400, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 11: Register member C and try to view their check-ins as trainer A ==========
    log("\n[STEP 11] Register member C (not assigned to A) and try to view their check-ins")
    try:
        member_c_data = {
            "username": f"client_charlie_{timestamp}",
            "email": f"client_charlie_{timestamp}@test.com",
            "password": "secure999"
        }
        r = requests.post(f"{BASE_URL}/auth/register", json=member_c_data)
        if r.status_code == 200:
            member_c = r.json().get('user', {})
            member_c_id = member_c.get('id')
            log(f"   Member C registered: {member_c.get('username')} (id={member_c_id})")
            
            # Try to view C's check-ins as trainer A
            r = trainer_session.get(f"{BASE_URL}/trainer/checkins?clientId={member_c_id}")
            if r.status_code == 403:
                log(f"✅ Status: {r.status_code} (expected 403)")
                log(f"   Error message: {r.json().get('error')}")
                passed += 1
            else:
                log(f"❌ Expected 403, got {r.status_code} - {r.text}")
                failed += 1
        else:
            log(f"❌ Failed to register member C: {r.status_code}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 12: As admin, demote trainer A and verify B is unassigned ==========
    log("\n[STEP 12] As admin, PUT /api/admin/users to demote trainer A (isTrainer=false)")
    try:
        r = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_a_id,
            "isTrainer": False
        })
        if r.status_code == 200:
            log(f"✅ Status: {r.status_code}")
            log(f"   Trainer A demoted")
            
            # Verify B is unassigned via GET /api/admin/users
            r = admin_session.get(f"{BASE_URL}/admin/users")
            if r.status_code == 200:
                users = r.json().get('users', [])
                member_b_updated = next((u for u in users if u.get('id') == member_b_id), None)
                
                if member_b_updated:
                    assigned_trainer = member_b_updated.get('assignedTrainerId')
                    log(f"   Member B assignedTrainerId: {assigned_trainer}")
                    
                    if assigned_trainer is None:
                        log(f"✅ Member B successfully unassigned (assignedTrainerId is null)")
                        passed += 1
                    else:
                        log(f"❌ Member B still has assignedTrainerId: {assigned_trainer}")
                        failed += 1
                else:
                    log(f"❌ Member B not found in users list")
                    failed += 1
            else:
                log(f"❌ Failed to get users list: {r.status_code}")
                failed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== STEP 13: GET /api/trainer/clients with NO auth cookie ==========
    log("\n[STEP 13] GET /api/trainer/clients with NO auth cookie")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.get(f"{BASE_URL}/trainer/clients")
        if r.status_code == 403:
            log(f"✅ Status: {r.status_code} (expected 403)")
            log(f"   Error message: {r.json().get('error')}")
            passed += 1
        else:
            log(f"❌ Expected 403, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== SUMMARY ==========
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    log(f"✅ PASSED: {passed}")
    log(f"❌ FAILED: {failed}")
    log(f"TOTAL: {passed + failed}")
    if passed + failed > 0:
        log(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    log("=" * 80)
    
    return passed, failed

if __name__ == "__main__":
    try:
        passed, failed = test_trainer_portal()
        sys.exit(0 if failed == 0 else 1)
    except Exception as e:
        log(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

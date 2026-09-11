#!/usr/bin/env python3
"""
Backend test for GET /api/trainer/insights endpoint.
Tests coach insights with adherence, flags, RPE, and readiness data.
"""

import requests
import json
import os
import random
import string

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Demo client
DEMO_CLIENT_ID = "da3cf979-45da-4c47-9b5f-8680d131038e"
DEMO_CLIENT_NAME = "Ben Carter"

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_result(passed, msg):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {msg}")

def register_member(session, username):
    """Register a new member"""
    resp = session.post(f"{API_BASE}/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "testpass123"
    })
    if resp.status_code != 200:
        print(f"  Register failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Registered: {username} (id={user.get('id')}, role={user.get('role')})")
    return user

def login(session, username, password):
    """Login and return user"""
    resp = session.post(f"{API_BASE}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code != 200:
        print(f"  Login failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Logged in: {username} (role={user.get('role')}, id={user.get('id')})")
    return user

def check_no_leaks(data):
    """Check for MongoDB _id leaks in response"""
    data_str = json.dumps(data)
    has_id = '_id' in data_str
    has_password = 'passwordHash' in data_str or 'password_hash' in data_str
    return not (has_id or has_password)

def main():
    print(f"\n{'#'*80}")
    print("# COACH INSIGHTS ENDPOINT TEST - GET /api/trainer/insights")
    print(f"# Base URL: {BASE_URL}")
    print(f"{'#'*80}\n")
    
    results = []
    
    # ========== TEST 1: ADMIN ACCESS ==========
    print_test("TEST 1: Admin GET /api/trainer/insights -> 200 with {clients:[...]}")
    
    admin_session = requests.Session()
    admin_user = login(admin_session, ADMIN_USERNAME, ADMIN_PASSWORD)
    
    if not admin_user:
        print("❌ CRITICAL: Admin login failed")
        results.append(("Admin login", False))
        return 1
    
    results.append(("Admin login", True))
    
    # GET /api/trainer/insights as admin
    resp = admin_session.get(f"{API_BASE}/trainer/insights")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print(f"  ❌ Expected 200, got {resp.status_code}")
        print(f"  Response: {resp.text}")
        results.append(("Admin GET insights returns 200", False))
        return 1
    
    results.append(("Admin GET insights returns 200", True))
    
    try:
        data = resp.json()
    except:
        print(f"  ❌ Failed to parse JSON response")
        results.append(("Response is valid JSON", False))
        return 1
    
    results.append(("Response is valid JSON", True))
    
    # Check response structure
    has_clients = 'clients' in data
    print(f"  Has 'clients' key: {has_clients}")
    results.append(("Response has 'clients' key", has_clients))
    
    if not has_clients:
        print(f"  ❌ Response missing 'clients' key: {data}")
        return 1
    
    clients = data.get('clients', [])
    is_array = isinstance(clients, list)
    print(f"  'clients' is array: {is_array}")
    results.append(("'clients' is array", is_array))
    
    if not is_array:
        print(f"  ❌ 'clients' is not an array: {type(clients)}")
        return 1
    
    print(f"  Number of clients: {len(clients)}")
    
    # ========== TEST 2: DEMO CLIENT PRESENT ==========
    print_test("TEST 2: Demo client 'Ben Carter' should be present")
    
    demo_client = None
    for client in clients:
        if client.get('id') == DEMO_CLIENT_ID:
            demo_client = client
            break
    
    if demo_client:
        print(f"  ✅ Found demo client: {demo_client.get('username')} (id={demo_client.get('id')})")
        results.append(("Demo client Ben Carter present", True))
    else:
        print(f"  ⚠️  Demo client not found (id={DEMO_CLIENT_ID})")
        print(f"  Available clients: {[c.get('username') for c in clients]}")
        results.append(("Demo client Ben Carter present", False))
    
    # ========== TEST 3: STRUCTURE AND TYPE CHECKS ==========
    print_test("TEST 3: Verify structure and types for each client")
    
    if len(clients) == 0:
        print("  ⚠️  No clients found, skipping structure checks")
        results.append(("Client structure validation", False))
    else:
        all_valid = True
        for i, client in enumerate(clients):
            print(f"\n  Client {i+1}: {client.get('username')}")
            
            # Required fields
            required_fields = ['id', 'username', 'adherence', 'flags', 'avgRpe', 'latestReadiness']
            for field in required_fields:
                if field not in client:
                    print(f"    ❌ Missing field: {field}")
                    all_valid = False
            
            # Check adherence structure
            adherence = client.get('adherence', {})
            if not isinstance(adherence, dict):
                print(f"    ❌ adherence is not a dict: {type(adherence)}")
                all_valid = False
            else:
                # Check adherence fields
                adherence_fields = ['workoutsLast7', 'workoutTarget', 'workoutPct', 'macroHitRate', 'checkinStreak']
                for field in adherence_fields:
                    if field not in adherence:
                        print(f"    ❌ adherence missing field: {field}")
                        all_valid = False
                
                # Type checks
                workoutsLast7 = adherence.get('workoutsLast7')
                workoutTarget = adherence.get('workoutTarget')
                workoutPct = adherence.get('workoutPct')
                macroHitRate = adherence.get('macroHitRate')
                checkinStreak = adherence.get('checkinStreak')
                
                print(f"    workoutsLast7: {workoutsLast7} (type: {type(workoutsLast7).__name__})")
                print(f"    workoutTarget: {workoutTarget} (type: {type(workoutTarget).__name__})")
                print(f"    workoutPct: {workoutPct} (type: {type(workoutPct).__name__})")
                print(f"    macroHitRate: {macroHitRate} (type: {type(macroHitRate).__name__})")
                print(f"    checkinStreak: {checkinStreak} (type: {type(checkinStreak).__name__})")
                
                # Validate workoutsLast7 is int
                if not isinstance(workoutsLast7, int):
                    print(f"    ❌ workoutsLast7 should be int, got {type(workoutsLast7).__name__}")
                    all_valid = False
                
                # Validate workoutTarget is int
                if not isinstance(workoutTarget, int):
                    print(f"    ❌ workoutTarget should be int, got {type(workoutTarget).__name__}")
                    all_valid = False
                
                # Validate workoutPct is int 0-100
                if not isinstance(workoutPct, int):
                    print(f"    ❌ workoutPct should be int, got {type(workoutPct).__name__}")
                    all_valid = False
                elif workoutPct < 0 or workoutPct > 100:
                    print(f"    ❌ workoutPct should be 0-100, got {workoutPct}")
                    all_valid = False
                
                # Validate macroHitRate is null or int 0-100
                if macroHitRate is not None:
                    if not isinstance(macroHitRate, int):
                        print(f"    ❌ macroHitRate should be null or int, got {type(macroHitRate).__name__}")
                        all_valid = False
                    elif macroHitRate < 0 or macroHitRate > 100:
                        print(f"    ❌ macroHitRate should be 0-100, got {macroHitRate}")
                        all_valid = False
                
                # Validate checkinStreak is int >= 0
                if not isinstance(checkinStreak, int):
                    print(f"    ❌ checkinStreak should be int, got {type(checkinStreak).__name__}")
                    all_valid = False
                elif checkinStreak < 0:
                    print(f"    ❌ checkinStreak should be >= 0, got {checkinStreak}")
                    all_valid = False
            
            # Check flags structure
            flags = client.get('flags', [])
            if not isinstance(flags, list):
                print(f"    ❌ flags is not an array: {type(flags)}")
                all_valid = False
            else:
                print(f"    flags: {len(flags)} flag(s)")
                for j, flag in enumerate(flags):
                    if not isinstance(flag, dict):
                        print(f"      ❌ Flag {j+1} is not a dict: {type(flag)}")
                        all_valid = False
                    else:
                        if 'type' not in flag:
                            print(f"      ❌ Flag {j+1} missing 'type' field")
                            all_valid = False
                        if 'label' not in flag:
                            print(f"      ❌ Flag {j+1} missing 'label' field")
                            all_valid = False
                        print(f"      Flag {j+1}: type={flag.get('type')}, label={flag.get('label')}")
                        if 'suggestion' in flag:
                            print(f"        suggestion: {flag.get('suggestion')}")
            
            # Check avgRpe (null or number)
            avgRpe = client.get('avgRpe')
            if avgRpe is not None and not isinstance(avgRpe, (int, float)):
                print(f"    ❌ avgRpe should be null or number, got {type(avgRpe).__name__}")
                all_valid = False
            else:
                print(f"    avgRpe: {avgRpe}")
            
            # Check latestReadiness (string)
            latestReadiness = client.get('latestReadiness')
            if not isinstance(latestReadiness, str):
                print(f"    ❌ latestReadiness should be string, got {type(latestReadiness).__name__}")
                all_valid = False
            else:
                print(f"    latestReadiness: '{latestReadiness}'")
        
        results.append(("Client structure validation", all_valid))
    
    # ========== TEST 4: SORTING (FLAGGED-FIRST) ==========
    print_test("TEST 4: Verify clients sorted flagged-first (more flags first)")
    
    if len(clients) < 2:
        print("  ⚠️  Less than 2 clients, skipping sort check")
        results.append(("Clients sorted flagged-first", True))  # Pass if not enough data
    else:
        is_sorted = True
        for i in range(len(clients) - 1):
            current_flags = len(clients[i].get('flags', []))
            next_flags = len(clients[i+1].get('flags', []))
            print(f"  Client {i+1} ({clients[i].get('username')}): {current_flags} flag(s)")
            if current_flags < next_flags:
                print(f"    ❌ Not sorted: client {i+1} has {current_flags} flags, but client {i+2} has {next_flags} flags")
                is_sorted = False
        
        if is_sorted:
            print(f"  ✅ Clients are sorted flagged-first")
        
        results.append(("Clients sorted flagged-first", is_sorted))
    
    # ========== TEST 5: NORMAL MEMBER ACCESS (403) ==========
    print_test("TEST 5: Normal member GET /api/trainer/insights -> 403")
    
    member_session = requests.Session()
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    member_username = f"testmember_{rand_suffix}"
    member_user = register_member(member_session, member_username)
    
    if not member_user:
        print("  ❌ Failed to register member")
        results.append(("Register normal member", False))
        results.append(("Normal member GET insights returns 403", False))
    else:
        results.append(("Register normal member", True))
        
        resp = member_session.get(f"{API_BASE}/trainer/insights")
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code == 403:
            print(f"  ✅ Normal member correctly denied (403)")
            results.append(("Normal member GET insights returns 403", True))
        else:
            print(f"  ❌ Expected 403, got {resp.status_code}")
            print(f"  Response: {resp.text}")
            results.append(("Normal member GET insights returns 403", False))
    
    # ========== TEST 6: ANONYMOUS ACCESS (401/403) ==========
    print_test("TEST 6: Anonymous GET /api/trainer/insights -> 401 or 403")
    
    anon_session = requests.Session()
    resp = anon_session.get(f"{API_BASE}/trainer/insights")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code in [401, 403]:
        print(f"  ✅ Anonymous correctly denied ({resp.status_code})")
        results.append(("Anonymous GET insights returns 401/403", True))
    else:
        print(f"  ❌ Expected 401 or 403, got {resp.status_code}")
        print(f"  Response: {resp.text}")
        results.append(("Anonymous GET insights returns 401/403", False))
    
    # ========== TEST 7: NO MONGODB _id LEAKS ==========
    print_test("TEST 7: No MongoDB _id or passwordHash leaks")
    
    no_leaks = check_no_leaks(data)
    if no_leaks:
        print(f"  ✅ No MongoDB _id or passwordHash leaks detected")
    else:
        print(f"  ❌ Found MongoDB _id or passwordHash in response")
    
    results.append(("No MongoDB _id leaks", no_leaks))
    
    # ========== SUMMARY ==========
    print(f"\n\n{'#'*80}")
    print("# TEST SUMMARY")
    print(f"{'#'*80}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        print_result(result, test_name)
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total if total > 0 else 0}%)")
    print(f"{'='*80}\n")
    
    if passed == total:
        print("✅ ALL TESTS PASSED - Coach insights endpoint fully functional")
        return 0
    else:
        print(f"❌ {total - passed} TEST(S) FAILED - Review failures above")
        return 1

if __name__ == "__main__":
    exit(main())

#!/usr/bin/env python3
"""
Backend test for PHASE B: Member self-load 4-week program onto calendar - COACH-BLOCK RULE ONLY
This test focuses on verifying the coach-block rule by creating a program in 'programs' collection
"""
import requests
import json
import random
import string
from datetime import datetime, timedelta

BASE_URL = "https://tensor-strength.preview.emergentagent.com/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def get_future_dates(start_days_ahead=30, count=3):
    """Generate future dates 30-60 days ahead to ensure /member/schedule returns them"""
    dates = []
    base = datetime.now() + timedelta(days=start_days_ahead)
    for i in range(count):
        date = base + timedelta(days=i*2)  # Every 2 days
        dates.append(date.strftime('%Y-%m-%d'))
    return dates

def test_coach_block():
    print("=" * 80)
    print("PHASE B: COACH-BLOCK RULE TESTING")
    print("=" * 80)
    
    # Admin credentials
    admin_username = "The Hutch"
    admin_password = "Vzkfjf3n!3"
    
    test_count = 0
    passed = 0
    
    # Test 1: Login as admin
    test_count += 1
    print(f"\nTest {test_count}: Login as admin")
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json={
            "username": admin_username,
            "password": admin_password
        })
        if r.status_code == 200:
            admin_cookies = r.cookies
            admin_data = r.json()
            admin_id = admin_data['user']['id']
            is_trainer = admin_data['user'].get('isTrainer', False)
            print(f"✅ PASS: Admin login successful (id={admin_id}, isTrainer={is_trainer})")
            passed += 1
        else:
            print(f"❌ FAIL: Admin login failed with status {r.status_code}")
            print(f"Response: {r.text[:200]}")
            return passed, test_count
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return passed, test_count
    
    # Test 2: Register fresh member for coach-block test
    test_count += 1
    print(f"\nTest {test_count}: Register fresh member for coach-block test")
    try:
        member_x_username = f"memberx_{random_string()}"
        member_x_email = f"{member_x_username}@example.com"
        member_x_password = "testpass123"
        
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "username": member_x_username,
            "email": member_x_email,
            "password": member_x_password
        })
        
        if r.status_code == 200:
            member_x_cookies = r.cookies
            member_x_data = r.json()
            member_x_id = member_x_data['user']['id']
            print(f"✅ PASS: Registered memberX: {member_x_username} (id={member_x_id})")
            passed += 1
        else:
            print(f"❌ FAIL: MemberX registration failed with status {r.status_code}")
            return passed, test_count
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return passed, test_count
    
    # Test 3: Assign memberX to admin
    test_count += 1
    print(f"\nTest {test_count}: Assign memberX to admin as trainer")
    try:
        r = requests.put(f"{BASE_URL}/admin/users", json={
            "id": member_x_id,
            "assignedTrainerId": admin_id
        }, cookies=admin_cookies)
        
        if r.status_code == 200:
            print(f"✅ PASS: MemberX assigned to admin (status={r.status_code})")
            passed += 1
        else:
            print(f"❌ FAIL: Assignment failed with status {r.status_code}")
            print(f"Response: {r.text[:200]}")
            return passed, test_count
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return passed, test_count
    
    # Test 4: Create a program in 'programs' collection (line 2151 endpoint)
    test_count += 1
    print(f"\nTest {test_count}: Create program in 'programs' collection via POST /api/trainer/programs")
    try:
        program_data = {
            "title": "Coach Test Program",
            "notes": "Test program for coach-block rule",
            "exercises": [
                {"name": "Squat", "sets": "3", "reps": "5", "load": "heavy", "notes": "Focus on depth", "cue": "Chest up"}
            ],
            "clientId": member_x_id
        }
        
        r = requests.post(f"{BASE_URL}/trainer/programs", json=program_data, cookies=admin_cookies)
        print(f"POST /api/trainer/programs response: status={r.status_code}")
        print(f"Response: {r.text[:500]}")
        
        if r.status_code == 200:
            program = r.json()
            program_id = program.get('id')
            print(f"✅ PASS: Program created in 'programs' collection (id={program_id})")
            passed += 1
        else:
            print(f"❌ FAIL: Program creation failed with status {r.status_code}")
            if r.status_code == 403:
                print(f"⚠️  Admin does not have isTrainer=true, cannot create program in 'programs' collection")
            return passed, test_count
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        return passed, test_count
    
    # Test 5: Create coach schedule using the program
    test_count += 1
    print(f"\nTest {test_count}: Create coach schedule for memberX using POST /api/trainer/schedule")
    try:
        future_date = get_future_dates(start_days_ahead=35, count=1)[0]
        schedule_data = {
            "clientId": member_x_id,
            "programId": program_id,
            "date": future_date,
            "autoload": True,
            "repeatWeekly": False
        }
        
        r = requests.post(f"{BASE_URL}/trainer/schedule", json=schedule_data, cookies=admin_cookies)
        print(f"POST /api/trainer/schedule response: status={r.status_code}")
        print(f"Response: {r.text[:500]}")
        
        if r.status_code == 200:
            print(f"✅ PASS: Coach schedule created successfully")
            coach_schedule_created = True
            passed += 1
        else:
            print(f"❌ FAIL: Coach schedule creation failed with status {r.status_code}")
            coach_schedule_created = False
            return passed, test_count
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
        coach_schedule_created = False
        return passed, test_count
    
    # Test 6: Check if memberX sees coachLoaded:true
    test_count += 1
    print(f"\nTest {test_count}: GET /api/member/load-status as memberX (check coachLoaded)")
    try:
        r = requests.get(f"{BASE_URL}/member/load-status", cookies=member_x_cookies)
        if r.status_code == 200:
            data = r.json()
            print(f"MemberX load-status: {data}")
            
            if data.get('coachLoaded') == True:
                print(f"✅ PASS: MemberX sees coachLoaded:true (coach schedule detected)")
                passed += 1
            else:
                print(f"❌ FAIL: Expected coachLoaded:true, got {data.get('coachLoaded')}")
        else:
            print(f"❌ FAIL: Expected 200, got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
    
    # Test 7: Try to self-load as memberX (should be blocked)
    test_count += 1
    print(f"\nTest {test_count}: POST /api/member/load-program as memberX (should be blocked)")
    try:
        future_dates_x = get_future_dates(start_days_ahead=50, count=2)
        r = requests.post(f"{BASE_URL}/member/load-program", json={
            "programId": "memberx-program",
            "label": "MemberX Program",
            "items": [
                {"date": future_dates_x[0], "title": "Day 1", "exercises": [{"name": "Squat", "sets": "3", "reps": "5", "load": "", "notes": ""}]},
                {"date": future_dates_x[1], "title": "Day 2", "exercises": [{"name": "Bench", "sets": "3", "reps": "5", "load": "", "notes": ""}]}
            ]
        }, cookies=member_x_cookies)
        
        print(f"POST /api/member/load-program response: status={r.status_code}")
        print(f"Response: {r.text[:300]}")
        
        if r.status_code == 409:
            data = r.json()
            if data.get('coachLoaded') == True and 'coach' in data.get('error', '').lower():
                print(f"✅ PASS: MemberX blocked from self-loading (409 with coachLoaded:true and coach mention)")
                passed += 1
            else:
                print(f"❌ FAIL: Got 409 but response doesn't match expected format: {data}")
        else:
            print(f"❌ FAIL: Expected 409 (coach-block), got {r.status_code}")
    except Exception as e:
        print(f"❌ FAIL: Exception: {e}")
    
    # ========== SUMMARY ==========
    print("\n" + "=" * 80)
    print(f"COACH-BLOCK RULE TESTING COMPLETE")
    print(f"Total tests: {test_count}")
    print(f"Passed: {passed}")
    print(f"Failed: {test_count - passed}")
    print(f"Success rate: {(passed/test_count*100):.1f}%")
    print("=" * 80)
    
    return passed, test_count

if __name__ == "__main__":
    passed, total = test_coach_block()
    exit(0 if passed == total else 1)

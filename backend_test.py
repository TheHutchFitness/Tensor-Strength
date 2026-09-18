#!/usr/bin/env python3
"""
Backend testing script for Tensor Strength API
Tests security fixes and regressions after code review + security audit
"""

import requests
import json
import random
import string
from datetime import datetime, timedelta

# Base URL from environment
BASE_URL = "https://tensor-strength.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# CRON_SECRET from .env
CRON_SECRET = "77d2e7126c0da6c2d9a3ac40efece1a8559398529be5957e"

def random_string(length=8):
    """Generate a random string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def register_member(username=None):
    """Register a new member and return credentials + cookie"""
    if not username:
        username = f"testmember_{random_string()}"
    email = f"{username}@example.com"
    password = "testpass123"
    
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    if response.status_code == 200:
        cookie = response.cookies.get("ts_token")
        user_data = response.json().get("user", {})
        return {
            "username": username,
            "email": email,
            "password": password,
            "cookie": cookie,
            "id": user_data.get("id")
        }
    else:
        print(f"❌ Failed to register member: {response.status_code} {response.text}")
        return None

def admin_login():
    """Login as admin and return cookie + user data"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        cookie = response.cookies.get("ts_token")
        user_data = response.json().get("user", {})
        return {"cookie": cookie, "id": user_data.get("id"), "username": user_data.get("username")}
    else:
        print(f"❌ Admin login failed: {response.status_code} {response.text}")
        return None

print("=" * 80)
print("BACKEND TESTING: Security Fixes + Regressions")
print("=" * 80)

# ============================================================================
# A) SEC-001 HARDENING: POST /api/push/subscribe strict validation
# ============================================================================
print("\n" + "=" * 80)
print("A) SEC-001 HARDENING: POST /api/push/subscribe strict validation")
print("=" * 80)

# Register a test member for push subscription tests
member = register_member()
if not member:
    print("❌ Failed to register member for push tests")
    exit(1)

member_cookie = {"ts_token": member["cookie"]}

# Test A1: Valid subscription with proper types -> 200
print("\n[A1] Valid subscription with proper types")
try:
    valid_sub = {
        "subscription": {
            "endpoint": f"https://example.com/ep-{random_string(16)}",
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty_base64_string_here",
                "auth": "abc123_auth_key"
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=valid_sub, cookies=member_cookie)
    if response.status_code == 200 and response.json().get("ok") == True:
        print(f"✅ Valid subscription accepted: {response.status_code}")
    else:
        print(f"❌ Valid subscription rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A1 failed: {e}")

# Test A2: Invalid endpoint (number instead of string) -> 400
print("\n[A2] Invalid endpoint (number instead of string)")
try:
    invalid_sub = {
        "subscription": {
            "endpoint": 12345,  # number, not string
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty",
                "auth": "abc"
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=invalid_sub, cookies=member_cookie)
    if response.status_code == 400:
        print(f"✅ Invalid endpoint (number) rejected: {response.status_code}")
    else:
        print(f"❌ Invalid endpoint (number) NOT rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A2 failed: {e}")

# Test A3: Invalid endpoint (object like {"$ne":""}) -> 400
print("\n[A3] Invalid endpoint (object like {\"$ne\":\"\"})")
try:
    invalid_sub = {
        "subscription": {
            "endpoint": {"$ne": ""},  # object, not string
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty",
                "auth": "abc"
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=invalid_sub, cookies=member_cookie)
    if response.status_code == 400:
        print(f"✅ Invalid endpoint (object) rejected: {response.status_code}")
    else:
        print(f"❌ Invalid endpoint (object) NOT rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A3 failed: {e}")

# Test A4: Invalid endpoint (http:// instead of https://) -> 400
print("\n[A4] Invalid endpoint (http:// instead of https://)")
try:
    invalid_sub = {
        "subscription": {
            "endpoint": "http://example.com/ep-test",  # http, not https
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty",
                "auth": "abc"
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=invalid_sub, cookies=member_cookie)
    if response.status_code == 400:
        print(f"✅ Invalid endpoint (http://) rejected: {response.status_code}")
    else:
        print(f"❌ Invalid endpoint (http://) NOT rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A4 failed: {e}")

# Test A5: Missing keys.p256dh -> 400
print("\n[A5] Missing keys.p256dh")
try:
    invalid_sub = {
        "subscription": {
            "endpoint": "https://example.com/ep-test",
            "expirationTime": None,
            "keys": {
                "auth": "abc"
                # p256dh missing
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=invalid_sub, cookies=member_cookie)
    if response.status_code == 400:
        print(f"✅ Missing keys.p256dh rejected: {response.status_code}")
    else:
        print(f"❌ Missing keys.p256dh NOT rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A5 failed: {e}")

# Test A6: Missing keys.auth -> 400
print("\n[A6] Missing keys.auth")
try:
    invalid_sub = {
        "subscription": {
            "endpoint": "https://example.com/ep-test",
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty"
                # auth missing
            }
        }
    }
    response = requests.post(f"{BASE_URL}/push/subscribe", json=invalid_sub, cookies=member_cookie)
    if response.status_code == 400:
        print(f"✅ Missing keys.auth rejected: {response.status_code}")
    else:
        print(f"❌ Missing keys.auth NOT rejected: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test A6 failed: {e}")

# Test A7: Re-subscribe same endpoint -> upsert (no duplicate)
print("\n[A7] Re-subscribe same endpoint (upsert, no duplicate)")
try:
    endpoint = f"https://example.com/ep-{random_string(16)}"
    sub1 = {
        "subscription": {
            "endpoint": endpoint,
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty_first",
                "auth": "abc123_first"
            }
        }
    }
    response1 = requests.post(f"{BASE_URL}/push/subscribe", json=sub1, cookies=member_cookie)
    
    # Get subscription count
    status1 = requests.get(f"{BASE_URL}/push/status", cookies=member_cookie)
    count1 = status1.json().get("subscriptions", 0)
    
    # Re-subscribe with same endpoint but different keys
    sub2 = {
        "subscription": {
            "endpoint": endpoint,  # same endpoint
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty_second",
                "auth": "abc123_second"
            }
        }
    }
    response2 = requests.post(f"{BASE_URL}/push/subscribe", json=sub2, cookies=member_cookie)
    
    # Get subscription count again
    status2 = requests.get(f"{BASE_URL}/push/status", cookies=member_cookie)
    count2 = status2.json().get("subscriptions", 0)
    
    if response1.status_code == 200 and response2.status_code == 200 and count1 == count2:
        print(f"✅ Re-subscribe upsert working (count unchanged: {count1} -> {count2})")
    else:
        print(f"❌ Re-subscribe upsert NOT working: count {count1} -> {count2}")
except Exception as e:
    print(f"❌ Test A7 failed: {e}")

# ============================================================================
# B) COACH-BLOCK LOGIC: Only counts ACTIVE (future/recurring) coach schedules
# ============================================================================
print("\n" + "=" * 80)
print("B) COACH-BLOCK LOGIC: Only counts ACTIVE (future/recurring) coach schedules")
print("=" * 80)

# Login as admin
admin = admin_login()
if not admin:
    print("❌ Failed to login as admin")
    exit(1)

admin_cookie = {"ts_token": admin["cookie"]}

# Register a fresh member for coach-block tests
memberX = register_member(f"memberx_{random_string()}")
if not memberX:
    print("❌ Failed to register memberX")
    exit(1)

memberX_cookie = {"ts_token": memberX["cookie"]}

# Assign memberX to admin
print(f"\n[B1] Assign memberX (id={memberX['id']}) to admin (id={admin['id']})")
try:
    response = requests.put(
        f"{BASE_URL}/admin/users",
        json={"id": memberX["id"], "assignedTrainerId": admin["id"]},
        cookies=admin_cookie
    )
    if response.status_code == 200:
        print(f"✅ memberX assigned to admin: {response.status_code}")
    else:
        print(f"❌ Failed to assign memberX to admin: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test B1 failed: {e}")

# Create a program in 'programs' collection (admin has isTrainer=true)
print("\n[B2] Create a program for coach schedule")
try:
    program_data = {
        "title": "Coach Test Program",
        "exercises": [
            {
                "name": "Squat",
                "sets": "3",
                "reps": "5",
                "load": "heavy",
                "notes": "Focus on depth",
                "cue": "Chest up"
            }
        ],
        "clientId": memberX["id"]
    }
    response = requests.post(f"{BASE_URL}/trainer/programs", json=program_data, cookies=admin_cookie)
    if response.status_code == 200:
        program_id = response.json().get("id")
        print(f"✅ Program created: {program_id}")
    else:
        print(f"❌ Failed to create program: {response.status_code} {response.text}")
        program_id = None
except Exception as e:
    print(f"❌ Test B2 failed: {e}")
    program_id = None

if program_id:
    # Test B3: Create coach schedule with PAST date -> memberX should have coachLoaded:FALSE
    print("\n[B3] Create coach schedule with PAST date (2020-01-01)")
    try:
        past_date = "2020-01-01"
        schedule_data = {
            "clientId": memberX["id"],
            "programId": program_id,
            "date": past_date,
            "autoload": True,
            "repeatWeekly": False
        }
        response = requests.post(f"{BASE_URL}/trainer/schedule", json=schedule_data, cookies=admin_cookie)
        if response.status_code == 200:
            print(f"✅ Past coach schedule created: {response.status_code}")
            
            # Check memberX load-status
            status_response = requests.get(f"{BASE_URL}/member/load-status", cookies=memberX_cookie)
            if status_response.status_code == 200:
                status_data = status_response.json()
                coach_loaded = status_data.get("coachLoaded", True)
                if coach_loaded == False:
                    print(f"✅ memberX coachLoaded=FALSE with past coach schedule (correct)")
                else:
                    print(f"❌ memberX coachLoaded=TRUE with past coach schedule (should be FALSE)")
                
                # Try to self-load -> should SUCCEED (200)
                future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                load_data = {
                    "programId": "test-program",
                    "label": "Test Program",
                    "items": [
                        {
                            "date": future_date,
                            "title": "Test Workout",
                            "exercises": [{"name": "Squat", "sets": "3", "reps": "5", "load": "heavy", "notes": ""}]
                        }
                    ]
                }
                load_response = requests.post(f"{BASE_URL}/member/load-program", json=load_data, cookies=memberX_cookie)
                if load_response.status_code == 200:
                    print(f"✅ memberX can self-load with past coach schedule (200)")
                else:
                    print(f"❌ memberX CANNOT self-load with past coach schedule: {load_response.status_code} {load_response.text}")
            else:
                print(f"❌ Failed to get load-status: {status_response.status_code} {status_response.text}")
        else:
            print(f"❌ Failed to create past coach schedule: {response.status_code} {response.text}")
    except Exception as e:
        print(f"❌ Test B3 failed: {e}")
    
    # Clean up self-loaded program
    try:
        requests.delete(f"{BASE_URL}/member/load-program", cookies=memberX_cookie)
    except:
        pass
    
    # Test B4: Create coach schedule with FUTURE date -> memberX should have coachLoaded:TRUE
    print("\n[B4] Create coach schedule with FUTURE date")
    try:
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        schedule_data = {
            "clientId": memberX["id"],
            "programId": program_id,
            "date": future_date,
            "autoload": True,
            "repeatWeekly": False
        }
        response = requests.post(f"{BASE_URL}/trainer/schedule", json=schedule_data, cookies=admin_cookie)
        if response.status_code == 200:
            print(f"✅ Future coach schedule created: {response.status_code}")
            
            # Check memberX load-status
            status_response = requests.get(f"{BASE_URL}/member/load-status", cookies=memberX_cookie)
            if status_response.status_code == 200:
                status_data = status_response.json()
                coach_loaded = status_data.get("coachLoaded", False)
                if coach_loaded == True:
                    print(f"✅ memberX coachLoaded=TRUE with future coach schedule (correct)")
                else:
                    print(f"❌ memberX coachLoaded=FALSE with future coach schedule (should be TRUE)")
                
                # Try to self-load -> should FAIL (409)
                load_data = {
                    "programId": "test-program",
                    "label": "Test Program",
                    "items": [
                        {
                            "date": (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d"),
                            "title": "Test Workout",
                            "exercises": [{"name": "Squat", "sets": "3", "reps": "5", "load": "heavy", "notes": ""}]
                        }
                    ]
                }
                load_response = requests.post(f"{BASE_URL}/member/load-program", json=load_data, cookies=memberX_cookie)
                if load_response.status_code == 409:
                    print(f"✅ memberX CANNOT self-load with future coach schedule (409)")
                else:
                    print(f"❌ memberX CAN self-load with future coach schedule: {load_response.status_code} (should be 409)")
            else:
                print(f"❌ Failed to get load-status: {status_response.status_code} {status_response.text}")
        else:
            print(f"❌ Failed to create future coach schedule: {response.status_code} {response.text}")
    except Exception as e:
        print(f"❌ Test B4 failed: {e}")
    
    # Test B5: Create coach schedule with repeatWeekly:true -> memberX should have coachLoaded:TRUE
    print("\n[B5] Create coach schedule with repeatWeekly:true")
    try:
        # Delete previous schedules first
        requests.delete(f"{BASE_URL}/trainer/schedule", params={"clientId": memberX["id"]}, cookies=admin_cookie)
        
        schedule_data = {
            "clientId": memberX["id"],
            "programId": program_id,
            "date": "2020-01-01",  # past date but repeatWeekly=true
            "autoload": True,
            "repeatWeekly": True
        }
        response = requests.post(f"{BASE_URL}/trainer/schedule", json=schedule_data, cookies=admin_cookie)
        if response.status_code == 200:
            print(f"✅ Recurring coach schedule created: {response.status_code}")
            
            # Check memberX load-status
            status_response = requests.get(f"{BASE_URL}/member/load-status", cookies=memberX_cookie)
            if status_response.status_code == 200:
                status_data = status_response.json()
                coach_loaded = status_data.get("coachLoaded", False)
                if coach_loaded == True:
                    print(f"✅ memberX coachLoaded=TRUE with repeatWeekly schedule (correct)")
                else:
                    print(f"❌ memberX coachLoaded=FALSE with repeatWeekly schedule (should be TRUE)")
                
                # Try to self-load -> should FAIL (409)
                load_data = {
                    "programId": "test-program",
                    "label": "Test Program",
                    "items": [
                        {
                            "date": (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d"),
                            "title": "Test Workout",
                            "exercises": [{"name": "Squat", "sets": "3", "reps": "5", "load": "heavy", "notes": ""}]
                        }
                    ]
                }
                load_response = requests.post(f"{BASE_URL}/member/load-program", json=load_data, cookies=memberX_cookie)
                if load_response.status_code == 409:
                    print(f"✅ memberX CANNOT self-load with repeatWeekly schedule (409)")
                else:
                    print(f"❌ memberX CAN self-load with repeatWeekly schedule: {load_response.status_code} (should be 409)")
            else:
                print(f"❌ Failed to get load-status: {status_response.status_code} {status_response.text}")
        else:
            print(f"❌ Failed to create recurring coach schedule: {response.status_code} {response.text}")
    except Exception as e:
        print(f"❌ Test B5 failed: {e}")

# ============================================================================
# C) CRON /api/push/reminders RETRY/IDEMPOTENCY
# ============================================================================
print("\n" + "=" * 80)
print("C) CRON /api/push/reminders RETRY/IDEMPOTENCY")
print("=" * 80)

# Test C1: Call with ?secret=<CRON_SECRET>&force=1 -> 200
print("\n[C1] Call with ?secret=<CRON_SECRET>&force=1")
try:
    response = requests.get(f"{BASE_URL}/push/reminders?secret={CRON_SECRET}&force=1")
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", {})
        if "today-workout" in results and "daily-check-in" in results:
            print(f"✅ Cron with force=1 returns 200 with today-workout and daily-check-in")
        else:
            print(f"❌ Cron with force=1 missing expected jobs: {results.keys()}")
    else:
        print(f"❌ Cron with force=1 failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test C1 failed: {e}")

# Test C2: Call once normally (no force) -> jobs run (not skipped)
print("\n[C2] Call once normally (no force) -> jobs run (not skipped)")
try:
    response = requests.get(f"{BASE_URL}/push/reminders?secret={CRON_SECRET}")
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", {})
        today_workout = results.get("today-workout", {})
        daily_checkin = results.get("daily-check-in", {})
        
        if not today_workout.get("skipped") and not daily_checkin.get("skipped"):
            print(f"✅ First call runs jobs (not skipped)")
        else:
            print(f"❌ First call shows skipped: today-workout={today_workout.get('skipped')}, daily-check-in={daily_checkin.get('skipped')}")
    else:
        print(f"❌ Cron first call failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test C2 failed: {e}")

# Test C3: Call again same day (no force) -> jobs show skipped:true
print("\n[C3] Call again same day (no force) -> jobs show skipped:true")
try:
    response = requests.get(f"{BASE_URL}/push/reminders?secret={CRON_SECRET}")
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", {})
        today_workout = results.get("today-workout", {})
        daily_checkin = results.get("daily-check-in", {})
        
        if today_workout.get("skipped") == True and daily_checkin.get("skipped") == True:
            print(f"✅ Second call shows skipped:true (idempotency working)")
        else:
            print(f"❌ Second call does NOT show skipped: today-workout={today_workout.get('skipped')}, daily-check-in={daily_checkin.get('skipped')}")
    else:
        print(f"❌ Cron second call failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test C3 failed: {e}")

# Test C4: Call with ?weekly=1 includes weekly-check-in
print("\n[C4] Call with ?weekly=1&force=1 includes weekly-check-in")
try:
    response = requests.get(f"{BASE_URL}/push/reminders?secret={CRON_SECRET}&weekly=1&force=1")
    if response.status_code == 200:
        data = response.json()
        results = data.get("results", {})
        if "weekly-check-in" in results:
            print(f"✅ Cron with weekly=1 includes weekly-check-in")
        else:
            print(f"❌ Cron with weekly=1 missing weekly-check-in: {results.keys()}")
    else:
        print(f"❌ Cron with weekly=1 failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test C4 failed: {e}")

# ============================================================================
# D) REGRESSION: Confirm all previously-passing endpoints still work
# ============================================================================
print("\n" + "=" * 80)
print("D) REGRESSION: Confirm all previously-passing endpoints still work")
print("=" * 80)

# Test D1: GET /api/push/vapid-public-key (200, publicKey)
print("\n[D1] GET /api/push/vapid-public-key")
try:
    response = requests.get(f"{BASE_URL}/push/vapid-public-key")
    if response.status_code == 200:
        data = response.json()
        if data.get("publicKey") and data.get("configured") == True:
            print(f"✅ GET /api/push/vapid-public-key returns 200 with publicKey")
        else:
            print(f"❌ GET /api/push/vapid-public-key missing publicKey or configured: {data}")
    else:
        print(f"❌ GET /api/push/vapid-public-key failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D1 failed: {e}")

# Test D2: GET /api/push/status (auth required)
print("\n[D2] GET /api/push/status (auth required)")
try:
    # Without auth -> 401
    response = requests.get(f"{BASE_URL}/push/status")
    if response.status_code == 401:
        print(f"✅ GET /api/push/status without auth returns 401")
    else:
        print(f"❌ GET /api/push/status without auth does NOT return 401: {response.status_code}")
    
    # With auth -> 200
    response = requests.get(f"{BASE_URL}/push/status", cookies=member_cookie)
    if response.status_code == 200:
        data = response.json()
        if "configured" in data and "subscriptions" in data and "remindersEnabled" in data:
            print(f"✅ GET /api/push/status with auth returns 200 with correct shape")
        else:
            print(f"❌ GET /api/push/status with auth missing fields: {data}")
    else:
        print(f"❌ GET /api/push/status with auth failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D2 failed: {e}")

# Test D3: POST /api/push/preferences toggle
print("\n[D3] POST /api/push/preferences toggle")
try:
    # Toggle to false
    response = requests.post(f"{BASE_URL}/push/preferences", json={"remindersEnabled": False}, cookies=member_cookie)
    if response.status_code == 200 and response.json().get("remindersEnabled") == False:
        print(f"✅ POST /api/push/preferences toggle to false works")
    else:
        print(f"❌ POST /api/push/preferences toggle to false failed: {response.status_code} {response.text}")
    
    # Toggle back to true
    response = requests.post(f"{BASE_URL}/push/preferences", json={"remindersEnabled": True}, cookies=member_cookie)
    if response.status_code == 200 and response.json().get("remindersEnabled") == True:
        print(f"✅ POST /api/push/preferences toggle to true works")
    else:
        print(f"❌ POST /api/push/preferences toggle to true failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D3 failed: {e}")

# Test D4: POST /api/push/unsubscribe
print("\n[D4] POST /api/push/unsubscribe")
try:
    # Subscribe first
    endpoint = f"https://example.com/ep-{random_string(16)}"
    sub = {
        "subscription": {
            "endpoint": endpoint,
            "expirationTime": None,
            "keys": {
                "p256dh": "BOmNonEmpty",
                "auth": "abc123"
            }
        }
    }
    requests.post(f"{BASE_URL}/push/subscribe", json=sub, cookies=member_cookie)
    
    # Unsubscribe
    response = requests.post(f"{BASE_URL}/push/unsubscribe", json={"endpoint": endpoint}, cookies=member_cookie)
    if response.status_code == 200 and response.json().get("ok") == True:
        print(f"✅ POST /api/push/unsubscribe works")
    else:
        print(f"❌ POST /api/push/unsubscribe failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D4 failed: {e}")

# Test D5: POST /api/push/test (200)
print("\n[D5] POST /api/push/test")
try:
    response = requests.post(f"{BASE_URL}/push/test", cookies=member_cookie)
    if response.status_code == 200:
        print(f"✅ POST /api/push/test returns 200")
    else:
        print(f"❌ POST /api/push/test failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D5 failed: {e}")

# Test D6: POST /api/trainer/broadcast (200)
print("\n[D6] POST /api/trainer/broadcast")
try:
    response = requests.post(
        f"{BASE_URL}/trainer/broadcast",
        json={"body": "Test broadcast message"},
        cookies=admin_cookie
    )
    if response.status_code == 200 and response.json().get("ok") == True:
        print(f"✅ POST /api/trainer/broadcast returns 200")
    else:
        print(f"❌ POST /api/trainer/broadcast failed: {response.status_code} {response.text}")
except Exception as e:
    print(f"❌ Test D6 failed: {e}")

# Test D7: Phase-B member self-load happy path
print("\n[D7] Phase-B member self-load happy path")
try:
    # Register a fresh member with no coach schedule
    memberY = register_member(f"membery_{random_string()}")
    if memberY:
        memberY_cookie = {"ts_token": memberY["cookie"]}
        
        # Check load-status -> coachLoaded:false
        status_response = requests.get(f"{BASE_URL}/member/load-status", cookies=memberY_cookie)
        if status_response.status_code == 200:
            status_data = status_response.json()
            if status_data.get("coachLoaded") == False:
                print(f"✅ Fresh member has coachLoaded=false")
                
                # Self-load a program
                future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
                load_data = {
                    "programId": "test-program",
                    "label": "Test Program",
                    "items": [
                        {
                            "date": future_date,
                            "title": "Test Workout",
                            "exercises": [{"name": "Squat", "sets": "3", "reps": "5", "load": "heavy", "notes": ""}]
                        }
                    ]
                }
                load_response = requests.post(f"{BASE_URL}/member/load-program", json=load_data, cookies=memberY_cookie)
                if load_response.status_code == 200:
                    print(f"✅ Member can self-load program (200)")
                    
                    # Check schedule includes the item
                    schedule_response = requests.get(f"{BASE_URL}/member/schedule", cookies=memberY_cookie)
                    if schedule_response.status_code == 200:
                        schedule_data = schedule_response.json()
                        schedule = schedule_data.get("schedule", [])
                        if any(item.get("date") == future_date for item in schedule):
                            print(f"✅ GET /api/member/schedule includes self-loaded item")
                        else:
                            print(f"❌ GET /api/member/schedule does NOT include self-loaded item")
                    else:
                        print(f"❌ GET /api/member/schedule failed: {schedule_response.status_code}")
                    
                    # Delete the self-loaded program
                    delete_response = requests.delete(f"{BASE_URL}/member/load-program", cookies=memberY_cookie)
                    if delete_response.status_code == 200:
                        print(f"✅ DELETE /api/member/load-program works (200)")
                    else:
                        print(f"❌ DELETE /api/member/load-program failed: {delete_response.status_code}")
                else:
                    print(f"❌ Member CANNOT self-load program: {load_response.status_code} {load_response.text}")
            else:
                print(f"❌ Fresh member has coachLoaded=true (should be false)")
        else:
            print(f"❌ GET /api/member/load-status failed: {status_response.status_code}")
    else:
        print(f"❌ Failed to register memberY")
except Exception as e:
    print(f"❌ Test D7 failed: {e}")

print("\n" + "=" * 80)
print("BACKEND TESTING COMPLETE")
print("=" * 80)

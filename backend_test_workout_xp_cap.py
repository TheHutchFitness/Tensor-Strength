#!/usr/bin/env python3
"""
Backend test for anti-cheat daily workout-XP cap.
Tests that only ONE workout per day grants the 38 workout XP, even with different workoutIds.
"""

import requests
import random
import string
import sys

BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_workout_xp_cap():
    """Test anti-cheat daily workout-XP cap"""
    print("\n" + "="*80)
    print("ANTI-CHEAT DAILY WORKOUT-XP CAP TEST")
    print("="*80)
    
    session = requests.Session()
    test_passed = 0
    test_failed = 0
    
    try:
        # Step 1: Register a fresh member (auto-logged-in via cookie)
        print("\n[TEST 1] Register fresh member...")
        username = f"member_{random_string()}"
        email = f"{username}@example.com"
        password = "testpass123"
        
        register_resp = session.post(
            f"{BASE_URL}/auth/register",
            json={"username": username, "email": email, "password": password}
        )
        
        if register_resp.status_code != 200:
            print(f"❌ FAILED: Registration failed with status {register_resp.status_code}")
            print(f"Response: {register_resp.text}")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: Registered member '{username}' with id={register_resp.json().get('user', {}).get('id')}")
        test_passed += 1
        
        # Step 2: GET /api/gamification -> note xp.total (should be 0) and xpAward.workout (expected 38)
        print("\n[TEST 2] GET /api/gamification - check initial state...")
        gamification_resp = session.get(f"{BASE_URL}/gamification")
        
        if gamification_resp.status_code != 200:
            print(f"❌ FAILED: GET /api/gamification failed with status {gamification_resp.status_code}")
            print(f"Response: {gamification_resp.text}")
            test_failed += 1
            return test_passed, test_failed
        
        gamification_data = gamification_resp.json()
        initial_xp_total = gamification_data.get('xp', {}).get('total', 0)
        xp_award_workout = gamification_data.get('xpAward', {}).get('workout', 0)
        
        print(f"✅ PASSED: GET /api/gamification returned 200")
        print(f"   Initial xp.total: {initial_xp_total} (expected 0)")
        print(f"   xpAward.workout: {xp_award_workout} (expected 38)")
        test_passed += 1
        
        if initial_xp_total != 0:
            print(f"⚠️  WARNING: Initial xp.total is {initial_xp_total}, expected 0")
        
        if xp_award_workout != 38:
            print(f"❌ FAILED: xpAward.workout is {xp_award_workout}, expected 38")
            test_failed += 1
            return test_passed, test_failed
        
        # Step 3: POST /api/gamification/workout {workoutId:"w-<rand>-1"} -> 200; expect awarded:true
        print("\n[TEST 3] POST first workout (workoutId 1)...")
        rand_id = random_string()
        workout_id_1 = f"w-{rand_id}-1"
        
        workout_resp_1 = session.post(
            f"{BASE_URL}/gamification/workout",
            json={"workoutId": workout_id_1}
        )
        
        if workout_resp_1.status_code != 200:
            print(f"❌ FAILED: POST /api/gamification/workout failed with status {workout_resp_1.status_code}")
            print(f"Response: {workout_resp_1.text}")
            test_failed += 1
            return test_passed, test_failed
        
        workout_data_1 = workout_resp_1.json()
        awarded_1 = workout_data_1.get('awarded', False)
        gained_1 = workout_data_1.get('gained', 0)
        xp_after_1 = workout_data_1.get('xp', {}).get('total', 0)
        streak_bonus_1 = workout_data_1.get('streakBonus', 0)
        
        print(f"✅ PASSED: POST /api/gamification/workout returned 200")
        print(f"   awarded: {awarded_1} (expected True)")
        print(f"   gained: {gained_1} (expected 38 + streak bonus)")
        print(f"   streakBonus: {streak_bonus_1}")
        print(f"   xp.total after: {xp_after_1}")
        test_passed += 1
        
        if not awarded_1:
            print(f"❌ FAILED: First workout awarded is {awarded_1}, expected True")
            test_failed += 1
            return test_passed, test_failed
        
        # The gained should be 38 (workout XP) + streak bonus (5 for day 1)
        expected_gained_1 = 38 + streak_bonus_1
        if gained_1 != expected_gained_1:
            print(f"❌ FAILED: First workout gained is {gained_1}, expected {expected_gained_1} (38 + {streak_bonus_1} streak bonus)")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: First workout awarded {gained_1} XP (38 workout XP + {streak_bonus_1} streak bonus)")
        test_passed += 1
        
        # Step 4: POST /api/gamification/workout {workoutId:"w-<rand>-2"} (DIFFERENT workoutId, same day)
        # -> 200; expect awarded:false and the workout-XP portion is 0
        print("\n[TEST 4] POST second workout (workoutId 2, DIFFERENT ID, same day)...")
        workout_id_2 = f"w-{rand_id}-2"
        
        workout_resp_2 = session.post(
            f"{BASE_URL}/gamification/workout",
            json={"workoutId": workout_id_2}
        )
        
        if workout_resp_2.status_code != 200:
            print(f"❌ FAILED: POST /api/gamification/workout (2nd) failed with status {workout_resp_2.status_code}")
            print(f"Response: {workout_resp_2.text}")
            test_failed += 1
            return test_passed, test_failed
        
        workout_data_2 = workout_resp_2.json()
        awarded_2 = workout_data_2.get('awarded', False)
        gained_2 = workout_data_2.get('gained', 0)
        xp_after_2 = workout_data_2.get('xp', {}).get('total', 0)
        streak_bonus_2 = workout_data_2.get('streakBonus', 0)
        
        print(f"✅ PASSED: POST /api/gamification/workout (2nd) returned 200")
        print(f"   awarded: {awarded_2} (expected False)")
        print(f"   gained: {gained_2} (expected 0, since workout XP already paid today)")
        print(f"   streakBonus: {streak_bonus_2} (expected 0, since streak already counted today)")
        print(f"   xp.total after: {xp_after_2}")
        test_passed += 1
        
        if awarded_2:
            print(f"❌ FAILED: Second workout awarded is {awarded_2}, expected False (daily cap should prevent XP)")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: Second workout awarded is False (daily cap working)")
        test_passed += 1
        
        # The gained should be 0 (no workout XP, no streak bonus since already counted today)
        if gained_2 != 0:
            print(f"❌ FAILED: Second workout gained is {gained_2}, expected 0 (no workout XP on same day)")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: Second workout gained 0 XP (daily cap working)")
        test_passed += 1
        
        # Confirm xp.total did NOT increase by another 38
        if xp_after_2 != xp_after_1:
            print(f"❌ FAILED: xp.total changed from {xp_after_1} to {xp_after_2}, expected no change")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: xp.total unchanged at {xp_after_2} (daily cap working)")
        test_passed += 1
        
        # Step 5: POST the SAME first workoutId again "w-<rand>-1" -> 200 awarded:false
        print("\n[TEST 5] POST same first workoutId again (per-workout dedup)...")
        
        workout_resp_3 = session.post(
            f"{BASE_URL}/gamification/workout",
            json={"workoutId": workout_id_1}
        )
        
        if workout_resp_3.status_code != 200:
            print(f"❌ FAILED: POST /api/gamification/workout (repeat) failed with status {workout_resp_3.status_code}")
            print(f"Response: {workout_resp_3.text}")
            test_failed += 1
            return test_passed, test_failed
        
        workout_data_3 = workout_resp_3.json()
        awarded_3 = workout_data_3.get('awarded', False)
        gained_3 = workout_data_3.get('gained', 0)
        xp_after_3 = workout_data_3.get('xp', {}).get('total', 0)
        
        print(f"✅ PASSED: POST /api/gamification/workout (repeat) returned 200")
        print(f"   awarded: {awarded_3} (expected False)")
        print(f"   gained: {gained_3} (expected 0)")
        print(f"   xp.total after: {xp_after_3}")
        test_passed += 1
        
        if awarded_3:
            print(f"❌ FAILED: Repeat workout awarded is {awarded_3}, expected False (per-workout dedup)")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: Repeat workout awarded is False (per-workout dedup working)")
        test_passed += 1
        
        if gained_3 != 0:
            print(f"❌ FAILED: Repeat workout gained is {gained_3}, expected 0")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: Repeat workout gained 0 XP (per-workout dedup working)")
        test_passed += 1
        
        if xp_after_3 != xp_after_2:
            print(f"❌ FAILED: xp.total changed from {xp_after_2} to {xp_after_3}, expected no change")
            test_failed += 1
            return test_passed, test_failed
        
        print(f"✅ PASSED: xp.total unchanged at {xp_after_3} (per-workout dedup working)")
        test_passed += 1
        
        # Step 6: Check for _id leaks
        print("\n[TEST 6] Check for MongoDB _id leaks...")
        
        has_id_leak = False
        for resp_data in [gamification_data, workout_data_1, workout_data_2, workout_data_3]:
            if '_id' in str(resp_data):
                print(f"❌ FAILED: Found _id leak in response: {resp_data}")
                has_id_leak = True
                test_failed += 1
                break
        
        if not has_id_leak:
            print(f"✅ PASSED: No MongoDB _id leaks detected")
            test_passed += 1
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        test_failed += 1
    
    return test_passed, test_failed

if __name__ == "__main__":
    passed, failed = test_workout_xp_cap()
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"✅ PASSED: {passed} tests")
    print(f"❌ FAILED: {failed} tests")
    print(f"TOTAL: {passed + failed} tests")
    print("="*80)
    
    if failed > 0:
        print("\n❌ ANTI-CHEAT DAILY WORKOUT-XP CAP TEST FAILED")
        sys.exit(1)
    else:
        print("\n✅ ANTI-CHEAT DAILY WORKOUT-XP CAP TEST PASSED")
        sys.exit(0)

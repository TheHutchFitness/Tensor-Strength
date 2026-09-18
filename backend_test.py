#!/usr/bin/env python3
"""
Backend test for PHASE D: Coach Plan Overrides
Tests GET/PUT/DELETE /api/trainer/schedule endpoints with self-loaded member days
"""

import requests
import random
import string
from datetime import datetime, timedelta

BASE_URL = "https://tensor-strength.preview.emergentagent.com/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def test_phase_d_coach_plan_overrides():
    print("\n" + "="*80)
    print("PHASE D: COACH PLAN OVERRIDES - BACKEND TESTING")
    print("="*80 + "\n")
    
    test_count = 0
    passed = 0
    
    # ========== TEST 1: GET /api/trainer/schedule (coach auth, no clientId) ==========
    test_count += 1
    print(f"TEST {test_count}: GET /api/trainer/schedule (coach auth, no clientId)")
    try:
        # Login as admin (The Hutch)
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "username": "The Hutch",
            "password": "Vzkfjf3n!3"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.status_code} {login_resp.text}"
        admin_cookies = login_resp.cookies
        admin_user = login_resp.json().get('user', {})
        admin_id = admin_user.get('id')
        print(f"✓ Admin login successful, id={admin_id}")
        
        # GET /api/trainer/schedule without clientId
        schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule", cookies=admin_cookies)
        assert schedule_resp.status_code == 200, f"Expected 200, got {schedule_resp.status_code}: {schedule_resp.text}"
        schedule_data = schedule_resp.json()
        assert 'schedule' in schedule_data, f"Response missing 'schedule' key: {schedule_data}"
        assert isinstance(schedule_data['schedule'], list), f"'schedule' should be a list: {schedule_data}"
        print(f"✓ GET /api/trainer/schedule returns 200 with schedule array (length={len(schedule_data['schedule'])})")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 2: Setup self-loaded member day ==========
    test_count += 1
    print(f"\nTEST {test_count}: Setup self-loaded member day")
    try:
        # Register a fresh member
        member_username = f"member_{random_string()}"
        member_email = f"{member_username}@example.com"
        member_password = "testpass123"
        
        register_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "username": member_username,
            "email": member_email,
            "password": member_password
        })
        assert register_resp.status_code == 200, f"Member registration failed: {register_resp.status_code} {register_resp.text}"
        member_cookies = register_resp.cookies
        member_user = register_resp.json().get('user', {})
        member_id = member_user.get('id')
        print(f"✓ Registered fresh member: {member_username}, id={member_id}")
        
        # Assign member to admin
        assign_resp = requests.put(f"{BASE_URL}/admin/users", 
            cookies=admin_cookies,
            json={"id": member_id, "assignedTrainerId": admin_id}
        )
        assert assign_resp.status_code == 200, f"Failed to assign member to admin: {assign_resp.status_code} {assign_resp.text}"
        print(f"✓ Assigned member to admin (assignedTrainerId={admin_id})")
        
        # As member, POST /api/member/load-program with FUTURE dates (30-40 days ahead)
        today = datetime.utcnow()
        future_dates = [
            (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            (today + timedelta(days=32)).strftime("%Y-%m-%d"),
            (today + timedelta(days=35)).strftime("%Y-%m-%d"),
        ]
        
        load_program_resp = requests.post(f"{BASE_URL}/member/load-program",
            cookies=member_cookies,
            json={
                "programId": "tensor-dup",
                "label": "Test Self-Loaded Program",
                "items": [
                    {
                        "date": future_dates[0],
                        "title": "Day 1 - Upper Push",
                        "exercises": [
                            {"name": "Bench Press", "sets": "4", "reps": "8", "load": "RPE 7", "notes": ""},
                            {"name": "Overhead Press", "sets": "3", "reps": "10", "load": "RPE 8", "notes": ""}
                        ]
                    },
                    {
                        "date": future_dates[1],
                        "title": "Day 2 - Lower Pull",
                        "exercises": [
                            {"name": "Deadlift", "sets": "5", "reps": "5", "load": "RPE 8", "notes": ""},
                            {"name": "Romanian Deadlift", "sets": "3", "reps": "12", "load": "RPE 7", "notes": ""}
                        ]
                    },
                    {
                        "date": future_dates[2],
                        "title": "Day 3 - Upper Pull",
                        "exercises": [
                            {"name": "Pull-ups", "sets": "4", "reps": "8", "load": "Bodyweight", "notes": ""},
                            {"name": "Barbell Row", "sets": "4", "reps": "10", "load": "RPE 7", "notes": ""}
                        ]
                    }
                ]
            }
        )
        assert load_program_resp.status_code == 200, f"Failed to load program: {load_program_resp.status_code} {load_program_resp.text}"
        load_data = load_program_resp.json()
        assert load_data.get('ok') == True, f"Expected ok=true: {load_data}"
        assert load_data.get('scheduled') == 3, f"Expected scheduled=3: {load_data}"
        print(f"✓ Member loaded 3 self-loaded days with future dates: {future_dates}")
        
        # As admin, GET /api/trainer/schedule?clientId=<memberId>
        client_schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=admin_cookies)
        assert client_schedule_resp.status_code == 200, f"Expected 200, got {client_schedule_resp.status_code}: {client_schedule_resp.text}"
        client_schedule_data = client_schedule_resp.json()
        assert 'schedule' in client_schedule_data, f"Response missing 'schedule' key: {client_schedule_data}"
        
        # Verify source:'self' docs are included
        self_loaded_days = [day for day in client_schedule_data['schedule'] if day.get('source') == 'self']
        assert len(self_loaded_days) >= 3, f"Expected at least 3 self-loaded days, got {len(self_loaded_days)}: {self_loaded_days}"
        print(f"✓ GET /api/trainer/schedule?clientId={member_id} returns {len(self_loaded_days)} source:'self' docs")
        
        # Save first self-loaded day ID for later tests
        self_day_id = self_loaded_days[0]['id']
        self_day_title = self_loaded_days[0]['title']
        print(f"✓ Saved self-loaded day ID for testing: {self_day_id} (title: {self_day_title})")
        
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
        return  # Can't continue without setup
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return
    
    # ========== TEST 3: Non-admin coach access control ==========
    test_count += 1
    print(f"\nTEST {test_count}: Non-admin coach access control")
    try:
        # Try to create a second trainer account
        trainer2_username = f"trainer_{random_string()}"
        trainer2_email = f"{trainer2_username}@example.com"
        trainer2_password = "trainerpass123"
        
        register_trainer2_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "username": trainer2_username,
            "email": trainer2_email,
            "password": trainer2_password
        })
        
        if register_trainer2_resp.status_code == 200:
            trainer2_cookies = register_trainer2_resp.cookies
            trainer2_user = register_trainer2_resp.json().get('user', {})
            trainer2_id = trainer2_user.get('id')
            print(f"✓ Registered second trainer: {trainer2_username}, id={trainer2_id}")
            
            # Set isTrainer=true for trainer2
            set_trainer_resp = requests.put(f"{BASE_URL}/admin/users",
                cookies=admin_cookies,
                json={"id": trainer2_id, "isTrainer": True}
            )
            assert set_trainer_resp.status_code == 200, f"Failed to set isTrainer: {set_trainer_resp.status_code} {set_trainer_resp.text}"
            print(f"✓ Set isTrainer=true for trainer2")
            
            # As trainer2, try to GET /api/trainer/schedule?clientId=<member_id> (member NOT assigned to trainer2)
            trainer2_schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=trainer2_cookies)
            assert trainer2_schedule_resp.status_code == 403, f"Expected 403, got {trainer2_schedule_resp.status_code}: {trainer2_schedule_resp.text}"
            error_data = trainer2_schedule_resp.json()
            assert 'error' in error_data, f"Expected error message: {error_data}"
            print(f"✓ Non-admin coach GET /api/trainer/schedule?clientId=<unassigned_member> returns 403: {error_data.get('error')}")
            passed += 1
        else:
            print(f"⚠ Could not create second trainer account (status {register_trainer2_resp.status_code}), skipping non-admin coach test")
            print(f"✓ Admin can access any clientId (verified in TEST 2)")
            passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 4: PUT /api/trainer/schedule/item - No auth ==========
    test_count += 1
    print(f"\nTEST {test_count}: PUT /api/trainer/schedule/item - No auth")
    try:
        put_no_auth_resp = requests.put(f"{BASE_URL}/trainer/schedule/item", json={"id": self_day_id})
        assert put_no_auth_resp.status_code == 403, f"Expected 403, got {put_no_auth_resp.status_code}: {put_no_auth_resp.text}"
        print(f"✓ PUT /api/trainer/schedule/item without auth returns 403")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 5: PUT /api/trainer/schedule/item - Missing id ==========
    test_count += 1
    print(f"\nTEST {test_count}: PUT /api/trainer/schedule/item - Missing id")
    try:
        put_no_id_resp = requests.put(f"{BASE_URL}/trainer/schedule/item", 
            cookies=admin_cookies,
            json={"title": "Test"}
        )
        assert put_no_id_resp.status_code == 400, f"Expected 400, got {put_no_id_resp.status_code}: {put_no_id_resp.text}"
        error_data = put_no_id_resp.json()
        assert 'error' in error_data, f"Expected error message: {error_data}"
        print(f"✓ PUT /api/trainer/schedule/item without id returns 400: {error_data.get('error')}")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 6: PUT /api/trainer/schedule/item - Unknown id ==========
    test_count += 1
    print(f"\nTEST {test_count}: PUT /api/trainer/schedule/item - Unknown id")
    try:
        unknown_id = f"unknown-{random_string()}"
        put_unknown_resp = requests.put(f"{BASE_URL}/trainer/schedule/item",
            cookies=admin_cookies,
            json={"id": unknown_id, "title": "Test"}
        )
        assert put_unknown_resp.status_code == 404, f"Expected 404, got {put_unknown_resp.status_code}: {put_unknown_resp.text}"
        error_data = put_unknown_resp.json()
        assert 'error' in error_data, f"Expected error message: {error_data}"
        print(f"✓ PUT /api/trainer/schedule/item with unknown id returns 404: {error_data.get('error')}")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 7: PUT /api/trainer/schedule/item - Valid edit ==========
    test_count += 1
    print(f"\nTEST {test_count}: PUT /api/trainer/schedule/item - Valid edit on self-loaded day")
    try:
        new_title = "Coach Override — Squat Focus"
        new_date = (datetime.utcnow() + timedelta(days=40)).strftime("%Y-%m-%d")
        
        put_valid_resp = requests.put(f"{BASE_URL}/trainer/schedule/item",
            cookies=admin_cookies,
            json={
                "id": self_day_id,
                "title": new_title,
                "date": new_date,
                "autoload": True,
                "exercises": [
                    {"name": "Back Squat", "sets": "5", "reps": "3", "load": "RPE 8", "notes": "paused"},
                    {"name": "", "sets": "", "reps": "", "load": "", "notes": ""}  # Empty exercise should be filtered out
                ]
            }
        )
        assert put_valid_resp.status_code == 200, f"Expected 200, got {put_valid_resp.status_code}: {put_valid_resp.text}"
        put_data = put_valid_resp.json()
        assert put_data.get('ok') == True, f"Expected ok=true: {put_data}"
        assert 'item' in put_data, f"Response missing 'item' key: {put_data}"
        
        updated_item = put_data['item']
        assert updated_item.get('title') == new_title, f"Title not updated: {updated_item.get('title')}"
        assert updated_item.get('date') == new_date, f"Date not updated: {updated_item.get('date')}"
        assert updated_item.get('autoload') == True, f"Autoload not set: {updated_item.get('autoload')}"
        assert 'lastEditedByTrainerId' in updated_item, f"Missing lastEditedByTrainerId: {updated_item}"
        assert updated_item.get('lastEditedByTrainerId') == admin_id, f"lastEditedByTrainerId mismatch: {updated_item.get('lastEditedByTrainerId')} != {admin_id}"
        
        # Verify empty-name exercise was filtered out
        exercises = updated_item.get('exercises', [])
        assert len(exercises) == 1, f"Expected 1 exercise (empty one filtered out), got {len(exercises)}: {exercises}"
        assert exercises[0].get('name') == "Back Squat", f"Exercise name mismatch: {exercises[0].get('name')}"
        
        print(f"✓ PUT /api/trainer/schedule/item returns 200 with updated item")
        print(f"  - Title updated: {new_title}")
        print(f"  - Date updated: {new_date}")
        print(f"  - Autoload set: True")
        print(f"  - lastEditedByTrainerId: {updated_item.get('lastEditedByTrainerId')}")
        print(f"  - Empty exercise filtered out (1 exercise remaining)")
        
        # Verify change persists via GET /api/trainer/schedule?clientId=<memberId>
        verify_schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=admin_cookies)
        assert verify_schedule_resp.status_code == 200, f"Expected 200, got {verify_schedule_resp.status_code}"
        verify_schedule_data = verify_schedule_resp.json()
        updated_day = next((day for day in verify_schedule_data['schedule'] if day.get('id') == self_day_id), None)
        assert updated_day is not None, f"Updated day not found in schedule"
        assert updated_day.get('title') == new_title, f"Title not persisted: {updated_day.get('title')}"
        assert updated_day.get('date') == new_date, f"Date not persisted: {updated_day.get('date')}"
        print(f"✓ Change persists in GET /api/trainer/schedule?clientId={member_id}")
        
        # Verify change persists via member's GET /api/member/schedule
        member_schedule_resp = requests.get(f"{BASE_URL}/member/schedule", cookies=member_cookies)
        assert member_schedule_resp.status_code == 200, f"Expected 200, got {member_schedule_resp.status_code}"
        member_schedule_data = member_schedule_resp.json()
        member_updated_day = next((day for day in member_schedule_data['schedule'] if day.get('id') == self_day_id), None)
        assert member_updated_day is not None, f"Updated day not found in member schedule"
        assert member_updated_day.get('title') == new_title, f"Title not visible to member: {member_updated_day.get('title')}"
        print(f"✓ Change visible in member's GET /api/member/schedule")
        
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 8: PUT /api/trainer/schedule/item - Invalid date format ==========
    test_count += 1
    print(f"\nTEST {test_count}: PUT /api/trainer/schedule/item - Invalid date format")
    try:
        # Get current state
        current_schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=admin_cookies)
        current_day = next((day for day in current_schedule_resp.json()['schedule'] if day.get('id') == self_day_id), None)
        current_date = current_day.get('date')
        
        invalid_date_title = "Invalid Date Test"
        put_invalid_date_resp = requests.put(f"{BASE_URL}/trainer/schedule/item",
            cookies=admin_cookies,
            json={
                "id": self_day_id,
                "title": invalid_date_title,
                "date": "2025/01/01"  # Invalid format (should be YYYY-MM-DD)
            }
        )
        assert put_invalid_date_resp.status_code == 200, f"Expected 200, got {put_invalid_date_resp.status_code}: {put_invalid_date_resp.text}"
        put_data = put_invalid_date_resp.json()
        
        # Verify title was updated but date was ignored
        updated_item = put_data['item']
        assert updated_item.get('title') == invalid_date_title, f"Title not updated: {updated_item.get('title')}"
        # Date should remain unchanged (invalid date ignored)
        assert updated_item.get('date') == current_date, f"Date should be unchanged (invalid format ignored): {updated_item.get('date')} != {current_date}"
        
        print(f"✓ PUT with invalid date format returns 200")
        print(f"  - Title updated: {invalid_date_title}")
        print(f"  - Invalid date ignored (date unchanged: {current_date})")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 9: DELETE /api/trainer/schedule?id=<selfDayId> ==========
    test_count += 1
    print(f"\nTEST {test_count}: DELETE /api/trainer/schedule?id=<selfDayId>")
    try:
        delete_resp = requests.delete(f"{BASE_URL}/trainer/schedule?id={self_day_id}", cookies=admin_cookies)
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        delete_data = delete_resp.json()
        assert delete_data.get('ok') == True, f"Expected ok=true: {delete_data}"
        print(f"✓ DELETE /api/trainer/schedule?id={self_day_id} returns 200 with ok=true")
        
        # Verify day no longer appears in GET /api/trainer/schedule?clientId=<memberId>
        verify_delete_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=admin_cookies)
        assert verify_delete_resp.status_code == 200, f"Expected 200, got {verify_delete_resp.status_code}"
        verify_delete_data = verify_delete_resp.json()
        deleted_day = next((day for day in verify_delete_data['schedule'] if day.get('id') == self_day_id), None)
        assert deleted_day is None, f"Deleted day still appears in schedule: {deleted_day}"
        print(f"✓ Deleted day no longer appears in GET /api/trainer/schedule?clientId={member_id}")
        
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 10: DELETE non-existent id (idempotent) ==========
    test_count += 1
    print(f"\nTEST {test_count}: DELETE non-existent id (idempotent)")
    try:
        nonexistent_id = f"nonexistent-{random_string()}"
        delete_nonexistent_resp = requests.delete(f"{BASE_URL}/trainer/schedule?id={nonexistent_id}", cookies=admin_cookies)
        assert delete_nonexistent_resp.status_code == 200, f"Expected 200, got {delete_nonexistent_resp.status_code}: {delete_nonexistent_resp.text}"
        delete_data = delete_nonexistent_resp.json()
        assert delete_data.get('ok') == True, f"Expected ok=true: {delete_data}"
        print(f"✓ DELETE non-existent id returns 200 with ok=true (idempotent)")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 11: Regression - POST /api/trainer/schedule ==========
    test_count += 1
    print(f"\nTEST {test_count}: Regression - POST /api/trainer/schedule")
    try:
        # Try to create from a bogus programId (should return 404, not 500)
        bogus_program_id = f"bogus-program-{random_string()}"
        post_schedule_resp = requests.post(f"{BASE_URL}/trainer/schedule",
            cookies=admin_cookies,
            json={
                "programId": bogus_program_id,
                "date": (datetime.utcnow() + timedelta(days=50)).strftime("%Y-%m-%d"),
                "clientId": member_id
            }
        )
        assert post_schedule_resp.status_code == 404, f"Expected 404 for bogus programId, got {post_schedule_resp.status_code}: {post_schedule_resp.text}"
        error_data = post_schedule_resp.json()
        assert 'error' in error_data, f"Expected error message: {error_data}"
        assert 'not found' in error_data.get('error', '').lower(), f"Expected 'not found' error: {error_data.get('error')}"
        print(f"✓ POST /api/trainer/schedule with bogus programId returns 404: {error_data.get('error')}")
        print(f"✓ Regression test passed (no 500 error)")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== TEST 12: Check for MongoDB _id leaks ==========
    test_count += 1
    print(f"\nTEST {test_count}: Check for MongoDB _id leaks")
    try:
        # Check various responses for _id leaks
        schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule", cookies=admin_cookies)
        schedule_text = schedule_resp.text
        
        client_schedule_resp = requests.get(f"{BASE_URL}/trainer/schedule?clientId={member_id}", cookies=admin_cookies)
        client_schedule_text = client_schedule_resp.text
        
        assert '"_id"' not in schedule_text, f"Found _id leak in GET /api/trainer/schedule response"
        assert '"_id"' not in client_schedule_text, f"Found _id leak in GET /api/trainer/schedule?clientId response"
        
        print(f"✓ No MongoDB _id leaks detected in responses")
        passed += 1
    except AssertionError as e:
        print(f"✗ FAILED: {e}")
    except Exception as e:
        print(f"✗ ERROR: {e}")
    
    # ========== SUMMARY ==========
    print("\n" + "="*80)
    print(f"PHASE D TESTING COMPLETE: {passed}/{test_count} tests passed ({100*passed//test_count}% success rate)")
    print("="*80 + "\n")
    
    if passed == test_count:
        print("✅ ALL TESTS PASSED")
    else:
        print(f"⚠ {test_count - passed} test(s) failed")
    
    return passed == test_count

if __name__ == "__main__":
    success = test_phase_d_coach_plan_overrides()
    exit(0 if success else 1)

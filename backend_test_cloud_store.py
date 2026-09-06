#!/usr/bin/env python3
"""
Backend test for NEW Client Cloud Store endpoints on Next.js app.
Tests: PUT /api/client/store, GET /api/client/store (with and without key param)
Focus: Auth, validation, per-user isolation, upsert, size limits, no MongoDB _id leaks
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
    print("BACKEND TEST: Client Cloud Store (GET/PUT /api/client/store)")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    member_a_session = requests.Session()
    member_b_session = requests.Session()
    
    # Generate unique usernames for this test run
    timestamp = str(int(time.time() * 1000))
    member_a_username = f"CloudStoreMemberA_{timestamp[-6:]}"
    member_b_username = f"CloudStoreMemberB_{timestamp[-6:]}"
    member_a_email = f"cloud_store_a_{timestamp}@test.com"
    member_b_email = f"cloud_store_b_{timestamp}@test.com"
    member_a_password = "TestPass123!"
    member_b_password = "TestPass456!"
    
    member_a_id = None
    member_b_id = None
    
    try:
        # ============================================================
        # SETUP: Register 2 fresh members
        # ============================================================
        print("\n--- SETUP: Register 2 fresh members ---")
        
        # 1. Register Member A
        print(f"\n1. Register Member A (username: '{member_a_username}')")
        resp = member_a_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_a_username,
            "email": member_a_email,
            "password": member_a_password
        })
        if resp.status_code == 200:
            data = resp.json()
            member_a_user = data.get("user", {})
            member_a_id = member_a_user.get("id")
            log_test("Register Member A", True, f"id={member_a_id}, role={member_a_user.get('role')}")
        else:
            log_test("Register Member A", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 2. Register Member B
        print(f"\n2. Register Member B (username: '{member_b_username}')")
        resp = member_b_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_b_username,
            "email": member_b_email,
            "password": member_b_password
        })
        if resp.status_code == 200:
            data = resp.json()
            member_b_user = data.get("user", {})
            member_b_id = member_b_user.get("id")
            log_test("Register Member B", True, f"id={member_b_id}, role={member_b_user.get('role')}")
        else:
            log_test("Register Member B", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # ============================================================
        # TEST 1: PUT /api/client/store requires auth (401 without cookie)
        # ============================================================
        print("\n--- TEST 1: PUT /api/client/store requires auth ---")
        resp = requests.put(f"{BASE_URL}/client/store", json={
            "key": "test-key",
            "value": "test-value"
        })
        if resp.status_code == 401:
            data = resp.json()
            log_test("PUT /api/client/store without auth returns 401", True, f"error='{data.get('error')}'")
        else:
            log_test("PUT /api/client/store without auth returns 401", False, f"Expected 401, got {resp.status_code}")
        
        # ============================================================
        # TEST 2: GET /api/client/store requires auth (401 without cookie)
        # ============================================================
        print("\n--- TEST 2: GET /api/client/store requires auth ---")
        resp = requests.get(f"{BASE_URL}/client/store?key=test-key")
        if resp.status_code == 401:
            data = resp.json()
            log_test("GET /api/client/store without auth returns 401", True, f"error='{data.get('error')}'")
        else:
            log_test("GET /api/client/store without auth returns 401", False, f"Expected 401, got {resp.status_code}")
        
        # ============================================================
        # TEST 3: PUT with empty/missing key returns 400
        # ============================================================
        print("\n--- TEST 3: PUT with empty/missing key returns 400 ---")
        
        # 3a. Missing key field
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "value": "some value"
        })
        if resp.status_code == 400:
            data = resp.json()
            log_test("PUT without key field returns 400", True, f"error='{data.get('error')}'")
        else:
            log_test("PUT without key field returns 400", False, f"Expected 400, got {resp.status_code}")
        
        # 3b. Empty key string
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "",
            "value": "some value"
        })
        if resp.status_code == 400:
            data = resp.json()
            log_test("PUT with empty key returns 400", True, f"error='{data.get('error')}'")
        else:
            log_test("PUT with empty key returns 400", False, f"Expected 400, got {resp.status_code}")
        
        # ============================================================
        # TEST 4: PUT with valid key/value returns 200 {ok:true}
        # ============================================================
        print("\n--- TEST 4: PUT with valid key/value returns 200 ---")
        
        # 4a. Simple string value
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-test-string",
            "value": "Hello World"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and check_no_leaks(data):
                log_test("PUT with string value returns 200 {ok:true}", True, f"response={data}")
            else:
                log_test("PUT with string value returns 200 {ok:true}", False, f"ok={data.get('ok')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("PUT with string value returns 200 {ok:true}", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4b. Object value
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-bodyweight",
            "value": [{"date": "2025-01-01", "weight": 200}, {"date": "2025-01-02", "weight": 199.5}]
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and check_no_leaks(data):
                log_test("PUT with array value returns 200 {ok:true}", True, f"response={data}")
            else:
                log_test("PUT with array value returns 200 {ok:true}", False, f"ok={data.get('ok')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("PUT with array value returns 200 {ok:true}", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4c. Number value
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-counter",
            "value": 42
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") == True and check_no_leaks(data):
                log_test("PUT with number value returns 200 {ok:true}", True, f"response={data}")
            else:
                log_test("PUT with number value returns 200 {ok:true}", False, f"ok={data.get('ok')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("PUT with number value returns 200 {ok:true}", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 5: GET with key returns {found:true, value:<exact value>}
        # ============================================================
        print("\n--- TEST 5: GET with key returns stored value ---")
        
        # 5a. Get string value
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-test-string")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == True and data.get("value") == "Hello World" and check_no_leaks(data):
                log_test("GET ts-test-string returns {found:true, value:'Hello World'}", True, f"response={data}")
            else:
                log_test("GET ts-test-string returns {found:true, value:'Hello World'}", False, f"found={data.get('found')}, value={data.get('value')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("GET ts-test-string returns {found:true, value:'Hello World'}", False, f"Status {resp.status_code}: {resp.text}")
        
        # 5b. Get array value
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-bodyweight")
        if resp.status_code == 200:
            data = resp.json()
            expected_value = [{"date": "2025-01-01", "weight": 200}, {"date": "2025-01-02", "weight": 199.5}]
            if data.get("found") == True and data.get("value") == expected_value and check_no_leaks(data):
                log_test("GET ts-bodyweight returns {found:true, value:[array]}", True, f"value length={len(data.get('value', []))}")
            else:
                log_test("GET ts-bodyweight returns {found:true, value:[array]}", False, f"found={data.get('found')}, value={data.get('value')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("GET ts-bodyweight returns {found:true, value:[array]}", False, f"Status {resp.status_code}: {resp.text}")
        
        # 5c. Get number value
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-counter")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == True and data.get("value") == 42 and check_no_leaks(data):
                log_test("GET ts-counter returns {found:true, value:42}", True, f"response={data}")
            else:
                log_test("GET ts-counter returns {found:true, value:42}", False, f"found={data.get('found')}, value={data.get('value')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("GET ts-counter returns {found:true, value:42}", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 6: GET with key never set returns {found:false, value:null}
        # ============================================================
        print("\n--- TEST 6: GET with key never set returns {found:false, value:null} ---")
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-never-set-key")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == False and data.get("value") is None and check_no_leaks(data):
                log_test("GET never-set key returns {found:false, value:null}", True, f"response={data}")
            else:
                log_test("GET never-set key returns {found:false, value:null}", False, f"found={data.get('found')}, value={data.get('value')}, leaks={not check_no_leaks(data)}")
        else:
            log_test("GET never-set key returns {found:false, value:null}", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 7: GET without key returns {data:{key:value,...}} for all keys
        # ============================================================
        print("\n--- TEST 7: GET without key returns all keys ---")
        resp = member_a_session.get(f"{BASE_URL}/client/store")
        if resp.status_code == 200:
            data = resp.json()
            all_data = data.get("data", {})
            # Should have at least the 3 keys we set: ts-test-string, ts-bodyweight, ts-counter
            if "ts-test-string" in all_data and "ts-bodyweight" in all_data and "ts-counter" in all_data and check_no_leaks(data):
                log_test("GET without key returns {data:{...}} with all keys", True, f"keys={list(all_data.keys())}")
            else:
                log_test("GET without key returns {data:{...}} with all keys", False, f"data={all_data}, leaks={not check_no_leaks(data)}")
        else:
            log_test("GET without key returns {data:{...}} with all keys", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 8: UPSERT - PUT same key twice with different values
        # ============================================================
        print("\n--- TEST 8: UPSERT - PUT same key twice with different values ---")
        
        # First PUT
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-upsert-test",
            "value": "first value"
        })
        if resp.status_code != 200:
            log_test("UPSERT first PUT", False, f"Status {resp.status_code}: {resp.text}")
        
        # Second PUT with different value
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-upsert-test",
            "value": "second value (updated)"
        })
        if resp.status_code != 200:
            log_test("UPSERT second PUT", False, f"Status {resp.status_code}: {resp.text}")
        
        # GET should return the latest value
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-upsert-test")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == True and data.get("value") == "second value (updated)" and check_no_leaks(data):
                log_test("UPSERT - GET returns latest value (not duplicated)", True, f"value='{data.get('value')}'")
            else:
                log_test("UPSERT - GET returns latest value (not duplicated)", False, f"found={data.get('found')}, value={data.get('value')}")
        else:
            log_test("UPSERT - GET returns latest value (not duplicated)", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 9: Value larger than 2MB returns 413
        # ============================================================
        print("\n--- TEST 9: Value larger than 2MB returns 413 ---")
        
        # Build a large string > 2MB
        large_value = "x" * (2_000_001)  # 2MB + 1 byte
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-large-value",
            "value": large_value
        })
        if resp.status_code == 413:
            data = resp.json()
            log_test("PUT with value > 2MB returns 413", True, f"error='{data.get('error')}'")
        else:
            log_test("PUT with value > 2MB returns 413", False, f"Expected 413, got {resp.status_code}")
        
        # ============================================================
        # TEST 10: PER-USER ISOLATION - Member A and Member B data is separate
        # ============================================================
        print("\n--- TEST 10: PER-USER ISOLATION ---")
        
        # 10a. Member A PUTs key "ts-water"
        resp = member_a_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-water",
            "value": {"2025-01-01": 5}
        })
        if resp.status_code == 200:
            log_test("Member A PUT ts-water", True, "")
        else:
            log_test("Member A PUT ts-water", False, f"Status {resp.status_code}: {resp.text}")
        
        # 10b. Member B GET ts-water should return {found:false, value:null}
        resp = member_b_session.get(f"{BASE_URL}/client/store?key=ts-water")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == False and data.get("value") is None:
                log_test("Member B GET ts-water returns {found:false} (isolation working)", True, f"response={data}")
            else:
                log_test("Member B GET ts-water returns {found:false} (isolation working)", False, f"CRITICAL: Member B can see Member A's data! found={data.get('found')}, value={data.get('value')}")
        else:
            log_test("Member B GET ts-water returns {found:false} (isolation working)", False, f"Status {resp.status_code}: {resp.text}")
        
        # 10c. Member B PUTs their own value for ts-water
        resp = member_b_session.put(f"{BASE_URL}/client/store", json={
            "key": "ts-water",
            "value": {"2025-01-01": 8}
        })
        if resp.status_code == 200:
            log_test("Member B PUT ts-water with different value", True, "")
        else:
            log_test("Member B PUT ts-water with different value", False, f"Status {resp.status_code}: {resp.text}")
        
        # 10d. Member A GET ts-water should still return their original value
        resp = member_a_session.get(f"{BASE_URL}/client/store?key=ts-water")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == True and data.get("value") == {"2025-01-01": 5}:
                log_test("Member A still sees only their own ts-water value (isolation working)", True, f"value={data.get('value')}")
            else:
                log_test("Member A still sees only their own ts-water value (isolation working)", False, f"CRITICAL: Member A's data was overwritten! found={data.get('found')}, value={data.get('value')}")
        else:
            log_test("Member A still sees only their own ts-water value (isolation working)", False, f"Status {resp.status_code}: {resp.text}")
        
        # 10e. Member B GET ts-water should return their own value
        resp = member_b_session.get(f"{BASE_URL}/client/store?key=ts-water")
        if resp.status_code == 200:
            data = resp.json()
            if data.get("found") == True and data.get("value") == {"2025-01-01": 8}:
                log_test("Member B sees only their own ts-water value (isolation working)", True, f"value={data.get('value')}")
            else:
                log_test("Member B sees only their own ts-water value (isolation working)", False, f"found={data.get('found')}, value={data.get('value')}")
        else:
            log_test("Member B sees only their own ts-water value (isolation working)", False, f"Status {resp.status_code}: {resp.text}")
        
        # 10f. Member A GET all keys should NOT include Member B's keys
        resp = member_a_session.get(f"{BASE_URL}/client/store")
        if resp.status_code == 200:
            data = resp.json()
            all_data = data.get("data", {})
            # Member A should have their keys, not Member B's unique keys
            # Both have ts-water but with different values
            if "ts-test-string" in all_data and all_data.get("ts-water") == {"2025-01-01": 5}:
                log_test("Member A GET all keys returns only their own data", True, f"keys={list(all_data.keys())}")
            else:
                log_test("Member A GET all keys returns only their own data", False, f"data={all_data}")
        else:
            log_test("Member A GET all keys returns only their own data", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # FINAL SUMMARY
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed_count = sum(1 for r in test_results if r["passed"])
        total_count = len(test_results)
        success_rate = (passed_count / total_count * 100) if total_count > 0 else 0
        
        print(f"\nTotal tests: {total_count}")
        print(f"Passed: {passed_count}")
        print(f"Failed: {total_count - passed_count}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if passed_count == total_count:
            print("\n🎉 ALL TESTS PASSED!")
        else:
            print("\n⚠️  SOME TESTS FAILED")
            print("\nFailed tests:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  - {r['test']}: {r['details']}")
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

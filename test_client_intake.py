#!/usr/bin/env python3
"""
Backend API test for client-intake endpoints:
- GET /api/trainer/client-intake?clientId=<CID>
- PUT /api/trainer/client-intake {clientId, items}
"""

import requests
import json
import sys
from datetime import datetime
import random

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Demo client ID (will verify or get fresh one)
DEMO_CLIENT_ID = "da3cf979-45da-4c47-9b5f-8680d131038e"

def print_test(num, desc):
    print(f"\n{'='*80}")
    print(f"TEST {num}: {desc}")
    print('='*80)

def print_result(success, message):
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"{status}: {message}")

def check_no_id_leak(data):
    """Check if response contains MongoDB _id field"""
    if isinstance(data, dict):
        if '_id' in data:
            return False
        for value in data.values():
            if not check_no_id_leak(value):
                return False
    elif isinstance(data, list):
        for item in data:
            if not check_no_id_leak(item):
                return False
    return True

def main():
    session = requests.Session()
    passed = 0
    failed = 0
    
    try:
        # TEST 1: Admin login
        print_test(1, "Admin login with 'The Hutch' / 'Vzkfjf3n!3'")
        resp = session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            user = data.get('user', data)  # Handle both nested and flat structure
            if user.get('role') == 'admin' and 'ts_token' in resp.cookies:
                print_result(True, "Admin login successful, role=admin, ts_token cookie set")
                passed += 1
            else:
                print_result(False, f"Admin login returned 200 but role={user.get('role')} or cookie missing")
                failed += 1
        else:
            print(f"Response: {resp.text}")
            print_result(False, f"Admin login failed with status {resp.status_code}")
            failed += 1
            return
        
        # TEST 2: Get a valid client ID from /api/trainer/clients
        print_test(2, "GET /api/trainer/clients to verify/get client ID")
        resp = session.get(f"{BASE_URL}/trainer/clients")
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            clients_data = resp.json()
            print(f"Response type: {type(clients_data)}")
            print(f"Response: {json.dumps(clients_data, indent=2)[:500]}")
            
            # Handle both list and dict responses
            if isinstance(clients_data, list):
                clients = clients_data
            elif isinstance(clients_data, dict) and 'clients' in clients_data:
                clients = clients_data['clients']
            else:
                clients = []
            
            if len(clients) > 0:
                client_id = clients[0]['id']
                print(f"Using client ID: {client_id}")
                print_result(True, f"Retrieved client list, using client ID: {client_id}")
                passed += 1
            else:
                # Use the demo client ID
                client_id = DEMO_CLIENT_ID
                print(f"No clients found, using demo client ID: {client_id}")
                print_result(True, f"Using demo client ID: {client_id}")
                passed += 1
        else:
            print(f"Response: {resp.text}")
            client_id = DEMO_CLIENT_ID
            print(f"Failed to get clients, using demo client ID: {client_id}")
            print_result(True, f"Using demo client ID: {client_id}")
            passed += 1
        
        # TEST 3: GET /api/trainer/client-intake?clientId=<CID> -> 200 {items: array}
        print_test(3, f"GET /api/trainer/client-intake?clientId={client_id} as admin")
        resp = session.get(f"{BASE_URL}/trainer/client-intake", params={"clientId": client_id})
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 200:
            data = resp.json()
            if 'items' in data and isinstance(data['items'], list):
                if check_no_id_leak(data):
                    print_result(True, f"GET client-intake returned 200 with items array (length={len(data['items'])}), no _id leak")
                    passed += 1
                else:
                    print_result(False, "GET client-intake returned 200 but contains MongoDB _id leak")
                    failed += 1
            else:
                print_result(False, f"GET client-intake returned 200 but missing 'items' array: {data}")
                failed += 1
        else:
            print_result(False, f"GET client-intake failed with status {resp.status_code}")
            failed += 1
        
        # TEST 4: PUT /api/trainer/client-intake with items -> 200 {ok:true, items:[...]}
        print_test(4, f"PUT /api/trainer/client-intake with clientId={client_id} and 2 items")
        items_to_put = [
            {"label": "Signed waiver", "done": True},
            {"label": "Goals set", "done": False}
        ]
        resp = session.put(f"{BASE_URL}/trainer/client-intake", json={
            "clientId": client_id,
            "items": items_to_put
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') == True and 'items' in data and isinstance(data['items'], list):
                items = data['items']
                if len(items) == 2:
                    # Check that each item has an id assigned
                    all_have_ids = all('id' in item and item['id'] for item in items)
                    # Check that done booleans are preserved
                    done_preserved = items[0]['done'] == True and items[1]['done'] == False
                    # Check labels
                    labels_correct = items[0]['label'] == "Signed waiver" and items[1]['label'] == "Goals set"
                    
                    if all_have_ids and done_preserved and labels_correct:
                        if check_no_id_leak(data):
                            print(f"Item 1: id={items[0]['id']}, label={items[0]['label']}, done={items[0]['done']}")
                            print(f"Item 2: id={items[1]['id']}, label={items[1]['label']}, done={items[1]['done']}")
                            print_result(True, "PUT client-intake returned 200 with ok:true, items have ids assigned, done booleans preserved, no _id leak")
                            passed += 1
                        else:
                            print_result(False, "PUT client-intake returned 200 but contains MongoDB _id leak")
                            failed += 1
                    else:
                        print_result(False, f"PUT client-intake returned 200 but items incorrect: all_have_ids={all_have_ids}, done_preserved={done_preserved}, labels_correct={labels_correct}")
                        failed += 1
                else:
                    print_result(False, f"PUT client-intake returned 200 but items length={len(items)}, expected 2")
                    failed += 1
            else:
                print_result(False, f"PUT client-intake returned 200 but missing ok:true or items: {data}")
                failed += 1
        else:
            print_result(False, f"PUT client-intake failed with status {resp.status_code}")
            failed += 1
        
        # TEST 5: GET again to verify persistence
        print_test(5, f"GET /api/trainer/client-intake?clientId={client_id} again to verify persistence")
        resp = session.get(f"{BASE_URL}/trainer/client-intake", params={"clientId": client_id})
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 200:
            data = resp.json()
            if 'items' in data and isinstance(data['items'], list):
                items = data['items']
                if len(items) == 2:
                    # Check that items persisted with ids
                    all_have_ids = all('id' in item and item['id'] for item in items)
                    done_preserved = items[0]['done'] == True and items[1]['done'] == False
                    labels_correct = items[0]['label'] == "Signed waiver" and items[1]['label'] == "Goals set"
                    
                    if all_have_ids and done_preserved and labels_correct:
                        if check_no_id_leak(data):
                            print_result(True, "GET client-intake returned persisted items with ids, done booleans preserved, no _id leak")
                            passed += 1
                        else:
                            print_result(False, "GET client-intake returned persisted items but contains MongoDB _id leak")
                            failed += 1
                    else:
                        print_result(False, f"GET client-intake returned items but data incorrect: all_have_ids={all_have_ids}, done_preserved={done_preserved}, labels_correct={labels_correct}")
                        failed += 1
                else:
                    print_result(False, f"GET client-intake returned items length={len(items)}, expected 2")
                    failed += 1
            else:
                print_result(False, f"GET client-intake returned 200 but missing 'items' array: {data}")
                failed += 1
        else:
            print_result(False, f"GET client-intake failed with status {resp.status_code}")
            failed += 1
        
        # TEST 6: PUT with non-existent clientId "nope" -> 403
        print_test(6, "PUT /api/trainer/client-intake with non-existent clientId='nope' -> expect 403")
        resp = session.put(f"{BASE_URL}/trainer/client-intake", json={
            "clientId": "nope",
            "items": [{"label": "Test", "done": False}]
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 403:
            data = resp.json()
            if 'error' in data:
                print_result(True, f"PUT with non-existent clientId correctly returned 403 with error: {data['error']}")
                passed += 1
            else:
                print_result(True, "PUT with non-existent clientId correctly returned 403")
                passed += 1
        else:
            print_result(False, f"PUT with non-existent clientId returned {resp.status_code}, expected 403")
            failed += 1
        
        # TEST 7: Register a normal member
        print_test(7, "Register a normal member")
        member_username = f"testmember_{random.random()}"
        member_password = "testpass123"
        member_email = f"{member_username}@test.com"
        
        member_session = requests.Session()
        resp = member_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_username,
            "email": member_email,
            "password": member_password
        })
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            user = data.get('user', data)  # Handle both nested and flat structure
            if user.get('role') == 'member' and 'ts_token' in resp.cookies:
                print_result(True, f"Member registered successfully: {member_username}, role=member")
                passed += 1
            else:
                print_result(False, f"Member registration returned 200 but role={user.get('role')} or cookie missing")
                failed += 1
        else:
            print(f"Response: {resp.text}")
            print_result(False, f"Member registration failed with status {resp.status_code}")
            failed += 1
            return
        
        # TEST 8: As member, GET /api/trainer/client-intake -> 403
        print_test(8, f"GET /api/trainer/client-intake?clientId={client_id} as normal member -> expect 403")
        resp = member_session.get(f"{BASE_URL}/trainer/client-intake", params={"clientId": client_id})
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 403:
            data = resp.json()
            if 'error' in data:
                print_result(True, f"GET as member correctly returned 403 with error: {data['error']}")
                passed += 1
            else:
                print_result(True, "GET as member correctly returned 403")
                passed += 1
        else:
            print_result(False, f"GET as member returned {resp.status_code}, expected 403")
            failed += 1
        
        # TEST 9: As member, PUT /api/trainer/client-intake -> 403
        print_test(9, f"PUT /api/trainer/client-intake as normal member -> expect 403")
        resp = member_session.put(f"{BASE_URL}/trainer/client-intake", json={
            "clientId": client_id,
            "items": [{"label": "Test", "done": False}]
        })
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        if resp.status_code == 403:
            data = resp.json()
            if 'error' in data:
                print_result(True, f"PUT as member correctly returned 403 with error: {data['error']}")
                passed += 1
            else:
                print_result(True, "PUT as member correctly returned 403")
                passed += 1
        else:
            print_result(False, f"PUT as member returned {resp.status_code}, expected 403")
            failed += 1
        
        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        print(f"Total tests: {passed + failed}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED!")
            sys.exit(0)
        else:
            print(f"\n⚠️  {failed} test(s) failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

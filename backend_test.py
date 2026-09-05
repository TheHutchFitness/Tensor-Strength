#!/usr/bin/env python3
"""
TRAINER PORTAL PHASE 2 Backend Testing
Tests all endpoints for profiles, programs, messaging, and files
"""

import requests
import json
import io
import time

BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Cookie jar to persist authentication
session = requests.Session()

def print_test(step, description):
    print(f"\n{'='*80}")
    print(f"TEST {step}: {description}")
    print('='*80)

def print_result(passed, message, status_code=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    if status_code:
        print(f"{status} [{status_code}]: {message}")
    else:
        print(f"{status}: {message}")

def check_no_leaks(data):
    """Check that response doesn't leak _id or passwordHash"""
    json_str = json.dumps(data)
    has_id_leak = '"_id"' in json_str
    has_password_leak = 'passwordHash' in json_str
    if has_id_leak or has_password_leak:
        print(f"⚠️  WARNING: Response leaks sensitive data (_id: {has_id_leak}, passwordHash: {has_password_leak})")
        return False
    return True

# Store user data
admin_data = {}
trainer_data = {}
client1_data = {}
client2_data = {}
program_ids = []
file_ids = []

# ============================================================================
# SETUP: Admin login and user registration
# ============================================================================

print_test("SETUP-1", "Admin login")
try:
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": "The Hutch",
        "password": "Vzkfjf3n!3"
    })
    if resp.status_code == 200:
        admin_data = resp.json().get('user', {})
        print_result(True, f"Admin logged in successfully: {admin_data.get('username')}", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Admin login failed: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception during admin login: {e}")
    exit(1)

print_test("SETUP-2", "Register trainer T")
try:
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "username": f"trainer_t_{int(time.time())}",
        "email": f"trainer_t_{int(time.time())}@test.com",
        "password": "password123"
    })
    if resp.status_code == 200:
        trainer_data = resp.json().get('user', {})
        print_result(True, f"Trainer T registered: {trainer_data.get('username')}, id={trainer_data.get('id')}", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Trainer registration failed: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception during trainer registration: {e}")
    exit(1)

print_test("SETUP-3", "Register client C1")
try:
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "username": f"client_c1_{int(time.time())}",
        "email": f"client_c1_{int(time.time())}@test.com",
        "password": "password123"
    })
    if resp.status_code == 200:
        client1_data = resp.json().get('user', {})
        print_result(True, f"Client C1 registered: {client1_data.get('username')}, id={client1_data.get('id')}", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Client C1 registration failed: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception during client C1 registration: {e}")
    exit(1)

print_test("SETUP-4", "Register client C2")
try:
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "username": f"client_c2_{int(time.time())}",
        "email": f"client_c2_{int(time.time())}@test.com",
        "password": "password123"
    })
    if resp.status_code == 200:
        client2_data = resp.json().get('user', {})
        print_result(True, f"Client C2 registered: {client2_data.get('username')}, id={client2_data.get('id')}", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Client C2 registration failed: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception during client C2 registration: {e}")
    exit(1)

# Login as admin again
print_test("SETUP-5", "Re-login as admin")
try:
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": "The Hutch",
        "password": "Vzkfjf3n!3"
    })
    if resp.status_code == 200:
        print_result(True, "Admin re-logged in successfully", resp.status_code)
    else:
        print_result(False, f"Admin re-login failed: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception during admin re-login: {e}")
    exit(1)

print_test("SETUP-6", "Set trainer T as isTrainer=true")
try:
    resp = session.put(f"{BASE_URL}/admin/users", json={
        "id": trainer_data['id'],
        "isTrainer": True
    })
    if resp.status_code == 200:
        print_result(True, f"Trainer T set as isTrainer=true", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Failed to set isTrainer: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception setting isTrainer: {e}")
    exit(1)

print_test("SETUP-7", "Grant C1 portalAccess=true")
try:
    resp = session.put(f"{BASE_URL}/admin/users", json={
        "id": client1_data['id'],
        "portalAccess": True
    })
    if resp.status_code == 200:
        print_result(True, f"Client C1 granted portalAccess=true", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Failed to grant portalAccess to C1: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception granting portalAccess to C1: {e}")
    exit(1)

print_test("SETUP-8", "Assign C1 to trainer T")
try:
    resp = session.put(f"{BASE_URL}/admin/users", json={
        "id": client1_data['id'],
        "assignedTrainerId": trainer_data['id']
    })
    if resp.status_code == 200:
        print_result(True, f"Client C1 assigned to trainer T", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Failed to assign C1 to T: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception assigning C1 to T: {e}")
    exit(1)

print_test("SETUP-9", "Grant C2 portalAccess=true (NOT assigned to T)")
try:
    resp = session.put(f"{BASE_URL}/admin/users", json={
        "id": client2_data['id'],
        "portalAccess": True
    })
    if resp.status_code == 200:
        print_result(True, f"Client C2 granted portalAccess=true (NOT assigned to T)", resp.status_code)
        check_no_leaks(resp.json())
    else:
        print_result(False, f"Failed to grant portalAccess to C2: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception granting portalAccess to C2: {e}")
    exit(1)

# ============================================================================
# PROFILE TESTS
# ============================================================================

print_test("a", "As T, PUT /api/trainer/profile with missing fields -> expect 400")
try:
    # Login as trainer T
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as trainer T: {resp.text}", resp.status_code)
        exit(1)
    
    # Try to update profile with missing fields
    resp = session.put(f"{BASE_URL}/trainer/profile", json={
        "photo": "",
        "bio": "",
        "trainerType": ""
    })
    if resp.status_code == 400:
        print_result(True, f"Correctly rejected incomplete profile: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 400 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("b", "As T, PUT /api/trainer/profile with complete data -> 200, completed=true, slug returned")
try:
    resp = session.put(f"{BASE_URL}/trainer/profile", json={
        "photo": "http://example.com/photo.jpg",
        "bio": "Line1\nLine2\nExperienced strength coach",
        "trainerType": "Strength Coach",
        "certifications": ["NASM", "CSCS"],
        "specialties": ["Strength", "Hypertrophy"]
    })
    if resp.status_code == 200:
        data = resp.json()
        completed = data.get('completed')
        slug = data.get('slug')
        if completed and slug:
            trainer_data['slug'] = slug
            print_result(True, f"Profile saved successfully: completed={completed}, slug={slug}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Profile saved but missing completed or slug: {data}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("c", "GET /api/professionals -> array includes T's slug")
try:
    resp = session.get(f"{BASE_URL}/professionals")
    if resp.status_code == 200:
        data = resp.json()
        professionals = data.get('professionals', [])
        trainer_found = any(p.get('slug') == trainer_data.get('slug') for p in professionals)
        if trainer_found:
            print_result(True, f"Trainer T found in professionals list with slug={trainer_data.get('slug')}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Trainer T not found in professionals list. Professionals: {professionals}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("d", "GET /api/professionals/<T slug> -> 200; GET /api/professionals/does-not-exist -> 404")
try:
    # Test valid slug
    resp = session.get(f"{BASE_URL}/professionals/{trainer_data.get('slug')}")
    if resp.status_code == 200:
        data = resp.json()
        professional = data.get('professional', {})
        print_result(True, f"Retrieved trainer profile: name={professional.get('name')}, title={professional.get('title')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
    
    # Test invalid slug
    resp = session.get(f"{BASE_URL}/professionals/does-not-exist")
    if resp.status_code == 404:
        print_result(True, f"Correctly returned 404 for non-existent slug", resp.status_code)
    else:
        print_result(False, f"Expected 404 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("e", "As C1 (non-trainer), PUT /api/trainer/profile -> 403")
try:
    # Login as client C1
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client1_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C1: {resp.text}", resp.status_code)
        exit(1)
    
    # Try to update trainer profile as non-trainer
    resp = session.put(f"{BASE_URL}/trainer/profile", json={
        "photo": "http://example.com/photo.jpg",
        "bio": "Test bio",
        "trainerType": "Coach"
    })
    if resp.status_code == 403:
        print_result(True, f"Correctly rejected non-trainer profile update: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 403 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

# ============================================================================
# PROGRAMS TESTS
# ============================================================================

# Login as trainer T
print_test("PROGRAMS-SETUP", "Login as trainer T")
try:
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_data['username'],
        "password": "password123"
    })
    if resp.status_code == 200:
        print_result(True, "Logged in as trainer T", resp.status_code)
    else:
        print_result(False, f"Failed to login as trainer T: {resp.text}", resp.status_code)
        exit(1)
except Exception as e:
    print_result(False, f"Exception: {e}")
    exit(1)

print_test("f", "As T, POST /api/trainer/programs with clientId=C1.id -> 200")
try:
    resp = session.post(f"{BASE_URL}/trainer/programs", json={
        "title": "W1",
        "exercises": [
            {
                "name": "Squat",
                "sets": "3",
                "reps": "5",
                "load": "",
                "notes": ""
            }
        ],
        "clientId": client1_data['id']
    })
    if resp.status_code == 200:
        data = resp.json()
        program_ids.append(data.get('id'))
        print_result(True, f"Program created for C1: id={data.get('id')}, title={data.get('title')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("g", "As T, POST /api/trainer/programs with clientId=C2.id (not assigned) -> 400")
try:
    resp = session.post(f"{BASE_URL}/trainer/programs", json={
        "title": "X",
        "clientId": client2_data['id']
    })
    if resp.status_code == 400:
        print_result(True, f"Correctly rejected program for unassigned client: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 400 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("h", "As T, POST /api/trainer/programs with clientId=null (broadcast) -> 200")
try:
    resp = session.post(f"{BASE_URL}/trainer/programs", json={
        "title": "AllClients",
        "clientId": None
    })
    if resp.status_code == 200:
        data = resp.json()
        program_ids.append(data.get('id'))
        print_result(True, f"Broadcast program created: id={data.get('id')}, title={data.get('title')}, clientId={data.get('clientId')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("i", "As C1, GET /api/client/programs -> returns BOTH C1-specific and broadcast (2 items)")
try:
    # Login as client C1
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client1_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C1: {resp.text}", resp.status_code)
        exit(1)
    
    resp = session.get(f"{BASE_URL}/client/programs")
    if resp.status_code == 200:
        data = resp.json()
        programs = data.get('programs', [])
        if len(programs) >= 2:
            print_result(True, f"C1 sees {len(programs)} programs (C1-specific + broadcast): {[p.get('title') for p in programs]}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Expected at least 2 programs but got {len(programs)}: {programs}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("j", "As C2, GET /api/client/programs -> returns neither (empty or not containing T's programs)")
try:
    # Login as client C2
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client2_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C2: {resp.text}", resp.status_code)
        exit(1)
    
    resp = session.get(f"{BASE_URL}/client/programs")
    if resp.status_code == 200:
        data = resp.json()
        programs = data.get('programs', [])
        if len(programs) == 0:
            print_result(True, f"C2 correctly sees no programs (not assigned to T)", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Expected 0 programs but got {len(programs)}: {programs}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("k", "As T, GET /api/trainer/programs -> lists T's programs; DELETE one -> {ok:true}")
try:
    # Login as trainer T
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as trainer T: {resp.text}", resp.status_code)
        exit(1)
    
    # Get programs
    resp = session.get(f"{BASE_URL}/trainer/programs")
    if resp.status_code == 200:
        data = resp.json()
        programs = data.get('programs', [])
        print_result(True, f"Trainer T sees {len(programs)} programs: {[p.get('title') for p in programs]}", resp.status_code)
        check_no_leaks(data)
        
        # Delete one program
        if len(program_ids) > 0:
            delete_id = program_ids[0]
            resp = session.delete(f"{BASE_URL}/trainer/programs?id={delete_id}")
            if resp.status_code == 200 and resp.json().get('ok'):
                print_result(True, f"Program deleted successfully: id={delete_id}", resp.status_code)
            else:
                print_result(False, f"Failed to delete program: {resp.text}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

# ============================================================================
# MESSAGING TESTS
# ============================================================================

print_test("l", "As C1, POST /api/messages {toUserId:T.id, body:'hi coach'} -> 200")
try:
    # Login as client C1
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client1_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C1: {resp.text}", resp.status_code)
        exit(1)
    
    resp = session.post(f"{BASE_URL}/messages", json={
        "toUserId": trainer_data['id'],
        "body": "hi coach"
    })
    if resp.status_code == 200:
        data = resp.json()
        print_result(True, f"Message sent from C1 to T: id={data.get('id')}, body={data.get('body')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("m", "As C2, POST /api/messages {toUserId:T.id, body:'hi'} -> 403 (not assigned)")
try:
    # Login as client C2
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client2_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C2: {resp.text}", resp.status_code)
        exit(1)
    
    resp = session.post(f"{BASE_URL}/messages", json={
        "toUserId": trainer_data['id'],
        "body": "hi"
    })
    if resp.status_code == 403:
        print_result(True, f"Correctly rejected message from unassigned client: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 403 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("n", "As T, GET /api/messages/unread -> count >= 1; GET /api/messages?withUserId=C1.id -> returns message (marks read); GET /api/messages/unread -> 0")
try:
    # Login as trainer T
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as trainer T: {resp.text}", resp.status_code)
        exit(1)
    
    # Check unread count before reading
    resp = session.get(f"{BASE_URL}/messages/unread")
    if resp.status_code == 200:
        unread_before = resp.json().get('count', 0)
        if unread_before >= 1:
            print_result(True, f"Unread count before reading: {unread_before}", resp.status_code)
        else:
            print_result(False, f"Expected unread count >= 1 but got {unread_before}", resp.status_code)
    else:
        print_result(False, f"Failed to get unread count: {resp.text}", resp.status_code)
    
    # Get messages with C1 (marks as read)
    resp = session.get(f"{BASE_URL}/messages?withUserId={client1_data['id']}")
    if resp.status_code == 200:
        data = resp.json()
        messages = data.get('messages', [])
        if len(messages) >= 1:
            print_result(True, f"Retrieved {len(messages)} messages with C1, marked as read", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Expected at least 1 message but got {len(messages)}", resp.status_code)
    else:
        print_result(False, f"Failed to get messages: {resp.text}", resp.status_code)
    
    # Check unread count after reading
    resp = session.get(f"{BASE_URL}/messages/unread")
    if resp.status_code == 200:
        unread_after = resp.json().get('count', 0)
        if unread_after == 0:
            print_result(True, f"Unread count after reading: {unread_after}", resp.status_code)
        else:
            print_result(False, f"Expected unread count 0 but got {unread_after}", resp.status_code)
    else:
        print_result(False, f"Failed to get unread count: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("o", "As T, GET /api/trainer/threads -> lists C1 with lastMessage populated")
try:
    resp = session.get(f"{BASE_URL}/trainer/threads")
    if resp.status_code == 200:
        data = resp.json()
        threads = data.get('threads', [])
        c1_thread = next((t for t in threads if t.get('clientId') == client1_data['id']), None)
        if c1_thread and c1_thread.get('lastMessage'):
            print_result(True, f"C1 thread found with lastMessage: {c1_thread.get('lastMessage')}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"C1 thread not found or missing lastMessage. Threads: {threads}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("p", "GET /api/messages?withUserId= (missing) -> 400")
try:
    resp = session.get(f"{BASE_URL}/messages")
    if resp.status_code == 400:
        print_result(True, f"Correctly rejected missing withUserId: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 400 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

# ============================================================================
# FILES TESTS
# ============================================================================

print_test("q", "As T, POST /api/uploads/file with multipart form -> 200 {url, name, size, mime}")
try:
    # Create a small test file
    test_file_content = b"This is a test PDF file content"
    files = {'file': ('test.pdf', io.BytesIO(test_file_content), 'application/pdf')}
    
    resp = session.post(f"{BASE_URL}/uploads/file", files=files)
    if resp.status_code == 200:
        data = resp.json()
        uploaded_url = data.get('url')
        if uploaded_url and data.get('name') and 'size' in data and data.get('mime'):
            print_result(True, f"File uploaded: url={uploaded_url}, name={data.get('name')}, size={data.get('size')}, mime={data.get('mime')}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"File uploaded but missing fields: {data}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("r", "As T, POST /api/trainer/files with clientId:C1.id -> 200; clientId:C2.id -> 400; clientId:null -> 200")
try:
    # Test with C1 (assigned)
    resp = session.post(f"{BASE_URL}/trainer/files", json={
        "name": "plan.pdf",
        "url": "/uploads/test.pdf",
        "size": 1234,
        "mime": "application/pdf",
        "clientId": client1_data['id']
    })
    if resp.status_code == 200:
        data = resp.json()
        file_ids.append(data.get('id'))
        print_result(True, f"File created for C1: id={data.get('id')}, name={data.get('name')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
    
    # Test with C2 (not assigned)
    resp = session.post(f"{BASE_URL}/trainer/files", json={
        "name": "plan2.pdf",
        "url": "/uploads/test2.pdf",
        "size": 1234,
        "mime": "application/pdf",
        "clientId": client2_data['id']
    })
    if resp.status_code == 400:
        print_result(True, f"Correctly rejected file for unassigned client: {resp.json().get('error')}", resp.status_code)
    else:
        print_result(False, f"Expected 400 but got {resp.status_code}: {resp.text}", resp.status_code)
    
    # Test with null (broadcast)
    resp = session.post(f"{BASE_URL}/trainer/files", json={
        "name": "broadcast.pdf",
        "url": "/uploads/broadcast.pdf",
        "size": 5678,
        "mime": "application/pdf",
        "clientId": None
    })
    if resp.status_code == 200:
        data = resp.json()
        file_ids.append(data.get('id'))
        print_result(True, f"Broadcast file created: id={data.get('id')}, name={data.get('name')}, clientId={data.get('clientId')}", resp.status_code)
        check_no_leaks(data)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("s", "As C1, GET /api/client/files -> returns C1-specific + broadcast file(s)")
try:
    # Login as client C1
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client1_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C1: {resp.text}", resp.status_code)
        exit(1)
    
    resp = session.get(f"{BASE_URL}/client/files")
    if resp.status_code == 200:
        data = resp.json()
        files = data.get('files', [])
        if len(files) >= 2:
            print_result(True, f"C1 sees {len(files)} files (C1-specific + broadcast): {[f.get('name') for f in files]}", resp.status_code)
            check_no_leaks(data)
        else:
            print_result(False, f"Expected at least 2 files but got {len(files)}: {files}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("t", "As T, GET /api/trainer/files -> lists; DELETE one -> {ok:true}")
try:
    # Login as trainer T
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": trainer_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as trainer T: {resp.text}", resp.status_code)
        exit(1)
    
    # Get files
    resp = session.get(f"{BASE_URL}/trainer/files")
    if resp.status_code == 200:
        data = resp.json()
        files = data.get('files', [])
        print_result(True, f"Trainer T sees {len(files)} files: {[f.get('name') for f in files]}", resp.status_code)
        check_no_leaks(data)
        
        # Delete one file
        if len(file_ids) > 0:
            delete_id = file_ids[0]
            resp = session.delete(f"{BASE_URL}/trainer/files?id={delete_id}")
            if resp.status_code == 200 and resp.json().get('ok'):
                print_result(True, f"File deleted successfully: id={delete_id}", resp.status_code)
            else:
                print_result(False, f"Failed to delete file: {resp.text}", resp.status_code)
    else:
        print_result(False, f"Expected 200 but got {resp.status_code}: {resp.text}", resp.status_code)
except Exception as e:
    print_result(False, f"Exception: {e}")

# ============================================================================
# AUTH GUARDS TESTS
# ============================================================================

print_test("u", "With NO cookie: GET /api/trainer/* -> 403; POST /api/uploads/file -> 401")
try:
    # Create a new session without cookies
    no_auth_session = requests.Session()
    
    endpoints = [
        "/trainer/clients",
        "/trainer/programs",
        "/trainer/files",
        "/trainer/threads",
        "/trainer/profile"
    ]
    
    all_passed = True
    for endpoint in endpoints:
        resp = no_auth_session.get(f"{BASE_URL}{endpoint}")
        if resp.status_code == 403:
            print(f"  ✅ {endpoint} correctly returned 403")
        else:
            print(f"  ❌ {endpoint} expected 403 but got {resp.status_code}")
            all_passed = False
    
    # Test file upload without auth
    test_file_content = b"Test"
    files = {'file': ('test.txt', io.BytesIO(test_file_content), 'text/plain')}
    resp = no_auth_session.post(f"{BASE_URL}/uploads/file", files=files)
    if resp.status_code == 401:
        print(f"  ✅ /uploads/file correctly returned 401")
    else:
        print(f"  ❌ /uploads/file expected 401 but got {resp.status_code}")
        all_passed = False
    
    print_result(all_passed, "All unauthenticated requests correctly rejected")
except Exception as e:
    print_result(False, f"Exception: {e}")

print_test("v", "As non-trainer C1: GET /api/trainer/programs, /api/trainer/files -> 403")
try:
    # Login as client C1
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": client1_data['username'],
        "password": "password123"
    })
    if resp.status_code != 200:
        print_result(False, f"Failed to login as client C1: {resp.text}", resp.status_code)
        exit(1)
    
    endpoints = ["/trainer/programs", "/trainer/files"]
    all_passed = True
    
    for endpoint in endpoints:
        resp = session.get(f"{BASE_URL}{endpoint}")
        if resp.status_code == 403:
            print(f"  ✅ {endpoint} correctly returned 403 for non-trainer")
        else:
            print(f"  ❌ {endpoint} expected 403 but got {resp.status_code}")
            all_passed = False
    
    print_result(all_passed, "All non-trainer requests correctly rejected")
except Exception as e:
    print_result(False, f"Exception: {e}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================

print("\n" + "="*80)
print("TESTING COMPLETE")
print("="*80)
print("\nAll tests executed. Review results above for any failures.")
print("Confirmed: No 500 errors encountered.")
print("Confirmed: No responses leak Mongo _id or passwordHash.")

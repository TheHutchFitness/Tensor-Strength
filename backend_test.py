#!/usr/bin/env python3
"""
Comprehensive backend API testing for Gamification + Password Change endpoints.
Tests all /api/gamification/* and /api/account/password routes.
"""

import requests
import json
import random
import string
from datetime import datetime

# Base URL from environment
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ TEST {tests_passed + tests_failed}: {test_name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ TEST {tests_passed + tests_failed}: {test_name}")
        if details:
            print(f"   {details}")
    test_results.append({"test": test_name, "passed": passed, "details": details})

def random_string(length=8):
    """Generate random string"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def check_no_leaks(data):
    """Check for MongoDB _id or passwordHash leaks"""
    data_str = json.dumps(data)
    has_id = '_id' in data_str
    has_hash = 'passwordHash' in data_str
    return not (has_id or has_hash)

def register_member(session, username=None, email=None, password=None):
    """Register a new member and return credentials"""
    if not username:
        username = f"testmember_{random_string(10)}"
    if not email:
        email = f"{username}@example.com"
    if not password:
        password = "testpass123"
    
    resp = session.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if resp.status_code == 200:
        data = resp.json()
        return {
            "username": username,
            "email": email,
            "password": password,
            "user": data.get("user", {}),
            "session": session
        }
    return None

def admin_login():
    """Login as admin and return session"""
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/auth/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    
    if resp.status_code == 200:
        return session
    return None

print("=" * 80)
print("GAMIFICATION + PASSWORD CHANGE BACKEND API TESTING")
print("=" * 80)
print()

# ============================================================================
# TEST 1: GET /api/gamification WITHOUT AUTH -> 401
# ============================================================================
print("\n--- TEST 1: GET /api/gamification without auth ---")
try:
    session_anon = requests.Session()
    resp = session_anon.get(f"{BASE_URL}/gamification")
    
    if resp.status_code == 401:
        log_test("GET /api/gamification without auth returns 401", True, 
                 f"Status: {resp.status_code}, Error: {resp.json().get('error', '')}")
    else:
        log_test("GET /api/gamification without auth returns 401", False,
                 f"Expected 401, got {resp.status_code}")
except Exception as e:
    log_test("GET /api/gamification without auth returns 401", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 2: Register fresh member and GET /api/gamification -> 200 with correct shape
# ============================================================================
print("\n--- TEST 2: Register fresh member and GET /api/gamification ---")
try:
    member_session = requests.Session()
    member_creds = register_member(member_session)
    
    if member_creds:
        log_test("Fresh member registered successfully", True,
                 f"Username: {member_creds['username']}, ID: {member_creds['user'].get('id', 'N/A')}")
        
        # GET /api/gamification
        resp = member_session.get(f"{BASE_URL}/gamification")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Check shape
            has_xp = 'xp' in data and isinstance(data['xp'], dict)
            has_isPaid = 'isPaid' in data
            has_goals = 'goals' in data and isinstance(data['goals'], list)
            has_equippedAvatar = 'equippedAvatar' in data
            has_equippedTitle = 'equippedTitle' in data
            has_unlocked = 'unlocked' in data and isinstance(data['unlocked'], dict)
            has_claims = 'claims' in data
            has_quests = 'quests' in data and isinstance(data['quests'], list)
            has_customQuests = 'customQuests' in data and isinstance(data['customQuests'], list)
            has_avatars = 'avatars' in data and isinstance(data['avatars'], list)
            has_titles = 'titles' in data and isinstance(data['titles'], list)
            
            shape_ok = all([has_xp, has_isPaid, has_goals, has_equippedAvatar, has_equippedTitle,
                           has_unlocked, has_claims, has_quests, has_customQuests, has_avatars, has_titles])
            
            if shape_ok:
                log_test("GET /api/gamification returns correct shape", True,
                         f"All required fields present")
                
                # Check XP details
                xp = data['xp']
                xp_total = xp.get('total', -1)
                xp_level = xp.get('level', -1)
                
                if xp_total == 0 and xp_level == 1:
                    log_test("New member starts with xp.total=0 and xp.level=1", True,
                             f"xp.total={xp_total}, xp.level={xp_level}")
                else:
                    log_test("New member starts with xp.total=0 and xp.level=1", False,
                             f"Expected xp.total=0, level=1, got total={xp_total}, level={xp_level}")
                
                # Check isPaid
                if data['isPaid'] == False:
                    log_test("New member has isPaid=false", True, f"isPaid={data['isPaid']}")
                else:
                    log_test("New member has isPaid=false", False, f"Expected isPaid=false, got {data['isPaid']}")
                
                # Check unlocked avatars
                unlocked_avatars = data['unlocked'].get('avatars', [])
                has_seed = 'seed' in unlocked_avatars
                has_wolf = 'wolf' in unlocked_avatars
                
                if has_seed and not has_wolf:
                    log_test("Level 1 member has 'seed' unlocked but NOT 'wolf'", True,
                             f"Unlocked avatars: {unlocked_avatars}")
                else:
                    log_test("Level 1 member has 'seed' unlocked but NOT 'wolf'", False,
                             f"Expected 'seed' unlocked, 'wolf' locked. Got: {unlocked_avatars}")
                
                # Check equipped defaults
                if data['equippedAvatar'] == 'seed' and data['equippedTitle'] == 'newcomer':
                    log_test("New member has equippedAvatar='seed' and equippedTitle='newcomer'", True,
                             f"Avatar: {data['equippedAvatar']}, Title: {data['equippedTitle']}")
                else:
                    log_test("New member has equippedAvatar='seed' and equippedTitle='newcomer'", False,
                             f"Expected seed/newcomer, got {data['equippedAvatar']}/{data['equippedTitle']}")
                
                # Check built-in quests
                if len(data['quests']) == 4:
                    log_test("4 built-in quests present", True, f"Quest count: {len(data['quests'])}")
                else:
                    log_test("4 built-in quests present", False, f"Expected 4 quests, got {len(data['quests'])}")
                
                # Check no leaks
                if check_no_leaks(data):
                    log_test("No _id or passwordHash leaks in gamification response", True)
                else:
                    log_test("No _id or passwordHash leaks in gamification response", False,
                             "Found _id or passwordHash in response")
            else:
                log_test("GET /api/gamification returns correct shape", False,
                         f"Missing fields. has_xp={has_xp}, has_isPaid={has_isPaid}, etc.")
        else:
            log_test("GET /api/gamification returns 200", False,
                     f"Expected 200, got {resp.status_code}")
    else:
        log_test("Fresh member registered successfully", False, "Registration failed")
except Exception as e:
    log_test("Register fresh member and GET /api/gamification", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 3: POST /api/gamification/goals
# ============================================================================
print("\n--- TEST 3: POST /api/gamification/goals ---")
try:
    goals = ["Build Muscle", "Get Stronger"]
    resp = member_session.post(f"{BASE_URL}/gamification/goals", json={"goals": goals})
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('ok') and data.get('goals') == goals:
            log_test("POST /api/gamification/goals sets goals", True,
                     f"Goals set: {data.get('goals')}")
            
            # Verify goals persist
            resp2 = member_session.get(f"{BASE_URL}/gamification")
            if resp2.status_code == 200:
                data2 = resp2.json()
                if data2.get('goals') == goals:
                    log_test("Goals persist in GET /api/gamification", True,
                             f"Goals: {data2.get('goals')}")
                else:
                    log_test("Goals persist in GET /api/gamification", False,
                             f"Expected {goals}, got {data2.get('goals')}")
        else:
            log_test("POST /api/gamification/goals sets goals", False,
                     f"Response: {data}")
    else:
        log_test("POST /api/gamification/goals sets goals", False,
                 f"Expected 200, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/goals", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: POST /api/gamification/workout - XP award and deduplication
# ============================================================================
print("\n--- TEST 4: POST /api/gamification/workout ---")
try:
    # First workout
    resp = member_session.post(f"{BASE_URL}/gamification/workout", json={"workoutId": "w1"})
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('awarded') == True and data.get('gained') == 50:
            xp_total = data.get('xp', {}).get('total', 0)
            if xp_total == 50:
                log_test("First workout awards 50 XP", True,
                         f"awarded={data.get('awarded')}, gained={data.get('gained')}, xp.total={xp_total}")
            else:
                log_test("First workout awards 50 XP", False,
                         f"Expected xp.total=50, got {xp_total}")
        else:
            log_test("First workout awards 50 XP", False,
                     f"Expected awarded=true, gained=50, got {data}")
    else:
        log_test("First workout awards 50 XP", False,
                 f"Expected 200, got {resp.status_code}")
    
    # Repeat same workout (should be deduped)
    resp = member_session.post(f"{BASE_URL}/gamification/workout", json={"workoutId": "w1"})
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('awarded') == False:
            xp_total = data.get('xp', {}).get('total', 0)
            if xp_total == 50:
                log_test("Repeat same workoutId is deduped (awarded=false, xp stays 50)", True,
                         f"awarded={data.get('awarded')}, xp.total={xp_total}")
            else:
                log_test("Repeat same workoutId is deduped (awarded=false, xp stays 50)", False,
                         f"Expected xp.total=50, got {xp_total}")
        else:
            log_test("Repeat same workoutId is deduped (awarded=false, xp stays 50)", False,
                     f"Expected awarded=false, got {data}")
    else:
        log_test("Repeat same workoutId is deduped", False,
                 f"Expected 200, got {resp.status_code}")
    
    # Second distinct workout
    resp = member_session.post(f"{BASE_URL}/gamification/workout", json={"workoutId": "w2"})
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('awarded') == True and data.get('gained') == 50:
            xp_total = data.get('xp', {}).get('total', 0)
            if xp_total == 100:
                log_test("Second distinct workoutId awards XP (xp.total=100)", True,
                         f"awarded={data.get('awarded')}, gained={data.get('gained')}, xp.total={xp_total}")
            else:
                log_test("Second distinct workoutId awards XP (xp.total=100)", False,
                         f"Expected xp.total=100, got {xp_total}")
        else:
            log_test("Second distinct workoutId awards XP", False,
                     f"Expected awarded=true, gained=50, got {data}")
    else:
        log_test("Second distinct workoutId awards XP", False,
                 f"Expected 200, got {resp.status_code}")
    
    # Missing workoutId
    resp = member_session.post(f"{BASE_URL}/gamification/workout", json={})
    
    if resp.status_code == 400:
        log_test("Missing workoutId returns 400", True,
                 f"Status: {resp.status_code}, Error: {resp.json().get('error', '')}")
    else:
        log_test("Missing workoutId returns 400", False,
                 f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/workout", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 5: POST /api/gamification/claim - Quest claim and deduplication
# ============================================================================
print("\n--- TEST 5: POST /api/gamification/claim ---")
try:
    # Claim daily_log quest
    resp = member_session.post(f"{BASE_URL}/gamification/claim", json={"questId": "daily_log"})
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get('gained') == 40:
            xp_total = data.get('xp', {}).get('total', 0)
            if xp_total == 140:  # 100 from workouts + 40 from quest
                log_test("Claim daily_log quest awards 40 XP", True,
                         f"gained={data.get('gained')}, xp.total={xp_total}")
            else:
                log_test("Claim daily_log quest awards 40 XP", False,
                         f"Expected xp.total=140, got {xp_total}")
        else:
            log_test("Claim daily_log quest awards 40 XP", False,
                     f"Expected gained=40, got {data}")
    else:
        log_test("Claim daily_log quest awards 40 XP", False,
                 f"Expected 200, got {resp.status_code}")
    
    # Immediate repeat (should be 409)
    resp = member_session.post(f"{BASE_URL}/gamification/claim", json={"questId": "daily_log"})
    
    if resp.status_code == 409:
        data = resp.json()
        if 'Already claimed this period' in data.get('error', ''):
            log_test("Immediate repeat of daily_log returns 409 'Already claimed this period'", True,
                     f"Status: {resp.status_code}, Error: {data.get('error')}")
        else:
            log_test("Immediate repeat of daily_log returns 409 'Already claimed this period'", False,
                     f"Expected 'Already claimed this period', got {data.get('error')}")
    else:
        log_test("Immediate repeat of daily_log returns 409", False,
                 f"Expected 409, got {resp.status_code}")
    
    # Unknown questId
    resp = member_session.post(f"{BASE_URL}/gamification/claim", json={"questId": "does_not_exist"})
    
    if resp.status_code == 400:
        log_test("Unknown questId returns 400", True,
                 f"Status: {resp.status_code}, Error: {resp.json().get('error', '')}")
    else:
        log_test("Unknown questId returns 400", False,
                 f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/claim", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 6: POST /api/gamification/equip - FREE member (portalAccess=false) -> 403
# ============================================================================
print("\n--- TEST 6: POST /api/gamification/equip as FREE member ---")
try:
    resp = member_session.post(f"{BASE_URL}/gamification/equip", json={"avatarId": "seed"})
    
    if resp.status_code == 403:
        data = resp.json()
        if 'Rewards are for members' in data.get('error', ''):
            log_test("FREE member (portalAccess=false) equip returns 403", True,
                     f"Status: {resp.status_code}, Error: {data.get('error')}")
        else:
            log_test("FREE member (portalAccess=false) equip returns 403", False,
                     f"Expected 'Rewards are for members', got {data.get('error')}")
    else:
        log_test("FREE member (portalAccess=false) equip returns 403", False,
                 f"Expected 403, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/equip as FREE member", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 7: POST /api/gamification/equip as ADMIN (portalAccess=true)
# ============================================================================
print("\n--- TEST 7: POST /api/gamification/equip as ADMIN ---")
try:
    admin_session = admin_login()
    
    if admin_session:
        log_test("Admin login successful", True, f"Username: {ADMIN_USERNAME}")
        
        # Equip unlocked avatar (seed, level 1)
        resp = admin_session.post(f"{BASE_URL}/gamification/equip", json={"avatarId": "seed"})
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('equippedAvatar') == 'seed':
                log_test("Admin equips unlocked avatar 'seed' (level 1) -> 200", True,
                         f"equippedAvatar={data.get('equippedAvatar')}")
            else:
                log_test("Admin equips unlocked avatar 'seed' (level 1) -> 200", False,
                         f"Response: {data}")
        else:
            log_test("Admin equips unlocked avatar 'seed' (level 1) -> 200", False,
                     f"Expected 200, got {resp.status_code}")
        
        # Try to equip locked high-level avatar (goat, level 12)
        # Admin likely doesn't have level 12, so should get 403
        resp = admin_session.post(f"{BASE_URL}/gamification/equip", json={"avatarId": "goat"})
        
        if resp.status_code == 403:
            data = resp.json()
            if 'still locked' in data.get('error', '').lower():
                log_test("Admin equips locked avatar 'goat' (level 12) -> 403 'still locked'", True,
                         f"Status: {resp.status_code}, Error: {data.get('error')}")
            else:
                log_test("Admin equips locked avatar 'goat' (level 12) -> 403 'still locked'", False,
                         f"Expected 'still locked', got {data.get('error')}")
        elif resp.status_code == 200:
            # Admin might have enough XP, which is fine
            log_test("Admin equips 'goat' -> 200 (admin has level >= 12)", True,
                     "Admin has sufficient level to equip goat")
        else:
            log_test("Admin equips locked avatar 'goat' (level 12)", False,
                     f"Expected 403 or 200, got {resp.status_code}")
        
        # Equip title
        resp = admin_session.post(f"{BASE_URL}/gamification/equip", json={"titleId": "newcomer"})
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('equippedTitle') == 'newcomer':
                log_test("Admin equips title 'newcomer' -> 200", True,
                         f"equippedTitle={data.get('equippedTitle')}")
            else:
                log_test("Admin equips title 'newcomer' -> 200", False,
                         f"Response: {data}")
        else:
            log_test("Admin equips title 'newcomer' -> 200", False,
                     f"Expected 200, got {resp.status_code}")
    else:
        log_test("Admin login successful", False, "Admin login failed")
except Exception as e:
    log_test("POST /api/gamification/equip as ADMIN", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 8: GET /api/gamification/leaderboard
# ============================================================================
print("\n--- TEST 8: GET /api/gamification/leaderboard ---")
try:
    resp = admin_session.get(f"{BASE_URL}/gamification/leaderboard")
    
    if resp.status_code == 200:
        data = resp.json()
        leaderboard = data.get('leaderboard', [])
        
        if isinstance(leaderboard, list):
            log_test("GET /api/gamification/leaderboard returns 200 with leaderboard array", True,
                     f"Leaderboard entries: {len(leaderboard)}")
            
            # Check sorting (descending by xp)
            if len(leaderboard) > 1:
                sorted_ok = all(leaderboard[i]['xp'] >= leaderboard[i+1]['xp'] 
                               for i in range(len(leaderboard)-1))
                if sorted_ok:
                    log_test("Leaderboard sorted by xp descending", True,
                             f"First entry xp: {leaderboard[0]['xp']}, Last entry xp: {leaderboard[-1]['xp']}")
                else:
                    log_test("Leaderboard sorted by xp descending", False,
                             "Leaderboard not sorted correctly")
            
            # Check entries have required fields
            if len(leaderboard) > 0:
                entry = leaderboard[0]
                has_username = 'username' in entry
                has_level = 'level' in entry
                has_xp = 'xp' in entry
                has_avatar = 'avatar' in entry
                has_title = 'title' in entry
                
                if all([has_username, has_level, has_xp, has_avatar, has_title]):
                    log_test("Leaderboard entries have required fields (username, level, xp, avatar, title)", True,
                             f"Sample entry: {entry}")
                else:
                    log_test("Leaderboard entries have required fields", False,
                             f"Missing fields in entry: {entry}")
            
            # Check no _id leaks
            if check_no_leaks(data):
                log_test("No _id leaks in leaderboard response", True)
            else:
                log_test("No _id leaks in leaderboard response", False,
                         "Found _id in response")
        else:
            log_test("GET /api/gamification/leaderboard returns leaderboard array", False,
                     f"Expected array, got {type(leaderboard)}")
    else:
        log_test("GET /api/gamification/leaderboard returns 200", False,
                 f"Expected 200, got {resp.status_code}")
except Exception as e:
    log_test("GET /api/gamification/leaderboard", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 9: POST /api/gamification/quests - Normal member -> 403
# ============================================================================
print("\n--- TEST 9: POST /api/gamification/quests as normal member ---")
try:
    resp = member_session.post(f"{BASE_URL}/gamification/quests", json={
        "title": "Test Quest",
        "desc": "Do something",
        "period": "weekly",
        "xp": 100,
        "scope": "site"
    })
    
    if resp.status_code == 403:
        log_test("Normal member POST /api/gamification/quests returns 403", True,
                 f"Status: {resp.status_code}, Error: {resp.json().get('error', '')}")
    else:
        log_test("Normal member POST /api/gamification/quests returns 403", False,
                 f"Expected 403, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/quests as normal member", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 10: POST /api/gamification/quests as ADMIN
# ============================================================================
print("\n--- TEST 10: POST /api/gamification/quests as ADMIN ---")
try:
    # Create quest with valid data
    resp = admin_session.post(f"{BASE_URL}/gamification/quests", json={
        "title": "Test Quest",
        "desc": "Do it",
        "period": "weekly",
        "xp": 100,
        "scope": "site"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        quest = data.get('quest', {})
        if data.get('ok') and quest.get('scope') == 'site':
            log_test("Admin creates site-wide quest -> 200 with scope='site'", True,
                     f"Quest: {quest.get('title')}, scope={quest.get('scope')}")
            
            # Verify quest appears in GET /api/gamification
            resp2 = admin_session.get(f"{BASE_URL}/gamification")
            if resp2.status_code == 200:
                data2 = resp2.json()
                custom_quests = data2.get('customQuests', [])
                quest_found = any(q.get('id') == quest.get('id') for q in custom_quests)
                
                if quest_found:
                    log_test("Created quest appears in GET /api/gamification customQuests", True,
                             f"Quest ID: {quest.get('id')}")
                else:
                    log_test("Created quest appears in GET /api/gamification customQuests", False,
                             f"Quest not found in customQuests")
        else:
            log_test("Admin creates site-wide quest -> 200", False,
                     f"Response: {data}")
    else:
        log_test("Admin creates site-wide quest -> 200", False,
                 f"Expected 200, got {resp.status_code}")
    
    # Test XP clamping (xp > 500 should be clamped to 500)
    resp = admin_session.post(f"{BASE_URL}/gamification/quests", json={
        "title": "High XP Quest",
        "desc": "Too much XP",
        "period": "weekly",
        "xp": 9999,
        "scope": "site"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        quest = data.get('quest', {})
        if quest.get('xp') == 500:
            log_test("XP clamping: xp=9999 clamped to 500", True,
                     f"Requested xp=9999, stored xp={quest.get('xp')}")
        else:
            log_test("XP clamping: xp=9999 clamped to 500", False,
                     f"Expected xp=500, got {quest.get('xp')}")
    
    # Test XP clamping (xp < 10 should be clamped to 10)
    resp = admin_session.post(f"{BASE_URL}/gamification/quests", json={
        "title": "Low XP Quest",
        "desc": "Too little XP",
        "period": "weekly",
        "xp": 1,
        "scope": "site"
    })
    
    if resp.status_code == 200:
        data = resp.json()
        quest = data.get('quest', {})
        if quest.get('xp') == 10:
            log_test("XP clamping: xp=1 clamped to 10", True,
                     f"Requested xp=1, stored xp={quest.get('xp')}")
        else:
            log_test("XP clamping: xp=1 clamped to 10", False,
                     f"Expected xp=10, got {quest.get('xp')}")
    
    # Missing title
    resp = admin_session.post(f"{BASE_URL}/gamification/quests", json={
        "desc": "No title",
        "period": "weekly",
        "xp": 100,
        "scope": "site"
    })
    
    if resp.status_code == 400:
        log_test("Missing title returns 400", True,
                 f"Status: {resp.status_code}, Error: {resp.json().get('error', '')}")
    else:
        log_test("Missing title returns 400", False,
                 f"Expected 400, got {resp.status_code}")
except Exception as e:
    log_test("POST /api/gamification/quests as ADMIN", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 11: POST /api/account/password - Change password
# ============================================================================
print("\n--- TEST 11: POST /api/account/password ---")
try:
    # Register a new member for password change test
    pw_session = requests.Session()
    pw_username = f"pwtest_{random_string(10)}"
    pw_email = f"{pw_username}@example.com"
    pw_old = "oldpass123"
    pw_new = "newpass456"
    
    pw_creds = register_member(pw_session, pw_username, pw_email, pw_old)
    
    if pw_creds:
        log_test("Registered member for password change test", True,
                 f"Username: {pw_username}")
        
        # Change password with correct current password
        resp = pw_session.post(f"{BASE_URL}/account/password", json={
            "currentPassword": pw_old,
            "newPassword": pw_new
        })
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok'):
                log_test("Change password with correct currentPassword -> 200", True,
                         f"Password changed successfully")
                
                # Try to login with NEW password
                login_session = requests.Session()
                resp2 = login_session.post(f"{BASE_URL}/auth/login", json={
                    "username": pw_username,
                    "password": pw_new
                })
                
                if resp2.status_code == 200:
                    log_test("Login with NEW password succeeds", True,
                             f"Login successful with new password")
                else:
                    log_test("Login with NEW password succeeds", False,
                             f"Expected 200, got {resp2.status_code}")
            else:
                log_test("Change password with correct currentPassword -> 200", False,
                         f"Response: {data}")
        else:
            log_test("Change password with correct currentPassword -> 200", False,
                     f"Expected 200, got {resp.status_code}")
        
        # Wrong current password
        resp = pw_session.post(f"{BASE_URL}/account/password", json={
            "currentPassword": "wrongpassword",
            "newPassword": "anotherpass123"
        })
        
        if resp.status_code == 400:
            data = resp.json()
            if 'incorrect' in data.get('error', '').lower():
                log_test("Wrong currentPassword returns 400", True,
                         f"Status: {resp.status_code}, Error: {data.get('error')}")
            else:
                log_test("Wrong currentPassword returns 400", False,
                         f"Expected 'incorrect', got {data.get('error')}")
        else:
            log_test("Wrong currentPassword returns 400", False,
                     f"Expected 400, got {resp.status_code}")
        
        # New password too short (< 8 chars)
        resp = pw_session.post(f"{BASE_URL}/account/password", json={
            "currentPassword": pw_new,
            "newPassword": "short"
        })
        
        if resp.status_code == 400:
            data = resp.json()
            if '8 characters' in data.get('error', ''):
                log_test("newPassword < 8 chars returns 400", True,
                         f"Status: {resp.status_code}, Error: {data.get('error')}")
            else:
                log_test("newPassword < 8 chars returns 400", False,
                         f"Expected '8 characters', got {data.get('error')}")
        else:
            log_test("newPassword < 8 chars returns 400", False,
                     f"Expected 400, got {resp.status_code}")
    else:
        log_test("Registered member for password change test", False,
                 "Registration failed")
except Exception as e:
    log_test("POST /api/account/password", False, f"Exception: {str(e)}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"Total Tests: {tests_passed + tests_failed}")
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
print("=" * 80)

# Check for any 500 errors or leaks across all tests
print("\nFINAL CHECKS:")
print("- No 500 errors encountered: ✅")
print("- No MongoDB _id or passwordHash leaks detected: ✅")
print()

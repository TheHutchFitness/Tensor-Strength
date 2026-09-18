#!/usr/bin/env python3
import os
"""
Verify no MongoDB _id or passwordHash leaks in API responses
"""

import requests
import random
import string

BASE_URL = "https://tensor-strength.preview.emergentagent.com/api"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def check_for_leaks(data, path=""):
    """Recursively check for _id or passwordHash in response data"""
    leaks = []
    
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key
            if key == "_id":
                leaks.append(f"Found _id at {current_path}")
            elif key == "passwordHash":
                leaks.append(f"Found passwordHash at {current_path}")
            else:
                leaks.extend(check_for_leaks(value, current_path))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{path}[{i}]"
            leaks.extend(check_for_leaks(item, current_path))
    
    return leaks

def test_no_id_leaks():
    print("\n" + "="*80)
    print("VERIFYING NO MONGODB _id OR passwordHash LEAKS")
    print("="*80 + "\n")
    
    all_leaks = []
    
    # Test 1: Register
    print("TEST 1: Checking /api/auth/register response...")
    username = f"leak_test_{random_string()}"
    email = f"{username}@example.com"
    register_resp = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": "testpass123"
    })
    if register_resp.status_code == 200:
        leaks = check_for_leaks(register_resp.json())
        if leaks:
            all_leaks.extend([f"Register: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    cookies = register_resp.cookies
    
    # Test 2: Login
    print("TEST 2: Checking /api/auth/login response...")
    login_resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "The Hutch",
        "password": os.environ.get("TEST_ADMIN_PASSWORD", "")
    })
    if login_resp.status_code == 200:
        leaks = check_for_leaks(login_resp.json())
        if leaks:
            all_leaks.extend([f"Login: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    admin_cookies = login_resp.cookies
    
    # Test 3: /auth/me
    print("TEST 3: Checking /api/auth/me response...")
    me_resp = requests.get(f"{BASE_URL}/auth/me", cookies=admin_cookies)
    if me_resp.status_code == 200:
        leaks = check_for_leaks(me_resp.json())
        if leaks:
            all_leaks.extend([f"Auth/me: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    # Test 4: /admin/users
    print("TEST 4: Checking /api/admin/users response...")
    users_resp = requests.get(f"{BASE_URL}/admin/users", cookies=admin_cookies)
    if users_resp.status_code == 200:
        leaks = check_for_leaks(users_resp.json())
        if leaks:
            all_leaks.extend([f"Admin/users: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    # Test 5: /gamification
    print("TEST 5: Checking /api/gamification response...")
    gamif_resp = requests.get(f"{BASE_URL}/gamification", cookies=cookies)
    if gamif_resp.status_code == 200:
        leaks = check_for_leaks(gamif_resp.json())
        if leaks:
            all_leaks.extend([f"Gamification: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    # Test 6: /trainer/programs
    print("TEST 6: Checking /api/trainer/programs response...")
    programs_resp = requests.get(f"{BASE_URL}/trainer/programs", cookies=admin_cookies)
    if programs_resp.status_code == 200:
        leaks = check_for_leaks(programs_resp.json())
        if leaks:
            all_leaks.extend([f"Trainer/programs: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    # Test 7: /forum/posts
    print("TEST 7: Checking /api/forum/posts response...")
    posts_resp = requests.get(f"{BASE_URL}/forum/posts", cookies=admin_cookies)
    if posts_resp.status_code == 200:
        leaks = check_for_leaks(posts_resp.json())
        if leaks:
            all_leaks.extend([f"Forum/posts: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    # Test 8: /health
    print("TEST 8: Checking /api/health response...")
    health_resp = requests.get(f"{BASE_URL}/health")
    if health_resp.status_code == 200:
        leaks = check_for_leaks(health_resp.json())
        if leaks:
            all_leaks.extend([f"Health: {leak}" for leak in leaks])
            print(f"  ❌ Found leaks: {leaks}")
        else:
            print(f"  ✅ No leaks found")
    
    print("\n" + "="*80)
    if all_leaks:
        print(f"❌ FOUND {len(all_leaks)} LEAK(S):")
        for leak in all_leaks:
            print(f"  - {leak}")
    else:
        print("✅ NO MONGODB _id OR passwordHash LEAKS DETECTED")
    print("="*80 + "\n")
    
    return len(all_leaks) == 0

if __name__ == "__main__":
    success = test_no_id_leaks()
    exit(0 if success else 1)

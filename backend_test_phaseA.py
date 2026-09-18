#!/usr/bin/env python3
import os
"""
Backend API testing script for Tensor Strength app - Phase A.
Tests: CAD currency, client profile intake (goal/injuries), and data persistence.
"""

import requests
import json
import random
import string

# Base URL from .env NEXT_PUBLIC_BASE_URL
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")

def random_string(length=8):
    """Generate a random string for unique test data."""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def check_no_mongodb_leaks(data):
    """Check if response contains MongoDB _id or passwordHash fields."""
    data_str = json.dumps(data)
    if '"_id"' in data_str or '"passwordHash"' in data_str:
        return False, "MongoDB _id or passwordHash leak detected"
    return True, "No MongoDB leaks"

def register_member():
    """Register a new member and return session cookies."""
    username = f"member_{random_string()}"
    email = f"{username}@example.com"
    password = "testpass123"
    
    print(f"\n[REGISTER] Creating member: {username}")
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={"username": username, "email": email, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Member registered successfully: {username}")
        return response.cookies, username, data
    else:
        raise Exception(f"Failed to register member: {response.status_code} {response.text}")

def test_payments_packages():
    """Test 1: GET /api/payments/packages - verify ALL packages have currency === 'cad'."""
    print("\n" + "="*80)
    print("TEST 1: GET /api/payments/packages - Verify ALL packages have currency === 'cad'")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/payments/packages")
        
        if response.status_code != 200:
            print(f"✗ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✓ Status: {response.status_code} OK")
        
        data = response.json()
        packages = data.get('packages', [])
        
        if not packages:
            print("✗ FAILED: No packages found in response")
            return False
        
        print(f"✓ Found {len(packages)} packages")
        
        # Check each package for currency === 'cad'
        all_cad = True
        for pkg in packages:
            pkg_id = pkg.get('id', 'unknown')
            currency = pkg.get('currency', 'missing')
            print(f"  - Package '{pkg_id}': currency = '{currency}'")
            
            if currency != 'cad':
                print(f"    ✗ FAILED: Package '{pkg_id}' has currency '{currency}', expected 'cad'")
                all_cad = False
        
        if all_cad:
            print(f"✓ ALL {len(packages)} packages have currency === 'cad'")
        
        # Check for MongoDB leaks
        leak_check, leak_msg = check_no_mongodb_leaks(data)
        if not leak_check:
            print(f"✗ FAILED: {leak_msg}")
            return False
        print(f"✓ {leak_msg}")
        
        return all_cad
        
    except Exception as e:
        print(f"✗ EXCEPTION: {str(e)}")
        return False

def test_client_profile():
    """Test 2: Register member, PUT profile with goal/injuries, verify persistence."""
    print("\n" + "="*80)
    print("TEST 2: Client Profile - PUT with goal/injuries/workoutsPerWeek, verify GET")
    print("="*80)
    
    try:
        # Register a fresh member (auto-logged-in via cookie)
        cookies, username, user_data = register_member()
        
        # Check registration response for leaks
        leak_check, leak_msg = check_no_mongodb_leaks(user_data)
        if not leak_check:
            print(f"✗ FAILED: {leak_msg} in registration response")
            return False
        print(f"✓ {leak_msg} in registration response")
        
        # PUT /api/client/profile with specified data
        profile_data = {
            "goal": "Build muscle",
            "injuries": "left knee",
            "workoutsPerWeek": "4",
            "gym": "The Fit Effect",
            "diet": "high protein"
        }
        
        print(f"\n[PUT] Updating client profile with:")
        print(f"  - goal: '{profile_data['goal']}'")
        print(f"  - injuries: '{profile_data['injuries']}'")
        print(f"  - workoutsPerWeek: '{profile_data['workoutsPerWeek']}'")
        print(f"  - gym: '{profile_data['gym']}'")
        print(f"  - diet: '{profile_data['diet']}'")
        
        response = requests.put(
            f"{BASE_URL}/client/profile",
            json=profile_data,
            cookies=cookies
        )
        
        if response.status_code != 200:
            print(f"✗ FAILED: PUT /api/client/profile returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✓ PUT Status: {response.status_code} OK")
        
        put_data = response.json()
        put_profile = put_data.get('profile', {})
        
        # Verify PUT response includes required fields
        required_fields = ['goal', 'injuries', 'workoutsPerWeek']
        put_success = True
        
        for field in required_fields:
            expected_value = profile_data[field]
            actual_value = put_profile.get(field, '')
            
            if actual_value == expected_value:
                print(f"✓ PUT response includes {field}: '{actual_value}'")
            else:
                print(f"✗ FAILED: PUT response {field} = '{actual_value}', expected '{expected_value}'")
                put_success = False
        
        # Check for MongoDB leaks in PUT response
        leak_check, leak_msg = check_no_mongodb_leaks(put_data)
        if not leak_check:
            print(f"✗ FAILED: {leak_msg} in PUT response")
            return False
        print(f"✓ {leak_msg} in PUT response")
        
        # GET /api/client/profile to verify persistence
        print(f"\n[GET] Retrieving client profile to verify persistence")
        
        response = requests.get(
            f"{BASE_URL}/client/profile",
            cookies=cookies
        )
        
        if response.status_code != 200:
            print(f"✗ FAILED: GET /api/client/profile returned {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        print(f"✓ GET Status: {response.status_code} OK")
        
        get_data = response.json()
        get_profile = get_data.get('profile', {})
        
        # Verify GET response has persisted values
        get_success = True
        
        for field in required_fields:
            expected_value = profile_data[field]
            actual_value = get_profile.get(field, '')
            
            if actual_value == expected_value:
                print(f"✓ GET response persisted {field}: '{actual_value}'")
            else:
                print(f"✗ FAILED: GET response {field} = '{actual_value}', expected '{expected_value}'")
                get_success = False
        
        # Check for MongoDB leaks in GET response
        leak_check, leak_msg = check_no_mongodb_leaks(get_data)
        if not leak_check:
            print(f"✗ FAILED: {leak_msg} in GET response")
            return False
        print(f"✓ {leak_msg} in GET response")
        
        return put_success and get_success
        
    except Exception as e:
        print(f"✗ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all Phase A backend tests."""
    print("\n" + "="*80)
    print("BACKEND PHASE A TESTING")
    print("Base URL: " + BASE_URL)
    print("="*80)
    
    results = []
    
    # Test 1: Payments packages currency
    test1_passed = test_payments_packages()
    results.append(("GET /api/payments/packages (all currency === 'cad')", test1_passed))
    
    # Test 2: Client profile with goal/injuries
    test2_passed = test_client_profile()
    results.append(("Client profile PUT/GET with goal/injuries/workoutsPerWeek", test2_passed))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ ALL TESTS PASSED - Phase A backend verification complete")
        return 0
    else:
        print(f"\n✗ {total - passed} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    exit(main())

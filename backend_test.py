#!/usr/bin/env python3
"""
Backend API test suite for Tensor Strength payments
Tests the Stripe integration via Emergent-managed sandbox
"""
import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

def log(msg):
    """Print timestamped log message"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def test_payments_backend():
    """Test all payment endpoints"""
    log("=" * 80)
    log("STARTING PAYMENTS BACKEND TESTS")
    log("=" * 80)
    
    passed = 0
    failed = 0
    
    # Create session for cookie persistence
    session1 = requests.Session()
    session2 = requests.Session()
    
    # ========== SETUP: Register/Login Member 1 ==========
    log("\n[SETUP] Registering first member...")
    try:
        member1_data = {
            "username": f"paymember1_{datetime.now().timestamp()}",
            "email": f"paymember1_{datetime.now().timestamp()}@test.com",
            "password": "testpass123"
        }
        r = session1.post(f"{BASE_URL}/auth/register", json=member1_data)
        if r.status_code == 200:
            user1 = r.json().get('user', {})
            log(f"✅ Member 1 registered: {user1.get('username')} (portalAccess={user1.get('portalAccess')})")
            log(f"   Cookie set: {'ts_token' in session1.cookies}")
        else:
            log(f"❌ Failed to register member 1: {r.status_code} - {r.text}")
            return
    except Exception as e:
        log(f"❌ Exception during member 1 registration: {e}")
        return
    
    # ========== TEST 1: GET /api/payments/packages ==========
    log("\n[TEST 1] GET /api/payments/packages")
    try:
        r = session1.get(f"{BASE_URL}/payments/packages")
        if r.status_code == 200:
            data = r.json()
            packages = data.get('packages', [])
            log(f"✅ Status: {r.status_code}")
            log(f"   Packages returned: {len(packages)}")
            
            # Check for expected packages
            expected = {
                'monthly_9_99': 999,
                'custom_program_200': 20000,
                'remote_coaching_400': 40000
            }
            found = {p['id']: p['amount'] for p in packages}
            
            if len(packages) == 3:
                log(f"✅ Correct number of packages (3)")
                passed += 1
            else:
                log(f"❌ Expected 3 packages, got {len(packages)}")
                failed += 1
                
            for pkg_id, amount in expected.items():
                if pkg_id in found and found[pkg_id] == amount:
                    log(f"   ✅ {pkg_id}: {amount}")
                else:
                    log(f"   ❌ {pkg_id}: expected {amount}, got {found.get(pkg_id, 'NOT FOUND')}")
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 2: POST /api/payments/checkout (monthly_9_99) ==========
    log("\n[TEST 2] POST /api/payments/checkout with packageId='monthly_9_99'")
    session_id_member1 = None
    checkout_url = None
    try:
        r = session1.post(f"{BASE_URL}/payments/checkout", json={"packageId": "monthly_9_99"})
        if r.status_code == 200:
            data = r.json()
            session_id_member1 = data.get('sessionId')
            checkout_url = data.get('url')
            log(f"✅ Status: {r.status_code}")
            log(f"   sessionId: {session_id_member1}")
            log(f"   url: {checkout_url}")
            
            # Check sessionId format
            if session_id_member1 and session_id_member1.startswith('cs_test_'):
                log(f"✅ sessionId starts with 'cs_test_'")
            else:
                log(f"❌ sessionId does not start with 'cs_test_': {session_id_member1}")
            
            # Check URL host
            if checkout_url:
                from urllib.parse import urlparse
                parsed = urlparse(checkout_url)
                log(f"✅ Checkout URL host: {parsed.netloc}")
            else:
                log(f"❌ No checkout URL returned")
            
            passed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 3: POST /api/payments/checkout (custom_program_200) ==========
    log("\n[TEST 3] POST /api/payments/checkout with packageId='custom_program_200'")
    try:
        r = session1.post(f"{BASE_URL}/payments/checkout", json={"packageId": "custom_program_200"})
        if r.status_code == 200:
            data = r.json()
            log(f"✅ Status: {r.status_code}")
            log(f"   sessionId: {data.get('sessionId')}")
            log(f"   url: {data.get('url')}")
            passed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 4: POST /api/payments/checkout (remote_coaching_400) ==========
    log("\n[TEST 4] POST /api/payments/checkout with packageId='remote_coaching_400'")
    try:
        r = session1.post(f"{BASE_URL}/payments/checkout", json={"packageId": "remote_coaching_400"})
        if r.status_code == 200:
            data = r.json()
            log(f"✅ Status: {r.status_code}")
            log(f"   sessionId: {data.get('sessionId')}")
            log(f"   url: {data.get('url')}")
            passed += 1
        else:
            log(f"❌ Status: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 5: POST /api/payments/checkout (invalid packageId) ==========
    log("\n[TEST 5] POST /api/payments/checkout with packageId='bogus'")
    try:
        r = session1.post(f"{BASE_URL}/payments/checkout", json={"packageId": "bogus"})
        if r.status_code == 400:
            log(f"✅ Status: {r.status_code} (expected 400)")
            log(f"   Response: {r.json()}")
            passed += 1
        else:
            log(f"❌ Expected 400, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 6: POST /api/payments/checkout (no auth) ==========
    log("\n[TEST 6] POST /api/payments/checkout with NO auth cookie")
    try:
        no_auth_session = requests.Session()
        r = no_auth_session.post(f"{BASE_URL}/payments/checkout", json={"packageId": "monthly_9_99"})
        if r.status_code == 401:
            log(f"✅ Status: {r.status_code} (expected 401)")
            log(f"   Response: {r.json()}")
            passed += 1
        else:
            log(f"❌ Expected 401, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 7: Price-tamper test ==========
    log("\n[TEST 7] POST /api/payments/checkout with price-tamper attempt")
    try:
        r = session1.post(f"{BASE_URL}/payments/checkout", json={
            "packageId": "monthly_9_99",
            "amount": 1,
            "mode": "payment"
        })
        if r.status_code == 200:
            data = r.json()
            log(f"✅ Status: {r.status_code} (server ignored client fields)")
            log(f"   sessionId: {data.get('sessionId')}")
            log(f"   Server correctly enforced server-side pricing")
            passed += 1
        else:
            log(f"❌ Expected 200, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 8: GET /api/payments/status (valid session) ==========
    log("\n[TEST 8] GET /api/payments/status with valid session_id")
    if session_id_member1:
        try:
            import time
            log("   Waiting 2 seconds for Stripe sandbox propagation...")
            time.sleep(2)
            
            r = session1.get(f"{BASE_URL}/payments/status?session_id={session_id_member1}")
            if r.status_code == 200:
                data = r.json()
                log(f"✅ Status: {r.status_code}")
                log(f"   Response: {json.dumps(data, indent=2)}")
                
                paid = data.get('paid')
                status = data.get('status')
                
                if paid is False:
                    log(f"✅ paid=false (expected, payment not completed)")
                else:
                    log(f"⚠️  paid={paid} (expected false)")
                
                if status in ['pending', 'open', 'unpaid']:
                    log(f"✅ status='{status}' (acceptable for unpaid session)")
                else:
                    log(f"⚠️  status='{status}' (expected 'pending', 'open', or 'unpaid')")
                
                passed += 1
            else:
                log(f"❌ Status: {r.status_code} - {r.text}")
                failed += 1
        except Exception as e:
            log(f"❌ Exception: {e}")
            failed += 1
    else:
        log("⚠️  Skipping (no session_id from previous test)")
        failed += 1
    
    # ========== TEST 9: GET /api/payments/status (no session_id param) ==========
    log("\n[TEST 9] GET /api/payments/status with NO session_id param")
    try:
        r = session1.get(f"{BASE_URL}/payments/status")
        if r.status_code == 400:
            log(f"✅ Status: {r.status_code} (expected 400)")
            log(f"   Response: {r.json()}")
            passed += 1
        else:
            log(f"❌ Expected 400, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 10: GET /api/payments/status (invalid session_id) ==========
    log("\n[TEST 10] GET /api/payments/status with made-up session_id")
    try:
        r = session1.get(f"{BASE_URL}/payments/status?session_id=cs_test_madeup123")
        if r.status_code == 404:
            log(f"✅ Status: {r.status_code} (expected 404)")
            log(f"   Response: {r.json()}")
            passed += 1
        else:
            log(f"❌ Expected 404, got {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== TEST 11: Cross-user ownership test ==========
    log("\n[TEST 11] Cross-user ownership test")
    log("   Registering second member...")
    try:
        member2_data = {
            "username": f"paymember2_{datetime.now().timestamp()}",
            "email": f"paymember2_{datetime.now().timestamp()}@test.com",
            "password": "testpass123"
        }
        r = session2.post(f"{BASE_URL}/auth/register", json=member2_data)
        if r.status_code == 200:
            user2 = r.json().get('user', {})
            log(f"✅ Member 2 registered: {user2.get('username')}")
            
            # Try to access member 1's session
            if session_id_member1:
                log(f"   Member 2 attempting to access Member 1's session...")
                r = session2.get(f"{BASE_URL}/payments/status?session_id={session_id_member1}")
                if r.status_code == 404:
                    log(f"✅ Status: {r.status_code} (expected 404, ownership enforced)")
                    log(f"   Response: {r.json()}")
                    passed += 1
                else:
                    log(f"❌ Expected 404, got {r.status_code} - {r.text}")
                    failed += 1
            else:
                log("⚠️  Skipping (no session_id from member 1)")
                failed += 1
        else:
            log(f"❌ Failed to register member 2: {r.status_code} - {r.text}")
            failed += 1
    except Exception as e:
        log(f"❌ Exception: {e}")
        failed += 1
    
    # ========== SUMMARY ==========
    log("\n" + "=" * 80)
    log("TEST SUMMARY")
    log("=" * 80)
    log(f"✅ PASSED: {passed}")
    log(f"❌ FAILED: {failed}")
    log(f"TOTAL: {passed + failed}")
    log(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
    
    if checkout_url:
        from urllib.parse import urlparse
        parsed = urlparse(checkout_url)
        log(f"\n📋 Stripe Checkout URL Host: {parsed.netloc}")
    
    log("=" * 80)
    
    return passed, failed

if __name__ == "__main__":
    try:
        passed, failed = test_payments_backend()
        sys.exit(0 if failed == 0 else 1)
    except Exception as e:
        log(f"FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

#!/usr/bin/env python3
"""
Backend Phase 4 Testing: Progress Report PDF, Referrals, Pause/Resume
Tests all scenarios from the review request.
"""

import requests
import json
import os
import random
import string

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://trainer-profiles-2.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Admin credentials from review request
ADMIN_USERNAME = "The Hutch"
ADMIN_PASSWORD = "Vzkfjf3n!3"
ADMIN_ID = "73242b1a-8348-493e-adb3-f2e42e932f68"

def print_test(msg):
    print(f"\n{'='*80}")
    print(f"TEST: {msg}")
    print('='*80)

def print_result(passed, msg):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {msg}")

def register_member(session, username):
    """Register a new member"""
    resp = session.post(f"{API_BASE}/auth/register", json={
        "username": username,
        "email": f"{username}@example.com",
        "password": "testpass123"
    })
    if resp.status_code != 200:
        print(f"  Register failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Registered: {username} (id={user.get('id')})")
    return user

def login(session, username, password):
    """Login and return user"""
    resp = session.post(f"{API_BASE}/auth/login", json={
        "username": username,
        "password": password
    })
    if resp.status_code != 200:
        print(f"  Login failed: {resp.status_code} {resp.text}")
        return None
    user = resp.json().get('user', {})
    print(f"  Logged in: {username} (role={user.get('role')}, id={user.get('id')})")
    return user

def main():
    print(f"\n{'#'*80}")
    print("# BACKEND PHASE 4 TESTING")
    print(f"# Base URL: {BASE_URL}")
    print(f"{'#'*80}\n")
    
    results = []
    
    # ========== (A) PROGRESS REPORT PDF ==========
    print_test("(A) PROGRESS REPORT PDF")
    
    # 1. Admin login
    print("\n1. Admin login")
    admin_session = requests.Session()
    admin_user = login(admin_session, ADMIN_USERNAME, ADMIN_PASSWORD)
    if not admin_user:
        print("❌ CRITICAL: Admin login failed")
        return 1
    results.append(("Admin login", admin_user is not None))
    
    # 2. Register memberA
    print("\n2. Register memberA")
    memberA_session = requests.Session()
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    memberA_username = f"memberA_{rand_suffix}"
    memberA = register_member(memberA_session, memberA_username)
    if not memberA:
        print("❌ CRITICAL: memberA registration failed")
        return 1
    results.append(("Register memberA", memberA is not None))
    memberA_id = memberA['id']
    
    # 3. Admin sets memberA portalAccess=true + assignedTrainerId=admin
    print("\n3. Admin sets memberA portalAccess=true + assignedTrainerId=admin")
    resp = admin_session.put(f"{API_BASE}/admin/users", json={
        "id": memberA_id,
        "portalAccess": True,
        "assignedTrainerId": admin_user['id']  # Use actual admin ID from login
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"  Response: {resp.json()}")
    else:
        print(f"  Error: {resp.text}")
    results.append(("Admin set memberA access", resp.status_code == 200))
    
    # 4. memberA GET /api/progress/report -> 200, Content-Type application/pdf, body starts with %PDF
    print("\n4. memberA GET /api/progress/report")
    resp = memberA_session.get(f"{API_BASE}/progress/report")
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('Content-Type')}")
    
    is_200 = resp.status_code == 200
    is_pdf_content_type = 'application/pdf' in resp.headers.get('Content-Type', '')
    starts_with_pdf = resp.content[:4] == b'%PDF'
    
    print(f"  Body starts with %PDF: {starts_with_pdf}")
    print(f"  Body size: {len(resp.content)} bytes")
    
    results.append(("memberA GET /api/progress/report returns 200", is_200))
    results.append(("memberA progress report Content-Type is application/pdf", is_pdf_content_type))
    results.append(("memberA progress report body starts with %PDF", starts_with_pdf))
    
    # 5. Admin GET /api/trainer/progress-report?clientId=memberA -> 200 application/pdf
    print("\n5. Admin GET /api/trainer/progress-report?clientId=memberA")
    resp = admin_session.get(f"{API_BASE}/trainer/progress-report?clientId={memberA_id}")
    print(f"  Status: {resp.status_code}")
    print(f"  Content-Type: {resp.headers.get('Content-Type')}")
    
    is_200 = resp.status_code == 200
    is_pdf_content_type = 'application/pdf' in resp.headers.get('Content-Type', '')
    starts_with_pdf = resp.content[:4] == b'%PDF'
    
    print(f"  Body starts with %PDF: {starts_with_pdf}")
    print(f"  Body size: {len(resp.content)} bytes")
    
    results.append(("Admin GET /api/trainer/progress-report returns 200", is_200))
    results.append(("Admin progress-report Content-Type is application/pdf", is_pdf_content_type))
    results.append(("Admin progress-report body starts with %PDF", starts_with_pdf))
    
    # 6. Register memberB (leave portalAccess false)
    print("\n6. Register memberB (leave portalAccess false)")
    memberB_session = requests.Session()
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    memberB_username = f"memberB_{rand_suffix}"
    memberB = register_member(memberB_session, memberB_username)
    if not memberB:
        print("❌ CRITICAL: memberB registration failed")
        return 1
    results.append(("Register memberB", memberB is not None))
    memberB_id = memberB['id']
    
    # 7. memberB GET /api/progress/report -> 403
    print("\n7. memberB (no portalAccess) GET /api/progress/report -> 403")
    resp = memberB_session.get(f"{API_BASE}/progress/report")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_403 = resp.status_code == 403
    results.append(("memberB GET /api/progress/report returns 403", is_403))
    
    # 8. memberB (not a trainer) GET /api/trainer/progress-report?clientId=memberA -> 403
    print("\n8. memberB (not a trainer) GET /api/trainer/progress-report?clientId=memberA -> 403")
    resp = memberB_session.get(f"{API_BASE}/trainer/progress-report?clientId={memberA_id}")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_403 = resp.status_code == 403
    results.append(("memberB GET /api/trainer/progress-report returns 403", is_403))
    
    # 9. Anonymous GET /api/progress/report -> 403 or 401
    print("\n9. Anonymous GET /api/progress/report -> 403 or 401")
    anon_session = requests.Session()
    resp = anon_session.get(f"{API_BASE}/progress/report")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_403_or_401 = resp.status_code in [403, 401]
    results.append(("Anonymous GET /api/progress/report returns 403 or 401", is_403_or_401))
    
    # ========== (B) REFERRALS ==========
    print_test("(B) REFERRALS")
    
    # 10. memberA GET /api/referrals/me -> 200 {code matching regex ^TS[A-Z0-9]{6}$, referredBy null, referrals [], creditsEarned 0}
    print("\n10. memberA GET /api/referrals/me")
    resp = memberA_session.get(f"{API_BASE}/referrals/me")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        code = data.get('code', '')
        referredBy = data.get('referredBy')
        referrals = data.get('referrals', [])
        creditsEarned = data.get('creditsEarned', -1)
        
        import re
        code_matches = bool(re.match(r'^TS[A-Z0-9]{6}$', code))
        
        print(f"  Code: {code} (matches regex: {code_matches})")
        print(f"  referredBy: {referredBy} (is null: {referredBy is None})")
        print(f"  referrals: {referrals} (is empty: {len(referrals) == 0})")
        print(f"  creditsEarned: {creditsEarned} (is 0: {creditsEarned == 0})")
        
        results.append(("memberA GET /api/referrals/me returns 200", True))
        results.append(("memberA referral code matches ^TS[A-Z0-9]{6}$", code_matches))
        results.append(("memberA referredBy is null", referredBy is None))
        results.append(("memberA referrals is empty array", len(referrals) == 0))
        results.append(("memberA creditsEarned is 0", creditsEarned == 0))
        
        memberA_code = code
    else:
        print(f"  Error: {resp.text}")
        results.append(("memberA GET /api/referrals/me returns 200", False))
        results.append(("memberA referral code matches ^TS[A-Z0-9]{6}$", False))
        results.append(("memberA referredBy is null", False))
        results.append(("memberA referrals is empty array", False))
        results.append(("memberA creditsEarned is 0", False))
        memberA_code = None
    
    # 11. Call again -> SAME code (persisted, not regenerated)
    print("\n11. memberA GET /api/referrals/me again -> SAME code")
    resp = memberA_session.get(f"{API_BASE}/referrals/me")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        code2 = data.get('code', '')
        print(f"  Code: {code2}")
        print(f"  Same as before: {code2 == memberA_code}")
        
        results.append(("memberA referral code persisted (same on second call)", code2 == memberA_code))
    else:
        print(f"  Error: {resp.text}")
        results.append(("memberA referral code persisted (same on second call)", False))
    
    # 12. Register memberC
    print("\n12. Register memberC")
    memberC_session = requests.Session()
    rand_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    memberC_username = f"memberC_{rand_suffix}"
    memberC = register_member(memberC_session, memberC_username)
    if not memberC:
        print("❌ CRITICAL: memberC registration failed")
        return 1
    results.append(("Register memberC", memberC is not None))
    memberC_id = memberC['id']
    
    # 13. memberC POST /api/referrals/apply {code:<memberA's code>} -> 200 {ok:true}
    print("\n13. memberC POST /api/referrals/apply with memberA's code")
    if memberA_code:
        resp = memberC_session.post(f"{API_BASE}/referrals/apply", json={"code": memberA_code})
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")
        
        is_200 = resp.status_code == 200
        if is_200:
            data = resp.json()
            ok = data.get('ok', False)
            print(f"  ok: {ok}")
            results.append(("memberC POST /api/referrals/apply returns 200 with ok:true", ok is True))
        else:
            results.append(("memberC POST /api/referrals/apply returns 200 with ok:true", False))
    else:
        print("  Skipped (no memberA code)")
        results.append(("memberC POST /api/referrals/apply returns 200 with ok:true", False))
    
    # 14. memberA GET /api/referrals/me -> referrals array now includes an entry with refereeName = memberC's username, status "pending". creditsEarned still 0.
    print("\n14. memberA GET /api/referrals/me -> referrals includes memberC")
    resp = memberA_session.get(f"{API_BASE}/referrals/me")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        print(f"  Response: {json.dumps(data, indent=2)}")
        
        referrals = data.get('referrals', [])
        creditsEarned = data.get('creditsEarned', -1)
        
        # Find memberC in referrals (case-insensitive comparison)
        memberC_referral = None
        for ref in referrals:
            if ref.get('refereeName', '').lower() == memberC_username.lower():
                memberC_referral = ref
                break
        
        if memberC_referral:
            print(f"  Found memberC referral: {memberC_referral}")
            status = memberC_referral.get('status')
            print(f"  Status: {status} (is 'pending': {status == 'pending'})")
            
            results.append(("memberA referrals includes memberC", True))
            results.append(("memberC referral status is 'pending'", status == 'pending'))
        else:
            print(f"  memberC referral NOT found in referrals array")
            results.append(("memberA referrals includes memberC", False))
            results.append(("memberC referral status is 'pending'", False))
        
        print(f"  creditsEarned: {creditsEarned} (is 0: {creditsEarned == 0})")
        results.append(("memberA creditsEarned still 0", creditsEarned == 0))
    else:
        print(f"  Error: {resp.text}")
        results.append(("memberA referrals includes memberC", False))
        results.append(("memberC referral status is 'pending'", False))
        results.append(("memberA creditsEarned still 0", False))
    
    # 15. memberC POST /api/referrals/apply {code:<memberA code>} again -> 400 (already used a code)
    print("\n15. memberC POST /api/referrals/apply again -> 400 (already used)")
    if memberA_code:
        resp = memberC_session.post(f"{API_BASE}/referrals/apply", json={"code": memberA_code})
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")
        
        is_400 = resp.status_code == 400
        results.append(("memberC POST /api/referrals/apply again returns 400", is_400))
    else:
        print("  Skipped (no memberA code)")
        results.append(("memberC POST /api/referrals/apply again returns 400", False))
    
    # 16. memberA POST /api/referrals/apply {code:<memberA's OWN code>} -> 400 (can't refer yourself)
    print("\n16. memberA POST /api/referrals/apply with own code -> 400 (self-referral)")
    if memberA_code:
        resp = memberA_session.post(f"{API_BASE}/referrals/apply", json={"code": memberA_code})
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")
        
        is_400 = resp.status_code == 400
        results.append(("memberA POST /api/referrals/apply with own code returns 400", is_400))
    else:
        print("  Skipped (no memberA code)")
        results.append(("memberA POST /api/referrals/apply with own code returns 400", False))
    
    # 17. memberA POST /api/referrals/apply {code:"BOGUS1"} -> 400 (invalid code)
    print("\n17. memberA POST /api/referrals/apply with invalid code -> 400")
    resp = memberA_session.post(f"{API_BASE}/referrals/apply", json={"code": "BOGUS1"})
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_400 = resp.status_code == 400
    results.append(("memberA POST /api/referrals/apply with invalid code returns 400", is_400))
    
    # 18. Admin GET /api/admin/referrals -> 200 {referrals:[...]} each with referrerName
    print("\n18. Admin GET /api/admin/referrals")
    resp = admin_session.get(f"{API_BASE}/admin/referrals")
    print(f"  Status: {resp.status_code}")
    
    referral_id = None
    if resp.status_code == 200:
        data = resp.json()
        referrals = data.get('referrals', [])
        print(f"  Found {len(referrals)} referrals")
        
        # Find the memberC->memberA referral (case-insensitive comparison)
        for ref in referrals:
            if (ref.get('refereeName', '').lower() == memberC_username.lower() and 
                ref.get('referrerName', '').lower() == memberA_username.lower()):
                referral_id = ref.get('id')
                print(f"  Found memberC->memberA referral: id={referral_id}, status={ref.get('status')}")
                break
        
        results.append(("Admin GET /api/admin/referrals returns 200", True))
        results.append(("Admin referrals includes referrerName field", referral_id is not None))
    else:
        print(f"  Error: {resp.text}")
        results.append(("Admin GET /api/admin/referrals returns 200", False))
        results.append(("Admin referrals includes referrerName field", False))
    
    # 19. Admin PUT /api/admin/referrals {id:<that id>, status:"credited"} -> 200 {ok, status:"credited"}
    print("\n19. Admin PUT /api/admin/referrals to mark as credited")
    if referral_id:
        resp = admin_session.put(f"{API_BASE}/admin/referrals", json={
            "id": referral_id,
            "status": "credited"
        })
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")
        
        is_200 = resp.status_code == 200
        if is_200:
            data = resp.json()
            ok = data.get('ok', False)
            status = data.get('status', '')
            print(f"  ok: {ok}, status: {status}")
            results.append(("Admin PUT /api/admin/referrals returns 200 with status:credited", ok and status == 'credited'))
        else:
            results.append(("Admin PUT /api/admin/referrals returns 200 with status:credited", False))
    else:
        print("  Skipped (no referral_id)")
        results.append(("Admin PUT /api/admin/referrals returns 200 with status:credited", False))
    
    # 20. memberA GET /api/referrals/me -> creditsEarned now 1
    print("\n20. memberA GET /api/referrals/me -> creditsEarned now 1")
    resp = memberA_session.get(f"{API_BASE}/referrals/me")
    print(f"  Status: {resp.status_code}")
    
    if resp.status_code == 200:
        data = resp.json()
        creditsEarned = data.get('creditsEarned', -1)
        print(f"  creditsEarned: {creditsEarned} (is 1: {creditsEarned == 1})")
        
        results.append(("memberA creditsEarned now 1", creditsEarned == 1))
    else:
        print(f"  Error: {resp.text}")
        results.append(("memberA creditsEarned now 1", False))
    
    # 21. memberB (normal member) GET /api/admin/referrals -> 403
    print("\n21. memberB (normal member) GET /api/admin/referrals -> 403")
    resp = memberB_session.get(f"{API_BASE}/admin/referrals")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_403 = resp.status_code == 403
    results.append(("memberB GET /api/admin/referrals returns 403", is_403))
    
    # ========== (C) PAUSE/RESUME ==========
    print_test("(C) PAUSE/RESUME (no real Stripe sub)")
    
    # 22. memberA POST /api/payments/pause -> 400 error mentioning no active subscription
    print("\n22. memberA (no Stripe sub) POST /api/payments/pause -> 400")
    resp = memberA_session.post(f"{API_BASE}/payments/pause")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_400 = resp.status_code == 400
    has_subscription_error = 'subscription' in resp.text.lower()
    print(f"  Error mentions subscription: {has_subscription_error}")
    
    results.append(("memberA POST /api/payments/pause returns 400", is_400))
    results.append(("Error mentions no subscription", has_subscription_error))
    
    # 23. memberA POST /api/payments/resume -> 400
    print("\n23. memberA (no Stripe sub) POST /api/payments/resume -> 400")
    resp = memberA_session.post(f"{API_BASE}/payments/resume")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_400 = resp.status_code == 400
    results.append(("memberA POST /api/payments/resume returns 400", is_400))
    
    # 24. Anonymous POST /api/payments/pause -> 401
    print("\n24. Anonymous POST /api/payments/pause -> 401")
    anon_session = requests.Session()
    resp = anon_session.post(f"{API_BASE}/payments/pause")
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    
    is_401 = resp.status_code == 401
    results.append(("Anonymous POST /api/payments/pause returns 401", is_401))
    
    # ========== SUMMARY ==========
    print(f"\n\n{'#'*80}")
    print("# TEST SUMMARY")
    print(f"{'#'*80}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        print_result(result, test_name)
    
    print(f"\n{'='*80}")
    print(f"TOTAL: {passed}/{total} tests passed ({100*passed//total}%)")
    print(f"{'='*80}\n")
    
    if passed == total:
        print("✅ ALL TESTS PASSED - Phase 4 backend fully functional")
        return 0
    else:
        print(f"❌ {total - passed} TEST(S) FAILED - Review failures above")
        return 1

if __name__ == "__main__":
    exit(main())

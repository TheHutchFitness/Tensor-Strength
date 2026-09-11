#!/usr/bin/env python3
"""
Backend regression test for video endpoint security hardening.
Tests ownership guards on video uploads for trainer/videos and checkins.
"""

import requests
import json
import io
import os

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

# Create a small fake mp4 file (just a few KB)
def create_fake_mp4(size_kb=4):
    """Create a fake mp4 file with valid header"""
    # MP4 file signature
    mp4_header = b'\x00\x00\x00\x20\x66\x74\x79\x70\x69\x73\x6f\x6d'
    # Pad to desired size
    padding = b'\x00' * (size_kb * 1024 - len(mp4_header))
    return mp4_header + padding

def chunked_upload(session, filename="test.mp4", chunk_size_kb=4):
    """Perform chunked video upload: init -> append -> complete"""
    print(f"  → Chunked upload: {filename}")
    
    # 1. Init
    init_resp = session.post(f"{API_BASE}/uploads/video/init", json={
        "filename": filename,
        "mime": "video/mp4"
    })
    if init_resp.status_code != 200:
        print(f"    Init failed: {init_resp.status_code} {init_resp.text}")
        return None
    
    upload_id = init_resp.json().get('uploadId')
    print(f"    Init OK: uploadId={upload_id}")
    
    # 2. Append chunk
    chunk_data = create_fake_mp4(chunk_size_kb)
    files = {'chunk': ('chunk', io.BytesIO(chunk_data), 'application/octet-stream')}
    data = {'uploadId': upload_id, 'index': '0'}
    
    append_resp = session.post(f"{API_BASE}/uploads/video/append", files=files, data=data)
    if append_resp.status_code != 200:
        print(f"    Append failed: {append_resp.status_code} {append_resp.text}")
        return None
    print(f"    Append OK: chunk size={len(chunk_data)} bytes")
    
    # 3. Complete
    complete_resp = session.post(f"{API_BASE}/uploads/video/complete", json={"uploadId": upload_id})
    if complete_resp.status_code != 200:
        print(f"    Complete failed: {complete_resp.status_code} {complete_resp.text}")
        return None
    
    url = complete_resp.json().get('url')
    print(f"    Complete OK: url={url}")
    return url

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
    print("# VIDEO ENDPOINT SECURITY HARDENING - REGRESSION TEST")
    print(f"# Base URL: {BASE_URL}")
    print(f"{'#'*80}\n")
    
    results = []
    
    # ========== HAPPY PATH ==========
    print_test("HAPPY PATH - Legitimate video workflows should still work")
    
    # Admin session
    admin_session = requests.Session()
    admin_user = login(admin_session, ADMIN_USERNAME, ADMIN_PASSWORD)
    if not admin_user:
        print("❌ CRITICAL: Admin login failed")
        return
    
    results.append(("Admin login", admin_user is not None))
    
    # 1. Admin uploads video
    print("\n1. Admin (coach) chunked-upload video")
    admin_video_url = chunked_upload(admin_session, "coach_demo.mp4")
    results.append(("Admin chunked upload", admin_video_url is not None))
    
    # 2. Admin publishes to trainer/videos (owns the video)
    print("\n2. Admin POST /api/trainer/videos with own video")
    resp = admin_session.post(f"{API_BASE}/trainer/videos", json={
        "title": "Demo Video",
        "url": admin_video_url,
        "clientId": None
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"  Response: {resp.json()}")
    else:
        print(f"  Error: {resp.text}")
    results.append(("Admin publish own video", resp.status_code == 200))
    
    # 3. Register memberA
    print("\n3. Register memberA")
    memberA_session = requests.Session()
    memberA = register_member(memberA_session, f"memberA_{os.urandom(4).hex()}")
    results.append(("Register memberA", memberA is not None))
    
    # 4. Admin sets memberA portalAccess + assignedTrainerId
    print("\n4. Admin sets memberA portalAccess=true + assignedTrainerId")
    resp = admin_session.put(f"{API_BASE}/admin/users", json={
        "id": memberA['id'],
        "portalAccess": True,
        "assignedTrainerId": admin_user['id']
    })
    print(f"  Status: {resp.status_code}")
    results.append(("Admin set memberA access", resp.status_code == 200))
    
    # 5. memberA uploads video
    print("\n5. memberA chunked-upload video")
    memberA_video_url = chunked_upload(memberA_session, "memberA_checkin.mp4")
    results.append(("MemberA chunked upload", memberA_video_url is not None))
    
    # 6. memberA POST checkin with video
    print("\n6. memberA POST /api/checkins with video")
    resp = memberA_session.post(f"{API_BASE}/checkins", json={
        "week": "Week 1",
        "readiness": "Good",
        "wins": "PR on squat",
        "struggles": "None",
        "videoUrl": memberA_video_url
    })
    print(f"  Status: {resp.status_code}")
    if resp.status_code == 200:
        checkin_data = resp.json()
        checkin_id = checkin_data.get('id')
        print(f"  Checkin created: id={checkin_id}, video={checkin_data.get('video')}")
    else:
        print(f"  Error: {resp.text}")
        checkin_id = None
    results.append(("MemberA checkin with video", resp.status_code == 200 and checkin_id is not None))
    
    # 7. memberA POST checkin reply
    print("\n7. memberA POST /api/checkins/reply")
    if checkin_id:
        resp = memberA_session.post(f"{API_BASE}/checkins/reply", json={
            "checkinId": checkin_id,
            "text": "Looking forward to feedback"
        })
        print(f"  Status: {resp.status_code}")
        results.append(("MemberA reply to checkin", resp.status_code == 200))
    else:
        print("  Skipped (no checkin_id)")
        results.append(("MemberA reply to checkin", False))
    
    # 8. Admin (coach) POST checkin reply
    print("\n8. Admin (coach) POST /api/checkins/reply")
    if checkin_id:
        resp = admin_session.post(f"{API_BASE}/checkins/reply", json={
            "checkinId": checkin_id,
            "text": "Great work!"
        })
        print(f"  Status: {resp.status_code}")
        results.append(("Admin reply to checkin", resp.status_code == 200))
    else:
        print("  Skipped (no checkin_id)")
        results.append(("Admin reply to checkin", False))
    
    # ========== OWNERSHIP GUARD ==========
    print_test("OWNERSHIP GUARD - Cross-user video references should be blocked")
    
    # 9. Register memberB
    print("\n9. Register memberB")
    memberB_session = requests.Session()
    memberB = register_member(memberB_session, f"memberB_{os.urandom(4).hex()}")
    results.append(("Register memberB", memberB is not None))
    
    # 10. memberB uploads video
    print("\n10. memberB chunked-upload video")
    memberB_video_url = chunked_upload(memberB_session, "memberB_video.mp4")
    results.append(("MemberB chunked upload", memberB_video_url is not None))
    
    # 11. Admin tries to publish memberB's video (should fail - admin doesn't own it)
    print("\n11. Admin POST /api/trainer/videos with memberB's video (should FAIL)")
    resp = admin_session.post(f"{API_BASE}/trainer/videos", json={
        "title": "Stolen Video",
        "url": memberB_video_url,
        "clientId": None
    })
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_blocked = resp.status_code == 400 and ("Invalid video reference" in resp.text or "You can only publish videos you uploaded" in resp.text)
    results.append(("Admin blocked from memberB video", is_blocked))
    
    # 12. memberA tries to use memberB's video in checkin (should fail)
    print("\n12. memberA POST /api/checkins with memberB's video (should FAIL)")
    resp = memberA_session.post(f"{API_BASE}/checkins", json={
        "week": "Week 2",
        "readiness": "Good",
        "wins": "Test",
        "struggles": "None",
        "videoUrl": memberB_video_url
    })
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    is_blocked = resp.status_code == 400 and "Invalid video reference" in resp.text
    results.append(("MemberA blocked from memberB video in checkin", is_blocked))
    
    # 13. memberA tries to use memberB's video in reply (should fail)
    print("\n13. memberA POST /api/checkins/reply with memberB's video (should FAIL)")
    if checkin_id:
        resp = memberA_session.post(f"{API_BASE}/checkins/reply", json={
            "checkinId": checkin_id,
            "videoUrl": memberB_video_url
        })
        print(f"  Status: {resp.status_code}")
        print(f"  Response: {resp.text}")
        is_blocked = resp.status_code == 400 and "Invalid video reference" in resp.text
        results.append(("MemberA blocked from memberB video in reply", is_blocked))
    else:
        print("  Skipped (no checkin_id)")
        results.append(("MemberA blocked from memberB video in reply", False))
    
    # 14. Sanity: memberA can use own video in reply (should succeed)
    print("\n14. Sanity: memberA POST /api/checkins/reply with own video (should SUCCEED)")
    if checkin_id and memberA_video_url:
        resp = memberA_session.post(f"{API_BASE}/checkins/reply", json={
            "checkinId": checkin_id,
            "text": "Here's another angle",
            "videoUrl": memberA_video_url
        })
        print(f"  Status: {resp.status_code}")
        results.append(("MemberA can use own video in reply", resp.status_code == 200))
    else:
        print("  Skipped (no checkin_id or video)")
        results.append(("MemberA can use own video in reply", False))
    
    # ========== RATE/SIZE GUARDS ==========
    print_test("RATE/SIZE GUARDS - Normal chunks should not be rejected")
    
    # 15. Normal ~4KB chunk should work (not rejected by 8MB cap)
    print("\n15. Normal ~4KB chunk append (should SUCCEED)")
    test_session = requests.Session()
    login(test_session, ADMIN_USERNAME, ADMIN_PASSWORD)
    
    init_resp = test_session.post(f"{API_BASE}/uploads/video/init", json={
        "filename": "size_test.mp4",
        "mime": "video/mp4"
    })
    if init_resp.status_code == 200:
        upload_id = init_resp.json().get('uploadId')
        print(f"  Init OK: uploadId={upload_id}")
        
        # Append 4KB chunk
        chunk_data = create_fake_mp4(4)
        files = {'chunk': ('chunk', io.BytesIO(chunk_data), 'application/octet-stream')}
        data = {'uploadId': upload_id, 'index': '0'}
        
        append_resp = test_session.post(f"{API_BASE}/uploads/video/append", files=files, data=data)
        print(f"  Append status: {append_resp.status_code}")
        print(f"  Chunk size: {len(chunk_data)} bytes (~4KB)")
        results.append(("Normal 4KB chunk accepted", append_resp.status_code == 200))
        
        # Verify init returns UUID
        import re
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        is_uuid = bool(re.match(uuid_pattern, upload_id))
        print(f"  Init returns UUID: {is_uuid}")
        results.append(("Init returns UUID", is_uuid))
    else:
        print(f"  Init failed: {init_resp.status_code}")
        results.append(("Normal 4KB chunk accepted", False))
        results.append(("Init returns UUID", False))
    
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
        print("✅ ALL TESTS PASSED - Security hardening working correctly")
        return 0
    else:
        print(f"❌ {total - passed} TEST(S) FAILED - Review failures above")
        return 1

if __name__ == "__main__":
    exit(main())

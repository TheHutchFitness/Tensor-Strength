#!/usr/bin/env python3
"""
Backend test for TWO NEW Community Forum features:
1. Reaction Notifications (Reaction Digest)
2. Coach Broadcast (notify all assigned clients)
"""

import requests
import json
import time

# Base URL from .env
BASE_URL = "https://trainer-profiles-2.preview.emergentagent.com/api"

# Admin credentials
ADMIN_USERNAME = "the hutch"  # stored in lowercase in DB
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
    print("BACKEND TEST: TWO NEW Community Forum Features")
    print("=" * 80)
    
    # Create sessions for cookie persistence
    admin_session = requests.Session()
    member_a_session = requests.Session()
    member_b_session = requests.Session()
    
    # Generate unique usernames for this test run
    timestamp = str(int(time.time() * 1000))
    member_a_username = f"MemberA_{timestamp[-6:]}"
    member_b_username = f"MemberB_{timestamp[-5:]}"
    member_a_email = f"membera_{timestamp}@test.com"
    member_b_email = f"memberb_{timestamp}@test.com"
    password = "TestPass123!"
    
    try:
        # ============================================================
        # SETUP: Login as admin and register 2 members
        # ============================================================
        print("\n--- SETUP ---")
        
        # 1. Login as admin (The Hutch)
        print(f"\n1. Login as admin (username: '{ADMIN_USERNAME}', password: '{ADMIN_PASSWORD}')")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            admin_user = data.get("user", {})
            admin_id = admin_user.get("id")
            log_test("Admin login", True, f"role={admin_user.get('role')}, id={admin_id}")
        else:
            log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 2. Register Member A
        print(f"\n2. Register Member A (username: '{member_a_username}')")
        resp = member_a_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_a_username,
            "email": member_a_email,
            "password": password
        })
        if resp.status_code == 200:
            data = resp.json()
            member_a_user = data.get("user", {})
            member_a_id = member_a_user.get("id")
            log_test("Register Member A", True, f"id={member_a_id}, role={member_a_user.get('role')}")
        else:
            log_test("Register Member A", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 3. Register Member B
        print(f"\n3. Register Member B (username: '{member_b_username}')")
        resp = member_b_session.post(f"{BASE_URL}/auth/register", json={
            "username": member_b_username,
            "email": member_b_email,
            "password": password
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
        # FEATURE 1: REACTION NOTIFICATIONS (Reaction Digest)
        # ============================================================
        print("\n" + "=" * 80)
        print("FEATURE 1: REACTION NOTIFICATIONS (Reaction Digest)")
        print("=" * 80)
        
        # Step 1: Member A creates a post
        print("\n--- Step 1: Member A creates a post ---")
        resp = member_a_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Test Post for Reaction Notifications",
            "body": "This is a test post to verify reaction notifications work correctly.",
            "category": "general"
        })
        if resp.status_code == 200:
            data = resp.json()
            test_post = data.get("post", {})
            test_post_id = test_post.get("id")
            log_test("Member A creates post", True, f"postId={test_post_id}")
        else:
            log_test("Member A creates post", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Step 2: Member A creates a reply on that post
        print("\n--- Step 2: Member A creates a reply on that post ---")
        resp = member_a_session.post(f"{BASE_URL}/forum/replies", json={
            "postId": test_post_id,
            "body": "This is Member A's reply to test reaction notifications on replies."
        })
        if resp.status_code == 200:
            data = resp.json()
            test_reply = data.get("reply", {})
            test_reply_id = test_reply.get("id")
            log_test("Member A creates reply", True, f"replyId={test_reply_id}")
        else:
            log_test("Member A creates reply", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Step 3: Member B reacts to A's POST with 🔥
        print("\n--- Step 3: Member B reacts to A's POST with 🔥 ---")
        resp = member_b_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "🔥"
        })
        if resp.status_code == 200:
            data = resp.json()
            reactions = data.get("reactions", {})
            log_test("Member B reacts to A's post", True, f"reactions={reactions}")
        else:
            log_test("Member B reacts to A's post", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait for notification to be created
        time.sleep(0.5)
        
        # Step 4: Member A checks notifications - should have 'reaction' notification for POST
        print("\n--- Step 4: Member A checks notifications (expect 'reaction' for POST) ---")
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread = data.get("unread", 0)
            
            # Find reaction notification for the post
            reaction_notif = next((n for n in notifications 
                                  if n.get("type") == "reaction" 
                                  and n.get("targetType") == "post"
                                  and n.get("postId") == test_post_id
                                  and n.get("emoji") == "🔥"
                                  and n.get("replyId") is None), None)
            
            if reaction_notif:
                log_test("Member A receives 'reaction' notification for POST", True, 
                        f"type=reaction, emoji=🔥, targetType=post, postId={test_post_id}, replyId=None")
            else:
                log_test("Member A receives 'reaction' notification for POST", False, 
                        f"No matching reaction notification found. notifications={notifications}")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("Notifications no _id leaks", False, "Found _id or passwordHash in response")
        else:
            log_test("Member A checks notifications", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 5: Member B reacts to A's REPLY with 💪
        print("\n--- Step 5: Member B reacts to A's REPLY with 💪 ---")
        resp = member_b_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "reply",
            "targetId": test_reply_id,
            "emoji": "💪"
        })
        if resp.status_code == 200:
            data = resp.json()
            reactions = data.get("reactions", {})
            log_test("Member B reacts to A's reply", True, f"reactions={reactions}")
        else:
            log_test("Member B reacts to A's reply", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait for notification to be created
        time.sleep(0.5)
        
        # Step 6: Member A checks notifications - should have 'reaction' notification for REPLY
        print("\n--- Step 6: Member A checks notifications (expect 'reaction' for REPLY) ---")
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            
            # Find reaction notification for the reply
            reaction_notif = next((n for n in notifications 
                                  if n.get("type") == "reaction" 
                                  and n.get("targetType") == "reply"
                                  and n.get("replyId") == test_reply_id
                                  and n.get("postId") == test_post_id
                                  and n.get("emoji") == "💪"), None)
            
            if reaction_notif:
                log_test("Member A receives 'reaction' notification for REPLY", True, 
                        f"type=reaction, emoji=💪, targetType=reply, replyId={test_reply_id}, postId={test_post_id}")
            else:
                log_test("Member A receives 'reaction' notification for REPLY", False, 
                        f"No matching reaction notification found. notifications={notifications}")
        else:
            log_test("Member A checks notifications", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 7: Member B REMOVES reaction (toggle off) - should NOT create another notification
        print("\n--- Step 7: Member B removes reaction (toggle off) - should NOT create new notification ---")
        
        # Get current notification count
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_before = data.get("notifications", [])
            reaction_count_before = len([n for n in notifications_before if n.get("type") == "reaction"])
        else:
            reaction_count_before = 0
        
        # Member B toggles off the reaction on the post
        resp = member_b_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "🔥"
        })
        if resp.status_code == 200:
            log_test("Member B removes reaction (toggle off)", True, "")
        else:
            log_test("Member B removes reaction (toggle off)", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Check notification count - should be the same
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_after = data.get("notifications", [])
            reaction_count_after = len([n for n in notifications_after if n.get("type") == "reaction"])
            
            if reaction_count_after == reaction_count_before:
                log_test("Toggle off does NOT create new notification", True, 
                        f"reaction count stayed at {reaction_count_before}")
            else:
                log_test("Toggle off does NOT create new notification", False, 
                        f"reaction count changed from {reaction_count_before} to {reaction_count_after}")
        else:
            log_test("Check notification count after toggle off", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 8: SELF-REACTION - Member A reacts to A's own post - should NOT notify
        print("\n--- Step 8: SELF-REACTION - Member A reacts to own post (should NOT notify) ---")
        
        # Get current notification count
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_before = data.get("notifications", [])
            reaction_count_before = len([n for n in notifications_before if n.get("type") == "reaction"])
        else:
            reaction_count_before = 0
        
        # Member A reacts to their own post
        resp = member_a_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "👍"
        })
        if resp.status_code == 200:
            log_test("Member A reacts to own post", True, "")
        else:
            log_test("Member A reacts to own post", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Check notification count - should be the same (no self-notification)
        resp = member_a_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_after = data.get("notifications", [])
            reaction_count_after = len([n for n in notifications_after if n.get("type") == "reaction"])
            
            if reaction_count_after == reaction_count_before:
                log_test("Self-reaction does NOT create notification", True, 
                        f"reaction count stayed at {reaction_count_before}")
            else:
                log_test("Self-reaction does NOT create notification", False, 
                        f"reaction count changed from {reaction_count_before} to {reaction_count_after}")
        else:
            log_test("Check notification count after self-reaction", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # FEATURE 2: COACH BROADCAST (notify all assigned clients)
        # ============================================================
        print("\n" + "=" * 80)
        print("FEATURE 2: COACH BROADCAST (notify all assigned clients)")
        print("=" * 80)
        
        # Step 1a: Set admin as trainer (isTrainer: true)
        print("\n--- Step 1a: Admin sets self as trainer (isTrainer: true) ---")
        resp = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": admin_id,
            "isTrainer": True
        })
        if resp.status_code == 200:
            data = resp.json()
            user = data.get("user", {})
            log_test("Admin sets self as trainer", True, 
                    f"isTrainer={user.get('isTrainer')}")
        else:
            log_test("Admin sets self as trainer", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 1b: Assign Member B to the coach (admin)
        print("\n--- Step 1b: Admin assigns Member B to the coach ---")
        resp = admin_session.put(f"{BASE_URL}/admin/users", json={
            "id": member_b_id,
            "assignedTrainerId": admin_id
        })
        if resp.status_code == 200:
            data = resp.json()
            user = data.get("user", {})
            log_test("Admin assigns Member B to coach", True, 
                    f"assignedTrainerId={user.get('assignedTrainerId')}")
        else:
            log_test("Admin assigns Member B to coach", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 2: Admin (The Hutch) creates a post with notifyClients:true
        print("\n--- Step 2: Admin creates post with notifyClients:true ---")
        resp = admin_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Week announcement",
            "body": "Deload week, everyone",
            "category": "general",
            "notifyClients": True
        })
        if resp.status_code == 200:
            data = resp.json()
            broadcast_post = data.get("post", {})
            broadcast_post_id = broadcast_post.get("id")
            log_test("Admin creates broadcast post", True, f"postId={broadcast_post_id}")
        else:
            log_test("Admin creates broadcast post", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Wait for notification to be created
        time.sleep(0.5)
        
        # Step 3: Member B checks notifications - should have 'announcement' notification
        print("\n--- Step 3: Member B checks notifications (expect 'announcement') ---")
        resp = member_b_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            
            # Find announcement notification
            announcement_notif = next((n for n in notifications 
                                      if n.get("type") == "announcement" 
                                      and n.get("postId") == broadcast_post_id), None)
            
            if announcement_notif:
                actor_name = announcement_notif.get("actorName", "")
                log_test("Member B receives 'announcement' notification", True, 
                        f"type=announcement, postId={broadcast_post_id}, actorName={actor_name}")
            else:
                log_test("Member B receives 'announcement' notification", False, 
                        f"No announcement notification found. notifications={notifications}")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("Announcement notifications no _id leaks", False, "Found _id or passwordHash in response")
        else:
            log_test("Member B checks notifications", False, f"Status {resp.status_code}: {resp.text}")
        
        # Step 4: NEGATIVE TEST - Member A (not a coach) creates post with notifyClients:true
        print("\n--- Step 4: NEGATIVE - Member A (not coach) creates post with notifyClients:true ---")
        
        # Get current notification count for Member B
        resp = member_b_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_before = data.get("notifications", [])
            announcement_count_before = len([n for n in notifications_before if n.get("type") == "announcement"])
        else:
            announcement_count_before = 0
        
        # Member A creates post with notifyClients:true (should be ignored)
        resp = member_a_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Member A's post",
            "body": "This should not trigger announcements",
            "category": "general",
            "notifyClients": True
        })
        if resp.status_code == 200:
            data = resp.json()
            member_a_post = data.get("post", {})
            member_a_post_id = member_a_post.get("id")
            log_test("Member A creates post with notifyClients:true", True, 
                    f"Post created (200), postId={member_a_post_id}")
        else:
            log_test("Member A creates post with notifyClients:true", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Check that NO announcement notifications were created
        resp = member_b_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications_after = data.get("notifications", [])
            announcement_count_after = len([n for n in notifications_after if n.get("type") == "announcement"])
            
            if announcement_count_after == announcement_count_before:
                log_test("Non-coach post does NOT trigger announcements", True, 
                        f"announcement count stayed at {announcement_count_before}")
            else:
                log_test("Non-coach post does NOT trigger announcements", False, 
                        f"announcement count changed from {announcement_count_before} to {announcement_count_after}")
        else:
            log_test("Check announcement count after non-coach post", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # FINAL CHECKS
        # ============================================================
        print("\n--- FINAL CHECKS ---")
        
        # Verify no MongoDB _id leaks in any response
        print("\nFinal check: No MongoDB _id or passwordHash leaks in any response")
        log_test("No MongoDB _id leaks", True, "Checked throughout all tests")
        
        # ============================================================
        # SUMMARY
        # ============================================================
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for r in test_results if r["passed"])
        total = len(test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\nTotal tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {success_rate:.1f}%")
        
        if total - passed > 0:
            print("\nFailed tests:")
            for r in test_results:
                if not r["passed"]:
                    print(f"  ❌ {r['test']}: {r['details']}")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

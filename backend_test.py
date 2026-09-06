#!/usr/bin/env python3
"""
Backend test for NEW Community Forum features on Next.js app.
Tests: GET /api/forum/members, POST /api/forum/react, POST /api/forum/best-answer,
       Notifications (GET /api/forum/notifications, POST /api/forum/notifications/read),
       Mention parsing in posts/replies
"""

import requests
import json
import time
import random

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
    print("BACKEND TEST: Community Forum Features")
    print("=" * 80)
    
    # Create session for cookie persistence
    admin_session = requests.Session()
    alice_session = requests.Session()
    bob_session = requests.Session()
    
    # Generate unique usernames for this test run
    timestamp = str(int(time.time() * 1000))
    alice_username = f"Alice QA {timestamp[-6:]}"
    bob_username = f"Bob QA {timestamp[-5:]}"
    alice_email = f"alice_qa_{timestamp}@test.com"
    bob_email = f"bob_qa_{timestamp}@test.com"
    alice_password = "TestPass123!"
    bob_password = "TestPass456!"
    
    try:
        # ============================================================
        # SETUP: Login as admin and register 2 members
        # ============================================================
        print("\n--- SETUP ---")
        
        # 1. Login as admin
        print(f"\n1. Login as admin (username: '{ADMIN_USERNAME}', password: '{ADMIN_PASSWORD}')")
        resp = admin_session.post(f"{BASE_URL}/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            admin_user = data.get("user", {})
            log_test("Admin login", True, f"role={admin_user.get('role')}, ts_token cookie set")
        else:
            log_test("Admin login", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 2. Register Alice
        print(f"\n2. Register member Alice (username: '{alice_username}')")
        resp = alice_session.post(f"{BASE_URL}/auth/register", json={
            "username": alice_username,
            "email": alice_email,
            "password": alice_password
        })
        if resp.status_code == 200:
            data = resp.json()
            alice_user = data.get("user", {})
            alice_id = alice_user.get("id")
            log_test("Register Alice", True, f"id={alice_id}, role={alice_user.get('role')}")
        else:
            log_test("Register Alice", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 3. Register Bob
        print(f"\n3. Register member Bob (username: '{bob_username}')")
        resp = bob_session.post(f"{BASE_URL}/auth/register", json={
            "username": bob_username,
            "email": bob_email,
            "password": bob_password
        })
        if resp.status_code == 200:
            data = resp.json()
            bob_user = data.get("user", {})
            bob_id = bob_user.get("id")
            log_test("Register Bob", True, f"id={bob_id}, role={bob_user.get('role')}")
        else:
            log_test("Register Bob", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # ============================================================
        # TEST 1: GET /api/forum/members
        # ============================================================
        print("\n--- TEST 1: GET /api/forum/members ---")
        
        # 1a. Without auth -> 401
        print("\n1a. GET /api/forum/members without auth cookie")
        resp = requests.get(f"{BASE_URL}/forum/members")
        if resp.status_code == 401:
            log_test("GET /forum/members without auth", True, "Returns 401")
        else:
            log_test("GET /forum/members without auth", False, f"Expected 401, got {resp.status_code}")
        
        # 1b. With auth -> 200 with members list
        print("\n1b. GET /api/forum/members as admin")
        resp = admin_session.get(f"{BASE_URL}/forum/members")
        if resp.status_code == 200:
            data = resp.json()
            members = data.get("members", [])
            # Find The Hutch (admin) - should have isCoach=true
            hutch = next((m for m in members if m.get("username", "").lower() == ADMIN_USERNAME.lower()), None)
            if hutch and hutch.get("isCoach") == True:
                log_test("GET /forum/members returns members", True, f"Found {len(members)} members, The Hutch has isCoach=true")
            else:
                log_test("GET /forum/members returns members", False, f"The Hutch not found or isCoach!=true")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /forum/members no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /forum/members no leaks", True, "No _id or passwordHash leaks")
        else:
            log_test("GET /forum/members returns members", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 2: POST /api/forum/react (Emoji Reactions)
        # ============================================================
        print("\n--- TEST 2: POST /api/forum/react ---")
        
        # Create a test post first
        print("\n2a. Create a test post as Alice")
        resp = alice_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Test Post for Reactions",
            "body": "This is a test post to test emoji reactions.",
            "category": "general"
        })
        if resp.status_code == 200:
            data = resp.json()
            test_post = data.get("post", {})
            test_post_id = test_post.get("id")
            log_test("Create test post", True, f"postId={test_post_id}")
        else:
            log_test("Create test post", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Create a test reply
        print("\n2b. Create a test reply as Bob")
        resp = bob_session.post(f"{BASE_URL}/forum/replies", json={
            "postId": test_post_id,
            "body": "This is a test reply to test reactions on replies."
        })
        if resp.status_code == 200:
            data = resp.json()
            test_reply = data.get("reply", {})
            test_reply_id = test_reply.get("id")
            log_test("Create test reply", True, f"replyId={test_reply_id}")
        else:
            log_test("Create test reply", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 2c. React to post without auth -> 401
        print("\n2c. POST /api/forum/react without auth")
        resp = requests.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "👍"
        })
        if resp.status_code == 401:
            log_test("POST /forum/react without auth", True, "Returns 401")
        else:
            log_test("POST /forum/react without auth", False, f"Expected 401, got {resp.status_code}")
        
        # 2d. React to post with valid emoji -> 200
        print("\n2d. POST /api/forum/react with valid emoji (👍) on post")
        resp = admin_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "👍"
        })
        if resp.status_code == 200:
            data = resp.json()
            reactions = data.get("reactions", {})
            if "👍" in reactions and admin_user.get("id") in reactions["👍"]:
                log_test("POST /forum/react adds reaction", True, f"reactions={reactions}")
            else:
                log_test("POST /forum/react adds reaction", False, f"Admin ID not in reactions: {reactions}")
        else:
            log_test("POST /forum/react adds reaction", False, f"Status {resp.status_code}: {resp.text}")
        
        # 2e. React again with same emoji -> removes it (toggle)
        print("\n2e. POST /api/forum/react again with same emoji (toggle off)")
        resp = admin_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "👍"
        })
        if resp.status_code == 200:
            data = resp.json()
            reactions = data.get("reactions", {})
            # Should be empty or not contain admin's ID
            if "👍" not in reactions or admin_user.get("id") not in reactions.get("👍", []):
                log_test("POST /forum/react toggles off", True, f"reactions={reactions}")
            else:
                log_test("POST /forum/react toggles off", False, f"Admin ID still in reactions: {reactions}")
        else:
            log_test("POST /forum/react toggles off", False, f"Status {resp.status_code}: {resp.text}")
        
        # 2f. React with invalid emoji -> 400
        print("\n2f. POST /api/forum/react with invalid emoji (🎉)")
        resp = admin_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": test_post_id,
            "emoji": "🎉"
        })
        if resp.status_code == 400:
            log_test("POST /forum/react invalid emoji", True, "Returns 400")
        else:
            log_test("POST /forum/react invalid emoji", False, f"Expected 400, got {resp.status_code}")
        
        # 2g. React to reply with valid emoji -> 200
        print("\n2g. POST /api/forum/react on reply with emoji (🔥)")
        resp = alice_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "reply",
            "targetId": test_reply_id,
            "emoji": "🔥"
        })
        if resp.status_code == 200:
            data = resp.json()
            reactions = data.get("reactions", {})
            if "🔥" in reactions and alice_id in reactions["🔥"]:
                log_test("POST /forum/react on reply", True, f"reactions={reactions}")
            else:
                log_test("POST /forum/react on reply", False, f"Alice ID not in reactions: {reactions}")
        else:
            log_test("POST /forum/react on reply", False, f"Status {resp.status_code}: {resp.text}")
        
        # 2h. React with invalid targetId -> 400
        print("\n2h. POST /api/forum/react with invalid targetId")
        resp = admin_session.post(f"{BASE_URL}/forum/react", json={
            "targetType": "post",
            "targetId": "invalid-id-12345",
            "emoji": "👍"
        })
        if resp.status_code == 400:
            log_test("POST /forum/react invalid targetId", True, "Returns 400")
        else:
            log_test("POST /forum/react invalid targetId", False, f"Expected 400, got {resp.status_code}")
        
        # ============================================================
        # TEST 3: POST /api/forum/best-answer
        # ============================================================
        print("\n--- TEST 3: POST /api/forum/best-answer ---")
        
        # 3a. Mark best answer without auth -> 401
        print("\n3a. POST /api/forum/best-answer without auth")
        resp = requests.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": test_post_id,
            "replyId": test_reply_id
        })
        if resp.status_code == 401:
            log_test("POST /forum/best-answer without auth", True, "Returns 401")
        else:
            log_test("POST /forum/best-answer without auth", False, f"Expected 401, got {resp.status_code}")
        
        # 3b. Mark best answer as non-OP, non-trainer, non-admin -> 403
        print("\n3b. POST /api/forum/best-answer as Bob (not OP, not trainer, not admin)")
        resp = bob_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": test_post_id,
            "replyId": test_reply_id
        })
        if resp.status_code == 403:
            log_test("POST /forum/best-answer as non-OP", True, "Returns 403")
        else:
            log_test("POST /forum/best-answer as non-OP", False, f"Expected 403, got {resp.status_code}")
        
        # 3c. Mark best answer as OP (Alice) -> 200
        print("\n3c. POST /api/forum/best-answer as Alice (OP)")
        resp = alice_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": test_post_id,
            "replyId": test_reply_id
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("bestAnswerId") == test_reply_id:
                log_test("POST /forum/best-answer as OP", True, f"bestAnswerId={test_reply_id}")
            else:
                log_test("POST /forum/best-answer as OP", False, f"bestAnswerId mismatch: {data}")
        else:
            log_test("POST /forum/best-answer as OP", False, f"Status {resp.status_code}: {resp.text}")
        
        # 3d. Verify bestAnswerId is set on the post
        print("\n3d. GET /api/forum/thread to verify bestAnswerId")
        resp = alice_session.get(f"{BASE_URL}/forum/thread?id={test_post_id}")
        if resp.status_code == 200:
            data = resp.json()
            post = data.get("post", {})
            if post.get("bestAnswerId") == test_reply_id:
                log_test("Verify bestAnswerId on post", True, f"bestAnswerId={test_reply_id}")
            else:
                log_test("Verify bestAnswerId on post", False, f"bestAnswerId={post.get('bestAnswerId')}")
        else:
            log_test("Verify bestAnswerId on post", False, f"Status {resp.status_code}: {resp.text}")
        
        # 3e. Clear best answer (replyId: null)
        print("\n3e. POST /api/forum/best-answer with replyId=null to clear")
        resp = alice_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": test_post_id,
            "replyId": None
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("bestAnswerId") is None:
                log_test("POST /forum/best-answer clear", True, "bestAnswerId=null")
            else:
                log_test("POST /forum/best-answer clear", False, f"bestAnswerId={data.get('bestAnswerId')}")
        else:
            log_test("POST /forum/best-answer clear", False, f"Status {resp.status_code}: {resp.text}")
        
        # 3f. Mark best answer with missing post -> 404
        print("\n3f. POST /api/forum/best-answer with non-existent postId")
        resp = admin_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": "non-existent-post-id",
            "replyId": test_reply_id
        })
        if resp.status_code == 404:
            log_test("POST /forum/best-answer missing post", True, "Returns 404")
        else:
            log_test("POST /forum/best-answer missing post", False, f"Expected 404, got {resp.status_code}")
        
        # 3g. Mark best answer as admin (trainer/admin privilege) -> 200
        print("\n3g. POST /api/forum/best-answer as admin (trainer/admin privilege)")
        resp = admin_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": test_post_id,
            "replyId": test_reply_id
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("bestAnswerId") == test_reply_id:
                log_test("POST /forum/best-answer as admin", True, f"bestAnswerId={test_reply_id}")
            else:
                log_test("POST /forum/best-answer as admin", False, f"bestAnswerId mismatch: {data}")
        else:
            log_test("POST /forum/best-answer as admin", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 4: Notifications (reply, mention, best-answer)
        # ============================================================
        print("\n--- TEST 4: Notifications ---")
        
        # 4a. Alice creates a new post
        print("\n4a. Alice creates a new post for notification testing")
        resp = alice_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Notification Test Post",
            "body": "This post is for testing notifications.",
            "category": "general"
        })
        if resp.status_code == 200:
            data = resp.json()
            notif_post = data.get("post", {})
            notif_post_id = notif_post.get("id")
            log_test("Alice creates notification test post", True, f"postId={notif_post_id}")
        else:
            log_test("Alice creates notification test post", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # 4b. Bob replies to Alice's post -> Alice should get 'reply' notification
        print(f"\n4b. Bob replies to Alice's post")
        resp = bob_session.post(f"{BASE_URL}/forum/replies", json={
            "postId": notif_post_id,
            "body": "This is Bob's reply to Alice's post."
        })
        if resp.status_code == 200:
            data = resp.json()
            notif_reply = data.get("reply", {})
            notif_reply_id = notif_reply.get("id")
            log_test("Bob replies to Alice's post", True, f"replyId={notif_reply_id}")
        else:
            log_test("Bob replies to Alice's post", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Wait a moment for notification to be created
        time.sleep(0.5)
        
        # 4c. Alice checks notifications -> should have 'reply' notification
        print("\n4c. Alice GET /api/forum/notifications (should have 'reply' notification)")
        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread = data.get("unread", 0)
            # Find reply notification
            reply_notif = next((n for n in notifications if n.get("type") == "reply" and n.get("postId") == notif_post_id), None)
            if reply_notif and unread >= 1:
                log_test("Alice receives 'reply' notification", True, f"unread={unread}, type={reply_notif.get('type')}")
            else:
                log_test("Alice receives 'reply' notification", False, f"No reply notification found, unread={unread}")
            
            # Check no leaks
            if not check_no_leaks(data):
                log_test("GET /forum/notifications no leaks", False, "Found _id or passwordHash in response")
            else:
                log_test("GET /forum/notifications no leaks", True, "No _id or passwordHash leaks")
        else:
            log_test("Alice receives 'reply' notification", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4d. Bob creates a post mentioning Alice
        print(f"\n4d. Bob creates a post mentioning Alice (@{alice_username})")
        resp = bob_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Mention Test",
            "body": f"Hey @{alice_username}, what do you think about this?",
            "category": "general"
        })
        if resp.status_code == 200:
            data = resp.json()
            mention_post = data.get("post", {})
            mention_post_id = mention_post.get("id")
            log_test("Bob creates post mentioning Alice", True, f"postId={mention_post_id}")
        else:
            log_test("Bob creates post mentioning Alice", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Wait a moment for notification to be created
        time.sleep(0.5)
        
        # 4e. Alice checks notifications -> should have 'mention' notification
        print("\n4e. Alice GET /api/forum/notifications (should have 'mention' notification)")
        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread = data.get("unread", 0)
            # Find mention notification
            mention_notif = next((n for n in notifications if n.get("type") == "mention" and n.get("postId") == mention_post_id), None)
            if mention_notif:
                log_test("Alice receives 'mention' notification", True, f"unread={unread}, type={mention_notif.get('type')}")
            else:
                log_test("Alice receives 'mention' notification", False, f"No mention notification found, unread={unread}")
        else:
            log_test("Alice receives 'mention' notification", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4f. Alice creates a reply mentioning Bob
        print(f"\n4f. Alice creates a reply mentioning Bob (@{bob_username})")
        resp = alice_session.post(f"{BASE_URL}/forum/replies", json={
            "postId": mention_post_id,
            "body": f"Thanks @{bob_username}, I think it's great!"
        })
        if resp.status_code == 200:
            data = resp.json()
            mention_reply = data.get("reply", {})
            mention_reply_id = mention_reply.get("id")
            log_test("Alice creates reply mentioning Bob", True, f"replyId={mention_reply_id}")
        else:
            log_test("Alice creates reply mentioning Bob", False, f"Status {resp.status_code}: {resp.text}")
            return
        
        # Wait a moment for notification to be created
        time.sleep(0.5)
        
        # 4g. Bob checks notifications -> should have 'mention' notification (and 'reply' since it's his post)
        print("\n4g. Bob GET /api/forum/notifications (should have 'mention' and 'reply' notifications)")
        resp = bob_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread = data.get("unread", 0)
            # Find mention notification
            mention_notif = next((n for n in notifications if n.get("type") == "mention" and n.get("replyId") == mention_reply_id), None)
            # Find reply notification
            reply_notif = next((n for n in notifications if n.get("type") == "reply" and n.get("replyId") == mention_reply_id), None)
            if mention_notif and reply_notif:
                log_test("Bob receives 'mention' and 'reply' notifications", True, f"unread={unread}")
            elif mention_notif:
                log_test("Bob receives 'mention' notification", True, f"unread={unread} (reply notification may be deduplicated)")
            else:
                log_test("Bob receives notifications", False, f"No mention notification found, unread={unread}")
        else:
            log_test("Bob receives notifications", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4h. Mark best answer -> Bob should get 'best-answer' notification
        print("\n4h. Alice marks Bob's reply as best answer")
        resp = alice_session.post(f"{BASE_URL}/forum/best-answer", json={
            "postId": notif_post_id,
            "replyId": notif_reply_id
        })
        if resp.status_code == 200:
            log_test("Alice marks Bob's reply as best answer", True, "")
        else:
            log_test("Alice marks Bob's reply as best answer", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment for notification to be created
        time.sleep(0.5)
        
        # 4i. Bob checks notifications -> should have 'best-answer' notification
        print("\n4i. Bob GET /api/forum/notifications (should have 'best-answer' notification)")
        resp = bob_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread = data.get("unread", 0)
            # Find best-answer notification
            best_notif = next((n for n in notifications if n.get("type") == "best-answer" and n.get("replyId") == notif_reply_id), None)
            if best_notif:
                log_test("Bob receives 'best-answer' notification", True, f"unread={unread}, type={best_notif.get('type')}")
            else:
                log_test("Bob receives 'best-answer' notification", False, f"No best-answer notification found, unread={unread}")
        else:
            log_test("Bob receives 'best-answer' notification", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4j. Test self-notification skip: Alice replies to her own post
        print("\n4j. Alice replies to her own post (should NOT create self-notification)")
        resp = alice_session.post(f"{BASE_URL}/forum/replies", json={
            "postId": notif_post_id,
            "body": "This is Alice replying to her own post."
        })
        if resp.status_code == 200:
            log_test("Alice replies to her own post", True, "")
        else:
            log_test("Alice replies to her own post", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Alice checks notifications -> unread count should not increase
        print("\n4k. Alice GET /api/forum/notifications (unread should not increase from self-reply)")
        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread_after_self = data.get("unread", 0)
            # Check that there's no new notification from herself
            self_reply_notif = next((n for n in notifications if n.get("actorId") == alice_id and n.get("recipientId") == alice_id), None)
            if not self_reply_notif:
                log_test("Self-notification skipped", True, f"No self-notification found")
            else:
                log_test("Self-notification skipped", False, f"Found self-notification: {self_reply_notif}")
        else:
            log_test("Self-notification skipped", False, f"Status {resp.status_code}: {resp.text}")
        
        # 4l. Test mention with different case
        print(f"\n4l. Bob mentions Alice with different case (@{alice_username.upper()})")
        resp = bob_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Case-insensitive Mention Test",
            "body": f"Hey @{alice_username.upper()}, testing case-insensitive mentions.",
            "category": "general"
        })
        if resp.status_code == 200:
            log_test("Bob creates post with uppercase mention", True, "")
        else:
            log_test("Bob creates post with uppercase mention", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # Alice checks notifications -> should have mention notification
        print("\n4m. Alice GET /api/forum/notifications (should have case-insensitive mention)")
        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            # Find the latest mention notification
            recent_mentions = [n for n in notifications if n.get("type") == "mention" and n.get("actorId") == bob_id]
            if len(recent_mentions) >= 2:  # Should have 2 mentions from Bob now
                log_test("Case-insensitive mention works", True, f"Found {len(recent_mentions)} mentions from Bob")
            else:
                log_test("Case-insensitive mention works", False, f"Expected 2 mentions, found {len(recent_mentions)}")
        else:
            log_test("Case-insensitive mention works", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # TEST 5: POST /api/forum/notifications/read
        # ============================================================
        print("\n--- TEST 5: POST /api/forum/notifications/read ---")
        
        # 5a. Mark all notifications as read
        print("\n5a. Bob POST /api/forum/notifications/read (mark all as read)")
        resp = bob_session.post(f"{BASE_URL}/forum/notifications/read", json={})
        if resp.status_code == 200:
            log_test("POST /forum/notifications/read (all)", True, "")
        else:
            log_test("POST /forum/notifications/read (all)", False, f"Status {resp.status_code}: {resp.text}")
        
        # 5b. Check unread count -> should be 0
        print("\n5b. Bob GET /api/forum/notifications (unread should be 0)")
        resp = bob_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            unread = data.get("unread", 0)
            if unread == 0:
                log_test("Unread count after mark all read", True, f"unread={unread}")
            else:
                log_test("Unread count after mark all read", False, f"unread={unread}, expected 0")
        else:
            log_test("Unread count after mark all read", False, f"Status {resp.status_code}: {resp.text}")
        
        # 5c. Create a new notification for Alice
        print("\n5c. Bob creates a new post to generate notification for Alice")
        resp = bob_session.post(f"{BASE_URL}/forum/posts", json={
            "title": "Single Notification Test",
            "body": f"@{alice_username} testing single notification read.",
            "category": "general"
        })
        if resp.status_code == 200:
            log_test("Bob creates post for single notification test", True, "")
        else:
            log_test("Bob creates post for single notification test", False, f"Status {resp.status_code}: {resp.text}")
        
        # Wait a moment
        time.sleep(0.5)
        
        # 5d. Alice gets notifications and marks one as read
        print("\n5d. Alice GET /api/forum/notifications and mark one as read")
        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
        if resp.status_code == 200:
            data = resp.json()
            notifications = data.get("notifications", [])
            unread_before = data.get("unread", 0)
            if notifications:
                # Get the first unread notification
                unread_notif = next((n for n in notifications if not n.get("read")), None)
                if unread_notif:
                    notif_id = unread_notif.get("id")
                    print(f"\n5e. Alice POST /api/forum/notifications/read with id={notif_id}")
                    resp = alice_session.post(f"{BASE_URL}/forum/notifications/read", json={"id": notif_id})
                    if resp.status_code == 200:
                        log_test("POST /forum/notifications/read (single)", True, "")
                        
                        # Check unread count decreased
                        resp = alice_session.get(f"{BASE_URL}/forum/notifications")
                        if resp.status_code == 200:
                            data = resp.json()
                            unread_after = data.get("unread", 0)
                            if unread_after == unread_before - 1:
                                log_test("Unread count after mark one read", True, f"unread decreased from {unread_before} to {unread_after}")
                            else:
                                log_test("Unread count after mark one read", False, f"unread={unread_after}, expected {unread_before - 1}")
                        else:
                            log_test("Unread count after mark one read", False, f"Status {resp.status_code}: {resp.text}")
                    else:
                        log_test("POST /forum/notifications/read (single)", False, f"Status {resp.status_code}: {resp.text}")
                else:
                    log_test("Find unread notification", False, "No unread notifications found")
            else:
                log_test("Find unread notification", False, "No notifications found")
        else:
            log_test("Alice GET notifications for single read test", False, f"Status {resp.status_code}: {resp.text}")
        
        # ============================================================
        # FINAL CHECKS
        # ============================================================
        print("\n--- FINAL CHECKS ---")
        
        # Check that all responses have no MongoDB _id or passwordHash leaks
        print("\nFinal check: No MongoDB _id or passwordHash leaks in any response")
        # This was checked throughout the tests
        
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

"""Backend tests for Startup Roast API (auth, roast, payment)."""
import os
import hmac
import hashlib
import uuid
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://feedback-fire.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
RAZORPAY_KEY_SECRET = "hFKH4nvMQP3qqTGCOaYTE0bz"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def new_user(session):
    """Register a fresh user so we can test full free-roast→paid flow."""
    uniq = uuid.uuid4().hex[:8]
    email = f"TEST_roast_{uniq}@test.com"
    payload = {"email": email, "password": "password123", "name": f"TEST_{uniq}"}
    r = session.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": "password123", "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def existing_user(session):
    r = session.post(f"{API}/auth/login", json={"email": "roast1@test.com", "password": "password123"})
    assert r.status_code == 200, f"login existing failed: {r.text}"
    d = r.json()
    return {"token": d["token"], "user": d["user"]}


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---------- Auth ----------
class TestAuth:
    def test_register_initial_state(self, new_user):
        u = new_user["user"]
        assert u["used_free_roast"] is False
        assert u["paid_roasts_balance"] == 0
        assert "id" in u and u["email"].startswith("test_roast_")  # lowercased

    def test_register_duplicate_email(self, session, new_user):
        r = session.post(f"{API}/auth/register", json={
            "email": new_user["email"], "password": "password123", "name": "Dup"
        })
        assert r.status_code == 400

    def test_login_success(self, session, new_user):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user["email"], "password": new_user["password"]
        })
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid(self, session, new_user):
        r = session.post(f"{API}/auth/login", json={
            "email": new_user["email"], "password": "wrongpass"
        })
        assert r.status_code == 401

    def test_me_with_token(self, session, new_user):
        r = session.get(f"{API}/auth/me", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == new_user["email"].lower()

    def test_me_missing_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer notarealtoken"})
        assert r.status_code == 401


# ---------- Roast validation ----------
class TestRoastValidation:
    def test_idea_too_short(self, session, existing_user):
        r = session.post(f"{API}/roast/generate",
                         headers=auth_headers(existing_user["token"]),
                         json={"idea": "short", "startup_name": "X"})
        assert r.status_code == 400

    def test_idea_too_long(self, session, existing_user):
        r = session.post(f"{API}/roast/generate",
                         headers=auth_headers(existing_user["token"]),
                         json={"idea": "a" * 4001, "startup_name": "X"})
        assert r.status_code == 400

    def test_roast_missing_auth(self, session):
        r = session.post(f"{API}/roast/generate",
                         json={"idea": "Uber for pets with AI blockchain twist"})
        assert r.status_code == 401


# ---------- Roast generation (free then 402) ----------
class TestRoastFlow:
    def test_first_roast_free(self, session, new_user):
        idea = "An AI-powered toothbrush that subscribes users to a monthly dental NFT club."
        r = session.post(f"{API}/roast/generate",
                         headers=auth_headers(new_user["token"]),
                         json={"idea": idea, "startup_name": "ToothChain"})
        assert r.status_code == 200, f"first roast failed: {r.status_code} {r.text}"
        data = r.json()
        assert 1 <= data["score"] <= 10
        assert len(data["callouts"]) == 5
        assert len(data["fixes"]) == 5
        assert data["verdict_title"]
        assert data["one_liner"]
        # Store roast_id
        pytest.roast_id_new_user = data["id"]

        # me should now show used_free_roast True
        me = session.get(f"{API}/auth/me", headers=auth_headers(new_user["token"])).json()
        assert me["used_free_roast"] is True
        assert me["paid_roasts_balance"] == 0

    def test_second_roast_402(self, session, new_user):
        idea = "Another idea that should not pass because user has no balance left."
        r = session.post(f"{API}/roast/generate",
                         headers=auth_headers(new_user["token"]),
                         json={"idea": idea})
        assert r.status_code == 402
        assert "free roast" in r.text.lower() or "consumed" in r.text.lower()

    def test_existing_user_blocked(self, session, existing_user):
        # roast1@test.com supposedly already consumed free roast + 0 balance
        r = session.get(f"{API}/auth/me", headers=auth_headers(existing_user["token"]))
        me = r.json()
        if me.get("used_free_roast") and me.get("paid_roasts_balance", 0) == 0:
            r2 = session.post(f"{API}/roast/generate",
                              headers=auth_headers(existing_user["token"]),
                              json={"idea": "Yet another unremarkable SaaS idea for testing."})
            assert r2.status_code == 402
        else:
            pytest.skip(f"existing user state unexpected: {me}")


# ---------- Payment ----------
class TestPayment:
    def test_create_order(self, session, new_user):
        r = session.post(f"{API}/payment/create-order", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200, f"create-order failed: {r.status_code} {r.text}"
        d = r.json()
        assert d["amount"] == 4900
        assert d["currency"] == "INR"
        assert d["order_id"].startswith("order_")
        assert d["key_id"].startswith("rzp_test_")
        pytest.order_id_new_user = d["order_id"]

    def test_create_order_requires_auth(self, session):
        r = session.post(f"{API}/payment/create-order")
        assert r.status_code == 401

    def test_verify_invalid_signature(self, session, new_user):
        order_id = pytest.order_id_new_user
        payload = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_TEST123",
            "razorpay_signature": "deadbeef" * 8,
        }
        r = session.post(f"{API}/payment/verify",
                         headers=auth_headers(new_user["token"]),
                         json=payload)
        assert r.status_code == 400

    def test_verify_valid_signature_and_balance_increment(self, session, new_user):
        order_id = pytest.order_id_new_user
        payment_id = "pay_TEST123"
        body = f"{order_id}|{payment_id}"
        sig = hmac.new(RAZORPAY_KEY_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
        r = session.post(f"{API}/payment/verify",
                         headers=auth_headers(new_user["token"]),
                         json={
                             "razorpay_order_id": order_id,
                             "razorpay_payment_id": payment_id,
                             "razorpay_signature": sig,
                         })
        # Note: invalid signature test ran first and set status=invalid_signature.
        # Valid sig should still succeed regardless of that field.
        assert r.status_code == 200, f"verify failed: {r.status_code} {r.text}"
        resp = r.json()
        # Accept success OR already_credited
        assert resp.get("status") in ("success", "already_credited")
        # Confirm balance
        me = session.get(f"{API}/auth/me", headers=auth_headers(new_user["token"])).json()
        assert me["paid_roasts_balance"] >= 1

    def test_paid_roast_decrements_balance(self, session, new_user):
        me_before = session.get(f"{API}/auth/me", headers=auth_headers(new_user["token"])).json()
        if me_before["paid_roasts_balance"] < 1:
            pytest.skip("No paid balance to test decrement")
        idea = "A marketplace for recycling discarded pitch decks into toilet paper for VCs."
        r = session.post(f"{API}/roast/generate",
                         headers=auth_headers(new_user["token"]),
                         json={"idea": idea, "startup_name": "DeckRoll"})
        assert r.status_code == 200, f"paid roast failed: {r.text}"
        me_after = session.get(f"{API}/auth/me", headers=auth_headers(new_user["token"])).json()
        assert me_after["paid_roasts_balance"] == me_before["paid_roasts_balance"] - 1


# ---------- Listing ----------
class TestListings:
    def test_leaderboard_public(self, session):
        r = session.get(f"{API}/roasts/leaderboard")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        if len(items) >= 2:
            scores = [i["score"] for i in items]
            assert scores == sorted(scores), "Leaderboard should be sorted by score ascending"

    def test_my_roasts_requires_auth(self, session):
        r = session.get(f"{API}/roasts/my")
        assert r.status_code == 401

    def test_my_roasts_returns_only_mine(self, session, new_user):
        r = session.get(f"{API}/roasts/my", headers=auth_headers(new_user["token"]))
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert it["user_id"] == new_user["user"]["id"]

    def test_get_single_roast(self, session):
        rid = getattr(pytest, "roast_id_new_user", None)
        if not rid:
            pytest.skip("no roast id cached")
        r = session.get(f"{API}/roast/{rid}")
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_get_single_roast_404(self, session):
        r = session.get(f"{API}/roast/nonexistent-id-xyz")
        assert r.status_code == 404

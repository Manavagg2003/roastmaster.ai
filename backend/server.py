from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import uuid
import hmac
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
import razorpay

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
RAZORPAY_KEY_ID = os.environ["RAZORPAY_KEY_ID"]
RAZORPAY_KEY_SECRET = os.environ["RAZORPAY_KEY_SECRET"]
JWT_SECRET = os.environ["JWT_SECRET"]

ROAST_PRICE_PAISE = 4900  # Rs 49

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


# ============ MODELS ============
class RegisterInput(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    used_free_roast: bool
    paid_roasts_balance: int


class RoastInput(BaseModel):
    idea: str
    startup_name: Optional[str] = ""


class RoastOut(BaseModel):
    id: str
    user_id: str
    user_name: str
    startup_name: str
    idea: str
    score: int
    one_liner: str
    callouts: List[str]
    fixes: List[str]
    verdict_title: str
    created_at: str


class CreateOrderOut(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifyPaymentInput(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ============ HELPERS ============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))


def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "used_free_roast": u.get("used_free_roast", False),
        "paid_roasts_balance": u.get("paid_roasts_balance", 0),
    }


# ============ AUTH ============
@api_router.post("/auth/register")
async def register(payload: RegisterInput):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name.strip()[:60] or "Anon",
        "password_hash": hash_password(payload.password),
        "used_free_roast": False,
        "paid_roasts_balance": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return {"token": token, "user": user_public(doc)}


@api_router.post("/auth/login")
async def login(payload: LoginInput):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["id"])
    return {"token": token, "user": user_public(user)}


@api_router.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return user_public(current)


# ============ ROAST GENERATION ============
ROAST_SYSTEM = """You are THE ROASTMASTER — a brutal, no-bullshit startup critic who has seen 10,000 pitch decks die. Your job: eviscerate startup ideas with dark humor, surgical precision, and zero mercy. You are savage but never hateful. You find the REAL, SPECIFIC flaws — market reality, execution, TAM, moat, differentiation, founder delusion.

Output ONLY valid JSON in this exact schema, nothing else, no prefix, no suffix, no markdown fences:
{
  "score": <integer 1-10, where 1 = absolute trash and 10 = unicorn>,
  "verdict_title": "<a single brutal headline verdict, max 8 words, all caps>",
  "one_liner": "<one biting sentence summing up why this idea is cooked (max 25 words)>",
  "callouts": [
    "<brutal specific callout 1 — reference actual details from their idea>",
    "<callout 2>",
    "<callout 3>",
    "<callout 4>",
    "<callout 5>"
  ],
  "fixes": [
    "<sharp actionable fix 1>",
    "<fix 2>",
    "<fix 3>",
    "<fix 4>",
    "<fix 5>"
  ]
}

Rules:
- Callouts must be SPECIFIC to their idea, not generic advice.
- Use dry wit, irony, and dark startup humor. Think: Ricky Gervais roasting a TechCrunch pitch.
- Do NOT be supportive. Do NOT say 'great idea but'. Do NOT hedge.
- Each callout should be 1-2 sentences, punchy.
- Fixes should be specific, not 'do more research'.
- Score strictly: most ideas deserve 2-5. Unicorns are rare.
- Do not use emoji.
- Return only JSON. No commentary."""


async def generate_roast_ai(startup_name: str, idea: str) -> dict:
    session_id = str(uuid.uuid4())
    chat = (
        LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=ROAST_SYSTEM)
        .with_model("gemini", "gemini-3-flash-preview")
    )
    user_text = f"Startup Name: {startup_name or 'Unnamed'}\n\nIdea:\n{idea}\n\nRoast it. Return ONLY the JSON."
    msg = UserMessage(text=user_text)
    response = await chat.send_message(msg)
    text = (response or "").strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*", "", text).strip()
        text = text.rstrip("`").strip()
        if text.endswith("```"):
            text = text[:-3].strip()
    # Try to find JSON block
    try:
        data = json.loads(text)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise HTTPException(status_code=502, detail="AI returned invalid response")
        data = json.loads(m.group(0))

    # Normalise & validate
    score = int(data.get("score", 3))
    score = max(1, min(10, score))
    callouts = [str(x).strip() for x in (data.get("callouts") or [])][:5]
    fixes = [str(x).strip() for x in (data.get("fixes") or [])][:5]
    while len(callouts) < 5:
        callouts.append("The silence speaks louder than your pitch.")
    while len(fixes) < 5:
        fixes.append("Start over. Talk to 50 real users first.")
    return {
        "score": score,
        "verdict_title": str(data.get("verdict_title", "DELUSION DETECTED"))[:120].upper(),
        "one_liner": str(data.get("one_liner", "This idea needs a funeral, not a Series A."))[:300],
        "callouts": callouts,
        "fixes": fixes,
    }


@api_router.post("/roast/generate", response_model=RoastOut)
async def generate_roast(payload: RoastInput, current=Depends(get_current_user)):
    idea = payload.idea.strip()
    if len(idea) < 15:
        raise HTTPException(status_code=400, detail="Idea too short. Give us something to work with (min 15 chars).")
    if len(idea) > 4000:
        raise HTTPException(status_code=400, detail="Idea too long. Keep it under 4000 characters.")

    # Check entitlement
    user = await db.users.find_one({"id": current["id"]})
    used_free = user.get("used_free_roast", False)
    balance = user.get("paid_roasts_balance", 0)

    if not used_free:
        consume = {"$set": {"used_free_roast": True}}
    elif balance > 0:
        consume = {"$inc": {"paid_roasts_balance": -1}}
    else:
        raise HTTPException(status_code=402, detail="Free roast consumed. Pay Rs 49 for another savage review.")

    # Generate roast
    roast_data = await generate_roast_ai(payload.startup_name or "", idea)

    # Save roast
    roast_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": roast_id,
        "user_id": current["id"],
        "user_name": current["name"],
        "startup_name": (payload.startup_name or "").strip()[:80],
        "idea": idea,
        "score": roast_data["score"],
        "verdict_title": roast_data["verdict_title"],
        "one_liner": roast_data["one_liner"],
        "callouts": roast_data["callouts"],
        "fixes": roast_data["fixes"],
        "created_at": now,
    }
    await db.roasts.insert_one(doc)
    # Consume entitlement only after successful roast
    await db.users.update_one({"id": current["id"]}, consume)

    doc.pop("_id", None)
    return doc


@api_router.get("/roast/{roast_id}", response_model=RoastOut)
async def get_roast(roast_id: str):
    doc = await db.roasts.find_one({"id": roast_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Roast not found")
    return doc


@api_router.get("/roasts/my")
async def my_roasts(current=Depends(get_current_user)):
    items = await db.roasts.find({"user_id": current["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return items


@api_router.get("/roasts/leaderboard")
async def leaderboard():
    # Hall of Shame: lowest scores first, then most recent
    items = await db.roasts.find({}, {"_id": 0}).sort([("score", 1), ("created_at", -1)]).to_list(50)
    # Trim idea text for leaderboard
    for it in items:
        it["idea_preview"] = it["idea"][:180]
    return items


# ============ PAYMENT ============
@api_router.post("/payment/create-order", response_model=CreateOrderOut)
async def create_order(current=Depends(get_current_user)):
    short_id = current["id"][:8]
    receipt = f"roast_{short_id}_{int(datetime.now(timezone.utc).timestamp())}"[:40]
    order = rzp_client.order.create({
        "amount": ROAST_PRICE_PAISE,
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1,
        "notes": {"user_id": current["id"], "product": "startup_roast"},
    })
    await db.payments.insert_one({
        "order_id": order["id"],
        "user_id": current["id"],
        "amount": ROAST_PRICE_PAISE,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "order_id": order["id"],
        "amount": ROAST_PRICE_PAISE,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
    }


@api_router.post("/payment/verify")
async def verify_payment(payload: VerifyPaymentInput, current=Depends(get_current_user)):
    body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, payload.razorpay_signature):
        await db.payments.update_one(
            {"order_id": payload.razorpay_order_id},
            {"$set": {"status": "invalid_signature"}},
        )
        raise HTTPException(status_code=400, detail="Payment signature mismatch")

    pmt = await db.payments.find_one({"order_id": payload.razorpay_order_id})
    if not pmt or pmt["user_id"] != current["id"]:
        raise HTTPException(status_code=404, detail="Order not found")
    if pmt.get("status") == "paid":
        return {"status": "already_credited"}

    await db.payments.update_one(
        {"order_id": payload.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "payment_id": payload.razorpay_payment_id,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    await db.users.update_one(
        {"id": current["id"]},
        {"$inc": {"paid_roasts_balance": 1}},
    )
    user = await db.users.find_one({"id": current["id"]})
    return {"status": "success", "user": user_public(user)}


@api_router.get("/")
async def root():
    return {"message": "Roastmaster API v1"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

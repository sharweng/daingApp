# This file is for web backend: signup/login/auth API used by the daing-grader-web frontend.

import io
import json
import os
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Import email sending
from email_sender import send_verification_email

# --- for web backend: password hashing (bcrypt directly) and JWT ---
try:
    import bcrypt
except ImportError:
    bcrypt = None
try:
    from jose import jwt, JWTError
except ImportError:
    jwt = None
    JWTError = Exception

# --- Firebase Admin (verify ID tokens) ---
try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
except ImportError:
    firebase_admin = None
    credentials = None
    firebase_auth = None

# for web backend: Cloudinary for profile avatar upload
try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None

from bson import ObjectId
from mongodb import get_db

router = APIRouter()
security = HTTPBearer(auto_error=False)
BCRYPT_MAX_PASSWORD_BYTES = 72  # bcrypt limit; truncate to avoid ValueError

JWT_SECRET = os.getenv("JWT_SECRET", "dainggrader-web-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days
ADMIN_CODE = os.getenv("ADMIN_CODE", "DaingAdmin2026")  # for web backend: admin registration/login code
ALLOWED_ROLES = {"user", "seller", "admin"}
ALLOWED_GENDERS = {"", "male", "female", "prefer_not_say"}

# for web backend: Cloudinary config for profile avatars (same as server.py)
if cloudinary and os.getenv("CLOUDINARY_CLOUD_NAME"):
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    )


def _init_firebase_admin() -> bool:
    if not firebase_admin or not credentials:
        return False
    if firebase_admin._apps:
        return True

    service_json = (os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON") or "").strip()
    service_path = (os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or "").strip()

    try:
        if service_json:
            info = json.loads(service_json)
            cred = credentials.Certificate(info)
        elif service_path:
            cred = credentials.Certificate(service_path)
        else:
            return False
        firebase_admin.initialize_app(cred)
        return True
    except Exception:
        return False


def _verify_firebase_token(token: str) -> dict:
    if not _init_firebase_admin() or not firebase_auth:
        raise HTTPException(status_code=500, detail="Firebase auth not configured")
    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _get_firebase_claims(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _verify_firebase_token(credentials.credentials)


def _get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """for web backend: get current user from Firebase ID token (fallback to JWT)."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    db = get_db()

    if _init_firebase_admin():
        decoded = _verify_firebase_token(token)
        firebase_uid = decoded.get("uid")
        email = (decoded.get("email") or "").strip().lower()

        user = None
        if firebase_uid:
            user = db["users"].find_one({"firebase_uid": firebase_uid})
        if not user and email:
            user = db["users"].find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="User not registered")

        updates = {}
        if firebase_uid and user.get("firebase_uid") != firebase_uid:
            updates["firebase_uid"] = firebase_uid
        if email and (user.get("email") or "").strip().lower() != email:
            updates["email"] = email
        if "email_verified" in decoded:
            updates["email_verified"] = bool(decoded.get("email_verified"))

        if updates:
            db["users"].update_one({"_id": user["_id"]}, {"$set": updates})
            user = db["users"].find_one({"_id": user["_id"]})

        return user

    if not jwt:
        raise HTTPException(status_code=500, detail="Auth not configured")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        user = db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


class RegisterBody(BaseModel):
    name: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: str
    password: str
    city: Optional[str] = None
    street_address: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    gender: Optional[str] = None
    role: Optional[str] = None
    admin_code: Optional[str] = None


class RegisterFirebaseBody(BaseModel):
    name: str
    email: str
    role: Optional[str] = None
    admin_code: Optional[str] = None


class LoginBody(BaseModel):
    email: str
    password: str
    admin_code: Optional[str] = None


class ProfileUpdateBody(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    street_address: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    gender: Optional[str] = None


def _password_bytes(password: str) -> bytes:
    """Truncate to 72 bytes for bcrypt (avoids ValueError)."""
    raw = password.encode("utf-8")
    return raw[:BCRYPT_MAX_PASSWORD_BYTES] if len(raw) > BCRYPT_MAX_PASSWORD_BYTES else raw


def _hash_password(password: str) -> str:
    if not bcrypt:
        raise HTTPException(status_code=500, detail="Auth not configured (install bcrypt)")
    pw_bytes = _password_bytes(password)
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw_bytes, salt)
    return hashed.decode("utf-8")


def _validate_phone(phone: str) -> bool:
    digits = re.sub(r"\D", "", phone or "")
    return len(digits) >= 10


def _verify_password(plain: str, hashed: str) -> bool:
    if not bcrypt:
        return False
    try:
        pw_bytes = _password_bytes(plain)
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except Exception:
        return False


def _create_token(user_id: str, email: str) -> str:
    if not jwt:
        raise HTTPException(status_code=500, detail="Auth not configured (install python-jose[cryptography])")
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post("/register-firebase")
async def register_firebase(body: RegisterFirebaseBody, claims: dict = Depends(_get_firebase_claims)):
    """Register a new user using Firebase Auth (creates MongoDB user profile)."""
    name = (body.name or "").strip()
    email = (body.email or "").strip().lower()
    requested_role = (body.role or "user").strip().lower() if body.role else "user"
    admin_code = (body.admin_code or "").strip()

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    claim_email = (claims.get("email") or "").strip().lower()
    if not claim_email or claim_email != email:
        raise HTTPException(status_code=400, detail="Email does not match Firebase account")

    if admin_code:
        if admin_code != ADMIN_CODE:
            raise HTTPException(status_code=401, detail="Invalid admin code")
        requested_role = "admin"

    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if requested_role == "admin" and not admin_code:
        raise HTTPException(status_code=401, detail="Admin code is required")

    db = get_db()
    users = db["users"]
    firebase_uid = claims.get("uid")
    email_verified = bool(claims.get("email_verified"))

    existing = None
    if firebase_uid:
        existing = users.find_one({"firebase_uid": firebase_uid})
    if not existing:
        existing = users.find_one({"email": email})

    if existing:
        updates = {}
        if firebase_uid and existing.get("firebase_uid") != firebase_uid:
            updates["firebase_uid"] = firebase_uid
        if email_verified != existing.get("email_verified"):
            updates["email_verified"] = email_verified
        if updates:
            users.update_one({"_id": existing["_id"]}, {"$set": updates})
            existing = users.find_one({"_id": existing["_id"]})
        uid = str(existing["_id"])
        return {
            "id": uid,
            "name": existing.get("name") or "",
            "full_name": existing.get("full_name") or existing.get("name") or "",
            "email": existing.get("email") or "",
            "avatar_url": existing.get("avatar_url") or None,
            "phone": existing.get("phone") or "",
            "city": existing.get("city") or "",
            "street_address": existing.get("street_address") or "",
            "province": existing.get("province") or "",
            "postal_code": existing.get("postal_code") or "",
            "gender": existing.get("gender") or "",
            "role": (existing.get("role") or "user").strip().lower(),
            "email_verified": bool(existing.get("email_verified")),
        }

    doc = {
        "name": name,
        "full_name": name,
        "email": email,
        "phone": "",
        "city": "",
        "street_address": "",
        "province": "",
        "postal_code": "",
        "gender": "",
        "firebase_uid": firebase_uid,
        "email_verified": email_verified,
        "created_at": datetime.utcnow().isoformat(),
        "role": requested_role,
    }

    result = users.insert_one(doc)
    user_id = str(result.inserted_id)
    return {
        "id": user_id,
        "name": doc.get("name") or "",
        "full_name": doc.get("full_name") or doc.get("name") or "",
        "email": doc.get("email") or "",
        "avatar_url": doc.get("avatar_url") or None,
        "phone": doc.get("phone") or "",
        "city": doc.get("city") or "",
        "street_address": doc.get("street_address") or "",
        "province": doc.get("province") or "",
        "postal_code": doc.get("postal_code") or "",
        "gender": doc.get("gender") or "",
        "role": (doc.get("role") or "user").strip().lower(),
        "email_verified": bool(doc.get("email_verified")),
    }


@router.post("/register")
async def register(body: RegisterBody):
    """Web backend: register a new user. Stores in MongoDB users collection."""
    name = (body.name or "").strip()
    email = (body.email or "").strip().lower()
    password = body.password or ""
    requested_role = (body.role or "user").strip().lower() if body.role else "user"
    admin_code = (body.admin_code or "").strip()

    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    if admin_code:
        if admin_code != ADMIN_CODE:
            raise HTTPException(status_code=401, detail="Invalid admin code")
        requested_role = "admin"

    if requested_role not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if requested_role == "admin" and not admin_code:
        raise HTTPException(status_code=401, detail="Admin code is required")

    db = get_db()
    users = db["users"]

    existing = users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = _hash_password(password)
    # Generate email verification token
    email_verify_token = secrets.token_urlsafe(32)
    
    doc = {
        "name": name,
        "full_name": (body.full_name or name).strip(),
        "email": email,
        "phone": (body.phone or "").strip(),
        "city": (body.city or "").strip(),
        "street_address": (body.street_address or "").strip(),
        "province": (body.province or "").strip(),
        "postal_code": (body.postal_code or "").strip(),
        "gender": (body.gender or "").strip(),
        "password_hash": hashed,
        "created_at": datetime.utcnow().isoformat(),
        "role": requested_role,
        "email_verified": False,
        "email_verify_token": email_verify_token,
        "email_verify_token_expires": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
    }
    if doc["phone"] and not _validate_phone(doc["phone"]):
        raise HTTPException(status_code=400, detail="Invalid phone number")
    if doc["gender"] not in ALLOWED_GENDERS:
        raise HTTPException(status_code=400, detail="Invalid gender value")
    result = users.insert_one(doc)
    user_id = str(result.inserted_id)

    # Create verification link (adjust URL as needed for your frontend)
    verification_link = f"https://daiing-grader.com/verify-email?token={email_verify_token}&user_id={user_id}"
    
    # Send verification email
    try:
        send_verification_email(email, name, verification_link)
    except Exception as e:
        print(f"[WARNING] Failed to send verification email to {email}: {str(e)}")
        # Don't fail - user can still use account, just email not sent

    token = _create_token(user_id, email)
    return {
        "token": token,
        "user": {"id": user_id, "name": name, "email": email},
        "message": "Account created successfully. Please check your email to verify your account."
    }


@router.post("/login")
async def login(body: LoginBody):
    """Web backend: login user. Verifies password against MongoDB users collection."""
    email = (body.email or "").strip().lower()
    password = body.password or ""
    admin_code = (body.admin_code or "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    db = get_db()
    users = db["users"]

    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored_hash = user.get("password_hash")
    if not stored_hash or not _verify_password(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = (user.get("role") or "user").strip().lower()
    if role == "admin" and admin_code != ADMIN_CODE:
        raise HTTPException(status_code=401, detail="Admin code is required")

    user_id = str(user["_id"])
    name = user.get("name") or email.split("@")[0]
    token = _create_token(user_id, email)
    return {
        "token": token,
        "user": {"id": user_id, "name": name, "email": email, "role": role},
    }


@router.post("/verify-email")
async def verify_email(token: str, user_id: str):
    """Verify user email using token sent to their email."""
    if not token or not user_id:
        raise HTTPException(status_code=400, detail="Token and user_id required")
    
    db = get_db()
    users = db["users"]
    
    try:
        from bson import ObjectId
        user = users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if token matches
    if user.get("email_verify_token") != token:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check if token has expired
    token_expires = user.get("email_verify_token_expires")
    if token_expires:
        try:
            expires_at = datetime.fromisoformat(token_expires)
            if datetime.utcnow() > expires_at:
                raise HTTPException(status_code=400, detail="Verification token has expired")
        except ValueError:
            pass
    
    # Mark email as verified
    users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "email_verified": True,
                "email_verify_token": None,
                "email_verify_token_expires": None,
            }
        }
    )
    
    return {"status": "success", "message": "Email verified successfully"}


@router.get("/me")
async def get_me(user=Depends(_get_current_user)):
    """for web backend: return current user (id, name, email, avatar_url)."""
    uid = str(user["_id"])
    return {
        "id": uid,
        "name": user.get("name") or "",
        "full_name": user.get("full_name") or user.get("name") or "",
        "email": user.get("email") or "",
        "avatar_url": user.get("avatar_url") or None,
        "phone": user.get("phone") or "",
        "city": user.get("city") or "",
        "street_address": user.get("street_address") or "",
        "province": user.get("province") or "",
        "postal_code": user.get("postal_code") or "",
        "gender": user.get("gender") or "",
        "role": (user.get("role") or "user").strip().lower(),
        "email_verified": bool(user.get("email_verified")),
    }


@router.get("/firebase/health")
async def firebase_health():
    """Health check for Firebase Admin initialization."""
    ok = _init_firebase_admin()
    return {"status": "ok" if ok else "error", "firebase_admin": ok}


@router.patch("/profile")
async def update_profile(body: ProfileUpdateBody, user=Depends(_get_current_user)):
    """for web backend: update name (and optionally avatar_url set by /profile/avatar)."""
    db = get_db()
    users = db["users"]
    updates = {}
    if body.name is not None and len((body.name or "").strip()) >= 2:
        updates["name"] = body.name.strip()
    if body.full_name is not None and len((body.full_name or "").strip()) >= 2:
        updates["full_name"] = body.full_name.strip()
        if "name" not in updates:
            updates["name"] = body.full_name.strip()
    if body.phone is not None:
        phone = (body.phone or "").strip()
        if phone and not _validate_phone(phone):
            raise HTTPException(status_code=400, detail="Invalid phone number")
        updates["phone"] = phone
    if body.city is not None:
        updates["city"] = (body.city or "").strip()
    if body.street_address is not None:
        updates["street_address"] = (body.street_address or "").strip()
    if body.province is not None:
        updates["province"] = (body.province or "").strip()
    if body.postal_code is not None:
        updates["postal_code"] = (body.postal_code or "").strip()
    if body.gender is not None:
        gender = (body.gender or "").strip()
        if gender not in ALLOWED_GENDERS:
            raise HTTPException(status_code=400, detail="Invalid gender value")
        updates["gender"] = gender
    if body.email is not None:
        email = (body.email or "").strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        existing = users.find_one({"email": email, "_id": {"$ne": user["_id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        updates["email"] = email
    if updates:
        users.update_one({"_id": user["_id"]}, {"$set": updates})
    updated = users.find_one({"_id": user["_id"]})
    uid = str(updated["_id"])
    return {
        "id": uid,
        "name": updated.get("name") or "",
        "full_name": updated.get("full_name") or updated.get("name") or "",
        "email": updated.get("email") or "",
        "avatar_url": updated.get("avatar_url") or None,
        "phone": updated.get("phone") or "",
        "city": updated.get("city") or "",
        "street_address": updated.get("street_address") or "",
        "province": updated.get("province") or "",
        "postal_code": updated.get("postal_code") or "",
        "gender": updated.get("gender") or "",
        "role": (updated.get("role") or "user").strip().lower(),
    }


@router.post("/profile/avatar")
async def upload_profile_avatar(file: UploadFile = File(...), user=Depends(_get_current_user)):
    """for web backend: upload profile image to Cloudinary, save URL in MongoDB users."""
    if not cloudinary:
        raise HTTPException(status_code=500, detail="Cloudinary not configured")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5 MB
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    user_id = str(user["_id"])
    folder = "daing-profile-avatars"
    public_id = f"avatar_{user_id}"
    try:
        result = cloudinary.uploader.upload(
            io.BytesIO(content),
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
        )
        url = result.get("secure_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    db = get_db()
    db["users"].update_one({"_id": user["_id"]}, {"$set": {"avatar_url": url}})
    return {"avatar_url": url}

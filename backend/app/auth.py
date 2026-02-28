"""
Authentication Module
=====================
Handles user registration, login, logout, and token management.
Supports both session-based auth (mobile) and JWT-based auth (web).
"""

import os
import io
import re
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .config import get_users_collection, get_sessions_collection, get_db

# Try to import optional dependencies
try:
    import bcrypt
except ImportError:
    bcrypt = None

try:
    from jose import jwt, JWTError
except ImportError:
    jwt = None
    JWTError = Exception

try:
    import firebase_admin
    from firebase_admin import credentials, auth as firebase_auth
except ImportError:
    firebase_admin = None
    credentials = None
    firebase_auth = None

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    cloudinary = None

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dainggrader-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 7 days
ADMIN_CODE = os.getenv("ADMIN_CODE", "DaingAdmin2026")
ALLOWED_ROLES = {"user", "seller", "admin"}
ALLOWED_GENDERS = {"", "male", "female", "prefer_not_say"}
BCRYPT_MAX_PASSWORD_BYTES = 72

# Security setup
security = HTTPBearer(auto_error=False)


# ============================================
# PASSWORD HASHING (Dual support: SHA-256 + bcrypt)
# ============================================

def hash_password(password: str, use_bcrypt: bool = True) -> str:
    """Hash password using bcrypt (preferred) or SHA-256 with salt (fallback)."""
    if use_bcrypt and bcrypt:
        pw_bytes = password.encode("utf-8")[:BCRYPT_MAX_PASSWORD_BYTES]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(pw_bytes, salt)
        return hashed.decode("utf-8")
    else:
        # Fallback to SHA-256 for backward compatibility
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash (supports both bcrypt and SHA-256)."""
    try:
        # Try bcrypt first
        if bcrypt and stored_hash.startswith("$2"):
            pw_bytes = password.encode("utf-8")[:BCRYPT_MAX_PASSWORD_BYTES]
            return bcrypt.checkpw(pw_bytes, stored_hash.encode("utf-8"))
        # Fall back to SHA-256 for legacy hashes
        if ":" in stored_hash:
            salt, password_hash = stored_hash.split(":")
            new_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return new_hash == password_hash
        return False
    except:
        return False


# ============================================
# TOKEN MANAGEMENT
# ============================================

def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def create_session(user_id: str, role: str) -> Optional[str]:
    """
    Create a new session for user.
    
    Args:
        user_id: User's ID
        role: User's role
        
    Returns:
        Session token or None if failed
    """
    sessions_collection = get_sessions_collection()
    if sessions_collection is None:
        return None
    
    try:
        token = generate_token()
        session = {
            "token": token,
            "user_id": user_id,
            "role": role,
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(days=30)  # 30 day expiry
        }
        sessions_collection.insert_one(session)
        return token
    except Exception as e:
        print(f"⚠️ Failed to create session: {e}")
        return None


def validate_session(token: str) -> Optional[Dict[str, Any]]:
    """
    Validate session token and return user info.
    
    Args:
        token: Session token
        
    Returns:
        User info dict or None if invalid
    """
    sessions_collection = get_sessions_collection()
    if sessions_collection is None:
        return None
    
    try:
        session = sessions_collection.find_one({
            "token": token,
            "expires_at": {"$gt": datetime.now()}
        })
        
        if session:
            return {
                "user_id": session["user_id"],
                "role": session["role"]
            }
        return None
    except Exception as e:
        print(f"⚠️ Failed to validate session: {e}")
        return None


def delete_session(token: str) -> bool:
    """
    Delete a session (logout).
    
    Args:
        token: Session token to delete
        
    Returns:
        True if deleted, False otherwise
    """
    sessions_collection = get_sessions_collection()
    if sessions_collection is None:
        return False
    
    try:
        result = sessions_collection.delete_one({"token": token})
        return result.deleted_count > 0
    except Exception as e:
        print(f"⚠️ Failed to delete session: {e}")
        return False


# ============================================
# USER MANAGEMENT
# ============================================

def register_user(username: str, email: str, password: str) -> Dict[str, Any]:
    """
    Register a new user.
    
    Args:
        username: Username
        email: Email address
        password: Plain text password
        
    Returns:
        Result dict with status and user info or error
    """
    users_collection = get_users_collection()
    if users_collection is None:
        return {"status": "error", "message": "Database not connected"}
    
    # Validate inputs
    if not username or len(username) < 3:
        return {"status": "error", "message": "Username must be at least 3 characters"}
    
    if not email or "@" not in email:
        return {"status": "error", "message": "Invalid email address"}
    
    if not password or len(password) < 6:
        return {"status": "error", "message": "Password must be at least 6 characters"}
    
    try:
        # Check if username or email already exists
        existing = users_collection.find_one({
            "$or": [
                {"username": username.lower()},
                {"email": email.lower()}
            ]
        })
        
        if existing:
            if existing.get("username") == username.lower():
                return {"status": "error", "message": "Username already taken"}
            return {"status": "error", "message": "Email already registered"}
        
        # Create user
        user = {
            "username": username.lower(),
            "email": email.lower(),
            "password_hash": hash_password(password),
            "role": "user",  # Default role is "user"
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        result = users_collection.insert_one(user)
        user_id = str(result.inserted_id)
        
        # Create session
        token = create_session(user_id, "user")
        
        print(f"✅ User registered: {username}")
        return {
            "status": "success",
            "user": {
                "id": user_id,
                "username": username.lower(),
                "email": email.lower(),
                "role": "user"
            },
            "token": token
        }
    except Exception as e:
        print(f"❌ Registration failed: {e}")
        return {"status": "error", "message": "Registration failed"}


def login_user(username: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user and create session.
    
    Args:
        username: Username or email
        password: Plain text password
        
    Returns:
        Result dict with status and user info or error
    """
    users_collection = get_users_collection()
    if users_collection is None:
        return {"status": "error", "message": "Database not connected"}
    
    try:
        # Find user by username or email
        user = users_collection.find_one({
            "$or": [
                {"username": username.lower()},
                {"email": username.lower()}
            ]
        })
        
        if not user:
            return {"status": "error", "message": "Invalid username or password"}
        
        # Check if user is inactive
        if user.get("status") == "inactive":
            return {"status": "error", "message": "Your account has been deactivated. Please contact support."}
        
        # Verify password
        if not verify_password(password, user.get("password_hash", "")):
            return {"status": "error", "message": "Invalid username or password"}
        
        user_id = str(user["_id"])
        role = user.get("role", "user")
        
        # Create session
        token = create_session(user_id, role)
        
        if not token:
            return {"status": "error", "message": "Failed to create session"}
        
        print(f"✅ User logged in: {user['username']} (role: {role})")
        return {
            "status": "success",
            "user": {
                "id": user_id,
                "username": user["username"],
                "email": user["email"],
                "role": role
            },
            "token": token
        }
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return {"status": "error", "message": "Login failed"}


def logout_user(token: str) -> Dict[str, Any]:
    """
    Logout user by deleting session.
    
    Args:
        token: Session token
        
    Returns:
        Result dict with status
    """
    if delete_session(token):
        print("✅ User logged out")
        return {"status": "success", "message": "Logged out successfully"}
    return {"status": "error", "message": "Logout failed"}


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user info by ID.
    
    Args:
        user_id: User's ID
        
    Returns:
        User info dict or None
    """
    users_collection = get_users_collection()
    if users_collection is None:
        return None
    
    try:
        from bson import ObjectId
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            return {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
                "role": user.get("role", "user")
            }
        return None
    except Exception as e:
        print(f"⚠️ Failed to get user: {e}")
        return None


def update_user_role(user_id: str, new_role: str) -> Dict[str, Any]:
    """
    Update user's role (admin only).
    
    Args:
        user_id: User's ID
        new_role: New role (user, admin, seller)
        
    Returns:
        Result dict with status
    """
    if new_role not in ["user", "admin", "seller"]:
        return {"status": "error", "message": "Invalid role"}
    
    users_collection = get_users_collection()
    if users_collection is None:
        return {"status": "error", "message": "Database not connected"}
    
    try:
        from bson import ObjectId
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": new_role, "updated_at": datetime.now()}}
        )
        
        if result.modified_count > 0:
            print(f"✅ User role updated to: {new_role}")
            return {"status": "success", "message": f"Role updated to {new_role}"}
        return {"status": "error", "message": "User not found"}
    except Exception as e:
        print(f"❌ Failed to update role: {e}")
        return {"status": "error", "message": "Failed to update role"}


# ============================================
# JWT-BASED AUTHENTICATION (Web)
# ============================================

def _validate_phone(phone: str) -> bool:
    """Validate phone number has at least 10 digits."""
    digits = re.sub(r"\D", "", phone or "")
    return len(digits) >= 10


def create_jwt_token(user_id: str, email: str) -> str:
    """Create a JWT token for web authentication."""
    if not jwt:
        raise HTTPException(status_code=500, detail="JWT not configured (install python-jose[cryptography])")
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _init_firebase_admin() -> bool:
    """Initialize Firebase Admin SDK if configured."""
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
    """Verify Firebase ID token."""
    if not _init_firebase_admin() or not firebase_auth:
        raise HTTPException(status_code=500, detail="Firebase auth not configured")
    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user_web(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get current user from JWT or Firebase token (for web frontend)."""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    db = get_db()

    # Try Firebase auth first
    if _init_firebase_admin():
        try:
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
        except HTTPException:
            raise
        except:
            pass  # Fall through to JWT auth

    # Fall back to JWT auth
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
        from bson import ObjectId
        user = db["users"].find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin_user(user=Depends(get_current_user_web)):
    """Dependency to require admin role."""
    role = (user.get("role") or "user").strip().lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user


def require_seller_user(user=Depends(get_current_user_web)):
    """Dependency to require seller role."""
    role = (user.get("role") or "user").strip().lower()
    if role != "seller":
        raise HTTPException(status_code=403, detail="Sellers only")
    return user


# Pydantic models for web auth endpoints
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


def register_user_web(body: RegisterBody) -> Dict[str, Any]:
    """Register a new user (web frontend)."""
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

    hashed = hash_password(password)
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

    # Try to send verification email
    try:
        from .email_sender import send_verification_email
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        verification_link = f"{frontend_url}/verify-email?token={email_verify_token}&user_id={user_id}"
        send_verification_email(email, name, verification_link)
    except Exception as e:
        print(f"[WARNING] Failed to send verification email to {email}: {str(e)}")

    token = create_jwt_token(user_id, email)
    return {
        "token": token,
        "user": {"id": user_id, "name": name, "email": email, "role": requested_role},
        "message": "Account created successfully. Please check your email to verify your account."
    }


def login_user_web(body: LoginBody) -> Dict[str, Any]:
    """Login user (web frontend)."""
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

    # Check if user is inactive
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact support.")

    stored_hash = user.get("password_hash")
    if not stored_hash or not verify_password(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = (user.get("role") or "user").strip().lower()
    if role == "admin" and admin_code != ADMIN_CODE:
        raise HTTPException(status_code=401, detail="Admin code is required")

    user_id = str(user["_id"])
    name = user.get("name") or email.split("@")[0]
    token = create_jwt_token(user_id, email)
    return {
        "token": token,
        "user": {"id": user_id, "name": name, "email": email, "role": role},
    }


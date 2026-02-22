"""
Authentication Module
=====================
Handles user registration, login, logout, and token management.
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from .config import get_users_collection, get_sessions_collection


# ============================================
# PASSWORD HASHING
# ============================================

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt."""
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}:{password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, password_hash = stored_hash.split(":")
        new_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return new_hash == password_hash
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

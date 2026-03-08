"""
Ecommerce Module
================
Routes for product catalog, cart, wishlist, and orders.
Merged from daingGraderWeb backend.
"""

import io
import re
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
import cloudinary
import cloudinary.uploader
from better_profanity import profanity

from .config import get_db
from .auth import get_current_user_web, require_seller_user
from .order_receipt import build_receipt_pdf_bytes

router = APIRouter()


# ============================================
# BAD WORDS FILTER
# ============================================

# Add custom Filipino bad words to the profanity filter
CUSTOM_BAD_WORDS = [
    "puta", "gago", "tangina", "bobo", "tanga", "putangina", "leche", "tarantado",
    "ulol", "inutil", "hayop", "pakyu", "kupal"
]
profanity.add_censor_words(CUSTOM_BAD_WORDS)


def _censor_bad_words(text: str) -> str:
    """Replace bad words with asterisks using better-profanity."""
    if not text:
        return text
    return profanity.censor(text)


# ============================================
# HELPER FUNCTIONS
# ============================================

def _get_products_collection():
    """Return products collection from MongoDB."""
    try:
        return get_db()["products"]
    except Exception:
        return None


def _get_categories_collection():
    """Return product_categories collection from MongoDB."""
    try:
        return get_db()["product_categories"]
    except Exception:
        return None


def _get_reviews_collection():
    """Return product_reviews collection from MongoDB."""
    try:
        return get_db()["product_reviews"]
    except Exception:
        return None


def _get_wishlist_collection():
    """Return wishlists collection from MongoDB."""
    try:
        return get_db()["wishlists"]
    except Exception:
        return None


def _get_cart_collection():
    """Return carts collection from MongoDB."""
    try:
        return get_db()["carts"]
    except Exception:
        return None


def _get_orders_collection():
    """Return orders collection from MongoDB."""
    try:
        return get_db()["orders"]
    except Exception:
        return None


def _get_users_collection():
    """Return users collection from MongoDB."""
    try:
        return get_db()["users"]
    except Exception:
        return None


def _get_audit_logs_collection():
    """Return audit_logs collection from MongoDB."""
    try:
        return get_db()["audit_logs"]
    except Exception:
        return None


def _normalize_product(doc: dict) -> dict:
    """Normalize a product document for API response."""
    return {
        "id": str(doc.get("_id")),
        "seller_id": doc.get("seller_id", ""),
        "seller_name": doc.get("seller_name", ""),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "price": doc.get("price", 0),
        "category_id": str(doc.get("category_id")) if doc.get("category_id") else None,
        "category_name": doc.get("category_name", ""),
        "stock_qty": doc.get("stock_qty", 0),
        "status": doc.get("status", "available"),
        "grade": doc.get("grade", "export"),
        "images": doc.get("images", []),
        "main_image_index": doc.get("main_image_index", 0),
        "is_disabled": doc.get("is_disabled", False),
        "sold_count": doc.get("sold_count", 0),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


def _normalize_category(doc: dict) -> dict:
    """Normalize a category document for API response."""
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name", ""),
        "description": doc.get("description", ""),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


def _normalize_order(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize an order document for API response."""
    return {
        "id": str(doc.get("_id")),
        "order_number": doc.get("order_number", ""),
        "seller_id": doc.get("seller_id", ""),
        "seller_name": doc.get("seller_name", ""),
        "status": doc.get("status", ""),
        "total": doc.get("total", 0),
        "total_items": doc.get("total_items", 0),
        "payment_method": doc.get("payment_method", ""),
        "payment_status": doc.get("payment_status", "completed"),
        "payment_intent_id": doc.get("payment_intent_id", None),
        "paid_at": doc.get("paid_at", None),
        "address": doc.get("address", {}),
        "items": doc.get("items", []),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def _get_current_user_from_header(authorization: Optional[str] = Header(None)):
    """Get current user from Authorization header.
    
    Supports multiple auth methods:
    1. Session tokens (mobile app)
    2. Firebase ID tokens (web with Firebase auth)
    3. JWT tokens (web fallback)
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    from .auth import (
        _init_firebase_admin, _verify_firebase_token, 
        JWT_SECRET, JWT_ALGORITHM, 
        validate_session, get_user_by_id
    )
    from jose import jwt as jose_jwt
    
    db = get_db()
    user = None
    
    # Try session-based auth first (mobile app)
    session = validate_session(token)
    if session:
        user_data = get_user_by_id(session["user_id"])
        if user_data:
            # Return the full user document from database for consistency
            user = db["users"].find_one({"_id": ObjectId(session["user_id"])})
    
    # Try Firebase auth if session auth failed
    if not user and _init_firebase_admin():
        try:
            decoded = _verify_firebase_token(token)
            firebase_uid = decoded.get("uid")
            email = (decoded.get("email") or "").strip().lower()
            
            if firebase_uid:
                user = db["users"].find_one({"firebase_uid": firebase_uid})
            if not user and email:
                user = db["users"].find_one({"email": email})
        except:
            pass
    
    # Fall back to JWT auth
    if not user:
        try:
            payload = jose_jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = db["users"].find_one({"_id": ObjectId(user_id)})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return user


# Alias for convenience
_get_current_user = _get_current_user_from_header


async def _require_seller(authorization: Optional[str] = Header(None)):
    """Require seller role."""
    user = await _get_current_user_from_header(authorization)
    role = (user.get("role") or "user").strip().lower()
    if role != "seller":
        raise HTTPException(status_code=403, detail="Sellers only")
    return user


# ============================================
# PYDANTIC MODELS
# ============================================

class AddToCartBody(BaseModel):
    product_id: str
    qty: int = 1


class OrderAddressBody(BaseModel):
    full_name: str
    phone: str
    address_line: str
    city: str
    province: str
    postal_code: str
    notes: Optional[str] = ""


class OrderCreateBody(BaseModel):
    address: OrderAddressBody
    payment_method: str
    seller_id: Optional[str] = None
    voucher_id: Optional[str] = None


class CategoryCreateBody(BaseModel):
    name: str
    description: Optional[str] = ""


class CategoryUpdateBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class ProductCreateBody(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category_id: Optional[str] = None
    stock_qty: int = 0
    status: str = "available"
    grade: str = "export"


class ProductUpdateBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    stock_qty: Optional[int] = None
    status: Optional[str] = None
    grade: Optional[str] = None
    main_image_index: Optional[int] = None


# ============================================
# CATALOG ROUTES (Public)
# ============================================

@router.get("/catalog/categories")
def get_catalog_categories():
    """Get all product categories."""
    collection = _get_categories_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    docs = list(collection.find({}).sort("name", 1))
    return {"status": "success", "categories": [_normalize_category(d) for d in docs]}


@router.get("/catalog/sellers")
def get_catalog_sellers():
    """Get all sellers with products."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    pipeline = [
        {"$match": {"is_disabled": {"$ne": True}, "status": "available"}},
        {"$group": {
            "_id": "$seller_id",
            "name": {"$first": "$seller_name"},
            "product_count": {"$sum": 1},
            "total_sold": {"$sum": {"$ifNull": ["$sold_count", 0]}},
        }},
        {"$sort": {"name": 1}},
    ]
    sellers = []
    for item in collection.aggregate(pipeline):
        sellers.append({
            "id": item.get("_id", ""),
            "name": item.get("name", ""),
            "product_count": item.get("product_count", 0),
            "total_sold": item.get("total_sold", 0),
        })
    return {"status": "success", "sellers": sellers}


@router.get("/catalog/sellers/{seller_id}")
def get_seller_store_profile(seller_id: str):
    """Get seller store profile with stats."""
    try:
        products_collection = _get_products_collection()
        users_collection = _get_users_collection()
        if products_collection is None:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Try to find seller user
        seller_user = None
        if users_collection:
            try:
                seller_user = users_collection.find_one({"_id": ObjectId(seller_id), "role": "seller"})
            except:
                pass
        
        # Get seller stats from products
        pipeline = [
            {"$match": {"seller_id": seller_id, "is_disabled": {"$ne": True}, "status": "available"}},
            {"$group": {
                "_id": "$seller_id",
                "name": {"$first": "$seller_name"},
                "product_count": {"$sum": 1},
                "total_sold": {"$sum": {"$ifNull": ["$sold_count", 0]}},
            }},
        ]
        stats = list(products_collection.aggregate(pipeline))
        
        if not stats:
            raise HTTPException(status_code=404, detail="Seller not found or has no products")
        
        seller_stats = stats[0]
        
        joined_at = None
        if seller_user and seller_user.get("created_at"):
            created_val = seller_user.get("created_at")
            try:
                if isinstance(created_val, datetime):
                    joined_at = created_val.isoformat()
                else:
                    joined_at = str(created_val)
            except:
                joined_at = str(created_val)

        return {
            "status": "success",
            "seller": {
                "id": seller_id,
                "name": seller_stats.get("name", "Unknown Seller"),
                "avatar_url": seller_user.get("avatar_url") if seller_user else None,
                "bio": seller_user.get("bio") if seller_user else None,
                "joined_at": joined_at,
                "product_count": seller_stats.get("product_count", 0),
                "total_sold": seller_stats.get("total_sold", 0),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/catalog/products")
def get_catalog_products(
    search: str = "",
    category_id: str = "",
    seller_id: str = "",
    sort: str = "latest",
    page: int = 1,
    page_size: int = 12,
):
    """Get products catalog with filtering and pagination."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    query: Dict[str, Any] = {"is_disabled": {"$ne": True}, "status": "available"}
    if search:
        # Search by name or seller_name
        search_conditions = [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"seller_name": {"$regex": re.escape(search), "$options": "i"}},
        ]
        # Also try to search by price if search is a number
        try:
            price_value = float(search.replace(",", "").replace("₱", "").strip())
            search_conditions.append({"price": price_value})
        except (ValueError, AttributeError):
            pass  # Not a valid price, skip price search
        query["$or"] = search_conditions
    if category_id:
        try:
            query["category_id"] = ObjectId(category_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid category ID")
    if seller_id:
        query["seller_id"] = seller_id

    sort_fields = [("created_at", -1)]
    if sort == "most_sold":
        sort_fields = [("sold_count", -1), ("created_at", -1)]
    elif sort == "price_low":
        sort_fields = [("price", 1)]
    elif sort == "price_high":
        sort_fields = [("price", -1)]

    total = collection.count_documents(query)
    docs = list(
        collection.find(query)
        .sort(sort_fields)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "status": "success",
        "products": [_normalize_product(d) for d in docs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/catalog/products/{product_id}")
def get_catalog_product_detail(product_id: str):
    """Get detailed product information."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "is_disabled": {"$ne": True}, "status": "available"})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "product": _normalize_product(doc)}


# ============================================
# WISHLIST ROUTES
# ============================================

@router.get("/wishlist")
async def get_user_wishlist(user=Depends(_get_current_user_from_header)):
    """Get the current user's wishlist with product details."""
    wishlist_collection = _get_wishlist_collection()
    products_collection = _get_products_collection()
    if wishlist_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
    
    if not wishlist_doc or not wishlist_doc.get("product_ids"):
        return {"status": "success", "products": [], "total": 0}
    
    product_ids = []
    for pid in wishlist_doc.get("product_ids", []):
        try:
            product_ids.append(ObjectId(pid))
        except:
            pass
    
    products = list(products_collection.find({
        "_id": {"$in": product_ids},
        "is_disabled": {"$ne": True},
        "status": "available"
    }))
    
    return {
        "status": "success",
        "products": [_normalize_product(p) for p in products],
        "total": len(products),
    }


@router.post("/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, user=Depends(_get_current_user_from_header)):
    """Add or remove a product from the user's wishlist."""
    wishlist_collection = _get_wishlist_collection()
    products_collection = _get_products_collection()
    if wishlist_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user_id = str(user.get("_id"))
    wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
    
    if not wishlist_doc:
        wishlist_collection.insert_one({
            "user_id": user_id,
            "product_ids": [product_id],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        })
        return {"status": "success", "in_wishlist": True, "message": "Added to wishlist"}
    
    product_ids = wishlist_doc.get("product_ids", [])
    
    if product_id in product_ids:
        product_ids.remove(product_id)
        wishlist_collection.update_one(
            {"user_id": user_id},
            {"$set": {"product_ids": product_ids, "updated_at": datetime.now().isoformat()}}
        )
        return {"status": "success", "in_wishlist": False, "message": "Removed from wishlist"}
    else:
        product_ids.append(product_id)
        wishlist_collection.update_one(
            {"user_id": user_id},
            {"$set": {"product_ids": product_ids, "updated_at": datetime.now().isoformat()}}
        )
        return {"status": "success", "in_wishlist": True, "message": "Added to wishlist"}


@router.get("/wishlist/check/{product_id}")
async def check_wishlist(product_id: str, user=Depends(_get_current_user_from_header)):
    """Check if a product is in the user's wishlist."""
    wishlist_collection = _get_wishlist_collection()
    if wishlist_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
    
    in_wishlist = wishlist_doc and product_id in wishlist_doc.get("product_ids", [])
    return {"status": "success", "in_wishlist": in_wishlist}


@router.get("/wishlist/ids")
async def get_wishlist_ids(user=Depends(_get_current_user_from_header)):
    """Get just the product IDs in the user's wishlist."""
    wishlist_collection = _get_wishlist_collection()
    if wishlist_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
    
    product_ids = wishlist_doc.get("product_ids", []) if wishlist_doc else []
    return {"status": "success", "product_ids": product_ids}


# ============================================
# CART ROUTES
# ============================================

@router.get("/cart")
async def get_cart(user=Depends(_get_current_user_from_header)):
    """Return the current user's cart with product details."""
    cart_collection = _get_cart_collection()
    products_collection = _get_products_collection()
    if cart_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc or not cart_doc.get("items"):
        return {"status": "success", "items": [], "total_items": 0}

    items = []
    product_ids = []
    for it in cart_doc.get("items", []):
        try:
            product_ids.append(ObjectId(it.get("product_id")))
        except:
            pass

    products = list(products_collection.find({"_id": {"$in": product_ids}}))
    products_map = {str(p.get("_id")): p for p in products}

    for it in cart_doc.get("items", []):
        pid = it.get("product_id")
        prod = products_map.get(pid)
        if not prod:
            continue
        items.append({
            "product": _normalize_product(prod),
            "qty": int(it.get("qty", 1)),
        })

    total_items = sum(i.get("qty", 1) for i in cart_doc.get("items", []))
    return {"status": "success", "items": items, "total_items": total_items}


@router.post("/cart/add")
async def add_to_cart(body: AddToCartBody, user=Depends(_get_current_user_from_header)):
    """Add a product to the user's cart."""
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only regular users can add to cart")

    cart_collection = _get_cart_collection()
    products_collection = _get_products_collection()
    if cart_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        product = products_collection.find_one({"_id": ObjectId(body.product_id), "is_disabled": {"$ne": True}, "status": "available"})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if body.qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc:
        cart_collection.insert_one({
            "user_id": user_id,
            "items": [{"product_id": body.product_id, "qty": int(body.qty), "added_at": datetime.now().isoformat()}],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
        })
        return {"status": "success", "message": "Added to cart", "in_cart": True}

    items = cart_doc.get("items", [])
    found = False
    for it in items:
        if it.get("product_id") == body.product_id:
            it["qty"] = int(it.get("qty", 1)) + int(body.qty)
            found = True
            break

    if not found:
        items.append({"product_id": body.product_id, "qty": int(body.qty), "added_at": datetime.now().isoformat()})

    cart_collection.update_one({"user_id": user_id}, {"$set": {"items": items, "updated_at": datetime.now().isoformat()}})
    return {"status": "success", "message": "Added to cart", "in_cart": True}


@router.patch("/cart/{product_id}")
async def update_cart_item(product_id: str, body: dict, user=Depends(_get_current_user_from_header)):
    """Update the quantity of an item in the cart."""
    cart_collection = _get_cart_collection()
    if cart_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    qty = body.get("qty")
    if qty is None or not isinstance(qty, int) or qty < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = cart_doc.get("items", [])
    found = False
    for it in items:
        if it.get("product_id") == product_id:
            it["qty"] = int(qty)
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Product not found in cart")

    cart_collection.update_one({"user_id": user_id}, {"$set": {"items": items, "updated_at": datetime.now().isoformat()}})
    return {"status": "success", "message": "Cart updated"}


@router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, user=Depends(_get_current_user_from_header)):
    """Remove an item from the cart."""
    cart_collection = _get_cart_collection()
    if cart_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc:
        raise HTTPException(status_code=404, detail="Cart not found")

    items = cart_doc.get("items", [])
    items = [it for it in items if it.get("product_id") != product_id]

    cart_collection.update_one({"user_id": user_id}, {"$set": {"items": items, "updated_at": datetime.now().isoformat()}})
    return {"status": "success", "message": "Item removed from cart"}


# ============================================
# ORDER ROUTES
# ============================================

@router.post("/orders/checkout")
async def checkout_order(body: OrderCreateBody, user=Depends(_get_current_user_from_header)):
    """Create an order from the current user's cart."""
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only regular users can place orders")

    cart_collection = _get_cart_collection()
    orders_collection = _get_orders_collection()
    products_collection = _get_products_collection()
    vouchers_collection = _get_vouchers_collection()
    if cart_collection is None or orders_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc or not cart_doc.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Validate voucher if provided
    voucher = None
    voucher_discount = 0.0
    voucher_discount_type = None
    voucher_seller_id = None  # Track if this is a seller-specific voucher
    if body.voucher_id and vouchers_collection is not None:
        try:
            voucher = vouchers_collection.find_one({"_id": ObjectId(body.voucher_id), "active": True})
            if voucher:
                # Check expiration
                if voucher.get("expiration_date") and voucher["expiration_date"] <= datetime.utcnow():
                    voucher = None
                # Check max uses
                elif voucher.get("max_uses") and voucher.get("current_uses", 0) >= voucher["max_uses"]:
                    voucher = None
                # Check per user limit
                elif voucher.get("per_user_limit"):
                    user_usage = next(
                        (u["used_count"] for u in voucher.get("used_by", []) if u["user_id"] == user_id),
                        0
                    )
                    if user_usage >= voucher["per_user_limit"]:
                        voucher = None
                # Track seller_id for seller-specific vouchers
                if voucher:
                    voucher_seller_id = str(voucher.get("seller_id", "")) if voucher.get("seller_id") else None
        except:
            voucher = None

    seller_filter = (body.seller_id or "").strip()
    product_ids = []
    for it in cart_doc.get("items", []):
        try:
            product_ids.append(ObjectId(it.get("product_id")))
        except:
            pass

    products = list(products_collection.find({"_id": {"$in": product_ids}}))
    products_map = {str(p.get("_id")): p for p in products}

    seller_groups: Dict[str, Dict[str, Any]] = {}
    for it in cart_doc.get("items", []):
        pid = it.get("product_id")
        prod = products_map.get(pid)
        if not prod:
            continue
        if seller_filter and str(prod.get("seller_id", "")) != seller_filter:
            continue
        qty = int(it.get("qty", 1))
        price = float(prod.get("price", 0))
        seller_id = str(prod.get("seller_id", ""))
        seller_name = (prod.get("seller_name") or "").strip()

        images = prod.get("images", [])
        image_url = ""
        if images and isinstance(images, list):
            idx = int(prod.get("main_image_index", 0) or 0)
            if idx < len(images):
                image_url = images[idx].get("url", "") if isinstance(images[idx], dict) else ""

        if seller_id not in seller_groups:
            seller_groups[seller_id] = {
                "seller_id": seller_id,
                "seller_name": seller_name,
                "items": [],
                "total": 0.0,
                "total_items": 0,
            }

        seller_groups[seller_id]["items"].append({
            "product_id": pid,
            "seller_id": seller_id,
            "seller_name": seller_name,
            "name": prod.get("name", ""),
            "price": price,
            "qty": qty,
            "image_url": image_url,
        })
        seller_groups[seller_id]["total"] += price * qty
        seller_groups[seller_id]["total_items"] += qty

    if seller_filter and not seller_groups:
        raise HTTPException(status_code=400, detail="No items found for the selected seller")

    now = datetime.utcnow().isoformat()
    created_orders: List[Dict[str, Any]] = []

    # Calculate total across all seller groups for voucher application
    # If this is a seller voucher, only count items from that seller
    if voucher_seller_id:
        # Seller voucher - only apply to that seller's items
        applicable_total = seller_groups.get(voucher_seller_id, {}).get("total", 0)
    else:
        # Admin/global voucher - apply to all items
        applicable_total = sum(group.get("total", 0) for group in seller_groups.values())
    
    # For grand_total, always use all items (used for proportional distribution)
    grand_total = sum(group.get("total", 0) for group in seller_groups.values())
    
    # Calculate voucher discount if voucher is valid
    if voucher:
        # Check minimum order amount (against applicable total for seller vouchers)
        check_total = applicable_total if voucher_seller_id else grand_total
        if voucher.get("min_order_amount") and check_total < voucher["min_order_amount"]:
            voucher = None  # Don't apply voucher if minimum not met
        else:
            voucher_discount_type = voucher.get("discount_type", "fixed")
            if voucher_discount_type == "percentage":
                voucher_discount = applicable_total * (voucher.get("value", 0) / 100)
            else:
                voucher_discount = min(voucher.get("value", 0), applicable_total)  # Don't exceed order total

    for seller_id, group in seller_groups.items():
        order_number = f"ORD-{datetime.utcnow().strftime('%y%m%d')}-{str(ObjectId())[-6:].upper()}"
        
        if body.payment_method.lower() == "cod":
            order_status = "confirmed"
            payment_status = "completed"
            paid_at = now
        else:
            order_status = "pending"
            payment_status = "pending"
            paid_at = None
        
        # Calculate voucher discount for this order
        order_subtotal = float(group.get("total", 0))
        order_voucher_discount = 0.0
        
        if voucher:
            if voucher_seller_id:
                # Seller voucher - only apply to that specific seller's order
                if seller_id == voucher_seller_id:
                    order_voucher_discount = voucher_discount  # Full discount goes to this seller's order
            else:
                # Admin/global voucher - distribute proportionally across all orders
                if grand_total > 0:
                    order_voucher_discount = (order_subtotal / grand_total) * voucher_discount
        
        order_doc = {
            "user_id": user_id,
            "seller_id": group.get("seller_id", ""),
            "seller_name": group.get("seller_name", ""),
            "order_number": order_number,
            "status": order_status,
            "subtotal": order_subtotal,
            "discount": order_voucher_discount,
            "total": max(0, order_subtotal - order_voucher_discount),
            "total_items": int(group.get("total_items", 0)),
            "payment_method": body.payment_method,
            "payment_status": payment_status,
            "paid_at": paid_at,
            "address": body.address.dict(),
            "items": group.get("items", []),
            "voucher_id": str(voucher["_id"]) if voucher else None,
            "voucher_code": voucher.get("code") if voucher else None,
            "created_at": now,
            "updated_at": now,
        }
        result = orders_collection.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        created_orders.append(order_doc)

    # Update voucher usage if used
    if voucher and vouchers_collection is not None:
        try:
            # Update current_uses
            vouchers_collection.update_one(
                {"_id": voucher["_id"]},
                {
                    "$inc": {"current_uses": 1},
                    "$push": {
                        "used_by": {
                            "$each": [{"user_id": user_id, "used_count": 1, "used_at": now}]
                        }
                    }
                }
            )
            # Also update if user already in used_by
            vouchers_collection.update_one(
                {"_id": voucher["_id"], "used_by.user_id": user_id},
                {"$inc": {"used_by.$.used_count": 1}}
            )
        except:
            pass

    # Clear cart after successful order
    if seller_filter:
        remaining_items = []
        for it in cart_doc.get("items", []):
            pid = it.get("product_id")
            prod = products_map.get(pid)
            if not prod:
                continue
            if str(prod.get("seller_id", "")) != seller_filter:
                remaining_items.append(it)
        cart_collection.update_one({"user_id": user_id}, {"$set": {"items": remaining_items, "updated_at": now}})
    else:
        cart_collection.update_one({"user_id": user_id}, {"$set": {"items": [], "updated_at": now}})

    order_payloads = [_normalize_order(doc) for doc in created_orders]

    return {
        "status": "success",
        "orders": order_payloads,
        "order_ids": [o.get("id") for o in order_payloads],
        "order": order_payloads[0] if order_payloads else None,
    }


@router.get("/orders")
async def get_orders(page: int = 1, page_size: int = 10, user=Depends(_get_current_user_from_header)):
    """Get current user's orders."""
    orders_collection = _get_orders_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    user_id = str(user.get("_id"))
    total = orders_collection.count_documents({"user_id": user_id})
    docs = list(
        orders_collection.find({"user_id": user_id})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    return {"status": "success", "orders": [_normalize_order(d) for d in docs], "total": total}


@router.get("/orders/seller")
async def get_seller_orders(page: int = 1, page_size: int = 10, user=Depends(_require_seller)):
    """Get orders for seller's products."""
    print(f"[get_seller_orders] Called with page={page}, page_size={page_size}, user_id={user.get('_id') if user else None}")
    try:
        orders_collection = _get_orders_collection()
        products_collection = _get_products_collection()
        if orders_collection is None or products_collection is None:
            print("[get_seller_orders] Database not configured")
            raise HTTPException(status_code=500, detail="Database not configured")
        if page < 1 or page_size < 1 or page_size > 50:
            print(f"[get_seller_orders] Invalid pagination: page={page}, page_size={page_size}")
            raise HTTPException(status_code=400, detail="Invalid pagination parameters")

        seller_id = str(user.get("_id"))
        
        # Find all products belonging to this seller
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
        seller_product_ids = {str(p.get("_id")) for p in seller_products}
        
        if not seller_product_ids:
            return {"status": "success", "orders": [], "total": 0}
        
        # Find all orders that contain at least one of the seller's products
        all_orders = list(orders_collection.find({}).sort("created_at", -1))
        matching_orders = []
        
        for doc in all_orders:
            items = doc.get("items", [])
            seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
            if seller_items:
                matching_orders.append(doc)
        
        total = len(matching_orders)
        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_orders = matching_orders[start:end]
        
        # Format orders for response
        formatted_orders = []
        for doc in paginated_orders:
            items = doc.get("items", [])
            seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
            seller_total = sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
            order_obj = _normalize_order(doc)
            formatted_orders.append({
                "id": order_obj.get("id"),
                "order_number": order_obj.get("order_number", order_obj.get("id")),
                "customer": order_obj.get("address", {}).get("full_name", "Customer"),
                "total": seller_total,
                "status": order_obj.get("status", "pending"),
                "created_at": order_obj.get("created_at"),
                "items": seller_items
            })
        
        return {"status": "success", "orders": formatted_orders, "total": total}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_seller_orders: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/orders/{order_id}")
async def get_order_by_id(order_id: str, user=Depends(_get_current_user_from_header)):
    """Get a single order by ID."""
    orders_collection = _get_orders_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    doc = orders_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    user_id = str(user.get("_id"))
    role = (user.get("role") or "user").strip().lower()
    
    # Allow access if user owns the order, is the seller, or is admin
    if doc.get("user_id") != user_id and doc.get("seller_id") != user_id and role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    return {"status": "success", "order": _normalize_order(doc)}


@router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user=Depends(_get_current_user_from_header)):
    """Cancel an order (customer only)."""
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only regular users can cancel orders")

    orders_collection = _get_orders_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    doc = orders_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    user_id = str(user.get("_id"))
    if doc.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not your order")

    current_status = (doc.get("status") or "").strip().lower()
    if current_status not in ["pending", "confirmed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel order with status '{current_status}'"
        )

    now = datetime.utcnow().isoformat()
    orders_collection.update_one(
        {"_id": oid},
        {"$set": {"status": "cancelled", "updated_at": now}}
    )

    updated = orders_collection.find_one({"_id": oid})
    return {"status": "success", "order": _normalize_order(updated)}


class OrderStatusUpdateBody(BaseModel):
    status: str


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: str, body: OrderStatusUpdateBody, user=Depends(_require_seller)):
    """Update order status (seller only - can set: confirmed, shipped, cancelled)."""
    orders_collection = _get_orders_collection()
    products_collection = _get_products_collection()
    if orders_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    status = (body.status or "").strip().lower()
    if status not in {"confirmed", "shipped", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status value. Sellers can only set: confirmed, shipped, cancelled")

    doc = orders_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    seller_id = str(user.get("_id"))
    seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
    seller_product_ids = {str(p.get("_id")) for p in seller_products}
    if not seller_product_ids:
        raise HTTPException(status_code=403, detail="No seller products found")

    items = doc.get("items", [])
    if not any(it.get("product_id") in seller_product_ids for it in items):
        raise HTTPException(status_code=403, detail="No order items belong to this seller")

    updates: Dict[str, Any] = {"status": status, "updated_at": datetime.utcnow().isoformat()}

    # Deduct stock when shipped/delivered
    deducted_sellers = set(doc.get("stock_deducted_sellers", []))
    if status in {"shipped", "delivered"} and seller_id not in deducted_sellers:
        for it in items:
            pid = it.get("product_id")
            if pid not in seller_product_ids:
                continue
            try:
                prod_oid = ObjectId(pid)
            except:
                continue
            product = products_collection.find_one({"_id": prod_oid})
            if not product:
                continue
            qty = int(it.get("qty", 1))
            current_stock = int(product.get("stock_qty", 0))
            new_stock = max(0, current_stock - qty)
            products_collection.update_one(
                {"_id": prod_oid},
                {
                    "$set": {"stock_qty": new_stock, "updated_at": datetime.utcnow().isoformat()},
                    "$inc": {"sold_count": qty},
                },
            )
        deducted_sellers.add(seller_id)
        updates["stock_deducted_sellers"] = list(deducted_sellers)

    orders_collection.update_one({"_id": oid}, {"$set": updates})
    updated = orders_collection.find_one({"_id": oid})

    return {"status": "success", "order": _normalize_order(updated)}


@router.patch("/orders/{order_id}/mark-delivered")
async def mark_order_delivered(order_id: str, user=Depends(_get_current_user_from_header)):
    """Allow users to mark shipped orders as delivered when they receive them."""
    orders_collection = _get_orders_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    user_id = str(user.get("_id"))
    doc = orders_collection.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    current_status = (doc.get("status") or "").strip().lower()
    if current_status != "shipped":
        raise HTTPException(status_code=400, detail="Only shipped orders can be marked as delivered")

    updates = {
        "status": "delivered",
        "updated_at": datetime.utcnow().isoformat(),
        "delivered_at": datetime.utcnow().isoformat()
    }

    orders_collection.update_one({"_id": oid}, {"$set": updates})
    updated = orders_collection.find_one({"_id": oid})

    return {"status": "success", "order": _normalize_order(updated)}


@router.get("/orders/{order_id}/receipt.pdf")
async def get_order_receipt_pdf(order_id: str, user=Depends(_get_current_user_from_header)):
    """Download order receipt as PDF. Users can download their own orders, sellers can download orders containing their products."""
    orders_collection = _get_orders_collection()
    products_collection = _get_products_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    user_id = str(user.get("_id"))
    role = (user.get("role") or "user").strip().lower()

    doc = orders_collection.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")

    # Permission check
    if role == "user":
        if doc.get("user_id") != user_id:
            raise HTTPException(status_code=404, detail="Order not found")
    elif role == "seller":
        if products_collection is None:
            raise HTTPException(status_code=500, detail="Database not configured")
        seller_products = list(products_collection.find({"seller_id": user_id}, {"_id": 1}))
        seller_product_ids = {str(p.get("_id")) for p in seller_products}
        items = doc.get("items", [])
        if str(doc.get("seller_id", "")) != user_id and not any(it.get("product_id") in seller_product_ids for it in items):
            raise HTTPException(status_code=404, detail="Order not found")

    order_payload = _normalize_order(doc)
    pdf_bytes = build_receipt_pdf_bytes(order_payload)
    filename = f"receipt-{order_payload.get('order_number', order_id)}.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


# ============================================
# SELLER PRODUCT ROUTES
# ============================================

@router.get("/seller/products")
async def get_seller_products(
    search: str = "",
    page: int = 1,
    page_size: int = 20,
    user=Depends(_require_seller)
):
    """Get seller's own products."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    seller_id = str(user.get("_id"))
    query: Dict[str, Any] = {"seller_id": seller_id}
    if search:
        query["name"] = {"$regex": re.escape(search), "$options": "i"}

    total = collection.count_documents(query)
    docs = list(
        collection.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    return {
        "status": "success",
        "products": [_normalize_product(d) for d in docs],
        "total": total,
    }


@router.get("/seller/products/{product_id}")
async def get_seller_product(product_id: str, user=Depends(_require_seller)):
    """Get a specific product owned by the seller."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": str(user.get("_id"))})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"status": "success", "product": _normalize_product(doc)}


@router.post("/seller/products")
async def create_seller_product(body: ProductCreateBody, user=Depends(_require_seller)):
    """Create a new product."""
    collection = _get_products_collection()
    categories_collection = _get_categories_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    name = (body.name or "").strip()
    if not name or len(name) < 2:
        raise HTTPException(status_code=400, detail="Product name must be at least 2 characters")
    if body.price < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    category_name = ""
    category_id = None
    if body.category_id and categories_collection is not None:
        try:
            cat = categories_collection.find_one({"_id": ObjectId(body.category_id)})
            if cat:
                category_name = cat.get("name", "")
                category_id = ObjectId(body.category_id)
        except:
            pass

    now = datetime.utcnow().isoformat()
    doc = {
        "seller_id": str(user.get("_id")),
        "seller_name": user.get("name", ""),
        "name": name,
        "description": (body.description or "").strip(),
        "price": float(body.price),
        "category_id": category_id,
        "category_name": category_name,
        "stock_qty": int(body.stock_qty),
        "status": body.status or "available",
        "grade": body.grade if body.grade in ["export", "local"] else "export",
        "images": [],
        "main_image_index": 0,
        "is_disabled": False,
        "sold_count": 0,
        "created_at": now,
        "updated_at": now,
    }

    result = collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"status": "success", "product": _normalize_product(doc)}


@router.patch("/seller/products/{product_id}")
async def update_seller_product(product_id: str, body: ProductUpdateBody, user=Depends(_require_seller)):
    """Update a product."""
    collection = _get_products_collection()
    categories_collection = _get_categories_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": seller_id})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}

    if body.name is not None:
        name = body.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Product name must be at least 2 characters")
        updates["name"] = name
    if body.description is not None:
        updates["description"] = body.description.strip()
    if body.price is not None:
        if body.price < 0:
            raise HTTPException(status_code=400, detail="Price cannot be negative")
        updates["price"] = float(body.price)
    if body.stock_qty is not None:
        updates["stock_qty"] = int(body.stock_qty)
    if body.status is not None:
        updates["status"] = body.status
    if body.grade is not None:
        if body.grade in ["export", "local"]:
            updates["grade"] = body.grade
    if body.main_image_index is not None:
        updates["main_image_index"] = int(body.main_image_index)
    if body.category_id is not None and categories_collection is not None:
        try:
            cat = categories_collection.find_one({"_id": ObjectId(body.category_id)})
            if cat:
                updates["category_id"] = ObjectId(body.category_id)
                updates["category_name"] = cat.get("name", "")
        except:
            pass

    collection.update_one({"_id": ObjectId(product_id)}, {"$set": updates})
    updated_doc = collection.find_one({"_id": ObjectId(product_id)})
    return {"status": "success", "product": _normalize_product(updated_doc)}


@router.post("/seller/products/{product_id}/disable")
async def toggle_product_disabled(product_id: str, body: dict, user=Depends(_require_seller)):
    """Enable or disable a product."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": seller_id})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    disabled = bool(body.get("disabled", False))
    collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"is_disabled": disabled, "updated_at": datetime.utcnow().isoformat()}}
    )
    return {"status": "success", "is_disabled": disabled}


@router.delete("/seller/products/{product_id}")
async def delete_seller_product(product_id: str, user=Depends(_require_seller)):
    """Delete a product."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": seller_id})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    collection.delete_one({"_id": ObjectId(product_id)})
    return {"status": "success", "message": "Product deleted"}


@router.post("/seller/products/{product_id}/images")
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    user=Depends(_require_seller)
):
    """Upload a product image."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": seller_id})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    content = await file.read()
    try:
        result = cloudinary.uploader.upload(
            content,
            folder=f"daing-products/{product_id}",
            resource_type="image"
        )
        image_url = result.get("secure_url")
        public_id = result.get("public_id")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    images = doc.get("images", [])
    images.append({"url": image_url, "public_id": public_id})
    collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"images": images, "updated_at": datetime.utcnow().isoformat()}}
    )

    updated_doc = collection.find_one({"_id": ObjectId(product_id)})
    return {"status": "success", "product": _normalize_product(updated_doc)}


@router.delete("/seller/products/{product_id}/images/{index}")
async def delete_product_image(product_id: str, index: int, user=Depends(_require_seller)):
    """Delete a product image by index."""
    collection = _get_products_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        doc = collection.find_one({"_id": ObjectId(product_id), "seller_id": seller_id})
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")

    images = doc.get("images", [])
    if index < 0 or index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")

    # Try to delete from Cloudinary
    image = images[index]
    public_id = image.get("public_id")
    if public_id:
        try:
            cloudinary.uploader.destroy(public_id)
        except:
            pass

    images.pop(index)
    main_image_index = doc.get("main_image_index", 0)
    if main_image_index >= len(images):
        main_image_index = max(0, len(images) - 1)

    collection.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": {"images": images, "main_image_index": main_image_index, "updated_at": datetime.utcnow().isoformat()}}
    )

    updated_doc = collection.find_one({"_id": ObjectId(product_id)})
    return {"status": "success", "product": _normalize_product(updated_doc)}


# ============================================
# CATEGORIES ROUTES (Seller)
# ============================================

@router.get("/categories")
async def get_categories(user=Depends(_require_seller)):
    """Get all categories (for seller)."""
    collection = _get_categories_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    docs = list(collection.find({}).sort("name", 1))
    return {"status": "success", "categories": [_normalize_category(d) for d in docs]}


@router.post("/categories")
async def create_category(body: CategoryCreateBody, user=Depends(_require_seller)):
    """Create a new category."""
    collection = _get_categories_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    existing = collection.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    now = datetime.utcnow().isoformat()
    doc = {
        "name": name,
        "description": (body.description or "").strip(),
        "created_at": now,
        "updated_at": now,
        "created_by": str(user.get("_id")),
    }
    result = collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {"status": "success", "category": _normalize_category(doc)}


# ============================================
# SELLER ANALYTICS ROUTES
# ============================================

@router.get("/seller/analytics/kpis")
async def get_seller_kpis(user=Depends(_require_seller)):
    """Get seller KPI metrics for dashboard."""
    db = get_db()
    products_collection = _get_products_collection()
    orders_collection = _get_orders_collection()

    if db is None or products_collection is None or orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))

    try:
        # Get total products count
        total_products = products_collection.count_documents({
            "seller_id": seller_id,
            "is_disabled": {"$ne": True}
        })

        # Get seller product IDs for order filtering
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
        seller_product_ids = {str(p.get("_id")) for p in seller_products}
        seller_product_oids = [p.get("_id") for p in seller_products if p.get("_id")]

        # Calculate order metrics
        total_orders = 0
        total_earnings = 0.0

        if seller_product_ids:
            docs = list(orders_collection.find({}))
            for doc in docs:
                items = doc.get("items", [])
                seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
                if seller_items:
                    total_orders += 1
                    seller_total = sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
                    total_earnings += seller_total

        # Get average rating from reviews
        avg_rating = 0.0
        reviews_collection = db["product_reviews"]
        if reviews_collection is not None and seller_product_oids:
            rating_pipeline = [
                {"$match": {"product_id": {"$in": seller_product_oids}}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
            ]
            rating_result = list(reviews_collection.aggregate(rating_pipeline))
            if rating_result and rating_result[0].get("avg"):
                avg_rating = round(rating_result[0].get("avg", 0), 1)

        # Month-over-month change calculations
        now = datetime.utcnow()
        curr_month_start = datetime(now.year, now.month, 1)
        prev_month_start = datetime(now.year if now.month > 1 else now.year - 1, now.month - 1 if now.month > 1 else 12, 1)
        prev_month_end = curr_month_start

        # Products change
        curr_month_products = products_collection.count_documents({
            "seller_id": seller_id,
            "is_disabled": {"$ne": True},
            "created_at": {"$gte": curr_month_start.isoformat()}
        })
        prev_month_products = products_collection.count_documents({
            "seller_id": seller_id,
            "is_disabled": {"$ne": True},
            "created_at": {"$gte": prev_month_start.isoformat(), "$lt": prev_month_end.isoformat()}
        })

        # Orders & earnings change
        curr_month_orders = 0
        curr_month_earnings = 0.0
        prev_month_orders = 0
        prev_month_earnings = 0.0

        if seller_product_ids:
            docs = list(orders_collection.find({}))
            for doc in docs:
                items = doc.get("items", [])
                seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
                if seller_items:
                    created_raw = doc.get("created_at")
                    created_dt = None
                    if created_raw:
                        try:
                            if isinstance(created_raw, str):
                                created_dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00")).replace(tzinfo=None)
                            else:
                                created_dt = created_raw
                        except:
                            created_dt = None
                    seller_total = sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
                    if created_dt and created_dt >= curr_month_start:
                        curr_month_orders += 1
                        curr_month_earnings += seller_total
                    elif created_dt and prev_month_start <= created_dt < prev_month_end:
                        prev_month_orders += 1
                        prev_month_earnings += seller_total

        def _pct_change(curr, prev):
            if prev == 0:
                return 100.0 if curr > 0 else 0.0
            return round((curr - prev) / prev * 100, 1)

        # Rating change
        curr_avg_rating = 0.0
        prev_avg_rating = 0.0
        if reviews_collection is not None and seller_product_oids:
            r_curr = list(reviews_collection.aggregate([
                {"$match": {"product_id": {"$in": seller_product_oids}, "created_at": {"$gte": curr_month_start.isoformat()}}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
            ]))
            r_prev = list(reviews_collection.aggregate([
                {"$match": {"product_id": {"$in": seller_product_oids}, "created_at": {"$gte": prev_month_start.isoformat(), "$lt": prev_month_end.isoformat()}}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}}},
            ]))
            curr_avg_rating = round(r_curr[0].get("avg", 0), 1) if r_curr else 0.0
            prev_avg_rating = round(r_prev[0].get("avg", 0), 1) if r_prev else 0.0

        return {
            "status": "success",
            "kpis": {
                "total_products": total_products,
                "total_orders": total_orders,
                "total_earnings": round(total_earnings, 2),
                "average_rating": avg_rating,
                "products_change": _pct_change(curr_month_products, prev_month_products),
                "orders_change": _pct_change(curr_month_orders, prev_month_orders),
                "earnings_change": _pct_change(curr_month_earnings, prev_month_earnings),
                "rating_change": _pct_change(curr_avg_rating, prev_avg_rating),
            }
        }
    except Exception as e:
        print(f"Error in get_seller_kpis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/analytics/orders/recent")
async def get_seller_recent_orders(limit: int = 3, user=Depends(_require_seller)):
    """Get recent orders for seller dashboard."""
    products_collection = _get_products_collection()
    orders_collection = _get_orders_collection()

    if products_collection is None or orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))

    try:
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
        seller_product_ids = {str(p.get("_id")) for p in seller_products}

        if not seller_product_ids:
            return {"status": "success", "orders": []}

        docs = list(orders_collection.find({}).sort("created_at", -1).limit(limit * 3))
        recent_orders = []

        for doc in docs:
            items = doc.get("items", [])
            seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
            if seller_items:
                seller_total = sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
                order_obj = _normalize_order(doc)
                recent_orders.append({
                    "id": order_obj.get("id"),
                    "order_number": order_obj.get("order_number", order_obj.get("id")),
                    "customer": order_obj.get("address", {}).get("full_name", "Customer"),
                    "total": seller_total,
                    "status": order_obj.get("status", "confirmed"),
                    "created_at": order_obj.get("created_at")
                })
                if len(recent_orders) >= limit:
                    break

        return {"status": "success", "orders": recent_orders}
    except Exception as e:
        print(f"Error in get_seller_recent_orders: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/analytics/reviews/recent")
async def get_seller_recent_reviews(limit: int = 5, user=Depends(_require_seller)):
    """Get recent reviews across all of the seller's products."""
    db = get_db()
    products_collection = _get_products_collection()
    if db is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    try:
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1, "name": 1}))
        seller_product_oids = [p.get("_id") for p in seller_products if p.get("_id")]
        product_names = {str(p.get("_id")): p.get("name", "Unknown Product") for p in seller_products}

        if not seller_product_oids:
            return {"status": "success", "reviews": []}

        reviews_collection = db["product_reviews"]
        docs = list(
            reviews_collection.find({"product_id": {"$in": seller_product_oids}})
            .sort("created_at", -1)
            .limit(limit)
        )

        reviews = []
        for doc in docs:
            reviews.append({
                "id": str(doc.get("_id")),
                "user_name": doc.get("user_name", "Anonymous"),
                "rating": doc.get("rating", 0),
                "comment": doc.get("comment", ""),
                "product_name": product_names.get(str(doc.get("product_id")), "Unknown Product"),
                "created_at": doc.get("created_at", ""),
            })
        return {"status": "success", "reviews": reviews}
    except Exception as e:
        print(f"Error in get_seller_recent_reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/reviews")
async def get_seller_all_reviews(page: int = 1, page_size: int = 20, user=Depends(_require_seller)):
    """Get all reviews for seller's products with pagination."""
    db = get_db()
    products_collection = _get_products_collection()
    if db is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    seller_id = str(user.get("_id"))
    try:
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1, "name": 1}))
        seller_product_oids = [p.get("_id") for p in seller_products if p.get("_id")]
        product_names = {str(p.get("_id")): p.get("name", "Unknown Product") for p in seller_products}

        if not seller_product_oids:
            return {"status": "success", "reviews": [], "total": 0, "page": page, "page_size": page_size}

        reviews_collection = db["product_reviews"]
        query = {"product_id": {"$in": seller_product_oids}}
        total = reviews_collection.count_documents(query)
        docs = list(
            reviews_collection.find(query)
            .sort("created_at", -1)
            .skip((page - 1) * page_size)
            .limit(page_size)
        )

        reviews = []
        for doc in docs:
            reviews.append({
                "id": str(doc.get("_id")),
                "user_id": str(doc.get("user_id", "")),
                "user_name": doc.get("user_name", "Anonymous"),
                "rating": doc.get("rating", 0),
                "comment": doc.get("comment", ""),
                "product_id": str(doc.get("product_id", "")),
                "product_name": product_names.get(str(doc.get("product_id")), "Unknown Product"),
                "seller_reply": doc.get("seller_reply"),
                "created_at": doc.get("created_at", ""),
            })
        return {"status": "success", "reviews": reviews, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        print(f"Error in get_seller_all_reviews: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


class SellerReplyBody(BaseModel):
    reply: str


@router.post("/seller/reviews/{review_id}/reply")
async def seller_reply_to_review(review_id: str, body: SellerReplyBody, user=Depends(_require_seller)):
    """Seller can reply to a review on their product."""
    db = get_db()
    products_collection = _get_products_collection()
    if db is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        review_oid = ObjectId(review_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid review ID")
    
    seller_id = str(user.get("_id"))
    reviews_collection = db["product_reviews"]
    
    # Get the review
    review = reviews_collection.find_one({"_id": review_oid})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Verify the review is for seller's product
    product_id = review.get("product_id")
    product = products_collection.find_one({"_id": product_id, "seller_id": seller_id})
    if not product:
        raise HTTPException(status_code=403, detail="You can only reply to reviews on your products")
    
    # Update the review with seller reply
    reviews_collection.update_one(
        {"_id": review_oid},
        {"$set": {"seller_reply": body.reply, "seller_reply_at": datetime.utcnow().isoformat()}}
    )
    
    return {"status": "success", "message": "Reply added successfully"}


@router.get("/seller/analytics/products/top")
async def get_seller_top_products(page: int = 1, page_size: int = 4, user=Depends(_require_seller)):
    """Get top selling products for seller dashboard."""
    products_collection = _get_products_collection()

    if products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    if page < 1 or page_size < 1 or page_size > 20:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    seller_id = str(user.get("_id"))

    try:
        pipeline = [
            {"$match": {"seller_id": seller_id, "is_disabled": {"$ne": True}}},
            {"$sort": {"sold_count": -1}},
        ]

        all_products = list(products_collection.aggregate(pipeline))
        total = len(all_products)

        start = (page - 1) * page_size
        paged_products = all_products[start: start + page_size]

        products = []
        for p in paged_products:
            products.append({
                "id": str(p.get("_id")),
                "name": p.get("name", "Unknown Product"),
                "sold": p.get("sold_count", 0),
                "price": p.get("price", 0),
                "stock": p.get("stock_qty", 0),
                "category_name": p.get("category_name")
            })

        return {
            "status": "success",
            "products": products,
            "total": total,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        print(f"Error in get_seller_top_products: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/analytics/store/details")
async def get_seller_store_details(user=Depends(_require_seller)):
    """Get store details: total stock, overall rating, total reviews, total sales."""
    db = get_db()
    products_collection = _get_products_collection()
    orders_collection = _get_orders_collection()

    if db is None or products_collection is None or orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))

    try:
        products = list(products_collection.find({"seller_id": seller_id, "is_disabled": {"$ne": True}}))
        seller_product_ids = {str(p.get("_id")) for p in products}
        seller_product_oids = [p.get("_id") for p in products if p.get("_id")]

        total_stock = sum(int(p.get("stock_qty", 0)) for p in products)
        max_stock_reference = max(total_stock, 100)

        reviews_collection = db["product_reviews"]
        total_reviews = 0
        overall_rating = 0.0
        if seller_product_oids:
            total_reviews_res = list(reviews_collection.aggregate([
                {"$match": {"product_id": {"$in": seller_product_oids}}},
                {"$group": {"_id": None, "count": {"$sum": 1}, "avg": {"$avg": "$rating"}}},
            ]))
            if total_reviews_res:
                total_reviews = total_reviews_res[0].get("count", 0)
                overall_rating = round(total_reviews_res[0].get("avg", 0.0), 1)

        total_sales = 0.0
        total_orders_count = 0
        if seller_product_ids:
            for doc in orders_collection.find({}):
                items = doc.get("items", [])
                seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
                if seller_items:
                    total_orders_count += 1
                    total_sales += sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)

        avg_sales = round(total_sales / total_orders_count, 2) if total_orders_count > 0 else 0.0

        return {
            "status": "success",
            "store": {
                "total_stock": total_stock,
                "overall_rating": overall_rating,
                "total_reviews": total_reviews,
                "max_stock_reference": max_stock_reference,
            },
            "orders": {
                "total_sales": round(total_sales, 2),
                "avg_sales": avg_sales,
                "avg_orders": total_orders_count,
                "max_sales_reference": max(round(total_sales), 1000),
            }
        }
    except Exception as e:
        print(f"Error in get_seller_store_details: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/analytics/sales/categories")
async def get_seller_sales_by_category(user=Depends(_require_seller)):
    """Get sales breakdown by category for seller dashboard."""
    products_collection = _get_products_collection()

    if products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))

    try:
        pipeline = [
            {"$match": {"seller_id": seller_id, "is_disabled": {"$ne": True}}},
            {"$group": {
                "_id": "$category_name",
                "total_sold": {"$sum": {"$ifNull": ["$sold_count", 0]}},
            }},
            {"$sort": {"total_sold": -1}},
        ]

        category_data = list(products_collection.aggregate(pipeline))
        total_sold = sum(c.get("total_sold", 0) for c in category_data)

        categories = []
        for cat in category_data:
            cat_name = cat.get("_id") or "Uncategorized"
            cat_sold = cat.get("total_sold", 0)
            percentage = round((cat_sold / total_sold * 100), 1) if total_sold > 0 else 0
            categories.append({
                "category": cat_name,
                "sold": cat_sold,
                "percentage": percentage
            })

        return {"status": "success", "categories": categories}
    except Exception as e:
        print(f"Error in get_seller_sales_by_category: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/seller/analytics/sales/overview")
async def get_seller_sales_overview(
    year: Optional[int] = None,
    half: Optional[int] = None,
    granularity: str = "monthly",
    days: int = 7,
    count: int = 10,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user=Depends(_require_seller)
):
    """Flexible sales chart data endpoint."""
    from datetime import timedelta

    orders_col = _get_orders_collection()
    products_collection = _get_products_collection()
    if orders_col is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    now = datetime.utcnow()
    current_year = now.year

    try:
        seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
        seller_product_ids = {str(p.get("_id")) for p in seller_products}
        seller_product_oids = [p.get("_id") for p in seller_products if p.get("_id")]

        seller_orders = list(orders_col.find({
            "items.product_id": {"$in": list(seller_product_ids) + seller_product_oids},
            "status": {"$in": ["confirmed", "shipped", "delivered"]}
        }))

        def _parse_created(raw):
            if raw is None:
                return None
            if isinstance(raw, str):
                try:
                    return datetime.fromisoformat(raw.replace("Z", "+00:00")).replace(tzinfo=None)
                except:
                    return None
            return raw

        def _order_amount(order):
            total = 0.0
            for item in order.get("items", []):
                pid = item.get("product_id")
                if pid in seller_product_oids or str(pid) in seller_product_ids:
                    total += float(item.get("price", 0)) * int(item.get("qty", 0))
            return total

        # Available years
        years_set = set()
        for order in seller_orders:
            dt = _parse_created(order.get("created_at"))
            if dt:
                years_set.add(dt.year)
        available_years = sorted(years_set, reverse=True) or [current_year]

        # Custom date range
        if start_date and end_date:
            try:
                range_start = datetime.fromisoformat(start_date)
                range_end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            except:
                raise HTTPException(status_code=400, detail="Invalid start_date or end_date")
            num_days = (range_end.date() - range_start.date()).days + 1
            daily_totals = {}
            cur = range_start.date()
            for _ in range(num_days):
                daily_totals[cur] = 0.0
                cur += timedelta(days=1)
            for order in seller_orders:
                dt = _parse_created(order.get("created_at"))
                if dt and range_start <= dt <= range_end:
                    daily_totals[dt.date()] = daily_totals.get(dt.date(), 0.0) + _order_amount(order)
            sales_data = [
                {"period": d.strftime("%b %d"), "amount": round(daily_totals[d], 2)}
                for d in sorted(daily_totals)
            ]
            total_orders_in_range = sum(1 for order in seller_orders if (lambda dt: dt and range_start <= dt <= range_end)(_parse_created(order.get("created_at"))))
            return {"status": "success", "year": current_year, "half": None, "available_years": available_years, "data": sales_data, "total_orders": total_orders_in_range}

        # Daily
        if granularity == "daily":
            day_count = max(1, min(days, 365))
            today = now.date()
            daily_totals = {}
            for i in range(day_count - 1, -1, -1):
                d = today - timedelta(days=i)
                daily_totals[d] = 0.0
            for order in seller_orders:
                dt = _parse_created(order.get("created_at"))
                if dt and dt.date() in daily_totals:
                    daily_totals[dt.date()] += _order_amount(order)
            sales_data = [
                {"period": d.strftime("%b %d"), "amount": round(daily_totals[d], 2)}
                for d in sorted(daily_totals)
            ]
            today_date = now.date()
            range_s = today_date - timedelta(days=day_count - 1)
            total_orders_in_range = sum(1 for order in seller_orders if (lambda dt: dt and range_s <= dt.date() <= today_date)(_parse_created(order.get("created_at"))))
            return {"status": "success", "year": current_year, "half": None, "available_years": available_years, "data": sales_data, "total_orders": total_orders_in_range}

        # Yearly
        if granularity == "yearly":
            year_count = max(1, min(count, 20))
            yearly_totals = {y: 0.0 for y in range(current_year - year_count + 1, current_year + 1)}
            for order in seller_orders:
                dt = _parse_created(order.get("created_at"))
                if dt and dt.year in yearly_totals:
                    yearly_totals[dt.year] += _order_amount(order)
            sales_data = [
                {"period": str(y), "amount": round(yearly_totals[y], 2)}
                for y in sorted(yearly_totals)
            ]
            total_orders_in_range = sum(1 for order in seller_orders if (lambda dt: dt and dt.year in yearly_totals)(_parse_created(order.get("created_at"))))
            return {"status": "success", "year": current_year, "half": None, "available_years": available_years, "data": sales_data, "total_orders": total_orders_in_range}

        # Monthly (default)
        if year is None:
            year = current_year
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        monthly_totals = {i: 0.0 for i in range(1, 13)}
        for order in seller_orders:
            dt = _parse_created(order.get("created_at"))
            if dt and dt.year == year:
                monthly_totals[dt.month] += _order_amount(order)
        if half == 1:
            months = list(range(1, 7))
        elif half == 2:
            months = list(range(7, 13))
        else:
            months = list(range(1, 13))
        sales_data = [
            {"period": month_names[m - 1], "amount": round(monthly_totals[m], 2)}
            for m in months
        ]
        total_orders_in_range = sum(1 for order in seller_orders if (lambda dt: dt and dt.year == year and dt.month in months)(_parse_created(order.get("created_at"))))
        return {"status": "success", "year": year, "half": half, "available_years": available_years, "data": sales_data, "total_orders": total_orders_in_range}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_seller_sales_overview: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ============================================
# ADMIN ORDER ROUTES
# ============================================

async def _require_admin(authorization: Optional[str] = Header(None)):
    """Require admin role."""
    user = await _get_current_user_from_header(authorization)
    role = (user.get("role") or "user").strip().lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/orders/stats")
async def get_admin_orders_stats(user=Depends(_require_admin)):
    """Get quick stats for admin orders dashboard."""
    orders_collection = _get_orders_collection()

    if orders_collection is None:
        return {
            "status": "success",
            "stats": {
                "total_orders": 0,
                "pending_orders": 0,
                "confirmed_orders": 0,
                "shipped_orders": 0,
                "delivered_orders": 0,
                "cancelled_orders": 0,
                "total_revenue": 0,
                "total_sales": 0,
                "avg_order_value": 0,
            }
        }

    total_orders = orders_collection.count_documents({})
    pending_orders = orders_collection.count_documents({"status": "pending"})
    confirmed_orders = orders_collection.count_documents({"status": "confirmed"})
    shipped_orders = orders_collection.count_documents({"status": "shipped"})
    delivered_orders = orders_collection.count_documents({"status": "delivered"})
    cancelled_orders = orders_collection.count_documents({"status": "cancelled"})

    revenue_docs = list(orders_collection.find({"status": "delivered"}, {"total": 1}))
    total_revenue = sum(float(doc.get("total", 0)) for doc in revenue_docs)

    all_orders = list(orders_collection.find({}, {"total": 1}))
    total_sales = sum(float(doc.get("total", 0)) for doc in all_orders)

    avg_order_value = total_sales / total_orders if total_orders > 0 else 0

    return {
        "status": "success",
        "stats": {
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "confirmed_orders": confirmed_orders,
            "shipped_orders": shipped_orders,
            "delivered_orders": delivered_orders,
            "cancelled_orders": cancelled_orders,
            "total_revenue": total_revenue,
            "total_sales": total_sales,
            "avg_order_value": round(avg_order_value, 2),
        }
    }


@router.get("/admin/orders/by-time")
async def get_admin_orders_by_time(
    year: Optional[int] = None,
    month: Optional[int] = None,
    user=Depends(_require_admin)
):
    """Get orders grouped by day for heat map visualization."""
    import calendar

    orders_collection = _get_orders_collection()

    if orders_collection is None:
        return {"status": "success", "data": [], "year": year, "month": month}

    now = datetime.utcnow()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    first_day = datetime(year, month, 1)
    last_day_num = calendar.monthrange(year, month)[1]
    last_day = datetime(year, month, last_day_num, 23, 59, 59)

    query = {
        "created_at": {
            "$gte": first_day.isoformat(),
            "$lte": last_day.isoformat()
        }
    }

    orders = list(orders_collection.find(query))

    day_counts = {}
    for order in orders:
        created_at = order.get("created_at", "")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00").replace("+00:00", ""))
                day_of_month = dt.day
                day_of_week = dt.weekday()
                key = f"{day_of_month}"
                if key not in day_counts:
                    day_counts[key] = {"day": day_of_month, "weekday": day_of_week, "count": 0, "total": 0}
                day_counts[key]["count"] += 1
                day_counts[key]["total"] += float(order.get("total", 0))
            except:
                pass

    first_weekday = first_day.weekday()
    weeks = []
    current_day = 1

    for week_idx in range(6):
        week = []
        for day_idx in range(7):
            if week_idx == 0 and day_idx < first_weekday:
                week.append({"day": None, "count": 0, "total": 0})
            elif current_day > last_day_num:
                week.append({"day": None, "count": 0, "total": 0})
            else:
                key = f"{current_day}"
                data = day_counts.get(key, {"day": current_day, "weekday": day_idx, "count": 0, "total": 0})
                week.append({
                    "day": current_day,
                    "count": data["count"],
                    "total": round(data["total"], 2)
                })
                current_day += 1
        weeks.append(week)
        if current_day > last_day_num:
            break

    return {
        "status": "success",
        "year": year,
        "month": month,
        "month_name": calendar.month_name[month],
        "weeks": weeks,
        "max_count": max([d["count"] for w in weeks for d in w if d["day"] is not None], default=0)
    }


@router.get("/admin/orders")
async def get_admin_orders(
    page: int = 1,
    page_size: int = 20,
    status: str = "all",
    seller: str = "all",
    category: str = "all",
    search: str = "",
    user=Depends(_require_admin)
):
    """Get all orders for admin management with filters."""
    orders_collection = _get_orders_collection()
    products_collection = _get_products_collection()
    users_collection = _get_users_collection()

    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)

    query = {}
    if status != "all":
        query["status"] = status

    docs = list(orders_collection.find(query).sort("created_at", -1))

    filtered_orders = []

    for doc in docs:
        order_id = str(doc.get("_id"))
        user_id = doc.get("user_id")
        items = doc.get("items", [])

        buyer_name = "Unknown"
        if user_id and users_collection is not None:
            try:
                buyer_user = users_collection.find_one({"_id": ObjectId(user_id)})
                if buyer_user:
                    buyer_name = buyer_user.get("name", "Unknown")
            except:
                pass

        seller_name = "Unknown"
        order_category = ""

        if items and products_collection is not None:
            first_item = items[0]
            product_id = first_item.get("product_id")

            if product_id:
                try:
                    product = products_collection.find_one({"_id": ObjectId(product_id)})
                    if product:
                        seller_id = product.get("seller_id")
                        if seller_id and users_collection is not None:
                            try:
                                seller_user = users_collection.find_one({"_id": ObjectId(seller_id)})
                                if seller_user:
                                    seller_name = seller_user.get("name", "Unknown")
                            except:
                                pass

                        order_category = product.get("category", "")
                except:
                    pass

        if seller != "all" and seller_name != seller:
            continue
        if category != "all" and order_category != category:
            continue
        if search and not (
            order_id.lower().find(search.lower()) >= 0 or
            buyer_name.lower().find(search.lower()) >= 0 or
            seller_name.lower().find(search.lower()) >= 0
        ):
            continue

        filtered_orders.append({
            "id": order_id,
            "order_number": doc.get("order_number", order_id[:8]),
            "buyer_id": user_id or "",
            "buyer_name": buyer_name,
            "seller_id": "",
            "seller_name": seller_name,
            "category": order_category,
            "status": doc.get("status", "pending"),
            "total": float(doc.get("total", 0)),
            "total_items": len(items),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", ""),
        })

    total = len(filtered_orders)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_orders = filtered_orders[start:end]

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "orders": paginated_orders,
    }


@router.get("/admin/orders/{order_id}")
async def get_admin_order_detail(order_id: str, user=Depends(_require_admin)):
    """Get detailed order information for admin view."""
    orders_collection = _get_orders_collection()
    users_collection = _get_users_collection()
    products_collection = _get_products_collection()

    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order_doc = orders_collection.find_one({"_id": oid})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")

    user_id = order_doc.get("user_id")
    buyer_name = "Unknown"

    if user_id and users_collection is not None:
        try:
            buyer_user = users_collection.find_one({"_id": ObjectId(user_id)})
            if buyer_user:
                buyer_name = buyer_user.get("name", "Unknown")
        except:
            pass

    seller_name = "Unknown"
    category = "General"
    items = order_doc.get("items", [])

    if items and products_collection is not None:
        first_item = items[0]
        product_id = first_item.get("product_id")

        if product_id:
            try:
                product = products_collection.find_one({"_id": ObjectId(product_id)})
                if product:
                    category = product.get("category", "General")
                    seller_id = product.get("seller_id")
                    if seller_id and users_collection is not None:
                        try:
                            seller_user = users_collection.find_one({"_id": ObjectId(seller_id)})
                            if seller_user:
                                seller_name = seller_user.get("name", "Unknown")
                        except:
                            pass
            except:
                pass

    return {
        "status": "success",
        "order": {
            "id": str(order_doc["_id"]),
            "order_number": order_doc.get("order_number", str(order_doc["_id"])[:8]),
            "buyer_id": user_id or "",
            "buyer_name": buyer_name,
            "seller_id": "",
            "seller_name": seller_name,
            "category": category,
            "status": order_doc.get("status", "pending"),
            "total": float(order_doc.get("total", 0)),
            "total_items": len(items),
            "payment_method": order_doc.get("payment_method", ""),
            "address": order_doc.get("address", {}),
            "items": items,
            "created_at": order_doc.get("created_at", ""),
            "updated_at": order_doc.get("updated_at", ""),
        }
    }


class AdminOrderStatusUpdateBody(BaseModel):
    status: str


@router.put("/admin/orders/{order_id}/status")
async def update_admin_order_status(order_id: str, body: AdminOrderStatusUpdateBody, user=Depends(_require_admin)):
    """Update order status (admin only)."""
    orders_collection = _get_orders_collection()

    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(order_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order_doc = orders_collection.find_one({"_id": oid})
    if not order_doc:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = body.status
    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]

    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    update_data = {
        "status": new_status,
        "updated_at": datetime.utcnow().isoformat(),
    }

    orders_collection.update_one({"_id": oid}, {"$set": update_data})

    return {
        "status": "success",
        "new_status": new_status,
        "message": f"Order status updated to {new_status}",
        "order": _normalize_order(orders_collection.find_one({"_id": oid}))
    }


# ============================================
# PRODUCT REVIEWS
# ============================================

class ReviewCreateBody(BaseModel):
    rating: int
    comment: str = ""


class ReviewUpdateBody(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None


def _normalize_review(doc: dict) -> dict:
    """Normalize a review document for API response."""
    if not doc:
        return None
    return {
        "id": str(doc.get("_id")),
        "product_id": str(doc.get("product_id")) if doc.get("product_id") else "",
        "seller_id": doc.get("seller_id", ""),
        "user_id": doc.get("user_id", ""),
        "user_name": doc.get("user_name", ""),
        "rating": doc.get("rating", 0),
        "comment": doc.get("comment", ""),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", ""),
    }


def _validate_review_comment(comment: str) -> str:
    """Validate and clean review comment with bad words filter."""
    if not comment:
        return ""
    # Clean, limit length, and censor bad words
    cleaned = comment.strip()[:500]  # Max 500 chars
    return _censor_bad_words(cleaned)


def _user_has_ordered_product(orders_collection, user_id: str, product_id: str) -> bool:
    """Check if user has ordered the specified product with delivered status."""
    if orders_collection is None:
        return False
    
    # Check if there's a delivered order containing this product
    order = orders_collection.find_one({
        "user_id": user_id,
        "status": "delivered",
        "items.product_id": product_id
    })
    return order is not None


@router.get("/catalog/products/{product_id}/reviews")
async def get_product_reviews_public(
    product_id: str,
    page: int = 1,
    page_size: int = 5,
):
    """Public endpoint for displaying product reviews on the product detail page."""
    collection = _get_reviews_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")
    
    # Public query: get all reviews for this product
    query = {"product_id": oid}
    total = collection.count_documents(query)
    docs = list(
        collection.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    
    return {
        "status": "success",
        "reviews": [_normalize_review(d) for d in docs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/seller/products/{product_id}/reviews")
async def get_seller_product_reviews(
    product_id: str,
    page: int = 1,
    page_size: int = 3,
    user=Depends(_require_seller),
):
    """Seller-only endpoint for viewing reviews of their own products."""
    collection = _get_reviews_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")
    
    query = {"product_id": oid, "seller_id": str(user.get("_id"))}
    total = collection.count_documents(query)
    docs = list(
        collection.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    
    return {
        "status": "success",
        "reviews": [_normalize_review(d) for d in docs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/products/{product_id}/reviews")
async def create_product_review(product_id: str, body: ReviewCreateBody, user=Depends(_get_current_user)):
    """Create a product review. Only customers who ordered the product can review."""
    collection = _get_reviews_collection()
    products = _get_products_collection()
    orders = _get_orders_collection()
    
    if collection is None or products is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only customers can review products")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = products.find_one({"_id": oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user_id = str(user.get("_id"))
    
    if not _user_has_ordered_product(orders, user_id, product_id):
        raise HTTPException(status_code=403, detail="You can only review products you've ordered")
    
    existing = collection.find_one({"product_id": oid, "user_id": user_id})
    if existing:
        raise HTTPException(status_code=409, detail="You already reviewed this product. Update your review instead")
    
    rating = int(body.rating)
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    comment = _validate_review_comment(body.comment)
    now = datetime.utcnow().isoformat()
    
    doc = {
        "product_id": oid,
        "seller_id": product.get("seller_id", ""),
        "user_id": user_id,
        "user_name": user.get("name", ""),
        "rating": rating,
        "comment": comment,
        "created_at": now,
        "updated_at": now,
    }
    
    result = collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return {"status": "success", "review": _normalize_review(doc)}


@router.get("/products/{product_id}/reviews/me")
async def get_my_product_review(product_id: str, user=Depends(_get_current_user)):
    """Get current user's review for a product and whether they can review."""
    collection = _get_reviews_collection()
    products = _get_products_collection()
    orders = _get_orders_collection()
    
    if collection is None or products is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = products.find_one({"_id": oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user_id = str(user.get("_id"))
    can_review = _user_has_ordered_product(orders, user_id, product_id)
    existing = collection.find_one({"product_id": oid, "user_id": user_id})
    
    return {
        "status": "success",
        "can_review": bool(can_review),
        "review": _normalize_review(existing) if existing else None,
    }


@router.patch("/products/{product_id}/reviews/me")
async def update_my_product_review(product_id: str, body: ReviewUpdateBody, user=Depends(_get_current_user)):
    """Update current user's review for a product."""
    collection = _get_reviews_collection()
    products = _get_products_collection()
    orders = _get_orders_collection()
    
    if collection is None or products is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only customers can review products")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = products.find_one({"_id": oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user_id = str(user.get("_id"))
    
    if not _user_has_ordered_product(orders, user_id, product_id):
        raise HTTPException(status_code=403, detail="You can only review products you've ordered")
    
    existing = collection.find_one({"product_id": oid, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    
    updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
    
    if body.rating is not None:
        rating = int(body.rating)
        if rating < 1 or rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be 1-5")
        updates["rating"] = rating
    
    if body.comment is not None:
        updates["comment"] = _validate_review_comment(body.comment)
    
    if len(updates) == 1:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    collection.update_one({"_id": existing.get("_id")}, {"$set": updates})
    updated = collection.find_one({"_id": existing.get("_id")})
    
    return {"status": "success", "review": _normalize_review(updated)}


@router.delete("/products/{product_id}/reviews/me")
async def delete_my_product_review(product_id: str, user=Depends(_get_current_user)):
    """Delete user's own review for a product."""
    collection = _get_reviews_collection()
    products = _get_products_collection()
    
    if collection is None or products is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    role = (user.get("role") or "user").strip().lower()
    if role != "user":
        raise HTTPException(status_code=403, detail="Only customers can delete reviews")
    
    try:
        oid = ObjectId(product_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = products.find_one({"_id": oid})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user_id = str(user.get("_id"))
    existing = collection.find_one({"product_id": oid, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    
    collection.delete_one({"_id": existing.get("_id")})
    
    return {"status": "success", "message": "Review deleted successfully"}


# ============================================
# VOUCHERS
# ============================================

def _get_vouchers_collection():
    """Return vouchers collection from MongoDB."""
    try:
        return get_db()["vouchers"]
    except Exception:
        return None


class VoucherCreateBody(BaseModel):
    code: str
    discount_type: str  # "fixed" or "percentage"
    value: float
    expiration_date: Optional[str] = None
    max_uses: Optional[int] = None
    per_user_limit: Optional[int] = None
    min_order_amount: Optional[float] = None


class VoucherUpdateBody(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[float] = None
    expiration_date: Optional[str] = None
    max_uses: Optional[int] = None
    per_user_limit: Optional[int] = None
    min_order_amount: Optional[float] = None
    active: Optional[bool] = None


@router.get("/api/vouchers")
async def list_vouchers(
    filter_by: str = "all",
    seller_id: Optional[str] = None,
    user=Depends(_get_current_user)
):
    """List vouchers. If seller_id is provided, filter to that seller. Otherwise, list all (admin only)."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    user_role = user.get("role", "user")
    
    # Convert seller_id to ObjectId for query since it's stored as ObjectId
    if seller_id:
        try:
            query = {"seller_id": ObjectId(seller_id)}
        except:
            query = {"seller_id": seller_id}
    else:
        if user_role != "admin":
            query = {"seller_id": ObjectId(user_id)}
        else:
            query = {}
    
    # Apply status filter
    now = datetime.utcnow()
    if filter_by == "active":
        query["$or"] = [
            {"expiration_date": {"$exists": False}},
            {"expiration_date": {"$gt": now}},
            {"expiration_date": None}
        ]
        query["active"] = True
    elif filter_by == "expired":
        query["expiration_date"] = {"$lt": now}
    
    try:
        vouchers = list(vouchers_collection.find(query).sort("created_at", -1))
        # Convert ObjectId to string
        for v in vouchers:
            v["_id"] = str(v["_id"])
            v["seller_id"] = str(v["seller_id"]) if v.get("seller_id") else ""
            if v.get("created_at"):
                if hasattr(v["created_at"], "isoformat"):
                    v["created_at"] = v["created_at"].isoformat()
            if v.get("expiration_date"):
                if hasattr(v["expiration_date"], "isoformat"):
                    v["expiration_date"] = v["expiration_date"].isoformat()
        
        return {"status": "success", "vouchers": vouchers}
    except Exception as e:
        print(f"Error listing vouchers: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/api/vouchers/{voucher_id}")
async def get_voucher(voucher_id: str, user=Depends(_get_current_user)):
    """Get a single voucher details."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        voucher["_id"] = str(voucher["_id"])
        voucher["seller_id"] = str(voucher["seller_id"]) if voucher.get("seller_id") else ""
        if voucher.get("created_at") and hasattr(voucher["created_at"], "isoformat"):
            voucher["created_at"] = voucher["created_at"].isoformat()
        if voucher.get("expiration_date") and hasattr(voucher["expiration_date"], "isoformat"):
            voucher["expiration_date"] = voucher["expiration_date"].isoformat()
        
        return {"status": "success", "voucher": voucher}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting voucher: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/api/vouchers")
async def create_voucher(body: VoucherCreateBody, user=Depends(_get_current_user)):
    """Create a new voucher code."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    
    # Validation
    if len(body.code) < 3 or len(body.code) > 20:
        raise HTTPException(status_code=400, detail="Code must be 3-20 characters")
    
    if not re.match(r"^[A-Za-z0-9_-]+$", body.code):
        raise HTTPException(status_code=400, detail="Code must be alphanumeric, dash, or underscore only")
    
    if body.discount_type not in ["fixed", "percentage"]:
        raise HTTPException(status_code=400, detail="Invalid discount type")
    
    if body.value <= 0:
        raise HTTPException(status_code=400, detail="Value must be greater than 0")
    
    if body.discount_type == "percentage" and body.value > 100:
        raise HTTPException(status_code=400, detail="Percentage cannot exceed 100%")
    
    # Check if code already exists
    if vouchers_collection.find_one({"code": body.code.upper()}):
        raise HTTPException(status_code=400, detail="This code already exists")
    
    # Parse dates
    expiration_date = None
    if body.expiration_date:
        try:
            expiration_date = datetime.fromisoformat(body.expiration_date.replace("Z", "+00:00"))
            if expiration_date <= datetime.utcnow():
                raise HTTPException(status_code=400, detail="Expiration date must be in the future")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Validate constraints
    if body.max_uses is not None and body.max_uses <= 0:
        raise HTTPException(status_code=400, detail="Max uses must be greater than 0")
    
    if body.per_user_limit is not None and body.per_user_limit <= 0:
        raise HTTPException(status_code=400, detail="Per user limit must be greater than 0")
    
    if body.min_order_amount is not None and body.min_order_amount <= 0:
        raise HTTPException(status_code=400, detail="Min order amount must be greater than 0")
    
    try:
        voucher_doc = {
            "seller_id": ObjectId(user_id),
            "code": body.code.upper(),
            "discount_type": body.discount_type,
            "value": body.value,
            "expiration_date": expiration_date,
            "max_uses": body.max_uses,
            "current_uses": 0,
            "per_user_limit": body.per_user_limit,
            "min_order_amount": body.min_order_amount,
            "active": True,
            "created_at": datetime.utcnow(),
            "used_by": []
        }
        
        result = vouchers_collection.insert_one(voucher_doc)
        voucher_doc["_id"] = str(result.inserted_id)
        voucher_doc["seller_id"] = str(voucher_doc["seller_id"])
        voucher_doc["created_at"] = voucher_doc["created_at"].isoformat()
        if voucher_doc.get("expiration_date"):
            voucher_doc["expiration_date"] = voucher_doc["expiration_date"].isoformat()
        
        return {"status": "success", "voucher": voucher_doc}
    except Exception as e:
        print(f"Error creating voucher: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.put("/api/vouchers/{voucher_id}")
async def update_voucher(voucher_id: str, body: VoucherUpdateBody, user=Depends(_get_current_user)):
    """Update a voucher (only own vouchers can be edited)."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    
    try:
        voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        # Only seller who created it can edit
        if str(voucher["seller_id"]) != user_id:
            raise HTTPException(status_code=403, detail="You can only edit your own voucher codes")
        
        update_data = {}
        
        if body.code is not None:
            if len(body.code) < 3 or len(body.code) > 20:
                raise HTTPException(status_code=400, detail="Code must be 3-20 characters")
            if not re.match(r"^[A-Za-z0-9_-]+$", body.code):
                raise HTTPException(status_code=400, detail="Code must be alphanumeric, dash, or underscore only")
            if vouchers_collection.find_one({"code": body.code.upper(), "_id": {"$ne": ObjectId(voucher_id)}}):
                raise HTTPException(status_code=400, detail="This code already exists")
            update_data["code"] = body.code.upper()
        
        if body.discount_type is not None:
            if body.discount_type not in ["fixed", "percentage"]:
                raise HTTPException(status_code=400, detail="Invalid discount type")
            update_data["discount_type"] = body.discount_type
        
        if body.value is not None:
            if body.value <= 0:
                raise HTTPException(status_code=400, detail="Value must be greater than 0")
            current_type = body.discount_type or voucher.get("discount_type")
            if current_type == "percentage" and body.value > 100:
                raise HTTPException(status_code=400, detail="Percentage cannot exceed 100%")
            update_data["value"] = body.value
        
        if body.expiration_date is not None:
            try:
                exp_date = datetime.fromisoformat(body.expiration_date.replace("Z", "+00:00"))
                if exp_date <= datetime.utcnow():
                    raise HTTPException(status_code=400, detail="Expiration date must be in the future")
                update_data["expiration_date"] = exp_date
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format")
        
        if body.max_uses is not None:
            if body.max_uses <= 0:
                raise HTTPException(status_code=400, detail="Max uses must be greater than 0")
            update_data["max_uses"] = body.max_uses
        
        if body.per_user_limit is not None:
            if body.per_user_limit <= 0:
                raise HTTPException(status_code=400, detail="Per user limit must be greater than 0")
            update_data["per_user_limit"] = body.per_user_limit
        
        if body.min_order_amount is not None:
            if body.min_order_amount <= 0:
                raise HTTPException(status_code=400, detail="Min order amount must be greater than 0")
            update_data["min_order_amount"] = body.min_order_amount
        
        if body.active is not None:
            update_data["active"] = body.active
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        vouchers_collection.update_one({"_id": ObjectId(voucher_id)}, {"$set": update_data})
        updated_voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
        
        updated_voucher["_id"] = str(updated_voucher["_id"])
        updated_voucher["seller_id"] = str(updated_voucher["seller_id"])
        if updated_voucher.get("created_at") and hasattr(updated_voucher["created_at"], "isoformat"):
            updated_voucher["created_at"] = updated_voucher["created_at"].isoformat()
        if updated_voucher.get("expiration_date") and hasattr(updated_voucher["expiration_date"], "isoformat"):
            updated_voucher["expiration_date"] = updated_voucher["expiration_date"].isoformat()
        
        return {"status": "success", "voucher": updated_voucher}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating voucher: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.delete("/api/vouchers/{voucher_id}")
async def delete_voucher(voucher_id: str, user=Depends(_get_current_user)):
    """Delete a voucher (own vouchers or admin can delete any)."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    user_id = str(user.get("_id"))
    user_role = user.get("role", "user")
    
    try:
        voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
        if not voucher:
            raise HTTPException(status_code=404, detail="Voucher not found")
        
        # Allow delete if user is admin or if it's their own voucher
        if user_role != "admin" and str(voucher["seller_id"]) != user_id:
            raise HTTPException(status_code=403, detail="You can only delete your own voucher codes")
        
        vouchers_collection.delete_one({"_id": ObjectId(voucher_id)})
        return {"status": "success", "message": "Voucher deleted"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting voucher: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


class VoucherValidateRequest(BaseModel):
    code: str
    order_total: float


@router.post("/api/vouchers/validate")
async def validate_voucher(request: VoucherValidateRequest, user=Depends(_get_current_user)):
    """Validate a voucher code and return discount info."""
    vouchers_collection = _get_vouchers_collection()
    if vouchers_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    code = request.code
    order_total = request.order_total
    user_id = str(user.get("_id"))
    
    try:
        voucher = vouchers_collection.find_one({"code": code.upper(), "active": True})
        if not voucher:
            raise HTTPException(status_code=400, detail="Invalid or inactive voucher code")
        
        # Check expiration
        if voucher.get("expiration_date") and voucher["expiration_date"] <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="This voucher code has expired")
        
        # Check max uses
        if voucher.get("max_uses") and voucher.get("current_uses", 0) >= voucher["max_uses"]:
            raise HTTPException(status_code=400, detail="This voucher code has reached its usage limit")
        
        # Check per user limit
        if voucher.get("per_user_limit"):
            user_usage = next(
                (u["used_count"] for u in voucher.get("used_by", []) if u["user_id"] == user_id),
                0
            )
            if user_usage >= voucher["per_user_limit"]:
                raise HTTPException(status_code=400, detail="You have reached the usage limit for this code")
        
        # Check minimum order amount
        if voucher.get("min_order_amount") and order_total < voucher["min_order_amount"]:
            raise HTTPException(
                status_code=400,
                detail=f"Minimum order amount of ₱{voucher['min_order_amount']} required"
            )
        
        # Return the raw voucher value - frontend will calculate the discount
        # Include seller_id so frontend knows if this is a seller-specific voucher
        voucher_seller_id = str(voucher["seller_id"]) if voucher.get("seller_id") else None
        return {
            "status": "success",
            "valid": True,
            "discount_value": voucher["value"],
            "discount_type": voucher["discount_type"],
            "voucher_id": str(voucher["_id"]),
            "seller_id": voucher_seller_id  # null = global voucher, string = seller-specific
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error validating voucher: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ============================================
# PAYOUTS
# ============================================

def _get_payouts_collection():
    """Return payouts collection from MongoDB."""
    try:
        return get_db()["payouts"]
    except Exception:
        return None


class PayoutStatusUpdateBody(BaseModel):
    status: str  # pending, completed
    notes: Optional[str] = None


@router.get("/payouts/admin")
async def get_admin_payouts(
    page: int = 1,
    page_size: int = 20,
    status: str = "all",
    seller_id: str = "all",
    period: str = "",
    user=Depends(_require_admin)
):
    """Get all payouts for admin management with filters."""
    payouts_collection = _get_payouts_collection()
    users_collection = _get_users_collection()

    if payouts_collection is None:
        return {"status": "success", "page": page, "page_size": page_size, "total": 0, "payouts": []}

    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)

    # Build query
    query = {}
    if status != "all":
        query["status"] = status
    if seller_id != "all":
        query["seller_id"] = seller_id
    if period:
        query["period"] = period

    total = payouts_collection.count_documents(query)
    docs = list(
        payouts_collection.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )

    payouts = []
    for doc in docs:
        sid = doc.get("seller_id", "")
        seller_name = "Unknown"

        # Get seller name
        if sid and users_collection is not None:
            try:
                seller_user = users_collection.find_one({"_id": ObjectId(sid)})
                if seller_user:
                    seller_name = seller_user.get("name", "Unknown")
            except:
                pass

        payouts.append({
            "id": str(doc.get("_id")),
            "seller_id": sid,
            "seller_name": seller_name,
            "period": doc.get("period", ""),
            "total_sales": float(doc.get("total_sales", 0)),
            "commission_percent": doc.get("commission_percent", 5),
            "commission_amount": float(doc.get("commission_amount", 0)),
            "amount_to_pay": float(doc.get("amount_to_pay", 0)),
            "status": doc.get("status", "pending"),
            "notes": doc.get("notes", ""),
            "created_at": doc.get("created_at", ""),
            "paid_at": doc.get("paid_at"),
        })

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "payouts": payouts,
    }


@router.get("/payouts/admin/stats")
async def get_admin_payouts_stats(user=Depends(_require_admin)):
    """Get payout statistics for admin dashboard."""
    payouts_collection = _get_payouts_collection()

    if payouts_collection is None:
        return {
            "status": "success",
            "stats": {
                "total_payouts": 0,
                "pending_payouts": 0,
                "completed_payouts": 0,
                "total_pending_amount": 0,
                "total_paid_amount": 0,
            }
        }

    total_payouts = payouts_collection.count_documents({})
    pending_payouts = payouts_collection.count_documents({"status": "pending"})
    completed_payouts = payouts_collection.count_documents({"status": "completed"})

    # Calculate amounts
    pending_docs = list(payouts_collection.find({"status": "pending"}))
    total_pending = sum(float(doc.get("amount_to_pay", 0)) for doc in pending_docs)

    completed_docs = list(payouts_collection.find({"status": "completed"}))
    total_paid = sum(float(doc.get("amount_to_pay", 0)) for doc in completed_docs)

    return {
        "status": "success",
        "stats": {
            "total_payouts": total_payouts,
            "pending_payouts": pending_payouts,
            "completed_payouts": completed_payouts,
            "total_pending_amount": round(total_pending, 2),
            "total_paid_amount": round(total_paid, 2),
        }
    }


@router.put("/payouts/admin/{payout_id}/status")
async def update_payout_status(payout_id: str, body: PayoutStatusUpdateBody, user=Depends(_require_admin)):
    """Update payout status (admin only)."""
    payouts_collection = _get_payouts_collection()

    if payouts_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        oid = ObjectId(payout_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid payout ID")

    payout = payouts_collection.find_one({"_id": oid})
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    new_status = body.status.lower()
    if new_status not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    now = datetime.utcnow().isoformat()
    update_data = {
        "status": new_status,
        "updated_at": now,
    }

    if body.notes:
        update_data["notes"] = body.notes

    if new_status == "completed":
        update_data["paid_at"] = now

    payouts_collection.update_one({"_id": oid}, {"$set": update_data})

    return {
        "status": "success",
        "new_status": new_status,
        "message": f"Payout status updated to {new_status}",
    }


@router.get("/payouts/mysales")
async def get_seller_earnings(user=Depends(_require_seller)):
    """Get current seller's earnings summary and payout history."""
    payouts_collection = _get_payouts_collection()
    orders_collection = _get_orders_collection()
    products_collection = _get_products_collection()

    if payouts_collection is None or orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    seller_id = str(user.get("_id"))
    seller_name = user.get("name", "Seller")

    # Get seller's payouts
    payouts = list(payouts_collection.find({"seller_id": seller_id}).sort("created_at", -1))

    # Calculate current period earnings (current month)
    now = datetime.now()
    current_period = f"{now.year}-{now.month:02d}"

    current_month_payout = next(
        (p for p in payouts if p.get("period") == current_period),
        None
    )

    # If no payout for current month, calculate from orders
    current_total_sales = 0
    current_orders_count = 0

    if not current_month_payout:
        # Sum orders for current seller this month by matching product IDs
        if products_collection is not None:
            seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
            seller_product_ids = {str(p.get("_id")) for p in seller_products}
            all_orders = list(orders_collection.find({}))
            for order in all_orders:
                items = order.get("items", [])
                seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
                if seller_items:
                    order_date = order.get("created_at", "")
                    if isinstance(order_date, str) and order_date.startswith(current_period):
                        current_total_sales += sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
                        current_orders_count += 1
    else:
        current_total_sales = float(current_month_payout.get("total_sales", 0))
        current_orders_count = len(current_month_payout.get("orders", []))

    # Commission calculation (default 5%)
    commission_percent = 5
    commission_amount = (current_total_sales * commission_percent) / 100
    amount_to_pay = current_total_sales - commission_amount

    # Build payout history
    payout_history = []
    for payout in payouts:
        payout_history.append({
            "id": str(payout.get("_id", "")),
            "period": payout.get("period", ""),
            "total_sales": float(payout.get("total_sales", 0)),
            "commission_percent": payout.get("commission_percent", 5),
            "commission_amount": float(payout.get("commission_amount", 0)),
            "amount_to_pay": float(payout.get("amount_to_pay", 0)),
            "status": payout.get("status", "pending"),
            "created_at": payout.get("created_at", ""),
            "paid_at": payout.get("paid_at"),
        })

    return {
        "status": "success",
        "seller_name": seller_name,
        "current_period": {
            "period": current_period,
            "total_sales": round(current_total_sales, 2),
            "orders_count": current_orders_count,
            "commission_percent": commission_percent,
            "commission_amount": round(commission_amount, 2),
            "amount_to_pay": round(amount_to_pay, 2),
        },
        "payout_history": payout_history,
    }


# ============================================
# ADMIN USER MANAGEMENT
# ============================================

class ToggleUserStatusBody(BaseModel):
    reason: str = ""


class UpdateUserRoleBody(BaseModel):
    role: str


@router.get("/admin/users")
async def get_admin_users(
    page: int = 1,
    page_size: int = 20,
    role: str = "all",
    status: str = "all",
    search: str = "",
    user=Depends(_require_admin)
):
    """Get all users for admin management with filters."""
    db = get_db()
    users_collection = db["users"]

    query = {}
    if role != "all" and role in ["admin", "seller", "user"]:
        query["role"] = role
    if status != "all" and status in ["active", "inactive"]:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    total = users_collection.count_documents(query)
    skip = (max(page, 1) - 1) * page_size
    cursor = users_collection.find(query).skip(skip).limit(page_size).sort("created_at", -1)

    users_list = []
    for doc in cursor:
        user_id = str(doc["_id"])
        user_role = doc.get("role", "user")

        users_list.append({
            "id": user_id,
            "name": doc.get("name", ""),
            "email": doc.get("email", ""),
            "role": user_role,
            "status": doc.get("status", "active"),
            "avatar": doc.get("avatar", ""),
            "joined_at": doc.get("created_at", ""),
            "deactivation_reason": doc.get("deactivation_reason", ""),
        })

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "users": users_list,
    }


@router.get("/admin/users/stats")
async def get_admin_users_stats(user=Depends(_require_admin)):
    """Get user statistics for admin dashboard."""
    db = get_db()
    users_collection = db["users"]

    total = users_collection.count_documents({})
    admins = users_collection.count_documents({"role": "admin"})
    sellers = users_collection.count_documents({"role": "seller"})
    users_count = users_collection.count_documents({"role": "user"})
    active = users_collection.count_documents({"status": {"$ne": "inactive"}})
    inactive = users_collection.count_documents({"status": "inactive"})

    return {
        "status": "success",
        "stats": {
            "total": total,
            "admins": admins,
            "sellers": sellers,
            "users": users_count,
            "active": active,
            "inactive": inactive,
        }
    }


@router.put("/admin/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, body: ToggleUserStatusBody, user=Depends(_require_admin)):
    """Toggle user active/inactive status."""
    db = get_db()
    users_collection = db["users"]

    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    target_user = users_collection.find_one({"_id": oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    current_status = target_user.get("status", "active")
    new_status = "inactive" if current_status == "active" else "active"

    update_data = {"status": new_status}
    if new_status == "inactive":
        update_data["deactivation_reason"] = body.reason or "No reason provided"
        update_data["deactivated_at"] = datetime.utcnow().isoformat()
    else:
        update_data["deactivation_reason"] = ""
        update_data["reactivated_at"] = datetime.utcnow().isoformat()

    users_collection.update_one({"_id": oid}, {"$set": update_data})

    return {
        "status": "success",
        "new_status": new_status,
        "user_id": user_id,
        "message": f"User {'deactivated' if new_status == 'inactive' else 'activated'} successfully",
    }


@router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, body: UpdateUserRoleBody, user=Depends(_require_admin)):
    """Update user role."""
    db = get_db()
    users_collection = db["users"]

    allowed_roles = ["user", "seller", "admin"]
    if body.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(allowed_roles)}")

    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    target_user = users_collection.find_one({"_id": oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = target_user.get("role", "user")
    users_collection.update_one({"_id": oid}, {"$set": {"role": body.role, "role_updated_at": datetime.utcnow().isoformat()}})

    return {
        "status": "success",
        "old_role": old_role,
        "new_role": body.role,
        "user_id": user_id,
        "message": f"User role updated from {old_role} to {body.role}",
    }


@router.get("/admin/users/{user_id}")
async def get_admin_user_detail(user_id: str, user=Depends(_require_admin)):
    """Get detailed user information for admin view."""
    db = get_db()
    users_collection = db["users"]

    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    target_user = users_collection.find_one({"_id": oid})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_role = target_user.get("role", "user")

    return {
        "status": "success",
        "user": {
            "id": str(target_user["_id"]),
            "name": target_user.get("name", ""),
            "email": target_user.get("email", ""),
            "role": user_role,
            "status": target_user.get("status", "active"),
            "avatar": target_user.get("avatar", ""),
            "joined_at": target_user.get("created_at", ""),
            "deactivation_reason": target_user.get("deactivation_reason", ""),
            "deactivated_at": target_user.get("deactivated_at", ""),
            "reactivated_at": target_user.get("reactivated_at", ""),
        }
    }


# ============================================
# ADMIN USER ANALYTICS
# ============================================

@router.get("/admin/analytics/users/kpis")
async def get_admin_user_analytics_kpis(user=Depends(_require_admin)):
    """Get user KPI summary with percentage changes vs last 30 days."""
    db = get_db()
    users_collection = db["users"]

    now = datetime.utcnow()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    sixty_days_ago = (now - timedelta(days=60)).isoformat()

    # Current totals
    total_users = users_collection.count_documents({})
    active_users = users_collection.count_documents({"status": {"$ne": "inactive"}})
    verified_sellers = users_collection.count_documents({"role": "seller", "status": {"$ne": "inactive"}})
    disabled_users = users_collection.count_documents({"status": "inactive"})

    # Signups in last 30 days vs previous 30 days for % change
    new_last_30 = users_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})
    new_prev_30 = users_collection.count_documents({
        "created_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
    })

    # Sellers created in last/prev 30 days
    seller_last_30 = users_collection.count_documents({
        "role": "seller", "created_at": {"$gte": thirty_days_ago}
    })
    seller_prev_30 = users_collection.count_documents({
        "role": "seller", "created_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
    })

    # Disabled in last/prev 30 days
    disabled_last_30 = users_collection.count_documents({
        "status": "inactive", "deactivated_at": {"$gte": thirty_days_ago}
    })
    disabled_prev_30 = users_collection.count_documents({
        "status": "inactive", "deactivated_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}
    })

    def pct_change(current, previous):
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    return {
        "status": "success",
        "kpis": {
            "total_users": total_users,
            "active_users": active_users,
            "verified_sellers": verified_sellers,
            "disabled_users": disabled_users,
            "total_change": pct_change(new_last_30, new_prev_30),
            "active_change": pct_change(new_last_30, new_prev_30),
            "sellers_change": pct_change(seller_last_30, seller_prev_30),
            "disabled_change": pct_change(disabled_last_30, disabled_prev_30),
        }
    }


@router.get("/admin/analytics/users/segmentation")
async def get_admin_user_analytics_segmentation(user=Depends(_require_admin)):
    """Get user segmentation data for donut and progress bars."""
    db = get_db()
    users_collection = db["users"]

    total = users_collection.count_documents({})
    roles = {
        "Regular Users": users_collection.count_documents({"role": "user"}),
        "Sellers": users_collection.count_documents({"role": "seller"}),
        "Admins": users_collection.count_documents({"role": "admin"}),
    }
    statuses = {
        "Active": users_collection.count_documents({"status": {"$ne": "inactive"}}),
        "Inactive": users_collection.count_documents({"status": "inactive"}),
    }

    return {
        "status": "success",
        "total": total,
        "roles": roles,
        "statuses": statuses,
    }


# ============================================
# ADMIN MARKET ANALYTICS
# ============================================

@router.get("/admin/analytics/market/kpis")
async def get_admin_market_kpis(user=Depends(_require_admin)):
    """Get market KPI summary: revenue, orders, products, sellers, stocks, avg order."""
    db = get_db()
    orders_col = _get_orders_collection()
    products_col = _get_products_collection()
    users_col = db["users"]

    now = datetime.utcnow()
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    sixty_days_ago = (now - timedelta(days=60)).isoformat()

    # Totals
    total_orders = orders_col.count_documents({}) if orders_col is not None else 0
    delivered_orders = orders_col.count_documents({"status": "delivered"}) if orders_col is not None else 0
    pending_orders = orders_col.count_documents({"status": "pending"}) if orders_col is not None else 0
    cancelled_orders = orders_col.count_documents({"status": "cancelled"}) if orders_col is not None else 0

    # Revenue (delivered only)
    revenue_docs = list(orders_col.find({"status": "delivered"}, {"total": 1})) if orders_col is not None else []
    total_revenue = sum(float(d.get("total", 0)) for d in revenue_docs)

    # Total sales (all orders)
    all_order_docs = list(orders_col.find({}, {"total": 1})) if orders_col is not None else []
    total_sales = sum(float(d.get("total", 0)) for d in all_order_docs)
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0

    # Products & stock
    total_products = products_col.count_documents({}) if products_col is not None else 0
    active_products = products_col.count_documents({"is_disabled": {"$ne": True}}) if products_col is not None else 0
    all_products = list(products_col.find({}, {"stock_qty": 1})) if products_col is not None else []
    total_stock = sum(int(p.get("stock_qty", 0)) for p in all_products)
    out_of_stock = products_col.count_documents({"stock_qty": {"$lte": 0}, "is_disabled": {"$ne": True}}) if products_col is not None else 0

    # Sellers
    total_sellers = users_col.count_documents({"role": "seller"})
    active_sellers = users_col.count_documents({"role": "seller", "status": {"$ne": "inactive"}})

    # % changes (orders last 30 vs prev 30)
    orders_last_30 = orders_col.count_documents({"created_at": {"$gte": thirty_days_ago}}) if orders_col is not None else 0
    orders_prev_30 = orders_col.count_documents({"created_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}}) if orders_col is not None else 0

    rev_last_30_docs = list(orders_col.find({"status": "delivered", "created_at": {"$gte": thirty_days_ago}}, {"total": 1})) if orders_col is not None else []
    rev_prev_30_docs = list(orders_col.find({"status": "delivered", "created_at": {"$gte": sixty_days_ago, "$lt": thirty_days_ago}}, {"total": 1})) if orders_col is not None else []
    rev_last_30 = sum(float(d.get("total", 0)) for d in rev_last_30_docs)
    rev_prev_30 = sum(float(d.get("total", 0)) for d in rev_prev_30_docs)

    def pct(c, p):
        if p == 0:
            return 100.0 if c > 0 else 0.0
        return round(((c - p) / p) * 100, 1)

    return {
        "status": "success",
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "total_sales": round(total_sales, 2),
            "total_orders": total_orders,
            "delivered_orders": delivered_orders,
            "pending_orders": pending_orders,
            "cancelled_orders": cancelled_orders,
            "avg_order_value": round(avg_order_value, 2),
            "total_products": total_products,
            "active_products": active_products,
            "total_stock": total_stock,
            "out_of_stock": out_of_stock,
            "total_sellers": total_sellers,
            "active_sellers": active_sellers,
            "revenue_change": pct(rev_last_30, rev_prev_30),
            "orders_change": pct(orders_last_30, orders_prev_30),
        }
    }


@router.get("/admin/analytics/market/segmentation")
async def get_admin_market_segmentation(user=Depends(_require_admin)):
    """Get market segmentation: orders by status, products by category, top sellers."""
    orders_col = _get_orders_collection()
    products_col = _get_products_collection()

    # Orders by status
    order_statuses = {}
    total_orders = 0
    if orders_col is not None:
        for s in ["pending", "confirmed", "shipped", "delivered", "cancelled"]:
            c = orders_col.count_documents({"status": s})
            order_statuses[s.capitalize()] = c
            total_orders += c

    # Products by category
    category_breakdown = {}
    if products_col is not None:
        all_prods = list(products_col.find({"is_disabled": {"$ne": True}}, {"category_name": 1}))
        for p in all_prods:
            cat = p.get("category_name") or "Uncategorized"
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    # Top sellers by order count
    top_sellers = []
    if orders_col is not None:
        pipeline = [
            {"$group": {"_id": "$seller_id", "seller_name": {"$first": "$seller_name"}, "order_count": {"$sum": 1}, "revenue": {"$sum": {"$toDouble": "$total"}}}},
            {"$sort": {"revenue": -1}},
            {"$limit": 10},
        ]
        try:
            agg = list(orders_col.aggregate(pipeline))
            top_sellers = [{"seller_id": str(a["_id"]), "seller_name": a.get("seller_name", "Unknown"), "order_count": a["order_count"], "revenue": round(a["revenue"], 2)} for a in agg]
        except:
            pass

    return {
        "status": "success",
        "total_orders": total_orders,
        "order_statuses": order_statuses,
        "category_breakdown": category_breakdown,
        "top_sellers": top_sellers,
    }


# ============================================
# ADMIN AUDIT LOGS
# ============================================

@router.get("/admin/audit-logs")
async def get_admin_audit_logs(
    category: Optional[str] = None,
    status: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = 200,
    user=Depends(_require_admin)
):
    """Get audit logs for admin. Returns recent activity logs."""
    collection = _get_audit_logs_collection()
    if collection is None:
        return {"status": "success", "entries": []}

    query = {}
    if category and category.lower() not in ("all", ""):
        query["category"] = category
    if status and status.lower() not in ("all", ""):
        query["status"] = status
    if actor:
        query["actor"] = {"$regex": re.escape(actor), "$options": "i"}

    safe_limit = min(max(limit, 1), 500)
    try:
        cursor = collection.find(query).sort("timestamp", -1).limit(safe_limit)
        entries = []
        for doc in cursor:
            entries.append({
                "id": doc.get("id") or str(doc.get("_id")),
                "timestamp": doc.get("timestamp") or "",
                "userName": doc.get("actor") or "System",
                "role": doc.get("role") or "system",
                "action": doc.get("action") or "other",
                "category": doc.get("category") or "General",
                "entity": doc.get("entity") or "",
                "entityId": doc.get("entity_id") or "",
                "description": doc.get("details") or doc.get("description") or "",
                "ipAddress": doc.get("ip") or "",
                "resource": doc.get("category") or "",
            })
        return {"status": "success", "entries": entries}
    except Exception as e:
        print(f"Error fetching audit logs: {e}")
        return {"status": "success", "entries": []}

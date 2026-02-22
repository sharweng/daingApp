"""
Ecommerce Module
================
Routes for product catalog, cart, wishlist, and orders.
Merged from daingGraderWeb backend.
"""

import re
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File
from pydantic import BaseModel
from bson import ObjectId
import cloudinary
import cloudinary.uploader

from .config import get_db
from .auth import get_current_user_web, require_seller_user

router = APIRouter()


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
    """Get current user from Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    
    from .auth import _init_firebase_admin, _verify_firebase_token, JWT_SECRET, JWT_ALGORITHM
    from jose import jwt as jose_jwt
    
    db = get_db()
    user = None
    
    # Try Firebase auth first
    if _init_firebase_admin():
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


class ProductUpdateBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[str] = None
    stock_qty: Optional[int] = None
    status: Optional[str] = None
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
        query["name"] = {"$regex": re.escape(search), "$options": "i"}
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
    if cart_collection is None or orders_collection is None or products_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")

    user_id = str(user.get("_id"))
    cart_doc = cart_collection.find_one({"user_id": user_id})
    if not cart_doc or not cart_doc.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

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
        
        order_doc = {
            "user_id": user_id,
            "seller_id": group.get("seller_id", ""),
            "seller_name": group.get("seller_name", ""),
            "order_number": order_number,
            "status": order_status,
            "total": float(group.get("total", 0)),
            "total_items": int(group.get("total_items", 0)),
            "payment_method": body.payment_method,
            "payment_status": payment_status,
            "paid_at": paid_at,
            "address": body.address.dict(),
            "items": group.get("items", []),
            "created_at": now,
            "updated_at": now,
        }
        result = orders_collection.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        created_orders.append(order_doc)

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
    orders_collection = _get_orders_collection()
    if orders_collection is None:
        raise HTTPException(status_code=500, detail="Database not configured")
    if page < 1 or page_size < 1 or page_size > 50:
        raise HTTPException(status_code=400, detail="Invalid pagination parameters")

    seller_id = str(user.get("_id"))
    total = orders_collection.count_documents({"seller_id": seller_id})
    docs = list(
        orders_collection.find({"seller_id": seller_id})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    return {"status": "success", "orders": [_normalize_order(d) for d in docs], "total": total}


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
    if body.category_id and categories_collection:
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
    if body.main_image_index is not None:
        updates["main_image_index"] = int(body.main_image_index)
    if body.category_id is not None and categories_collection:
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

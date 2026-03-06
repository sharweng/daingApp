"""Community Forum API endpoints - Posts, Comments, Stats."""
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, List
import re
import cloudinary
import cloudinary.uploader
from better_profanity import profanity

from app.config import get_db
from app.auth import get_current_user_web, require_admin_user

router = APIRouter(tags=["community"])

# Initialize profanity filter with custom Filipino words
CUSTOM_BAD_WORDS = [
    "puta", "gago", "tangina", "bobo", "tanga", "putangina", "leche", "tarantado",
    "ulol", "inutil", "hayop", "pakyu", "kupal"
]
profanity.add_censor_words(CUSTOM_BAD_WORDS)


# --- Helper Functions ---

def _get_community_collection():
    """Return community_posts collection from MongoDB."""
    try:
        return get_db()["community_posts"]
    except Exception:
        return None


def _get_comments_collection():
    """Return community_comments collection from MongoDB."""
    try:
        return get_db()["community_comments"]
    except Exception:
        return None


def _get_users_collection():
    """Return users collection from MongoDB."""
    try:
        return get_db()["users"]
    except Exception:
        return None


def _censor_bad_words(text: str) -> str:
    """Replace bad words with asterisks using better-profanity."""
    if not text:
        return text
    return profanity.censor(text)


def _normalize_community_post(doc):
    """Normalize a community post document to a standard format."""
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "images": doc.get("images", []),
        "category": doc.get("category", "Discussion"),
        "likes": doc.get("likes", 0),
        "comments_count": doc.get("comments_count", 0),
        "shares": doc.get("shares", 0),
        "author_id": doc.get("author_id", ""),
        "author_name": doc.get("author_name", "Anonymous"),
        "author_avatar": doc.get("author_avatar", ""),
        "created_at": doc.get("created_at", ""),
        "liked_by": doc.get("liked_by", []),
    }


# --- Pydantic Models ---

class TogglePostStatusBody(BaseModel):
    reason: str = ""


class ToggleCommentStatusBody(BaseModel):
    reason: str = ""


# --- Public Community Endpoints ---

@router.get("/community/posts")
def get_community_posts(page: int = 1, page_size: int = 12, category: str = "All", search: str = ""):
    """Get paginated community posts (excludes deleted posts)."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)

    collection = _get_community_collection()
    comments_collection = _get_comments_collection()
    if collection is None:
        return {"status": "error", "message": "Database not available"}

    # Build query filter - exclude deleted and disabled posts for public view
    query = {"$and": [
        {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
        {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
    ]}
    if category and category != "All":
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    total = collection.count_documents(query)
    cursor = collection.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)

    posts = []
    for doc in cursor:
        post_id = str(doc["_id"])
        # Calculate actual comment count (exclude deleted/disabled)
        actual_comment_count = 0
        if comments_collection is not None:
            actual_comment_count = comments_collection.count_documents({
                "post_id": post_id,
                "$and": [
                    {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
                    {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
                ]
            })
        posts.append({
            "id": post_id,
            "title": doc.get("title", ""),
            "description": doc.get("description", ""),
            "images": doc.get("images", []),
            "category": doc.get("category", "Discussion"),
            "author_id": doc.get("author_id", ""),
            "author_name": doc.get("author_name", "Anonymous"),
            "author_avatar": doc.get("author_avatar", ""),
            "likes": doc.get("likes", 0),
            "liked_by": doc.get("liked_by", []),
            "comments_count": actual_comment_count,
            "shares": doc.get("shares", 0),
            "created_at": doc.get("created_at", ""),
        })

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "posts": posts,
    }


@router.get("/community/posts/featured")
def get_featured_posts(limit: int = 6):
    """Get featured posts for community forum carousels: top, trending, showcase, tips."""
    collection = _get_community_collection()
    if collection is None:
        return {"status": "success", "top": [], "trending": [], "showcase": [], "tips": []}

    # Only get active posts
    base_query = {
        "$and": [
            {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
            {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
        ]
    }

    # Top Posts: Most liked overall
    top_posts = list(collection.find(base_query).sort("likes", -1).limit(limit))

    # Trending: Recent posts with high engagement (combined likes + comments in last 7 days)
    week_ago = (datetime.now() - timedelta(days=7)).isoformat()
    trending_query = {**base_query, "created_at": {"$gte": week_ago}}
    trending_posts = list(collection.find(trending_query).sort([("likes", -1), ("comments_count", -1)]).limit(limit))

    # Showcase: Category = Showcase
    showcase_query = {**base_query, "category": "Showcase"}
    showcase_posts = list(collection.find(showcase_query).sort("created_at", -1).limit(limit))

    # Tips: Category = Tips
    tips_query = {**base_query, "category": "Tips"}
    tips_posts = list(collection.find(tips_query).sort("created_at", -1).limit(limit))

    return {
        "status": "success",
        "top": [_normalize_community_post(p) for p in top_posts],
        "trending": [_normalize_community_post(p) for p in trending_posts],
        "showcase": [_normalize_community_post(p) for p in showcase_posts],
        "tips": [_normalize_community_post(p) for p in tips_posts],
    }


@router.get("/community/posts/top/liked")
def get_most_liked_posts(limit: int = 7):
    """Get most liked community posts (excludes deleted/disabled). Default 7 for carousel."""
    collection = _get_community_collection()
    if collection is None:
        return {"status": "success", "posts": []}

    # Only get active posts
    query = {
        "$and": [
            {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
            {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
        ]
    }
    cursor = collection.find(query).sort("likes", -1).limit(limit)
    posts = [_normalize_community_post(doc) for doc in cursor]
    return {"status": "success", "posts": posts}


@router.get("/community/posts/by-category/{category}")
def get_posts_by_category(category: str, limit: int = 7):
    """Get posts filtered by category for horizontal carousel."""
    collection = _get_community_collection()
    if collection is None:
        return {"status": "success", "posts": []}

    base_query = {
        "$and": [
            {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
            {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
        ]
    }

    if category and category != "All":
        base_query["category"] = category

    cursor = collection.find(base_query).sort("created_at", -1).limit(limit)
    posts = [_normalize_community_post(doc) for doc in cursor]
    return {"status": "success", "posts": posts}


@router.get("/community/posts/me")
def get_my_community_posts(page: int = 1, page_size: int = 10, user=Depends(get_current_user_web)):
    """Get current user's community posts, including deleted/disabled status."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)

    collection = _get_community_collection()
    if collection is None:
        return {"status": "success", "page": page, "page_size": page_size, "total": 0, "posts": []}

    user_id = str(user.get("_id", user.get("id", "")))
    query = {"author_id": user_id}

    total = collection.count_documents(query)
    cursor = collection.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    posts = []
    for doc in cursor:
        is_deleted = doc.get("is_deleted", False)
        is_disabled = doc.get("is_disabled", False)
        status = "deleted" if is_deleted else "draft" if is_disabled else "published"
        posts.append({
            "id": str(doc.get("_id")),
            "title": doc.get("title", ""),
            "description": doc.get("description", ""),
            "images": doc.get("images", []),
            "category": doc.get("category", "Discussion"),
            "author_id": doc.get("author_id", ""),
            "author_name": doc.get("author_name", "Anonymous"),
            "comments_count": doc.get("comments_count", 0),
            "likes": doc.get("likes", 0),
            "created_at": doc.get("created_at", ""),
            "status": status,
        })

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "posts": posts,
    }


@router.get("/community/posts/{post_id}")
def get_community_post(post_id: str):
    """Get a single post with its comments."""
    collection = _get_community_collection()
    comments_collection = _get_comments_collection()

    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get comments - exclude deleted and disabled for public view
    comments = []
    if comments_collection is not None:
        cursor = comments_collection.find({
            "post_id": post_id,
            "$and": [
                {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
                {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
            ]
        }).sort("created_at", 1)
        for doc in cursor:
            comments.append({
                "id": str(doc["_id"]),
                "post_id": doc.get("post_id", ""),
                "author_id": doc.get("author_id", ""),
                "author_name": doc.get("author_name", "Anonymous"),
                "text": doc.get("text", ""),
                "created_at": doc.get("created_at", ""),
            })

    return {
        "status": "success",
        "post": {
            "id": str(post["_id"]),
            "title": post.get("title", ""),
            "description": post.get("description", ""),
            "images": post.get("images", []),
            "category": post.get("category", "Discussion"),
            "author_id": post.get("author_id", ""),
            "author_name": post.get("author_name", "Anonymous"),
            "author_avatar": post.get("author_avatar", ""),
            "likes": post.get("likes", 0),
            "liked_by": post.get("liked_by", []),
            "comments_count": len(comments),
            "shares": post.get("shares", 0),
            "created_at": post.get("created_at", ""),
        },
        "comments": comments,
    }


@router.post("/community/posts")
def create_community_post(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form("Discussion"),
    images: List[UploadFile] = File(default=[]),
    user=Depends(get_current_user_web),
):
    """Create a new community post with up to 3 images."""
    collection = _get_community_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    # Validate max 3 images
    if len(images) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images allowed per post")

    # Upload images to Cloudinary
    image_urls = []
    for img in images:
        if img.filename:
            try:
                contents = img.file.read()
                result = cloudinary.uploader.upload(
                    contents,
                    folder="community-posts",
                    resource_type="image",
                )
                image_urls.append(result.get("secure_url"))
            except Exception as e:
                print(f"Failed to upload image: {e}")

    # Create post document
    now = datetime.now().isoformat()
    post_doc = {
        "title": _censor_bad_words(title.strip()),
        "description": _censor_bad_words(description.strip()),
        "category": category,
        "images": image_urls,
        "author_id": str(user.get("_id", user.get("id", ""))),
        "author_name": user.get("name", "Anonymous"),
        "author_avatar": user.get("avatar", ""),
        "likes": 0,
        "liked_by": [],
        "comments_count": 0,
        "shares": 0,
        "created_at": now,
    }

    result = collection.insert_one(post_doc)
    post_doc["id"] = str(result.inserted_id)
    if "_id" in post_doc:
        del post_doc["_id"]

    return {"status": "success", "post": post_doc}


@router.post("/community/posts/{post_id}/like")
def toggle_like_post(post_id: str, user=Depends(get_current_user_web)):
    """Toggle like on a post."""
    collection = _get_community_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = str(user.get("_id", user.get("id", "")))
    liked_by = post.get("liked_by", [])

    if user_id in liked_by:
        # Unlike
        collection.update_one(
            {"_id": oid},
            {"$pull": {"liked_by": user_id}, "$inc": {"likes": -1}}
        )
        liked = False
    else:
        # Like
        collection.update_one(
            {"_id": oid},
            {"$push": {"liked_by": user_id}, "$inc": {"likes": 1}}
        )
        liked = True

    updated = collection.find_one({"_id": oid})

    return {"status": "success", "liked": liked, "likes": updated.get("likes", 0)}


@router.put("/community/posts/{post_id}")
def edit_community_post(
    post_id: str,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form("Discussion"),
    user=Depends(get_current_user_web),
):
    """Edit own post - only the post owner can edit."""
    collection = _get_community_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = str(user.get("_id", user.get("id", "")))

    # Only owner can edit
    if post.get("author_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    # Censor bad words
    censored_title = _censor_bad_words(title.strip())
    censored_description = _censor_bad_words(description.strip())

    collection.update_one(
        {"_id": oid},
        {"$set": {
            "title": censored_title,
            "description": censored_description,
            "category": category,
            "updated_at": datetime.now().isoformat(),
        }}
    )

    updated = collection.find_one({"_id": oid})
    return {
        "status": "success",
        "post": {
            "id": str(updated["_id"]),
            "title": updated.get("title", ""),
            "description": updated.get("description", ""),
            "category": updated.get("category", "Discussion"),
        }
    }


@router.delete("/community/posts/{post_id}")
def delete_community_post(post_id: str, user=Depends(get_current_user_web)):
    """Soft delete own post or admin can delete any - marks as deleted instead of removing."""
    collection = _get_community_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = str(user.get("_id", user.get("id", "")))
    user_role = (user.get("role") or "user").strip().lower()

    # Check ownership or admin
    if post.get("author_id") != user_id and user_role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    # Soft delete - mark as deleted instead of removing
    now = datetime.now().isoformat()
    collection.update_one({"_id": oid}, {"$set": {
        "is_deleted": True,
        "deleted_at": now,
        "updated_at": now,
    }})

    return {"status": "success", "message": "Post deleted"}


@router.post("/community/posts/{post_id}/comments")
def add_comment(post_id: str, text: str = Form(...), user=Depends(get_current_user_web)):
    """Add a comment to a post."""
    collection = _get_community_collection()
    comments_collection = _get_comments_collection()

    if collection is None or comments_collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Censor bad words
    censored_text = _censor_bad_words(text.strip())

    comment_doc = {
        "post_id": post_id,
        "author_id": str(user.get("_id", user.get("id", ""))),
        "author_name": user.get("name", "Anonymous"),
        "text": censored_text,
        "created_at": datetime.now().isoformat(),
    }

    result = comments_collection.insert_one(comment_doc)

    # Update comments count on post
    collection.update_one({"_id": oid}, {"$inc": {"comments_count": 1}})

    comment_doc["id"] = str(result.inserted_id)
    if "_id" in comment_doc:
        del comment_doc["_id"]

    return {"status": "success", "comment": comment_doc}


@router.delete("/community/comments/{comment_id}")
def delete_comment(comment_id: str, user=Depends(get_current_user_web)):
    """Soft delete own comment or admin can delete any - marks as deleted instead of removing."""
    comments_collection = _get_comments_collection()
    collection = _get_community_collection()

    if comments_collection is None or collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(comment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid comment ID")

    comment = comments_collection.find_one({"_id": oid})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = str(user.get("_id", user.get("id", "")))
    user_role = (user.get("role") or "user").strip().lower()

    if comment.get("author_id") != user_id and user_role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    # Soft delete - mark as deleted instead of removing
    now = datetime.now().isoformat()
    comments_collection.update_one({"_id": oid}, {"$set": {
        "is_deleted": True,
        "deleted_at": now,
    }})

    # Decrement comments count on the post
    post_id = comment.get("post_id")
    if post_id:
        try:
            post_oid = ObjectId(post_id)
            collection.update_one({"_id": post_oid}, {"$inc": {"comments_count": -1}})
        except:
            pass  # Ignore if post_id is invalid

    return {"status": "success", "message": "Comment deleted"}


@router.put("/community/comments/{comment_id}")
@router.patch("/community/comments/{comment_id}")
def edit_comment(comment_id: str, text: str = Form(...), user=Depends(get_current_user_web)):
    """Edit own comment - only the comment owner can edit. Supports both PUT and PATCH."""
    comments_collection = _get_comments_collection()

    if comments_collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(comment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid comment ID")

    comment = comments_collection.find_one({"_id": oid})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = str(user.get("_id", user.get("id", "")))

    # Only owner can edit
    if comment.get("author_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    # Censor bad words
    censored_text = _censor_bad_words(text.strip())

    comments_collection.update_one(
        {"_id": oid},
        {"$set": {
            "text": censored_text,
            "updated_at": datetime.now().isoformat(),
        }}
    )

    updated = comments_collection.find_one({"_id": oid})
    return {
        "status": "success",
        "comment": {
            "id": str(updated["_id"]),
            "post_id": updated.get("post_id", ""),
            "author_id": updated.get("author_id", ""),
            "author_name": updated.get("author_name", "Anonymous"),
            "text": updated.get("text", ""),
            "created_at": updated.get("created_at", ""),
            "updated_at": updated.get("updated_at", ""),
        }
    }


@router.get("/community/stats")
def get_community_stats():
    """Get community statistics for sidebar (total users, posts, comments)."""
    users_collection = _get_users_collection()
    posts_collection = _get_community_collection()
    comments_collection = _get_comments_collection()

    total_users = 0
    total_posts = 0
    total_comments = 0

    if users_collection is not None:
        total_users = users_collection.count_documents({})

    if posts_collection is not None:
        total_posts = posts_collection.count_documents({
            "$and": [
                {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
                {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
            ]
        })

    if comments_collection is not None:
        total_comments = comments_collection.count_documents({
            "$and": [
                {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
                {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
            ]
        })

    return {
        "status": "success",
        "total_users": total_users,
        "total_posts": total_posts,
        "total_comments": total_comments
    }


# --- Admin Community Posts Management ---

@router.get("/admin/posts")
def get_admin_posts(
    page: int = 1,
    page_size: int = 20,
    status: str = "all",
    search: str = "",
    category: str = "all",
    user=Depends(require_admin_user)
):
    """Get all community posts for admin management (including deleted/disabled)."""
    collection = _get_community_collection()
    if collection is None:
        return {"status": "error", "message": "Database not available"}

    page = max(page, 1)
    page_size = min(max(page_size, 1), 50)

    # Build query - admin sees ALL posts
    query = {}
    if status == "active":
        query["$and"] = [
            {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
            {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
        ]
    elif status == "deleted":
        query["is_deleted"] = True
    elif status == "disabled":
        query["is_disabled"] = True

    if category and category != "all":
        query["category"] = category

    if search:
        search_query = {"$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"author_name": {"$regex": search, "$options": "i"}},
        ]}
        if query:
            query = {"$and": [query, search_query]}
        else:
            query = search_query

    total = collection.count_documents(query)
    skip = (page - 1) * page_size
    cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)

    # Get comments collection for counts
    comments_collection = _get_comments_collection()

    posts = []
    for doc in cursor:
        # Determine status
        post_status = "active"
        if doc.get("is_disabled"):
            post_status = "disabled"
        elif doc.get("is_deleted"):
            post_status = "deleted"

        # Get actual comments count (including deleted for admin)
        total_comments = 0
        if comments_collection is not None:
            total_comments = comments_collection.count_documents({"post_id": str(doc["_id"])})

        posts.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", ""),
            "description": doc.get("description", ""),
            "images": doc.get("images", []),
            "category": doc.get("category", "Discussion"),
            "author_id": doc.get("author_id", ""),
            "author_name": doc.get("author_name", "Anonymous"),
            "author_avatar": doc.get("author_avatar", ""),
            "likes": doc.get("likes", 0),
            "comments_count": total_comments,
            "status": post_status,
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", doc.get("deleted_at", "")),
            "disable_reason": doc.get("disable_reason", ""),
        })

    return {
        "status": "success",
        "page": page,
        "page_size": page_size,
        "total": total,
        "posts": posts,
    }


@router.get("/admin/posts/stats")
def get_admin_posts_stats(user=Depends(require_admin_user)):
    """Get community posts statistics for admin dashboard."""
    collection = _get_community_collection()
    if collection is None:
        return {"status": "error", "message": "Database not available"}

    total = collection.count_documents({})
    active = collection.count_documents({
        "$and": [
            {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
            {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
        ]
    })
    deleted = collection.count_documents({"is_deleted": True})
    disabled = collection.count_documents({"is_disabled": True})

    # Get comments stats
    comments_collection = _get_comments_collection()
    total_comments = 0
    active_comments = 0
    deleted_comments = 0
    disabled_comments = 0
    if comments_collection is not None:
        total_comments = comments_collection.count_documents({})
        active_comments = comments_collection.count_documents({
            "$and": [
                {"$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}]},
                {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
            ]
        })
        deleted_comments = comments_collection.count_documents({"is_deleted": True})
        disabled_comments = comments_collection.count_documents({"is_disabled": True})

    return {
        "status": "success",
        "stats": {
            "total_posts": total,
            "active_posts": active,
            "deleted_posts": deleted,
            "disabled_posts": disabled,
            "total_comments": total_comments,
            "active_comments": active_comments,
            "deleted_comments": deleted_comments,
            "disabled_comments": disabled_comments,
        }
    }


@router.put("/admin/posts/{post_id}/toggle-status")
def toggle_post_status(post_id: str, body: TogglePostStatusBody, user=Depends(require_admin_user)):
    """Toggle post disabled status (admin only)."""
    collection = _get_community_collection()
    if collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    is_disabled = post.get("is_disabled", False)
    new_status = not is_disabled
    now = datetime.now().isoformat()

    update_data = {
        "is_disabled": new_status,
        "updated_at": now,
    }

    if new_status:
        update_data["disable_reason"] = body.reason or "Disabled by admin"
        update_data["disabled_at"] = now
        update_data["disabled_by"] = str(user.get("_id", user.get("id", "")))
    else:
        update_data["disable_reason"] = ""
        update_data["enabled_at"] = now

    collection.update_one({"_id": oid}, {"$set": update_data})

    return {
        "status": "success",
        "post_id": post_id,
        "new_status": "disabled" if new_status else "active",
        "message": f"Post {'disabled' if new_status else 'enabled'} successfully",
    }


@router.get("/admin/posts/{post_id}/comments")
def get_admin_post_comments(post_id: str, user=Depends(require_admin_user)):
    """Get all comments for a post (including deleted/disabled) - admin only."""
    collection = _get_community_collection()
    comments_collection = _get_comments_collection()

    if collection is None or comments_collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(post_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid post ID")

    post = collection.find_one({"_id": oid})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Get ALL comments including deleted and disabled
    cursor = comments_collection.find({"post_id": post_id}).sort("created_at", 1)

    comments = []
    for doc in cursor:
        # Determine status
        comment_status = "active"
        if doc.get("is_disabled"):
            comment_status = "disabled"
        elif doc.get("is_deleted"):
            comment_status = "deleted"

        comments.append({
            "id": str(doc["_id"]),
            "post_id": doc.get("post_id", ""),
            "author_id": doc.get("author_id", ""),
            "author_name": doc.get("author_name", "Anonymous"),
            "text": doc.get("text", ""),
            "status": comment_status,
            "created_at": doc.get("created_at", ""),
            "deleted_at": doc.get("deleted_at", ""),
            "disable_reason": doc.get("disable_reason", ""),
        })

    # Determine post status
    post_status = "active"
    if post.get("is_disabled"):
        post_status = "disabled"
    elif post.get("is_deleted"):
        post_status = "deleted"

    return {
        "status": "success",
        "post": {
            "id": str(post["_id"]),
            "title": post.get("title", ""),
            "description": post.get("description", ""),
            "images": post.get("images", []),
            "category": post.get("category", "Discussion"),
            "author_id": post.get("author_id", ""),
            "author_name": post.get("author_name", "Anonymous"),
            "author_avatar": post.get("author_avatar", ""),
            "likes": post.get("likes", 0),
            "status": post_status,
            "created_at": post.get("created_at", ""),
            "disable_reason": post.get("disable_reason", ""),
        },
        "comments": comments,
        "total_comments": len(comments),
    }


@router.put("/admin/comments/{comment_id}/toggle-status")
def toggle_comment_status(comment_id: str, body: ToggleCommentStatusBody, user=Depends(require_admin_user)):
    """Toggle comment disabled status (admin only)."""
    comments_collection = _get_comments_collection()
    if comments_collection is None:
        raise HTTPException(status_code=500, detail="Database not available")

    try:
        oid = ObjectId(comment_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid comment ID")

    comment = comments_collection.find_one({"_id": oid})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    is_disabled = comment.get("is_disabled", False)
    new_status = not is_disabled
    now = datetime.now().isoformat()

    update_data = {
        "is_disabled": new_status,
    }

    if new_status:
        update_data["disable_reason"] = body.reason or "Disabled by admin"
        update_data["disabled_at"] = now
        update_data["disabled_by"] = str(user.get("_id", user.get("id", "")))
    else:
        update_data["disable_reason"] = ""
        update_data["enabled_at"] = now

    comments_collection.update_one({"_id": oid}, {"$set": update_data})

    return {
        "status": "success",
        "comment_id": comment_id,
        "new_status": "disabled" if new_status else "active",
        "message": f"Comment {'disabled' if new_status else 'enabled'} successfully",
    }

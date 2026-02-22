"""
API Routes Module
=================
FastAPI route handlers for all endpoints.
"""

import io
import cv2
import numpy as np
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Header, HTTPException
from starlette.responses import StreamingResponse
import cloudinary
import cloudinary.uploader

from .model import get_model, run_inference
from .color_analysis import analyze_color_consistency_with_masks, analyze_color_consistency_with_boxes
from .mold_analysis import analyze_mold_with_masks, analyze_mold_with_boxes
from .drawing import draw_combined_result_image, draw_no_detection_image
from .history import (
    add_history_entry,
    remove_history_entry,
    fetch_history_from_cloudinary,
    get_history_entries,
    get_user_history_entries,
    get_all_history_entries,
    cleanup_empty_cloudinary_folder
)
from .analytics import log_scan_analytics, delete_analytics_by_scan_id, get_analytics_summary, get_user_analytics_summary
from .dataset import fetch_auto_dataset, delete_auto_dataset_entry, save_to_auto_dataset
from .auth import (
    register_user,
    login_user,
    logout_user,
    validate_session,
    get_user_by_id
)

router = APIRouter()


# ============================================
# AUTHENTICATION ROUTES
# ============================================

@router.post("/auth/register")
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...)
):
    """Register a new user."""
    result = register_user(username, email, password)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/auth/login")
async def login(
    username: str = Form(...),
    password: str = Form(...)
):
    """Login user."""
    result = login_user(username, password)
    if result["status"] == "error":
        raise HTTPException(status_code=401, detail=result["message"])
    return result


@router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    result = logout_user(token)
    return result


@router.get("/auth/me")
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current authenticated user info."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    session = validate_session(token)
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    user = get_user_by_id(session["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "user": user}


@router.post("/analyze")
async def analyze_fish(
    file: UploadFile = File(...), 
    auto_save_dataset: bool = False,
    confidence_threshold: float = 0.7,
    hide_color_overlay: bool = True,
    authorization: Optional[str] = Header(None)
):
    """
    Analyze fish image using AI model with color consistency analysis.
    
    Args:
        file: Uploaded image file
        auto_save_dataset: Whether to auto-save high-confidence images
        confidence_threshold: Minimum confidence for detection (0.0-1.0, default 0.7 = 70%)
        hide_color_overlay: Whether to hide the color consistency overlay (default True)
        authorization: Optional auth token for user tracking
        
    Returns:
        Analysis results with detection info and result image URL
    """
    # Extract user_id from authorization token if provided
    user_id = None
    if authorization:
        token = authorization.replace("Bearer ", "")
        session = validate_session(token)
        if session:
            user_id = session["user_id"]
    # Clamp confidence threshold between 0.1 and 1.0
    confidence_threshold = max(0.1, min(1.0, confidence_threshold))
    print(f"Received an image for AI Analysis... (auto_save_dataset: {auto_save_dataset}, confidence: {confidence_threshold:.0%}, hide_color_overlay: {hide_color_overlay})")
    
    # 1. READ IMAGE
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. RUN AI INFERENCE
    model = get_model()
    results, filtered_indices, detected_fish_types, detected_confidences, has_masks = run_inference(img, confidence_threshold)
    
    # Variables for result
    is_daing_detected = False
    result_img = None
    color_analysis = None
    mold_analysis = None
    
    boxes = results[0].boxes
    masks = results[0].masks
    
    if filtered_indices:
        # DAING DETECTED
        is_daing_detected = True
        
        # Perform color analysis and mold analysis
        if has_masks:
            filtered_masks = masks[filtered_indices]
            filtered_boxes = boxes[filtered_indices] if filtered_indices else None
            color_analysis = analyze_color_consistency_with_masks(img, filtered_masks, filtered_boxes)
            mold_analysis = analyze_mold_with_masks(img, filtered_masks, filtered_boxes)
        else:
            filtered_boxes = boxes[filtered_indices] if filtered_indices else None
            color_analysis = analyze_color_consistency_with_boxes(img, filtered_boxes)
            mold_analysis = analyze_mold_with_boxes(img, filtered_boxes)
        
        # Create combined result image with mold visualization
        result_img = draw_combined_result_image(img, results, filtered_indices, model, color_analysis, mold_analysis, hide_color_overlay)
        
        print(f"✅ Found {len(filtered_indices)} high-confidence daing detection(s)")
        if color_analysis:
            print(f"🎨 Color Analysis: Score={color_analysis['consistency_score']}% Grade={color_analysis['quality_grade']}")
        if mold_analysis:
            print(f"🦠 Mold Analysis: Severity={mold_analysis['overall_severity']} Coverage={mold_analysis['avg_coverage_percent']}%")
    else:
        # NO DAING DETECTED
        result_img = draw_no_detection_image(img)
        print("⚠️ No high-confidence daing detected")
    
    # 3. ENCODE IMAGE
    success, encoded_result = cv2.imencode('.jpg', result_img)
    if not success:
        raise ValueError("Failed to encode result image")
    result_bytes = encoded_result.tobytes()
    
    # 4. UPLOAD TO CLOUDINARY & LOG HISTORY
    try:
        now = datetime.now()
        date_folder = now.strftime("%Y-%m-%d")
        history_folder = f"daing-history/{date_folder}"
        history_id = f"scan_{now.strftime('%Y%m%d_%H%M%S_%f')}"
        
        result_upload = cloudinary.uploader.upload(
            io.BytesIO(result_bytes),
            folder=history_folder,
            public_id=history_id,
            resource_type="image"
        )
        result_url = result_upload.get("secure_url")
        
        add_history_entry({
            "id": history_id,
            "timestamp": now.isoformat(),
            "url": result_url,
            "folder": history_folder,
            "user_id": user_id
        })
        print(f"📚 History saved: {history_folder}/{history_id}" + (f" (user: {user_id})" if user_id else ""))
        
        # 5. LOG ANALYTICS
        log_scan_analytics(
            detected_fish_types,
            detected_confidences,
            is_daing_detected,
            scan_id=history_id,
            color_analysis=color_analysis,
            mold_analysis=mold_analysis,
            user_id=user_id
        )
        
        # 6. AUTO-SAVE HIGH-CONFIDENCE IMAGES
        if auto_save_dataset and is_daing_detected and detected_confidences:
            max_confidence = max(detected_confidences) if detected_confidences else 0
            if max_confidence >= 0.85:
                save_to_auto_dataset(contents, date_folder, max_confidence)
        
        # 7. RETURN RESPONSE
        return {
            "status": "success",
            "is_daing_detected": is_daing_detected,
            "result_image": result_url,
            "detections": [
                {"fish_type": ft, "confidence": conf}
                for ft, conf in zip(detected_fish_types, detected_confidences)
            ],
            "color_analysis": color_analysis,
            "mold_analysis": mold_analysis
        }
        
    except Exception as history_error:
        print(f"⚠️ Failed to save history: {history_error}")
        import traceback
        traceback.print_exc()
        return StreamingResponse(io.BytesIO(result_bytes), media_type="image/jpeg")


@router.post("/upload-dataset")
async def upload_dataset(
    file: UploadFile = File(...),
    fish_type: str = Form(...),
    condition: str = Form(...)
):
    """Upload image to dataset with classification."""
    print(f"📸 Data Gathering: {fish_type} - {condition}")
    contents = await file.read()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{fish_type}_{condition}_{timestamp}"
    date_folder = datetime.now().strftime("%Y-%m-%d")
    
    try:
        folder_path_1 = f"daing-dataset/{fish_type}/{condition}"
        upload_result_1 = cloudinary.uploader.upload(
            contents,
            folder=folder_path_1,
            public_id=filename,
            resource_type="image"
        )
        folder_path_2 = f"daing-dataset/date/{date_folder}/{fish_type}/{condition}"
        upload_result_2 = cloudinary.uploader.upload(
            contents,
            folder=folder_path_2,
            public_id=filename,
            resource_type="image"
        )
        return {
            "status": "success",
            "message": "Image uploaded",
            "filename": filename,
            "uploads": [
                {"url": upload_result_1.get("secure_url")},
                {"url": upload_result_2.get("secure_url")}
            ]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/history")
async def get_history(authorization: Optional[str] = Header(None)):
    """
    Fetch user's history. If authenticated, returns user's own history.
    If not authenticated, returns all history (for backward compatibility).
    """
    try:
        user_id = None
        if authorization:
            token = authorization.replace("Bearer ", "")
            session = validate_session(token)
            if session:
                user_id = session["user_id"]
        
        if user_id:
            # Return user's own history from MongoDB
            entries = get_user_history_entries(user_id)
        else:
            # Fallback to all history from Cloudinary for unauthenticated users
            entries = fetch_history_from_cloudinary()
        
        return {"status": "success", "entries": entries}
    except Exception as e:
        print(f"⚠️ Failed to fetch history: {e}")
        return {"status": "success", "entries": []}


@router.get("/history/all")
async def get_all_history(authorization: Optional[str] = Header(None)):
    """
    Fetch all history (admin only).
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    session = validate_session(token)
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    if session["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        entries = get_all_history_entries()
        return {"status": "success", "entries": entries}
    except Exception as e:
        print(f"⚠️ Failed to fetch all history: {e}")
        return {"status": "success", "entries": []}


@router.delete("/history/{entry_id}")
def delete_history(entry_id: str):
    """Delete from both Cloudinary and MongoDB."""
    try:
        folder_to_check = None
        
        # Try to get folder info from MongoDB first
        entry = remove_history_entry(entry_id)
        
        if not entry:
            # Search in Cloudinary for this scan ID
            try:
                result = cloudinary.api.resources(
                    type="upload",
                    prefix="daing-history/",
                    max_results=500,
                    resource_type="image"
                )
                for resource in result.get("resources", []):
                    public_id = resource.get("public_id", "")
                    if entry_id in public_id:
                        parts = public_id.rsplit("/", 1)
                        if len(parts) > 1:
                            folder_to_check = parts[0]
                        
                        cloudinary.uploader.destroy(public_id, resource_type="image")
                        delete_analytics_by_scan_id(entry_id)
                        
                        if folder_to_check:
                            cleanup_empty_cloudinary_folder(folder_to_check)
                        
                        return {"status": "success"}
            except Exception as search_error:
                print(f"⚠️ Failed to search Cloudinary: {search_error}")
            
            return {"status": "error", "message": "Entry not found"}
        
        folder_to_check = entry.get("folder")
        public_id = f"{folder_to_check}/{entry_id}" if folder_to_check else entry_id
        cloudinary.uploader.destroy(public_id, resource_type="image")
        delete_analytics_by_scan_id(entry_id)
        
        if folder_to_check:
            cleanup_empty_cloudinary_folder(folder_to_check)
        
        return {"status": "success"}
    except Exception as e:
        print(f"⚠️ Failed to delete: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/analytics/summary")
async def analytics_summary(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """
    Get analytics summary. If authenticated, returns user's own analytics.
    If not authenticated, returns all analytics (for backward compatibility).
    
    Args:
        days: Number of days for time-based analytics (7, 30, 90, or 365)
    """
    # Validate days parameter
    valid_days = [7, 30, 90, 365]
    if days not in valid_days:
        days = 7
    
    user_id = None
    if authorization:
        token = authorization.replace("Bearer ", "")
        session = validate_session(token)
        if session:
            user_id = session["user_id"]
    
    if user_id:
        return get_user_analytics_summary(user_id, days)
    return get_analytics_summary(days)


@router.get("/analytics/all")
async def all_analytics_summary(
    days: int = 7,
    authorization: Optional[str] = Header(None)
):
    """
    Get all analytics summary (for authenticated users or public access).
    Non-authenticated users can also access overall analytics.
    
    Args:
        days: Number of days for time-based analytics (7, 30, 90, or 365)
    """
    # Validate days parameter
    valid_days = [7, 30, 90, 365]
    if days not in valid_days:
        days = 7
    
    # Allow access without authentication - public overall analytics
    # If authorization is provided, validate it but don't require it
    if authorization:
        token = authorization.replace("Bearer ", "")
        session = validate_session(token)
        # Token provided but invalid - still allow access to public data
    
    return get_analytics_summary(days)


@router.get("/auto-dataset")
def get_auto_dataset_endpoint():
    """Fetch auto-saved dataset images."""
    return fetch_auto_dataset()


@router.delete("/auto-dataset/{entry_id}")
def delete_auto_dataset_endpoint(entry_id: str):
    """Delete an auto-saved dataset image."""
    return delete_auto_dataset_entry(entry_id)

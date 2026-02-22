"""
History Management Module
=========================
Handles CRUD operations for scan history with MongoDB and Cloudinary.
"""

from datetime import datetime
import cloudinary
import cloudinary.api
import cloudinary.uploader

from .config import get_history_collection


def add_history_entry(entry: dict) -> bool:
    """
    Add a history entry to MongoDB.
    
    Args:
        entry: dict with id, timestamp, url, folder, user_id (optional),
               detections, color_analysis, mold_analysis (optional)
        
    Returns:
        True if successful, False otherwise
    """
    history_collection = get_history_collection()
    if history_collection is None:
        print("⚠️ MongoDB not connected, skipping history save")
        return False
    
    try:
        entry_doc = {
            "id": entry["id"],
            "timestamp": datetime.fromisoformat(entry["timestamp"]),
            "url": entry["url"],
            "folder": entry.get("folder", ""),
            "user_id": entry.get("user_id"),  # Can be None for unauthenticated scans
            # Analysis data
            "detections": entry.get("detections"),
            "color_analysis": entry.get("color_analysis"),
            "mold_analysis": entry.get("mold_analysis"),
            "quality_grade": entry.get("quality_grade"),
            "is_daing_detected": entry.get("is_daing_detected", False),
        }
        # Debug: Log what we're saving
        print(f"📊 Saving history with analysis data:")
        print(f"   - is_daing_detected: {entry_doc.get('is_daing_detected')}")
        print(f"   - detections count: {len(entry_doc.get('detections') or [])}")
        print(f"   - has color_analysis: {entry_doc.get('color_analysis') is not None}")
        print(f"   - has mold_analysis: {entry_doc.get('mold_analysis') is not None}")
        
        history_collection.insert_one(entry_doc)
        print(f"📚 History saved to MongoDB: {entry['id']}")
        return True
    except Exception as e:
        print(f"⚠️ Failed to save history to MongoDB: {e}")
        return False


def get_history_entries() -> list:
    """
    Get all history entries from MongoDB, sorted by newest first.
    
    Returns:
        List of history entries
    """
    history_collection = get_history_collection()
    if history_collection is None:
        return []
    
    try:
        entries = list(history_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(200))
        # Convert datetime back to ISO string for JSON response
        for entry in entries:
            if isinstance(entry.get("timestamp"), datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
        return entries
    except Exception as e:
        print(f"⚠️ Failed to get history from MongoDB: {e}")
        return []


def get_user_history_entries(user_id: str) -> list:
    """
    Get history entries for a specific user from MongoDB.
    
    Args:
        user_id: The user's ID
        
    Returns:
        List of history entries for the user
    """
    history_collection = get_history_collection()
    if history_collection is None:
        return []
    
    try:
        entries = list(history_collection.find(
            {"user_id": user_id}, 
            {"_id": 0}
        ).sort("timestamp", -1).limit(200))
        
        # Convert datetime back to ISO string for JSON response
        for entry in entries:
            if isinstance(entry.get("timestamp"), datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
        
        # Debug: Log what we're returning
        if entries:
            first = entries[0]
            print(f"📤 Returning {len(entries)} history entries for user {user_id}")
            print(f"   - First entry has is_daing_detected: {first.get('is_daing_detected')}")
            print(f"   - First entry has detections: {len(first.get('detections') or [])}")
            print(f"   - First entry has color_analysis: {first.get('color_analysis') is not None}")
        
        return entries
    except Exception as e:
        print(f"⚠️ Failed to get user history from MongoDB: {e}")
        return []


def get_all_history_entries() -> list:
    """
    Get all history entries from MongoDB (for admin view).
    Includes user_id field to identify which user made each scan.
    
    Returns:
        List of all history entries
    """
    history_collection = get_history_collection()
    if history_collection is None:
        return []
    
    try:
        entries = list(history_collection.find({}, {"_id": 0}).sort("timestamp", -1).limit(500))
        
        # Convert datetime back to ISO string for JSON response
        for entry in entries:
            if isinstance(entry.get("timestamp"), datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
        return entries
    except Exception as e:
        print(f"⚠️ Failed to get all history from MongoDB: {e}")
        return []


def remove_history_entry(entry_id: str) -> dict:
    """
    Remove a history entry from MongoDB.
    
    Args:
        entry_id: ID of the entry to remove
        
    Returns:
        Removed entry or None if not found
    """
    history_collection = get_history_collection()
    if history_collection is None:
        return None
    
    try:
        result = history_collection.find_one_and_delete({"id": entry_id})
        if result:
            # Convert datetime to ISO string
            if isinstance(result.get("timestamp"), datetime):
                result["timestamp"] = result["timestamp"].isoformat()
            return result
        return None
    except Exception as e:
        print(f"⚠️ Failed to remove history from MongoDB: {e}")
        return None


def fetch_history_from_cloudinary() -> list:
    """
    Fetch history entries directly from Cloudinary.
    
    Returns:
        List of history entries from Cloudinary
    """
    try:
        result = cloudinary.api.resources(
            type="upload",
            prefix="daing-history/",
            max_results=500,
            resource_type="image"
        )
        
        entries = []
        for resource in result.get("resources", []):
            public_id = resource.get("public_id", "")
            parts = public_id.split("/")
            
            if len(parts) >= 3:
                folder = "/".join(parts[:2])
                scan_id = parts[2]
                
                # Parse timestamp from scan_id
                try:
                    timestamp_str = scan_id.replace("scan_", "")
                    date_part = timestamp_str[:8]
                    time_part = timestamp_str[9:15]
                    micro_part = timestamp_str[16:]
                    iso_timestamp = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}T{time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}.{micro_part}"
                except:
                    iso_timestamp = resource.get("created_at", "")
                
                entries.append({
                    "id": scan_id,
                    "timestamp": iso_timestamp,
                    "url": resource.get("secure_url"),
                    "folder": folder
                })
        
        entries.sort(key=lambda x: x["timestamp"], reverse=True)
        return entries
    except Exception as e:
        print(f"⚠️ Failed to fetch from Cloudinary: {e}")
        return []


def cleanup_empty_cloudinary_folder(folder_path: str) -> bool:
    """
    Delete empty folder from Cloudinary.
    
    Args:
        folder_path: Path of the folder to check and potentially delete
        
    Returns:
        True if folder was deleted, False otherwise
    """
    try:
        result = cloudinary.api.resources(
            type="upload",
            prefix=folder_path,
            max_results=1,
            resource_type="image"
        )
        if len(result.get("resources", [])) == 0:
            cloudinary.api.delete_folder(folder_path)
            print(f"🗑️ Deleted empty folder: {folder_path}")
            return True
    except Exception as e:
        print(f"⚠️ Could not delete folder {folder_path}: {e}")
    return False

"""
Dataset Management Module
=========================
Handles auto-saved dataset image operations with Cloudinary.
"""

import cloudinary
import cloudinary.api
import cloudinary.uploader

from .history import cleanup_empty_cloudinary_folder


def fetch_auto_dataset() -> dict:
    """
    Fetch auto-saved dataset images from Cloudinary.
    
    Returns:
        dict with status and entries list
    """
    try:
        result = cloudinary.api.resources(
            type="upload",
            prefix="daing-dataset-auto/",
            max_results=500,
            resource_type="image"
        )
        
        entries = []
        for resource in result.get("resources", []):
            public_id = resource.get("public_id", "")
            parts = public_id.split("/")
            
            if len(parts) >= 2:
                if len(parts) >= 3:
                    folder = "/".join(parts[:2])
                    image_id = parts[-1]
                else:
                    folder = parts[0]
                    image_id = parts[-1]
                
                # Parse timestamp from image_id
                try:
                    timestamp_str = image_id.replace("auto_", "")
                    date_part = timestamp_str[:8]
                    time_part = timestamp_str[9:15] if len(timestamp_str) > 9 else "000000"
                    micro_part = timestamp_str[16:] if len(timestamp_str) > 16 else "000000"
                    iso_timestamp = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}T{time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}.{micro_part}"
                except:
                    iso_timestamp = resource.get("created_at", "")
                
                entries.append({
                    "id": image_id,
                    "timestamp": iso_timestamp,
                    "url": resource.get("secure_url"),
                    "folder": folder,
                    "public_id": public_id
                })
        
        print(f"📁 Auto-dataset: Found {len(entries)} images")
        entries.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"status": "success", "entries": entries}
    except Exception as e:
        print(f"⚠️ Failed to fetch auto-dataset: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "entries": [], "message": str(e)}


def delete_auto_dataset_entry(entry_id: str) -> dict:
    """
    Delete an auto-saved dataset image from Cloudinary.
    
    Args:
        entry_id: ID of the entry to delete
        
    Returns:
        dict with status
    """
    try:
        folder_to_check = None
        
        result = cloudinary.api.resources(
            type="upload",
            prefix="daing-dataset-auto/",
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
                print(f"🗑️ Deleted auto-dataset entry: {public_id}")
                
                if folder_to_check:
                    cleanup_empty_cloudinary_folder(folder_to_check)
                
                return {"status": "success"}
        
        return {"status": "error", "message": "Entry not found"}
    except Exception as e:
        print(f"⚠️ Failed to delete auto-dataset entry: {e}")
        return {"status": "error", "message": str(e)}


def save_to_auto_dataset(contents: bytes, date_folder: str, max_confidence: float) -> bool:
    """
    Save high-confidence image to auto dataset.
    
    Args:
        contents: Image bytes
        date_folder: Date folder string (YYYY-MM-DD)
        max_confidence: Maximum confidence score
        
    Returns:
        True if saved successfully, False otherwise
    """
    from datetime import datetime
    
    try:
        dataset_folder = f"daing-dataset-auto/{date_folder}"
        now = datetime.now()
        dataset_id = f"auto_{now.strftime('%Y%m%d_%H%M%S_%f')}"
        
        cloudinary.uploader.upload(
            contents,
            folder=dataset_folder,
            public_id=dataset_id,
            resource_type="image"
        )
        print(f"📁 Auto-saved to dataset: {dataset_folder}/{dataset_id} (confidence: {max_confidence:.1%})")
        return True
    except Exception as e:
        print(f"⚠️ Failed to auto-save to dataset: {e}")
        return False

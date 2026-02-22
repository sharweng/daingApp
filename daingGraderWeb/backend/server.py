from fastapi import FastAPI, UploadFile, File, Form, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # for web backend (CORS so frontend can read responses)
from pydantic import BaseModel
import cv2
import numpy as np
import io
import csv
import os
import json
import re
from pathlib import Path
from starlette.responses import StreamingResponse
from datetime import datetime
from typing import Optional, List, Dict, Any
from jose import jwt, JWTError
from bson import ObjectId
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv
from ultralytics import YOLO  # <--- NEW IMPORT
from mongodb import get_db
from order_receipt import build_receipt_pdf_bytes, send_order_receipt_email
from email_sender import send_item_disabled_email, send_item_enabled_email, send_order_shipped_email, send_order_cancelled_email
from paymongo import create_payment_intent_for_ewallet, create_payment_intent_for_card, retrieve_payment_intent

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
  cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key=os.getenv("CLOUDINARY_API_KEY"),
  api_secret=os.getenv("CLOUDINARY_API_SECRET")
) 

app = FastAPI()

# --- for web backend: CORS so the frontend (localhost + production) can read API responses ---
# Add FRONTEND_URL env var in Render to your Vercel URL (e.g. https://dainggrader.vercel.app)
_cors_origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:51732",  # Vite preview port
]
if _url := os.getenv("FRONTEND_URL", "").strip():
    _cors_origins.append(_url.rstrip("/"))

# Allow any localhost port for development
import re as _re
def _is_localhost_origin(origin: str) -> bool:
    return bool(_re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin))

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- for web backend: auth routes (signup/login) ---
from auth_web import router as auth_router, _get_current_user, JWT_SECRET, JWT_ALGORITHM
app.include_router(auth_router, prefix="/auth", tags=["auth"])

# --- 🧠 LOAD YOUR AI MODEL HERE ---
# We load it outside the function so it stays in memory (faster)
# Make sure 'best.pt' is in the same folder as this script!
try:
    print("Loading AI Model...")
    model = YOLO("best.pt")
    print("✅ AI Model Loaded Successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("Did you forget to put best.pt in the folder?")
# ----------------------------------

# Dataset & History Setup
DATASET_DIR = Path("dataset")
DATASET_DIR.mkdir(exist_ok=True)
HISTORY_FILE = Path("history_log.json")

def _read_history_entries():
  if not HISTORY_FILE.exists():
    return []
  try:
    with open(HISTORY_FILE, "r", encoding="utf-8") as f:
      return json.load(f)
  except json.JSONDecodeError:
    return []

def _write_history_entries(entries):
  with open(HISTORY_FILE, "w", encoding="utf-8") as f:
    json.dump(entries, f, indent=2)

def add_history_entry(entry):
  entries = _read_history_entries()
  entries.insert(0, entry)
  _write_history_entries(entries[:200])

def _get_scan_collection():
  """for web backend: return scan_history collection if MongoDB is configured."""
  try:
    return get_db()["scan_history"]
  except Exception:
    return None

def _get_audit_collection():
  """for web backend: return audit_logs collection if MongoDB is configured."""
  try:
    return get_db()["audit_logs"]
  except Exception:
    return None

def _log_audit_event(actor: str, action: str, category: str, entity: str, entity_id: str, status: str = "success", details: str = "", role: str = "user", ip: str = "", actor_id: str = ""):
  """Log an audit event to the audit_logs collection."""
  try:
    collection = _get_audit_collection()
    if collection is None:
      return
    
    import uuid
    event = {
      "id": f"AL-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}",
      "timestamp": datetime.now().isoformat(),
      "actor": actor,
      "actor_id": actor_id,
      "role": role,
      "action": action,
      "category": category,
      "entity": entity,
      "entity_id": entity_id,
      "status": status,
      "ip": ip,
      "details": details,
    }
    collection.insert_one(event)
  except Exception as e:
    print(f"⚠️ Failed to log audit event: {e}")

def _fetch_cloudinary_entries():
  """Fetch all scan entries from Cloudinary (same as /history endpoint)."""
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
        scan_id = parts[2]
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
        })
    entries.sort(key=lambda x: x["timestamp"], reverse=True)
    return entries
  except Exception as e:
    print(f"⚠️ Failed to fetch from Cloudinary: {e}")
    return []

def _fetch_scan_entries_from_db():
  """Fetch scan entries by merging MongoDB scan_history (full data) with Cloudinary (for older scans)."""
  try:
    # First get all Cloudinary entries (includes old scans)
    cloudinary_entries = _fetch_cloudinary_entries()
    
    collection = _get_scan_collection()
    if collection is None:
      # No MongoDB, return Cloudinary entries as-is
      return cloudinary_entries
    
    # Get all entries from MongoDB (has full scan data)
    mongo_entries = {}
    cursor = collection.find().limit(500)
    for doc in cursor:
      entry_id = doc.get("id") or str(doc.get("_id"))
      mongo_entries[entry_id] = {
        "id": entry_id,
        "timestamp": doc.get("timestamp") or "",
        "url": doc.get("url") or None,
        "fish_type": doc.get("fish_type") or "Unknown",
        "grade": doc.get("grade") or "Unknown",
        "score": doc.get("score"),
        "user_name": doc.get("user_name") or "Unknown",
        "user_id": doc.get("user_id") or None,
      }
    
    # Merge: prefer MongoDB data if available, otherwise use Cloudinary data
    merged = {}
    
    # Add all Cloudinary entries first (basic data)
    for entry in cloudinary_entries:
      entry_id = entry.get("id")
      if entry_id:
        merged[entry_id] = entry
    
    # Override with MongoDB data (full data) where available
    for entry_id, entry in mongo_entries.items():
      merged[entry_id] = entry
    
    # Sort by timestamp descending
    result = list(merged.values())
    result.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    return result
    
  except Exception as e:
    print(f"⚠️ Failed to fetch scan entries: {e}")
    # Fallback to Cloudinary only
    return _fetch_cloudinary_entries()

def _try_get_user_from_request(request: Request) -> Optional[dict]:
  """for web backend: best-effort user lookup from JWT (optional)."""
  auth_header = request.headers.get("Authorization", "")
  if not auth_header.startswith("Bearer "):
    return None
  token = auth_header.replace("Bearer ", "").strip()
  if not token:
    return None
  try:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
  except JWTError:
    return None
  user_id = payload.get("sub")
  if not user_id:
    return None
  try:
    db = get_db()
    return db["users"].find_one({"_id": ObjectId(user_id)})
  except Exception:
    return None

def _grade_from_score(score: float) -> str:
  if score >= 0.9:
    return "Export"
  if score >= 0.8:
    return "Local"
  return "Reject"

def _normalize_scan_entry(entry: dict) -> dict:
  score = entry.get("score")
  fish_type = entry.get("fish_type") or "Unknown"
  # Detection status: detected if score >= threshold OR fish_type is not Unknown
  detected = (score is not None and score >= 0.8) or (fish_type != "Unknown" and fish_type != "")
  return {
    "id": entry.get("id") or str(entry.get("_id")),
    "timestamp": entry.get("timestamp") or "",
    "url": entry.get("url") or None,
    "fish_type": fish_type,
    "grade": entry.get("grade") or "Unknown",
    "score": score if score is not None else None,
    "user_name": entry.get("user_name") or "Unknown",
    "user_id": entry.get("user_id") or None,
    "detected": detected,
  }

def _require_admin_user(user=Depends(_get_current_user)):
  role = (user.get("role") or "user").strip().lower()
  if role != "admin":
    raise HTTPException(status_code=403, detail="Admins only")
  return user

def _require_seller_user(user=Depends(_get_current_user)):
  role = (user.get("role") or "user").strip().lower()
  if role != "seller":
    raise HTTPException(status_code=403, detail="Sellers only")
  return user

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

def remove_history_entry(entry_id: str):
  entries = _read_history_entries()
  filtered = [e for e in entries if e.get("id") != entry_id]
  if len(filtered) == len(entries):
    return None
  _write_history_entries(filtered)
  removed = next(e for e in entries if e.get("id") == entry_id)
  return removed

@app.get("/")
def root():
  """Health/connection check for web and mobile clients."""
  return {"status": "ok"}

# --- for web backend: contact form (sends email to shathesisgroup@gmail.com) ---
from contact_web import router as contact_router
app.include_router(contact_router, tags=["contact"])

# --- for web backend: payment endpoints (secure PayMongo integration) ---
from payment_web import router as payment_router
app.include_router(payment_router, tags=["payment"])

@app.post("/analyze")
async def analyze_fish(request: Request, file: UploadFile = File(...)):
  print("Received an image for AI Analysis...") 
  
  # 1. READ IMAGE
  contents = await file.read()
  nparr = np.frombuffer(contents, np.uint8)
  img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

  # 2. RUN AI INFERENCE (The Real Deal)
  # This replaces the manual cv2.rectangle code
  results = model(img)
  
  # 3. FILTER DETECTIONS BY CONFIDENCE THRESHOLD
  # Set a minimum confidence threshold to avoid false positives
  CONFIDENCE_THRESHOLD = 0.8  # Only accept detections with 50% confidence or higher
  
  # Get the detection boxes from results
  boxes = results[0].boxes
  fish_type = "Unknown"
  best_score = 0.0
  if boxes is not None and len(boxes) > 0:
    confidences = boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confidences))
    best_score = float(confidences[best_idx])
    class_id = int(boxes.cls[best_idx].cpu().numpy())
    names = getattr(results[0], "names", {})
    if isinstance(names, dict) and class_id in names:
      fish_type = str(names[class_id]).replace("_", " ").title()
  
  # Filter detections based on confidence
  if boxes is not None and len(boxes) > 0:
    # Get confidence scores
    confidences = boxes.conf.cpu().numpy()
    # Check if any detection meets the threshold
    high_conf_detections = confidences >= CONFIDENCE_THRESHOLD
    
    if not high_conf_detections.any():
      # NO DAING DETECTED - Add text overlay
      annotated_img = img.copy()
      h, w = annotated_img.shape[:2]
      
      # Add semi-transparent overlay
      overlay = annotated_img.copy()
      cv2.rectangle(overlay, (0, 0), (w, h), (0, 0, 0), -1)
      cv2.addWeighted(overlay, 0.3, annotated_img, 0.7, 0, annotated_img)
      
      # Add "NO DAING DETECTED" text in the center
      text = "NO DAING DETECTED"
      font = cv2.FONT_HERSHEY_SIMPLEX
      font_scale = 1.5
      thickness = 3
      
      # Get text size for centering
      (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, thickness)
      text_x = (w - text_w) // 2
      text_y = (h + text_h) // 2
      
      # Draw text with outline for better visibility
      cv2.putText(annotated_img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness + 2)
      cv2.putText(annotated_img, text, (text_x, text_y), font, font_scale, (255, 255, 255), thickness)
      
      print("⚠️ No high-confidence daing detected")
    else:
      # DAING DETECTED - Filter and draw only high-confidence boxes
      # Create a mask for high confidence detections
      indices = [i for i, conf in enumerate(confidences) if conf >= CONFIDENCE_THRESHOLD]
      
      # Filter the results to only include high-confidence detections
      filtered_boxes = boxes[indices]
      results[0].boxes = filtered_boxes
      
      # Draw boxes and labels for filtered detections
      annotated_img = results[0].plot()
      print(f"✅ Found {len(indices)} high-confidence daing detection(s)")
  else:
    # No detections at all
    annotated_img = img.copy()
    h, w = annotated_img.shape[:2]
    
    # Add semi-transparent overlay
    overlay = annotated_img.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.3, annotated_img, 0.7, 0, annotated_img)
    
    # Add "NO DAING DETECTED" text
    text = "NO DAING DETECTED"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.5
    thickness = 3
    
    (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, thickness)
    text_x = (w - text_w) // 2
    text_y = (h + text_h) // 2
    
    cv2.putText(annotated_img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness + 2)
    cv2.putText(annotated_img, text, (text_x, text_y), font, font_scale, (255, 255, 255), thickness)
    
    print("⚠️ No daing detected at all")

  # 4. PREPARE RESPONSE
  success, encoded_img = cv2.imencode('.jpg', annotated_img)
  if not success:
    raise ValueError("Failed to encode image")

  # Convert to bytes - this creates the actual JPEG file data
  image_bytes = encoded_img.tobytes()

  # 5. UPLOAD TO CLOUDINARY & LOG HISTORY
  try:
    now = datetime.now()
    date_folder = now.strftime("%Y-%m-%d")
    history_folder = f"daing-history/{date_folder}"
    history_id = f"scan_{now.strftime('%Y%m%d_%H%M%S_%f')}"
    grade = _grade_from_score(best_score)
    user = _try_get_user_from_request(request)
    user_name = (user or {}).get("name") or "Unknown"
    user_id = str(user["_id"]) if user and user.get("_id") else None

    # We upload the ANNOTATED image (with boxes) so you can see what the AI saw
    # Use io.BytesIO to create a file-like object from the JPEG encoded data
    upload_result = cloudinary.uploader.upload(
      io.BytesIO(image_bytes),
      folder=history_folder,
      public_id=history_id,
      resource_type="image"
    )

    entry = {
      "id": history_id,
      "timestamp": now.isoformat(),
      "url": upload_result.get("secure_url"),
      "folder": history_folder,
      "fish_type": fish_type,
      "grade": grade,
      "score": round(best_score, 4),
      "user_id": user_id,
      "user_name": user_name,
    }
    add_history_entry(entry)
    collection = _get_scan_collection()
    if collection is not None:
      # for web backend: store full scan metadata for admin dashboard
      collection.insert_one(entry)
    
    # Log audit event for scan
    _log_audit_event(
      actor=user_name,
      role=user.get("role", "user") if user else "user",
      action="Created fish scan",
      category="Scans",
      entity="Scan",
      entity_id=history_id,
      status="success",
      details=f"Fish: {fish_type}, Grade: {grade}, Score: {best_score:.2%}"
    )
    
    print(f"📚 History saved: {history_folder}/{history_id}")
  except Exception as history_error:
    print(f"⚠️ Failed to save history: {history_error}")
    import traceback
    traceback.print_exc()

  # Return the image with boxes drawn on it
  return StreamingResponse(io.BytesIO(image_bytes), media_type="image/jpeg")


# --- KEEP YOUR DATASET/HISTORY ENDPOINTS BELOW AS IS ---
@app.post("/upload-dataset")
async def upload_dataset(
  file: UploadFile = File(...),
  fish_type: str = Form(...),
  condition: str = Form(...)
):
  # ... (Keep your existing code here) ...
  # Just copying the start to show where it goes
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
      "uploads": [{"url": upload_result_1.get("secure_url")}, {"url": upload_result_2.get("secure_url")}]
    }
  except Exception as e:
    return {"status": "error", "message": str(e)}

@app.get("/history")
def get_history():
  """Fetch history from Cloudinary directly - always in sync!"""
  try:
    # Get all resources from the daing-history folder
    result = cloudinary.api.resources(
      type="upload",
      prefix="daing-history/",
      max_results=500,
      resource_type="image"
    )
    
    entries = []
    for resource in result.get("resources", []):
      # Extract info from the resource
      public_id = resource.get("public_id", "")
      # public_id format: "daing-history/2026-01-30/scan_20260130_123456_789012"
      parts = public_id.split("/")
      if len(parts) >= 3:
        folder = "/".join(parts[:2])  # "daing-history/2026-01-30"
        scan_id = parts[2]  # "scan_20260130_123456_789012"
        
        # Parse timestamp from scan_id (scan_YYYYMMDD_HHMMSS_ffffff)
        try:
          timestamp_str = scan_id.replace("scan_", "")
          # Format: 20260130_123456_789012
          date_part = timestamp_str[:8]  # 20260130
          time_part = timestamp_str[9:15]  # 123456
          micro_part = timestamp_str[16:]  # 789012
          iso_timestamp = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}T{time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}.{micro_part}"
        except:
          iso_timestamp = resource.get("created_at", "")
        
        entries.append({
          "id": scan_id,
          "timestamp": iso_timestamp,
          "url": resource.get("secure_url"),
          "folder": folder
        })
    
    # Sort by timestamp descending (newest first)
    entries.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {"status": "success", "entries": entries}
  except Exception as e:
    print(f"⚠️ Failed to fetch from Cloudinary: {e}")
    # Fallback to JSON file if Cloudinary fails
    return {"status": "success", "entries": _read_history_entries()}

@app.get("/history/detailed")
def get_history_detailed(user=Depends(_get_current_user)):
  """Fetch history with fish_type, grade, score from Cloudinary + MongoDB metadata."""
  try:
    # First, fetch all resources from Cloudinary (same as /history endpoint)
    result = cloudinary.api.resources(
      type="upload",
      prefix="daing-history/",
      max_results=500,
      resource_type="image"
    )
    
    # Try to get MongoDB collection for metadata
    collection = _get_scan_collection()
    mongo_data = {}
    if collection is not None:
      try:
        # Index MongoDB data by scan_id for quick lookup
        for doc in collection.find({}):
          scan_id = doc.get("id") or str(doc.get("_id", ""))
          mongo_data[scan_id] = {
            "fish_type": doc.get("fish_type", "Unknown"),
            "grade": doc.get("grade", "Unknown"),
            "score": doc.get("score"),
          }
      except Exception as mongo_err:
        print(f"⚠️ MongoDB lookup failed, will use defaults: {mongo_err}")
    
    entries = []
    fish_types_set = set()
    
    for resource in result.get("resources", []):
      public_id = resource.get("public_id", "")
      # public_id format: "daing-history/2026-01-30/scan_20260130_123456_789012"
      parts = public_id.split("/")
      if len(parts) >= 3:
        scan_id = parts[2]  # "scan_20260130_123456_789012"
        
        # Parse timestamp from scan_id (scan_YYYYMMDD_HHMMSS_ffffff)
        try:
          timestamp_str = scan_id.replace("scan_", "")
          date_part = timestamp_str[:8]  # 20260130
          time_part = timestamp_str[9:15]  # 123456
          micro_part = timestamp_str[16:]  # 789012
          iso_timestamp = f"{date_part[:4]}-{date_part[4:6]}-{date_part[6:8]}T{time_part[:2]}:{time_part[2:4]}:{time_part[4:6]}.{micro_part}"
        except:
          iso_timestamp = resource.get("created_at", "")
        
        # Get metadata from MongoDB if available, otherwise use defaults
        mongo_meta = mongo_data.get(scan_id, {})
        fish_type = mongo_meta.get("fish_type", "Unknown")
        grade = mongo_meta.get("grade", "Unknown")
        score = mongo_meta.get("score")
        
        fish_types_set.add(fish_type)
        entries.append({
          "id": scan_id,
          "timestamp": iso_timestamp,
          "url": resource.get("secure_url"),
          "fish_type": fish_type,
          "grade": grade,
          "score": score,
        })
    
    # Sort by timestamp descending (newest first)
    entries.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
      "status": "success",
      "entries": entries,
      "fish_types": sorted(list(fish_types_set)),
    }
  except Exception as e:
    print(f"⚠️ Failed to fetch detailed history: {e}")
    import traceback
    traceback.print_exc()
    # Fallback to basic history if Cloudinary fails
    return {"status": "success", "entries": [], "fish_types": []}

@app.delete("/history/{entry_id}")
def delete_history(entry_id: str):
  """Delete from both Cloudinary and local JSON"""
  try:
    # Try to get folder info from JSON first
    entry = remove_history_entry(entry_id)
    
    # If not in JSON, try to find it in Cloudinary by searching
    if not entry:
      # Search in Cloudinary for this scan ID
      try:
        result = cloudinary.api.resources(
          type="upload",
          prefix=f"daing-history/",
          max_results=500,
          resource_type="image"
        )
        for resource in result.get("resources", []):
          public_id = resource.get("public_id", "")
          if entry_id in public_id:
            # Found it! Delete from Cloudinary
            cloudinary.uploader.destroy(public_id, resource_type="image")
            return {"status": "success"}
      except Exception as search_error:
        print(f"⚠️ Failed to search Cloudinary: {search_error}")
      
      return {"status": "error", "message": "Entry not found"}
    
    # Delete from Cloudinary using the folder info from JSON
    public_id = f"{entry.get('folder')}/{entry_id}" if entry.get("folder") else entry_id
    cloudinary.uploader.destroy(public_id, resource_type="image")
    return {"status": "success"}
  except Exception as e:
    print(f"⚠️ Failed to delete: {e}")
    return {"status": "error", "message": str(e)}

# --- for web backend: admin analytics (scan summary + paginated table) ---
@app.get("/admin/audit-logs")
def get_admin_audit_logs(
  category: Optional[str] = None,
  status: Optional[str] = None,
  actor: Optional[str] = None,
  limit: int = 200,
  user=Depends(_require_admin_user)
):
  collection = _get_audit_collection()
  if collection is None:
    return {"status": "success", "entries": []}

  query = {}
  if category and category != "All":
    query["category"] = category
  if status and status != "All":
    query["status"] = status
  if actor:
    query["actor"] = {"$regex": re.escape(actor), "$options": "i"}

  safe_limit = min(max(limit, 1), 500)
  cursor = collection.find(query).sort("timestamp", -1).limit(safe_limit)
  entries = []
  for doc in cursor:
    entries.append({
      "id": doc.get("id") or str(doc.get("_id")),
      "timestamp": doc.get("timestamp") or "",
      "actor": doc.get("actor") or "System",
      "role": doc.get("role") or "system",
      "action": doc.get("action") or "Unknown",
      "category": doc.get("category") or "General",
      "entity": doc.get("entity") or "",
      "entity_id": doc.get("entity_id") or "",
      "status": doc.get("status") or "success",
      "ip": doc.get("ip") or "",
      "details": doc.get("details") or "",
    })

  return {"status": "success", "entries": entries}


@app.get("/activity/me")
def get_my_activity_logs(page: int = 1, page_size: int = 10, user=Depends(_get_current_user)):
  """Return current user's activity logs (from audit_logs)."""
  collection = _get_audit_collection()
  if collection is None:
    return {"status": "success", "entries": [], "total": 0}

  page = max(page, 1)
  page_size = min(max(page_size, 1), 50)

  user_id = str(user.get("_id"))
  user_name = user.get("name") or ""
  query = {"$or": [
    {"actor_id": user_id},
    {"actor": user_name},
  ]}

  total = collection.count_documents(query)
  docs = list(
    collection.find(query)
    .sort("timestamp", -1)
    .skip((page - 1) * page_size)
    .limit(page_size)
  )
  entries = []
  for doc in docs:
    entries.append({
      "id": doc.get("id") or str(doc.get("_id")),
      "timestamp": doc.get("timestamp") or "",
      "actor": doc.get("actor") or "System",
      "role": doc.get("role") or "user",
      "action": doc.get("action") or "Unknown",
      "category": doc.get("category") or "General",
      "entity": doc.get("entity") or "",
      "entity_id": doc.get("entity_id") or "",
      "status": doc.get("status") or "success",
      "details": doc.get("details") or "",
    })

  return {"status": "success", "entries": entries, "total": total}

@app.get("/admin/scans")
def get_admin_scans(page: int = 1, page_size: int = 10, user=Depends(_require_admin_user)):
  page = max(page, 1)
  page_size = min(max(page_size, 1), 50)
  
  # Fetch from MongoDB scan_history (has full scan data)
  all_entries = _fetch_scan_entries_from_db()
  total = len(all_entries)
  start = (page - 1) * page_size
  end = start + page_size
  entries = [_normalize_scan_entry(e) for e in all_entries[start:end]]

  return {
    "status": "success",
    "page": page,
    "page_size": page_size,
    "total": total,
    "entries": entries,
  }

@app.get("/admin/scans/summary")
def get_admin_scan_summary(year: int, user=Depends(_require_admin_user)):
  # Fetch from MongoDB scan_history
  entries = _fetch_scan_entries_from_db()

  months = {f"{year}-{m:02d}": 0 for m in range(1, 13)}
  for entry in entries:
    ts = entry.get("timestamp") or ""
    if ts.startswith(f"{year}-"):
      key = ts[:7]
      if key in months:
        months[key] += 1

  labels = [
    {"key": f"{year}-01", "label": "Jan"},
    {"key": f"{year}-02", "label": "Feb"},
    {"key": f"{year}-03", "label": "Mar"},
    {"key": f"{year}-04", "label": "Apr"},
    {"key": f"{year}-05", "label": "May"},
    {"key": f"{year}-06", "label": "Jun"},
    {"key": f"{year}-07", "label": "Jul"},
    {"key": f"{year}-08", "label": "Aug"},
    {"key": f"{year}-09", "label": "Sep"},
    {"key": f"{year}-10", "label": "Oct"},
    {"key": f"{year}-11", "label": "Nov"},
    {"key": f"{year}-12", "label": "Dec"},
  ]

  return {
    "status": "success",
    "year": year,
    "months": [{"key": m["key"], "label": m["label"], "count": months[m["key"]]} for m in labels],
  }

@app.get("/admin/scans/stats")
def get_admin_scan_stats(user=Depends(_require_admin_user)):
  """Get quick stats for admin scans dashboard."""
  entries = _fetch_scan_entries_from_db()
  total = len(entries)
  
  # Count grades (from normalized entries or estimate)
  export_count = 0
  local_count = 0
  reject_count = 0
  disabled_count = 0
  user_ids = set()
  scores = []
  
  for entry in entries:
    normalized = _normalize_scan_entry(entry)
    grade = normalized.get("grade", "Unknown")
    if grade == "Export":
      export_count += 1
    elif grade == "Local":
      local_count += 1
    elif grade == "Reject":
      reject_count += 1
    
    if normalized.get("is_disabled"):
      disabled_count += 1
    
    user_name = normalized.get("user_name", "Unknown")
    if user_name and user_name != "Unknown":
      user_ids.add(user_name)
    
    score = normalized.get("score")
    if score is not None:
      scores.append(score)
  
  avg_score = sum(scores) / len(scores) if scores else 0
  
  return {
    "status": "success",
    "stats": {
      "total_scans": total,
      "export_count": export_count,
      "local_count": local_count,
      "reject_count": reject_count,
      "disabled_count": disabled_count,
      "unique_users": len(user_ids),
      "avg_score": round(avg_score, 4),
    }
  }

@app.post("/admin/scans/{scan_id}/disable")
def disable_admin_scan(scan_id: str, reason: str = "", user=Depends(_require_admin_user)):
  """Disable/deactivate a scan (soft delete). Sends email to user if they have one."""
  from datetime import datetime
  
  # Find the scan in MongoDB
  collection = _get_scan_collection()
  if not collection:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  scan = collection.find_one({"id": scan_id})
  if not scan:
    raise HTTPException(status_code=404, detail="Scan not found")
  
  now = datetime.now().isoformat()
  is_disabled = scan.get("is_disabled", False)
  admin_email = user.get("email", "")
  admin_name = user.get("name", "Admin")
  
  # Toggle disable status
  update_data = {
    "is_disabled": not is_disabled,
    "disable_reason": reason if not is_disabled else None,
    "disabled_at": now if not is_disabled else None,
    "disabled_by": str(user.get("_id")) if not is_disabled else None,
  }
  
  collection.update_one({"id": scan_id}, {"$set": update_data})
  
  # Send email to user if toggling status
  user_id = scan.get("user_id")
  if user_id:
    try:
      users_collection = get_db()["users"]
      scan_user = users_collection.find_one({"_id": ObjectId(user_id)})
      if scan_user and scan_user.get("email"):
        if is_disabled:  # Re-enabling
          send_item_enabled_email(
            user_email=scan_user.get("email"),
            user_name=scan_user.get("name") or scan_user.get("email"),
            item_type="scan",
            item_name=scan.get("name") or f"Scan {scan_id}",
            admin_name=admin_name,
            admin_email=admin_email
          )
        else:  # Disabling
          send_item_disabled_email(
            user_email=scan_user.get("email"),
            user_name=scan_user.get("name") or scan_user.get("email"),
            item_type="scan",
            item_name=scan.get("name") or f"Scan {scan_id}",
            reason=reason,
            admin_name=admin_name,
            admin_email=admin_email
          )
    except Exception as email_error:
      print(f"[EMAIL ERROR] Failed to send email: {email_error}")
  
  # Log audit event
  _log_audit_event(
    actor=admin_name,
    role=user.get("role", "admin"),
    action="Re-enabled scan" if is_disabled else "Disabled scan",
    category="Scans",
    entity="Scan",
    entity_id=scan_id,
    status="success",
    details=f"New status: {'Enabled' if is_disabled else 'Disabled'}, Reason: {reason}"
  )
  
  return {
    "status": "success",
    "message": "Scan enabled" if is_disabled else "Scan disabled",
    "is_disabled": not is_disabled
  }

@app.delete("/admin/scans/{scan_id}")
def delete_admin_scan(scan_id: str, user=Depends(_require_admin_user)):
  """Permanently delete a scan from Cloudinary and MongoDB."""
  # Get scan info before deleting for audit log
  collection = _get_scan_collection()
  scan_info = None
  if collection:
    scan_info = collection.find_one({"id": scan_id})
    collection.delete_one({"id": scan_id})
  
  # Remove from Cloudinary
  try:
    result = cloudinary.api.resources(
      type="upload",
      prefix="daing-history/",
      max_results=500,
      resource_type="image"
    )
    for resource in result.get("resources", []):
      public_id = resource.get("public_id", "")
      if scan_id in public_id:
        cloudinary.uploader.destroy(public_id, resource_type="image")
        break
  except Exception as e:
    print(f"⚠️ Failed to delete from Cloudinary: {e}")
  
  # Also remove from local JSON history
  remove_history_entry(scan_id)
  
  # Log audit event
  _log_audit_event(
    actor=user.get("name", "Admin"),
    role=user.get("role", "admin"),
    action="Permanently deleted scan",
    category="Scans",
    entity="Scan",
    entity_id=scan_id,
    status="success",
    details="Scan removed from Cloudinary and MongoDB"
  )
  
  return {"status": "success", "message": "Scan permanently deleted"}

# --- Community Posts ---
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

# Bad words filter - censors explicit words with asterisks
BAD_WORDS = [
  "fuck", "shit", "ass", "bitch", "damn", "crap", "bastard", "dick", "pussy",
  "cock", "whore", "slut", "fag", "nigger", "nigga", "retard", "idiot", "stupid",
  "puta", "gago", "tangina", "bobo", "tanga", "putangina", "leche", "tarantado"
]

def _censor_bad_words(text: str) -> str:
  """Replace bad words with asterisks."""
  if not text:
    return text
  result = text
  for word in BAD_WORDS:
    pattern = re.compile(re.escape(word), re.IGNORECASE)
    result = pattern.sub("*" * len(word), result)
  return result

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
    "created_at": doc.get("created_at", ""),
    "liked_by": doc.get("liked_by", []),
  }

@app.get("/community/posts")
def get_community_posts(page: int = 1, page_size: int = 12, category: str = "All", search: str = ""):
  """Get paginated community posts (excludes deleted posts)."""
  page = max(page, 1)
  page_size = min(max(page_size, 1), 50)
  
  collection = _get_community_collection()
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
      "liked_by": doc.get("liked_by", []),
      "comments_count": doc.get("comments_count", 0),
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


@app.get("/community/posts/me")
def get_my_community_posts(page: int = 1, page_size: int = 10, user=Depends(_get_current_user)):
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

@app.post("/community/posts")
def create_community_post(
  title: str = Form(...),
  description: str = Form(...),
  category: str = Form("Discussion"),
  images: list[UploadFile] = File(default=[]),
  user=Depends(_get_current_user),
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
  
  # Log audit event
  user_name = user.get("name", "Unknown")
  user_role = user.get("role", "user")
  _log_audit_event(
    actor=user_name,
    actor_id=str(user.get("_id", "")),
    role=user_role,
    action="Created community post",
    category="Community",
    entity="Post",
    entity_id=post_doc["id"],
    status="success",
    details=f"Title: {post_doc['title']}, Category: {category}"
  )
  
  return {"status": "success", "post": post_doc}

@app.post("/community/posts/{post_id}/like")
def toggle_like_post(post_id: str, user=Depends(_get_current_user)):
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
  
  # Log audit event
  _log_audit_event(
    actor=user.get("name", "Anonymous"),
    actor_id=str(user.get("_id", "")),
    role=user.get("role", "user"),
    action="Liked post" if liked else "Unliked post",
    category="Community",
    entity="Post",
    entity_id=post_id,
    status="success",
    details=f"Total likes: {updated.get('likes', 0)}"
  )
  
  return {"status": "success", "liked": liked, "likes": updated.get("likes", 0)}

@app.delete("/community/posts/{post_id}")
def delete_community_post(post_id: str, user=Depends(_get_current_user)):
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

  _log_audit_event(
    actor=user.get("name", "Anonymous"),
    actor_id=str(user.get("_id", "")),
    role=user.get("role", "user"),
    action="Deleted community post",
    category="Community",
    entity="Post",
    entity_id=post_id,
    status="success",
    details="",
  )
  
  return {"status": "success", "message": "Post deleted"}

@app.put("/community/posts/{post_id}")
def edit_community_post(
  post_id: str,
  title: str = Form(...),
  description: str = Form(...),
  category: str = Form("Discussion"),
  user=Depends(_get_current_user),
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

# NOTE: Static routes must be defined BEFORE dynamic {post_id} route
@app.get("/community/posts/featured")
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
  from datetime import timedelta
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

@app.get("/community/posts/top/liked")
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

@app.get("/community/posts/by-category/{category}")
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

@app.get("/community/posts/{post_id}")
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
  
  # Check if post is deleted or disabled - still show for backward compatibility
  # but regular users won't see it in the list anymore
  
  # Get comments - exclude deleted and disabled for public view
  comments = []
  if comments_collection is not None:
    comment_query = {
      "post_id": post_id,
      "$or": [{"is_deleted": {"$ne": True}}, {"is_deleted": {"$exists": False}}],
    }
    # Also exclude disabled comments
    comment_query["$and"] = [
      {"$or": [{"is_disabled": {"$ne": True}}, {"is_disabled": {"$exists": False}}]}
    ]
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

@app.post("/community/posts/{post_id}/comments")
def add_comment(post_id: str, text: str = Form(...), user=Depends(_get_current_user)):
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
  
  # Log audit event
  _log_audit_event(
    actor=user.get("name", "Anonymous"),
    role=user.get("role", "user"),
    action="Created comment",
    category="Community",
    entity="Comment",
    entity_id=comment_doc["id"],
    status="success",
    details=f"Commented on post {post_id}"
  )
  
  return {"status": "success", "comment": comment_doc}

@app.delete("/community/comments/{comment_id}")
def delete_comment(comment_id: str, user=Depends(_get_current_user)):
  """Soft delete own comment or admin can delete any - marks as deleted instead of removing."""
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
  user_role = (user.get("role") or "user").strip().lower()
  
  if comment.get("author_id") != user_id and user_role != "admin":
    raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
  
  # Soft delete - mark as deleted instead of removing
  now = datetime.now().isoformat()
  comments_collection.update_one({"_id": oid}, {"$set": {
    "is_deleted": True,
    "deleted_at": now,
  }})
  
  return {"status": "success", "message": "Comment deleted"}

def _get_users_collection():
  """Return users collection from MongoDB."""
  try:
    return get_db()["users"]
  except Exception:
    return None

@app.get("/community/stats")
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

class TogglePostStatusBody(BaseModel):
  reason: str = ""

class ToggleCommentStatusBody(BaseModel):
  reason: str = ""

@app.get("/admin/posts")
def get_admin_posts(
  page: int = 1,
  page_size: int = 20,
  status: str = "all",
  search: str = "",
  category: str = "all",
  user=Depends(_require_admin_user)
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
  
  # Get user info for posts
  db = get_db()
  users_collection = db["users"]
  
  posts = []
  for doc in cursor:
    # Determine status
    post_status = "active"
    if doc.get("is_disabled"):
      post_status = "disabled"
    elif doc.get("is_deleted"):
      post_status = "deleted"
    
    # Get actual comments count (including deleted for admin)
    comments_collection = _get_comments_collection()
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

@app.get("/admin/posts/stats")
def get_admin_posts_stats(user=Depends(_require_admin_user)):
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

@app.put("/admin/posts/{post_id}/toggle-status")
def toggle_post_status(post_id: str, body: TogglePostStatusBody, user=Depends(_require_admin_user)):
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
  admin_email = user.get("email", "")
  admin_name = user.get("name", "Admin")
  
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
  
  # Send email notification to post author
  db = get_db()
  author_id = post.get("author_id")
  if author_id:
    try:
      author = db["users"].find_one({"_id": ObjectId(author_id)})
      if author and author.get("email"):
        if new_status:  # Disabling
          send_item_disabled_email(
            user_email=author.get("email"),
            user_name=author.get("name") or author.get("email"),
            item_type="post",
            item_name=post.get("title", "Post")[:50],
            reason=body.reason,
            admin_name=admin_name,
            admin_email=admin_email
          )
        else:  # Enabling
          send_item_enabled_email(
            user_email=author.get("email"),
            user_name=author.get("name") or author.get("email"),
            item_type="post",
            item_name=post.get("title", "Post")[:50],
            admin_name=admin_name,
            admin_email=admin_email
          )
    except Exception as email_error:
      print(f"[EMAIL ERROR] Failed to send email: {email_error}")
  
  # Log audit event
  _log_audit_event(
    actor=admin_name,
    role=user.get("role", "admin"),
    action="Disabled post" if new_status else "Enabled post",
    category="Posts",
    entity="Post",
    entity_id=post_id,
    status="success",
    details=f"New status: {'disabled' if new_status else 'active'}, Reason: {body.reason}"
  )
  
  return {
    "status": "success",
    "post_id": post_id,
    "new_status": "disabled" if new_status else "active",
    "message": f"Post {'disabled' if new_status else 'enabled'} successfully",
  }

@app.get("/admin/posts/{post_id}/comments")
def get_admin_post_comments(post_id: str, user=Depends(_require_admin_user)):
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

@app.put("/admin/comments/{comment_id}/toggle-status")
def toggle_comment_status(comment_id: str, body: ToggleCommentStatusBody, user=Depends(_require_admin_user)):
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
  admin_email = user.get("email", "")
  admin_name = user.get("name", "Admin")
  
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
  
  # Send email notification to comment author
  db = get_db()
  author_id = comment.get("author_id")
  if author_id:
    try:
      author = db["users"].find_one({"_id": ObjectId(author_id)})
      if author and author.get("email"):
        if new_status:  # Disabling
          send_item_disabled_email(
            user_email=author.get("email"),
            user_name=author.get("name") or author.get("email"),
            item_type="comment",
            item_name=comment.get("text", "Comment")[:50],  # First 50 chars
            reason=body.reason,
            admin_name=admin_name,
            admin_email=admin_email
          )
        else:  # Enabling
          send_item_enabled_email(
            user_email=author.get("email"),
            user_name=author.get("name") or author.get("email"),
            item_type="comment",
            item_name=comment.get("text", "Comment")[:50],
            admin_name=admin_name,
            admin_email=admin_email
          )
    except Exception as email_error:
      print(f"[EMAIL ERROR] Failed to send email: {email_error}")
  
  # Log audit event
  _log_audit_event(
    actor=admin_name,
    role=user.get("role", "admin"),
    action="Disabled comment" if new_status else "Enabled comment",
    category="Comments",
    entity="Comment",
    entity_id=comment_id,
    status="success",
    details=f"New status: {'disabled' if new_status else 'active'}, Reason: {body.reason}"
  )
  
  return {
    "status": "success",
    "comment_id": comment_id,
    "new_status": "disabled" if new_status else "active",
    "message": f"Comment {'disabled' if new_status else 'enabled'} successfully",
  }

# --- Admin Users Management ---
@app.get("/admin/users")
def get_admin_users(
  page: int = 1,
  page_size: int = 20,
  role: str = "all",
  status: str = "all",
  search: str = "",
  user=Depends(_require_admin_user)
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
    
    # Get order count for this user (from scan_history in Cloudinary - approximate)
    orders_count = 0
    products_count = 0
    
    # For now, use placeholder counts - can add real logic later
    user_role = doc.get("role", "user")
    if user_role == "seller":
      products_count = 0  # Placeholder - would fetch from products collection
    
    users_list.append({
      "id": user_id,
      "name": doc.get("name", ""),
      "email": doc.get("email", ""),
      "role": user_role,
      "status": doc.get("status", "active"),
      "avatar": doc.get("avatar", ""),
      "joined_at": doc.get("created_at", ""),
      "orders_count": orders_count,
      "products_count": products_count,
      "deactivation_reason": doc.get("deactivation_reason", ""),
    })
  
  return {
    "status": "success",
    "page": page,
    "page_size": page_size,
    "total": total,
    "users": users_list,
  }

@app.get("/admin/users/stats")
def get_admin_users_stats(user=Depends(_require_admin_user)):
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

class ToggleUserStatusBody(BaseModel):
  reason: str = ""

@app.put("/admin/users/{user_id}/toggle-status")
def toggle_user_status(user_id: str, body: ToggleUserStatusBody, user=Depends(_require_admin_user)):
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
  admin_email = user.get("email", "")
  admin_name = user.get("name", "Admin")
  
  update_data = {"status": new_status}
  if new_status == "inactive":
    update_data["deactivation_reason"] = body.reason or "No reason provided"
    update_data["deactivated_at"] = datetime.utcnow().isoformat()
  else:
    update_data["deactivation_reason"] = ""
    update_data["reactivated_at"] = datetime.utcnow().isoformat()
  
  users_collection.update_one({"_id": oid}, {"$set": update_data})
  
  # Send email notification to user
  if target_user.get("email"):
    try:
      if new_status == "inactive":
        send_item_disabled_email(
          user_email=target_user.get("email"),
          user_name=target_user.get("name") or target_user.get("email"),
          item_type="account",
          item_name=target_user.get("name") or target_user.get("email"),
          reason=body.reason,
          admin_name=admin_name,
          admin_email=admin_email
        )
      else:
        send_item_enabled_email(
          user_email=target_user.get("email"),
          user_name=target_user.get("name") or target_user.get("email"),
          item_type="account",
          item_name=target_user.get("name") or target_user.get("email"),
          admin_name=admin_name,
          admin_email=admin_email
        )
    except Exception as email_error:
      print(f"[EMAIL ERROR] Failed to send email: {email_error}")
  
  # Log audit event
  _log_audit_event(
    actor=admin_name,
    role=user.get("role", "admin"),
    action="Deactivated account" if new_status == "inactive" else "Activated account",
    category="Users",
    entity="User Account",
    entity_id=user_id,
    status="success",
    details=f"New status: {new_status}, Reason: {body.reason}"
  )
  
  return {
    "status": "success",
    "new_status": new_status,
    "user_id": user_id,
    "message": f"User {'deactivated' if new_status == 'inactive' else 'activated'} successfully",
  }

@app.get("/admin/users/{user_id}")
def get_admin_user_detail(user_id: str, user=Depends(_require_admin_user)):
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
  
  # Get scan history count for this user
  scans_count = 0
  orders_count = 0
  products_count = 0
  
  # TODO: Add real counts from respective collections
  
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
      "scans_count": scans_count,
      "orders_count": orders_count,
      "products_count": products_count,
    }
  }

# --- Admin User Analytics (New Dashboard) ---

@app.get("/admin/analytics/users/kpis")
def get_admin_user_analytics_kpis(user=Depends(_require_admin_user)):
  """Get user KPI summary with percentage changes vs last 30 days."""
  from datetime import datetime, timedelta
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


@app.get("/admin/analytics/users/chart")
def get_admin_user_analytics_chart(
  granularity: str = "daily",
  days: int = 7,
  start_date: str = None,
  end_date: str = None,
  user=Depends(_require_admin_user)
):
  """Get user signup chart data with dual lines: New Users, New Sellers."""
  from datetime import datetime, timedelta
  import calendar as cal_mod
  db = get_db()
  users_collection = db["users"]

  now = datetime.utcnow()

  if start_date and end_date:
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
  elif granularity == "daily":
    start = now - timedelta(days=days)
    end = now
  elif granularity == "monthly":
    start = datetime(now.year, 1, 1)
    end = now
  else:  # yearly
    start = datetime(now.year - 4, 1, 1)
    end = now

  query = {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}}
  users = list(users_collection.find(query, {"created_at": 1, "role": 1}))

  data = []
  if granularity == "daily":
    current = start
    while current <= end:
      day_str = current.strftime("%b %d")
      day_iso = current.strftime("%Y-%m-%d")
      new_users = sum(1 for u in users if u.get("created_at", "").startswith(day_iso))
      new_sellers = sum(1 for u in users if u.get("created_at", "").startswith(day_iso) and u.get("role") == "seller")
      new_admins = sum(1 for u in users if u.get("created_at", "").startswith(day_iso) and u.get("role") == "admin")
      data.append({"period": day_str, "New Users": new_users, "New Sellers": new_sellers, "New Admins": new_admins})
      current += timedelta(days=1)
  elif granularity == "monthly":
    for m in range(1, 13):
      month_prefix = f"{start.year}-{m:02d}"
      month_name = cal_mod.month_abbr[m]
      new_users = sum(1 for u in users if u.get("created_at", "").startswith(month_prefix))
      new_sellers = sum(1 for u in users if u.get("created_at", "").startswith(month_prefix) and u.get("role") == "seller")
      new_admins = sum(1 for u in users if u.get("created_at", "").startswith(month_prefix) and u.get("role") == "admin")
      data.append({"period": month_name, "New Users": new_users, "New Sellers": new_sellers, "New Admins": new_admins})
  else:  # yearly
    for y in range(start.year, end.year + 1):
      year_prefix = str(y)
      new_users = sum(1 for u in users if u.get("created_at", "").startswith(year_prefix))
      new_sellers = sum(1 for u in users if u.get("created_at", "").startswith(year_prefix) and u.get("role") == "seller")
      new_admins = sum(1 for u in users if u.get("created_at", "").startswith(year_prefix) and u.get("role") == "admin")
      data.append({"period": str(y), "New Users": new_users, "New Sellers": new_sellers, "New Admins": new_admins})

  return {"status": "success", "data": data}


@app.get("/admin/analytics/users/calendar")
def get_admin_user_analytics_calendar(
  year: int = None,
  month: int = None,
  user=Depends(_require_admin_user)
):
  """Get user signup heatmap data for calendar view."""
  from datetime import datetime
  import calendar as cal_mod
  db = get_db()
  users_collection = db["users"]

  now = datetime.utcnow()
  if year is None:
    year = now.year
  if month is None:
    month = now.month

  first_day = datetime(year, month, 1)
  last_day_num = cal_mod.monthrange(year, month)[1]
  last_day = datetime(year, month, last_day_num, 23, 59, 59)

  query = {"created_at": {"$gte": first_day.isoformat(), "$lte": last_day.isoformat()}}
  users = list(users_collection.find(query, {"created_at": 1}))

  day_counts = {}
  for u in users:
    created_at = u.get("created_at", "")
    if created_at:
      try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00").replace("+00:00", ""))
        day = dt.day
        key = str(day)
        if key not in day_counts:
          day_counts[key] = {"day": day, "count": 0}
        day_counts[key]["count"] += 1
      except:
        pass

  first_weekday = first_day.weekday()
  weeks = []
  current_day = 1

  for week_idx in range(6):
    week = []
    for day_idx in range(7):
      if week_idx == 0 and day_idx < first_weekday:
        week.append({"day": None, "count": 0})
      elif current_day > last_day_num:
        week.append({"day": None, "count": 0})
      else:
        key = str(current_day)
        data = day_counts.get(key, {"day": current_day, "count": 0})
        week.append({"day": current_day, "count": data["count"]})
        current_day += 1
    weeks.append(week)
    if current_day > last_day_num:
      break

  return {
    "status": "success",
    "year": year,
    "month": month,
    "month_name": cal_mod.month_name[month],
    "weeks": weeks,
    "max_count": max([d["count"] for w in weeks for d in w if d["day"] is not None], default=0)
  }


@app.get("/admin/analytics/users/segmentation")
def get_admin_user_analytics_segmentation(user=Depends(_require_admin_user)):
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


# --- Admin Market Analytics ---

@app.get("/admin/analytics/market/kpis")
def get_admin_market_kpis(user=Depends(_require_admin_user)):
  """Get market KPI summary: revenue, orders, products, sellers, stocks, avg order."""
  from datetime import datetime, timedelta
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
    if p == 0: return 100.0 if c > 0 else 0.0
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


@app.get("/admin/analytics/market/chart")
def get_admin_market_chart(
  granularity: str = "daily",
  days: int = 7,
  start_date: str = None,
  end_date: str = None,
  seller_id: str = None,
  user=Depends(_require_admin_user),
):
  """Get market chart data: Orders count and Revenue per period."""
  from datetime import datetime, timedelta
  import calendar as cal_mod

  orders_col = _get_orders_collection()
  now = datetime.utcnow()

  if start_date and end_date:
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)
  elif granularity == "daily":
    start = now - timedelta(days=days)
    end = now
  elif granularity == "monthly":
    start = datetime(now.year, 1, 1)
    end = now
  else:
    start = datetime(now.year - 4, 1, 1)
    end = now

  query = {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}}
  if seller_id:
    query["seller_id"] = seller_id

  orders = list(orders_col.find(query, {"created_at": 1, "total": 1, "status": 1})) if orders_col is not None else []

  data = []
  if granularity == "daily":
    current = start
    while current <= end:
      day_str = current.strftime("%b %d")
      day_iso = current.strftime("%Y-%m-%d")
      day_orders = [o for o in orders if o.get("created_at", "").startswith(day_iso)]
      data.append({
        "period": day_str,
        "Orders": len(day_orders),
        "Revenue": round(sum(float(o.get("total", 0)) for o in day_orders if o.get("status") == "delivered"), 2),
      })
      current += timedelta(days=1)
  elif granularity == "monthly":
    for m in range(1, 13):
      mp = f"{start.year}-{m:02d}"
      month_orders = [o for o in orders if o.get("created_at", "").startswith(mp)]
      data.append({
        "period": cal_mod.month_abbr[m],
        "Orders": len(month_orders),
        "Revenue": round(sum(float(o.get("total", 0)) for o in month_orders if o.get("status") == "delivered"), 2),
      })
  else:
    for y in range(start.year, end.year + 1):
      yp = str(y)
      year_orders = [o for o in orders if o.get("created_at", "").startswith(yp)]
      data.append({
        "period": str(y),
        "Orders": len(year_orders),
        "Revenue": round(sum(float(o.get("total", 0)) for o in year_orders if o.get("status") == "delivered"), 2),
      })

  return {"status": "success", "data": data}


@app.get("/admin/analytics/market/segmentation")
def get_admin_market_segmentation(
  user=Depends(_require_admin_user),
):
  """Get market segmentation: orders by status, products by category, top sellers."""
  orders_col = _get_orders_collection()
  products_col = _get_products_collection()
  categories_col = _get_categories_collection()

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


@app.get("/admin/analytics/market/table")
def get_admin_market_table(
  page: int = 1,
  page_size: int = 10,
  seller_id: str = None,
  category: str = None,
  status: str = None,
  min_price: float = None,
  max_price: float = None,
  search: str = None,
  user=Depends(_require_admin_user),
):
  """Get market table data (products with seller info) with filters."""
  products_col = _get_products_collection()
  if products_col is None:
    return {"status": "success", "products": [], "total": 0, "page": page, "page_size": page_size, "sellers": [], "categories": []}

  query: Dict[str, Any] = {}
  if seller_id and seller_id != "all":
    query["seller_id"] = seller_id
  if category and category != "all":
    query["category_name"] = {"$regex": re.escape(category), "$options": "i"}
  if status and status != "all":
    if status == "in_stock":
      query["stock_qty"] = {"$gt": 0}
    elif status == "out_of_stock":
      query["stock_qty"] = {"$lte": 0}
    elif status == "disabled":
      query["is_disabled"] = True
  if min_price is not None:
    query["price"] = query.get("price", {})
    query["price"]["$gte"] = min_price
  if max_price is not None:
    query["price"] = query.get("price", {})
    query["price"]["$lte"] = max_price
  if search:
    query["$or"] = [
      {"name": {"$regex": re.escape(search), "$options": "i"}},
      {"seller_name": {"$regex": re.escape(search), "$options": "i"}},
    ]

  total = products_col.count_documents(query)
  docs = list(products_col.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size))

  products = []
  for d in docs:
    products.append({
      "id": str(d.get("_id")),
      "name": d.get("name", ""),
      "seller_id": d.get("seller_id", ""),
      "seller_name": d.get("seller_name", ""),
      "category_name": d.get("category_name", "Uncategorized"),
      "price": float(d.get("price", 0)),
      "stock_qty": int(d.get("stock_qty", 0)),
      "sold_count": int(d.get("sold_count", 0)),
      "status": "disabled" if d.get("is_disabled") else ("out_of_stock" if int(d.get("stock_qty", 0)) <= 0 else "available"),
      "created_at": d.get("created_at", ""),
    })

  # Get unique sellers and categories for filter dropdowns
  sellers_list = []
  categories_list = []
  try:
    seller_ids = products_col.distinct("seller_id")
    for sid in seller_ids:
      doc = products_col.find_one({"seller_id": sid}, {"seller_name": 1})
      if doc:
        sellers_list.append({"id": sid, "name": doc.get("seller_name", "Unknown")})
    categories_list = [c for c in products_col.distinct("category_name") if c]
  except:
    pass

  return {
    "status": "success",
    "products": products,
    "total": total,
    "page": page,
    "page_size": page_size,
    "sellers": sellers_list,
    "categories": categories_list,
  }


# --- Seller Products & Categories ---

# --- Admin Orders Management ---
@app.get("/admin/orders/stats")
def get_admin_orders_stats(user=Depends(_require_admin_user)):
  """Get quick stats for admin orders dashboard."""
  db = get_db()
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
  
  # Calculate total revenue (only from delivered orders for accuracy)
  revenue_docs = list(orders_collection.find({"status": "delivered"}, {"total": 1}))
  total_revenue = sum(float(doc.get("total", 0)) for doc in revenue_docs)
  
  # Calculate total sales (all orders regardless of status - this includes all seller transactions)
  all_orders = list(orders_collection.find({}, {"total": 1}))
  total_sales = sum(float(doc.get("total", 0)) for doc in all_orders)
  
  # Calculate average order value
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

@app.get("/admin/orders/by-time")
def get_admin_orders_by_time(
  year: int = None,
  month: int = None,
  user=Depends(_require_admin_user)
):
  """Get orders grouped by day for heat map visualization."""
  from datetime import datetime
  import calendar
  
  orders_collection = _get_orders_collection()
  
  if orders_collection is None:
    return {"status": "success", "data": [], "year": year, "month": month}
  
  # Default to current year/month if not specified
  now = datetime.now()
  if year is None:
    year = now.year
  if month is None:
    month = now.month
  
  # Get first and last day of the month
  first_day = datetime(year, month, 1)
  last_day_num = calendar.monthrange(year, month)[1]
  last_day = datetime(year, month, last_day_num, 23, 59, 59)
  
  # Query orders in the date range
  query = {
    "created_at": {
      "$gte": first_day.isoformat(),
      "$lte": last_day.isoformat()
    }
  }
  
  orders = list(orders_collection.find(query))
  
  # Group by day of week and day of month
  day_counts = {}
  for order in orders:
    created_at = order.get("created_at", "")
    if created_at:
      try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00").replace("+00:00", ""))
        day_of_month = dt.day
        day_of_week = dt.weekday()  # 0 = Monday, 6 = Sunday
        key = f"{day_of_month}"
        if key not in day_counts:
          day_counts[key] = {"day": day_of_month, "weekday": day_of_week, "count": 0, "total": 0}
        day_counts[key]["count"] += 1
        day_counts[key]["total"] += float(order.get("total", 0))
      except:
        pass
  
  # Build calendar grid (weeks x days)
  first_weekday = first_day.weekday()  # 0 = Monday
  weeks = []
  current_day = 1
  
  for week_idx in range(6):  # Max 6 weeks in a month view
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

@app.get("/admin/orders")
def get_admin_orders(
  page: int = 1,
  page_size: int = 20,
  status: str = "all",
  seller: str = "all",
  category: str = "all",
  search: str = "",
  user=Depends(_require_admin_user)
):
  """Get all orders for admin management with filters."""
  db = get_db()
  orders_collection = _get_orders_collection()
  products_collection = _get_products_collection()
  users_collection = _get_users_collection()
  
  if orders_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  page = max(page, 1)
  page_size = min(max(page_size, 1), 50)
  
  # Build query
  query = {}
  if status != "all":
    query["status"] = status
  
  # Get all orders and filter in app for seller/category (requires product lookup)
  docs = list(orders_collection.find(query).sort("created_at", -1))
  
  filtered_orders = []
  
  for doc in docs:
    order_id = str(doc.get("_id"))
    user_id = doc.get("user_id")
    items = doc.get("items", [])
    
    # Get buyer name
    buyer_name = "Unknown"
    if user_id:
      try:
        buyer_user = users_collection.find_one({"_id": ObjectId(user_id)})
        if buyer_user:
          buyer_name = buyer_user.get("name", "Unknown")
      except:
        pass
    
    # Get seller and category from first product in order
    seller_name = "Unknown"
    order_category = ""
    
    if items:
      first_item = items[0]
      product_id = first_item.get("product_id")
      
      if product_id:
        try:
          product = products_collection.find_one({"_id": ObjectId(product_id)})
          if product:
            seller_id = product.get("seller_id")
            if seller_id:
              try:
                seller_user = users_collection.find_one({"_id": ObjectId(seller_id)})
                if seller_user:
                  seller_name = seller_user.get("name", "Unknown")
              except:
                pass
            
            order_category = product.get("category", "")
        except:
          pass
    
    # Apply filters
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
      "seller_id": "",  # Can enhance later
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

@app.get("/admin/orders/{order_id}")
def get_admin_order_detail(order_id: str, user=Depends(_require_admin_user)):
  """Get detailed order information for admin view."""
  db = get_db()
  orders_collection = _get_orders_collection()
  users_collection = _get_users_collection()
  
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
  
  if user_id:
    try:
      buyer_user = users_collection.find_one({"_id": ObjectId(user_id)})
      if buyer_user:
        buyer_name = buyer_user.get("name", "Unknown")
    except:
      pass
  
  # Get seller name from products
  seller_name = "Unknown"
  category = "General"
  items = order_doc.get("items", [])
  
  if items:
    products_collection = _get_products_collection()
    first_item = items[0]
    product_id = first_item.get("product_id")
    
    if product_id:
      try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if product:
          category = product.get("category", "General")
          seller_id = product.get("seller_id")
          if seller_id:
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

class OrderStatusUpdateBody(BaseModel):
  status: str

@app.put("/admin/orders/{order_id}/status")
def update_admin_order_status(order_id: str, body: OrderStatusUpdateBody, user=Depends(_require_admin_user)):
  """Update order status (admin only)."""
  db = get_db()
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

class CategoryCreateBody(BaseModel):
  name: str
  description: Optional[str] = None

class CategoryUpdateBody(BaseModel):
  name: Optional[str] = None
  description: Optional[str] = None

class ProductCreateBody(BaseModel):
  name: str
  description: Optional[str] = None
  price: float
  category_id: Optional[str] = None
  stock_qty: int = 0
  status: Optional[str] = None

class ProductUpdateBody(BaseModel):
  name: Optional[str] = None
  description: Optional[str] = None
  price: Optional[float] = None
  category_id: Optional[str] = None
  stock_qty: Optional[int] = None
  status: Optional[str] = None
  main_image_index: Optional[int] = None

class ProductDisableBody(BaseModel):
  disabled: Optional[bool] = None

class ReviewCreateBody(BaseModel):
  rating: int
  comment: str

class ReviewUpdateBody(BaseModel):
  rating: Optional[int] = None
  comment: Optional[str] = None

REVIEW_COMMENT_REGEX = re.compile(r"^[A-Za-z0-9\s.,!?'\"-]{5,500}$")

def _validate_review_comment(comment: str):
  cleaned = (comment or "").strip()
  if not cleaned:
    raise HTTPException(status_code=400, detail="Comment is required")
  if not REVIEW_COMMENT_REGEX.fullmatch(cleaned):
    raise HTTPException(status_code=400, detail="Comment must be 5-500 chars and use letters, numbers, and basic punctuation")
  return cleaned

def _user_has_ordered_product(orders_collection, user_id: str, product_id: str) -> bool:
  """Check if user has ordered and received (delivered/shipped) a product."""
  if orders_collection is None:
    return False
  # Only allow reviews if order is shipped or delivered
  match = orders_collection.find_one({
    "user_id": user_id,
    "items.product_id": product_id,
    "status": {"$in": ["shipped", "delivered"]}
  })
  return bool(match)

def _normalize_review(doc: dict) -> dict:
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

def _normalize_category(doc: dict) -> dict:
  return {
    "id": str(doc.get("_id")),
    "name": doc.get("name", ""),
    "description": doc.get("description", ""),
    "created_at": doc.get("created_at", ""),
    "updated_at": doc.get("updated_at", ""),
    "created_by": str(doc.get("created_by", "")),
  }

def _normalize_product(doc: dict) -> dict:
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

@app.get("/categories")
def get_categories(user=Depends(_require_seller_user)):
  collection = _get_categories_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  docs = list(collection.find({}).sort("name", 1))
  return {"status": "success", "categories": [_normalize_category(d) for d in docs]}

@app.post("/categories")
def create_category(body: CategoryCreateBody, user=Depends(_require_seller_user)):
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

@app.patch("/categories/{category_id}")
def update_category(category_id: str, body: CategoryUpdateBody, user=Depends(_require_seller_user)):
  collection = _get_categories_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(category_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid category ID")
  
  # Check if category exists
  category = collection.find_one({"_id": oid})
  if not category:
    raise HTTPException(status_code=404, detail="Category not found")
  
  # Check ownership - only creator can edit
  user_id = str(user.get("_id"))
  if str(category.get("created_by", "")) != user_id:
    raise HTTPException(status_code=403, detail="You can only edit categories you created")
  
  updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
  if body.name is not None:
    name = body.name.strip()
    if not name:
      raise HTTPException(status_code=400, detail="Category name is required")
    # Check if new name conflicts with existing category (excluding self)
    existing = collection.find_one({
      "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
      "_id": {"$ne": oid}
    })
    if existing:
      raise HTTPException(status_code=400, detail="Category name already exists")
    updates["name"] = name
  if body.description is not None:
    updates["description"] = body.description.strip()
  
  collection.update_one({"_id": oid}, {"$set": updates})
  doc = collection.find_one({"_id": oid})
  return {"status": "success", "category": _normalize_category(doc)}

@app.delete("/categories/{category_id}")
def delete_category(category_id: str, user=Depends(_require_seller_user)):
  collection = _get_categories_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(category_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid category ID")
  
  # Check if category exists
  category = collection.find_one({"_id": oid})
  if not category:
    raise HTTPException(status_code=404, detail="Category not found")
  
  # Check ownership - only creator can delete
  user_id = str(user.get("_id"))
  if str(category.get("created_by", "")) != user_id:
    raise HTTPException(status_code=403, detail="You can only delete categories you created")
  
  collection.delete_one({"_id": oid})
  return {"status": "success"}

@app.get("/catalog/categories")
def get_catalog_categories():
  collection = _get_categories_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  docs = list(collection.find({}).sort("name", 1))
  return {"status": "success", "categories": [_normalize_category(d) for d in docs]}

@app.get("/catalog/sellers")
def get_catalog_sellers():
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

@app.get("/catalog/sellers/{seller_id}")
def get_seller_store_profile(seller_id: str):
  """Get seller store profile with stats."""
  try:
    products_collection = _get_products_collection()
    db = get_db()
    if products_collection is None or db is None:
      raise HTTPException(status_code=500, detail="Database not configured")
    
    users_collection = db["users"]
    
    # Try to find seller user
    seller_user = None
    try:
      seller_user = users_collection.find_one({"_id": ObjectId(seller_id), "role": "seller"})
    except Exception as e:
      print(f"⚠️ Could not find seller user by ObjectId: {e}")
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
    
    # Get average rating from reviews (optional, don't crash if fails)
    avg_rating = None
    total_reviews = 0
    try:
      reviews_collection = db["product_reviews"]
      seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
      product_ids = [str(p["_id"]) for p in seller_products]
      if product_ids and reviews_collection is not None:
        rating_pipeline = [
          {"$match": {"product_id": {"$in": product_ids}}},
          {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
        ]
        rating_result = list(reviews_collection.aggregate(rating_pipeline))
        if rating_result:
          avg_rating = round(rating_result[0].get("avg", 0), 1)
          total_reviews = rating_result[0].get("count", 0)
    except Exception as e:
      print(f"⚠️ Could not calculate reviews: {e}")
      pass
    
    # Prepare joined_at safely (created_at may already be an ISO string)
    joined_at = None
    if seller_user and seller_user.get("created_at"):
      created_val = seller_user.get("created_at")
      try:
        if isinstance(created_val, datetime):
          joined_at = created_val.isoformat()
        else:
          joined_at = str(created_val)
      except Exception:
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
        "avg_rating": avg_rating,
        "total_reviews": total_reviews,
      }
    }
  except HTTPException:
    raise
  except Exception as e:
    print(f"❌ Error in get_seller_store_profile: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/catalog/products")
def get_catalog_products(
  search: str = "",
  category_id: str = "",
  seller_id: str = "",
  sort: str = "latest",
  page: int = 1,
  page_size: int = 12,
):
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

# --- Catalog Product Detail ---
@app.get("/catalog/products/{product_id}")
def get_catalog_product_detail(product_id: str):
  """Get detailed product information including reviews for the catalog."""
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

# --- Wishlist Endpoints ---
def _get_wishlist_collection():
  """Return wishlists collection if MongoDB is configured."""
  try:
    return get_db()["wishlists"]
  except Exception:
    return None


def _get_cart_collection():
  """Return carts collection if MongoDB is configured."""
  try:
    return get_db()["carts"]
  except Exception:
    return None

def _get_orders_collection():
  """Return orders collection if MongoDB is configured."""
  try:
    return get_db()["orders"]
  except Exception:
    return None

def _get_payouts_collection():
  """Return payouts collection if MongoDB is configured."""
  try:
    return get_db()["payouts"]
  except Exception:
    return None

@app.get("/wishlist")
def get_user_wishlist(user=Depends(_get_current_user)):
  """Get the current user's wishlist with product details."""
  wishlist_collection = _get_wishlist_collection()
  products_collection = _get_products_collection()
  if wishlist_collection is None or products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  user_id = str(user.get("_id"))
  wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
  
  if not wishlist_doc or not wishlist_doc.get("product_ids"):
    return {"status": "success", "products": [], "total": 0}
  
  # Get all products in wishlist
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

@app.post("/wishlist/{product_id}")
def toggle_wishlist(product_id: str, user=Depends(_get_current_user)):
  """Add or remove a product from the user's wishlist."""
  wishlist_collection = _get_wishlist_collection()
  products_collection = _get_products_collection()
  if wishlist_collection is None or products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  # Verify product exists
  try:
    product = products_collection.find_one({"_id": ObjectId(product_id)})
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  if not product:
    raise HTTPException(status_code=404, detail="Product not found")
  
  user_id = str(user.get("_id"))
  wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
  
  if not wishlist_doc:
    # Create wishlist with this product
    wishlist_collection.insert_one({
      "user_id": user_id,
      "product_ids": [product_id],
      "created_at": datetime.now().isoformat(),
      "updated_at": datetime.now().isoformat(),
    })
    return {"status": "success", "in_wishlist": True, "message": "Added to wishlist"}
  
  product_ids = wishlist_doc.get("product_ids", [])
  
  if product_id in product_ids:
    # Remove from wishlist
    product_ids.remove(product_id)
    wishlist_collection.update_one(
      {"user_id": user_id},
      {"$set": {"product_ids": product_ids, "updated_at": datetime.now().isoformat()}}
    )
    return {"status": "success", "in_wishlist": False, "message": "Removed from wishlist"}
  else:
    # Add to wishlist
    product_ids.append(product_id)
    wishlist_collection.update_one(
      {"user_id": user_id},
      {"$set": {"product_ids": product_ids, "updated_at": datetime.now().isoformat()}}
    )
    return {"status": "success", "in_wishlist": True, "message": "Added to wishlist"}

@app.get("/wishlist/check/{product_id}")
def check_wishlist(product_id: str, user=Depends(_get_current_user)):
  """Check if a product is in the user's wishlist."""
  wishlist_collection = _get_wishlist_collection()
  if wishlist_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  user_id = str(user.get("_id"))
  wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
  
  in_wishlist = wishlist_doc and product_id in wishlist_doc.get("product_ids", [])
  return {"status": "success", "in_wishlist": in_wishlist}

@app.get("/wishlist/ids")
def get_wishlist_ids(user=Depends(_get_current_user)):
  """Get just the product IDs in the user's wishlist (for efficient checking)."""
  wishlist_collection = _get_wishlist_collection()
  if wishlist_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  user_id = str(user.get("_id"))
  wishlist_doc = wishlist_collection.find_one({"user_id": user_id})
  
  product_ids = wishlist_doc.get("product_ids", []) if wishlist_doc else []
  return {"status": "success", "product_ids": product_ids}


# --- Cart Endpoints ---
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


# ===== VOUCHER/DISCOUNT MODELS =====
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


@app.get("/cart")
def get_cart(user=Depends(_get_current_user)):
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


@app.post("/cart/add")
def add_to_cart(body: AddToCartBody, user=Depends(_get_current_user)):
  """Add a product to the user's cart (or update quantity).

  Only users with role 'user' may add to cart.
  """
  role = (user.get("role") or "user").strip().lower()
  if role != "user":
    raise HTTPException(status_code=403, detail="Only regular users can create orders or add to cart")

  cart_collection = _get_cart_collection()
  products_collection = _get_products_collection()
  if cart_collection is None or products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  # Validate product
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
    # create cart
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

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "user"),
    action="Added item to cart",
    category="Cart",
    entity="Product",
    entity_id=body.product_id,
    status="success",
    details=f"Qty: {body.qty}",
  )
  return {"status": "success", "message": "Added to cart", "in_cart": True}

@app.patch("/cart/{product_id}")
def update_cart_item(product_id: str, body: dict, user=Depends(_get_current_user)):
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

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "user"),
    action="Updated cart item quantity",
    category="Cart",
    entity="Product",
    entity_id=product_id,
    status="success",
    details=f"Qty: {qty}",
  )
  return {"status": "success", "message": "Cart updated"}

@app.delete("/cart/{product_id}")
def remove_from_cart(product_id: str, user=Depends(_get_current_user)):
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

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "user"),
    action="Removed item from cart",
    category="Cart",
    entity="Product",
    entity_id=product_id,
    status="success",
    details="",
  )
  return {"status": "success", "message": "Item removed from cart"}

# --- Orders Endpoints ---
def _normalize_order(doc: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": str(doc.get("_id")),
    "order_number": doc.get("order_number", ""),
    "seller_id": doc.get("seller_id", ""),
    "seller_name": doc.get("seller_name", ""),
    "status": doc.get("status", ""),
    "total": doc.get("total", 0),
    "total_items": doc.get("total_items", 0),
    "payment_method": doc.get("payment_method", ""),
    "payment_status": doc.get("payment_status", "completed"),  # pending, completed, failed
    "payment_intent_id": doc.get("payment_intent_id", None),
    "paid_at": doc.get("paid_at", None),
    "address": doc.get("address", {}),
    "items": doc.get("items", []),
    "created_at": doc.get("created_at"),
    "updated_at": doc.get("updated_at"),
  }


@app.post("/payments/create-payment-intent")
def create_payment_intent(
    request_body: dict,
    user=Depends(_get_current_user)
):
  """
  Create a payment intent with PayMongo for e-wallet or card payments.
  
  Expects:
  - amount: integer (in PHP centavos, e.g., 50000 = PHP 500.00)
  - provider: string ('gcash', 'grabpay', 'maya' for e-wallet, or 'card')
  - phone_number: string (for e-wallet payments)
  - description: string (order description)
  - redirect_url: string (URL to redirect after payment)
  """
  role = (user.get("role") or "user").strip().lower()
  if role != "user":
    raise HTTPException(status_code=403, detail="Only regular users can make payments")
  
  try:
    amount = request_body.get("amount")
    provider = request_body.get("provider", "").strip().lower()
    phone_number = request_body.get("phone_number", "").strip()
    description = request_body.get("description", "DaingGrader Order")
    redirect_url = request_body.get("redirect_url", "")
    
    # Validate amount
    if not amount or amount <= 0:
      raise HTTPException(status_code=400, detail="Invalid amount")
    
    # Convert PHP to centavos if needed
    amount_centavos = int(amount) if isinstance(amount, int) else int(float(amount) * 100)
    
    # Create payment intent based on provider type
    if provider in ["gcash", "grabpay", "maya"]:
      # E-wallet payment
      if not phone_number:
        raise HTTPException(status_code=400, detail="Phone number required for e-wallet payments")
      
      result = create_payment_intent_for_ewallet(
        amount=amount_centavos,
        provider=provider,
        description=description,
        redirect_url=redirect_url
      )
    elif provider == "card":
      # Card payment
      result = create_payment_intent_for_card(
        amount=amount_centavos,
        description=description,
        redirect_url=redirect_url
      )
    else:
      raise HTTPException(status_code=400, detail="Invalid payment provider")
    
    if not result.get("success"):
      raise HTTPException(status_code=400, detail=result.get("error", "Failed to create payment intent"))
    
    # Log the payment attempt
    _log_audit_event(
      actor=user.get("name", "User"),
      actor_id=str(user.get("_id")),
      role=user.get("role", "user"),
      action="Created payment intent",
      category="Payment",
      entity="PaymentIntent",
      entity_id=result.get("payment_intent_id", ""),
      status="success",
      details=f"Provider: {provider}, Amount: {amount_centavos} centavos",
    )
    
    return {
      "status": "success",
      "payment_intent_id": result.get("payment_intent_id"),
      "checkout_url": result.get("checkout_url"),
      "client_key": result.get("client_key"),
      "amount": amount_centavos,
      "provider": provider
    }
    
  except HTTPException:
    raise
  except Exception as e:
    error_msg = str(e)
    _log_audit_event(
      actor=user.get("name", "User"),
      actor_id=str(user.get("_id")),
      role=user.get("role", "user"),
      action="Failed to create payment intent",
      category="Payment",
      entity="PaymentIntent",
      entity_id="",
      status="failure",
      details=f"Error: {error_msg}",
    )
    raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {error_msg}")


@app.post("/payments/callback")
def payment_callback(request_body: dict, user=Depends(_get_current_user)):
  """
  Handle payment callback after user completes payment on PayMongo
  
  Expects:
  - payment_intent_id: string (from PayMongo)
  """
  try:
    payment_intent_id = request_body.get("payment_intent_id", "").strip()
    
    if not payment_intent_id:
      raise HTTPException(status_code=400, detail="Missing payment_intent_id")
    
    orders_collection = _get_orders_collection()
    if orders_collection is None:
      raise HTTPException(status_code=500, detail="Database not configured")
    
    # Retrieve payment intent status from PayMongo
    result = retrieve_payment_intent(payment_intent_id)
    
    if not result.get("success"):
      raise HTTPException(status_code=400, detail=result.get("error", "Failed to retrieve payment status"))
    
    paymongo_status = result.get("status", "unknown")
    
    # Map PayMongo status to our order status
    if paymongo_status == "succeeded":
      order_status = "confirmed"
      payment_status = "completed"
    elif paymongo_status == "failed":
      order_status = "failed"
      payment_status = "failed"
    else:
      order_status = "pending"
      payment_status = "pending"
    
    now = datetime.utcnow().isoformat()
    
    # Update all orders with this payment intent ID
    update_result = orders_collection.update_many(
      {"payment_intent_id": payment_intent_id, "user_id": str(user.get("_id"))},
      {
        "$set": {
          "status": order_status,
          "payment_status": payment_status,
          "paid_at": now if paymongo_status == "succeeded" else None,
          "updated_at": now
        }
      }
    )
    
    _log_audit_event(
      actor=user.get("name", "User"),
      actor_id=str(user.get("_id")),
      role=user.get("role", "user"),
      action="Payment callback processed",
      category="Payment",
      entity="PaymentIntent",
      entity_id=payment_intent_id,
      status="success",
      details=f"PayMongo status: {paymongo_status}, Orders updated: {update_result.modified_count}",
    )
    
    return {
      "status": "success",
      "payment_status": payment_status,
      "payment_intent_id": payment_intent_id,
      "paymongo_status": paymongo_status,
      "orders_updated": update_result.modified_count
    }
    
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to process payment callback: {str(e)}")


# --- Payouts Management (Admin & Seller) ---
@app.get("/payouts/admin")
def get_admin_payouts(
  page: int = 1,
  page_size: int = 20,
  status: str = "all",
  seller_id: str = "all",
  period: str = "",
  user=Depends(_require_admin_user)
):
  """Get all payouts for admin management with filters."""
  db = get_db()
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
    seller_id = doc.get("seller_id", "")
    seller_name = "Unknown"
    
    # Get seller name
    if seller_id and users_collection:
      try:
        seller_user = users_collection.find_one({"_id": ObjectId(seller_id)})
        if seller_user:
          seller_name = seller_user.get("name", "Unknown")
      except:
        pass
    
    payouts.append({
      "id": str(doc.get("_id")),
      "seller_id": seller_id,
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


@app.get("/payouts/admin/stats")
def get_admin_payouts_stats(user=Depends(_require_admin_user)):
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


class PayoutStatusUpdateBody(BaseModel):
  status: str  # pending, completed
  notes: Optional[str] = None


@app.put("/payouts/admin/{payout_id}/status")
def update_payout_status(payout_id: str, body: PayoutStatusUpdateBody, user=Depends(_require_admin_user)):
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
  
  _log_audit_event(
    actor=user.get("name", "Admin"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "admin"),
    action="Updated payout status",
    category="Payouts",
    entity="Payout",
    entity_id=payout_id,
    status="success",
    details=f"New status: {new_status}",
  )
  
  return {
    "status": "success",
    "new_status": new_status,
    "message": f"Payout status updated to {new_status}",
  }


@app.get("/payouts/mysales")
def get_seller_earnings(user=Depends(_require_seller_user)):
  """Get current seller's earnings summary and payout history."""
  payouts_collection = _get_payouts_collection()
  orders_collection = _get_orders_collection()
  
  if payouts_collection is None or orders_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  seller_id = str(user.get("_id"))
  seller_name = user.get("name", "Seller")
  
  # Get seller's payouts
  payouts = list(payouts_collection.find({"seller_id": seller_id}).sort("created_at", -1))
  
  # Calculate current period earnings (current month)
  from datetime import datetime as dt
  now = dt.now()
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
    products_collection = _get_products_collection()
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
      "paid_at": payout.get("paid_at"),
      "created_at": payout.get("created_at", ""),
    })
  
  return {
    "status": "success",
    "seller": {
      "id": seller_id,
      "name": seller_name,
    },
    "current_period": current_period,
    "earnings": {
      "total_sales": round(current_total_sales, 2),
      "commission_percent": commission_percent,
      "commission_amount": round(commission_amount, 2),
      "amount_to_pay": round(amount_to_pay, 2),
      "orders_count": current_orders_count,
    },
    "payout_history": payout_history,
  }


@app.post("/orders/checkout")
def checkout_order(body: OrderCreateBody, user=Depends(_get_current_user)):
  """Create an order from the current user's cart and clear the cart."""
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
    
    # Determine payment status based on payment method
    if body.payment_method.lower() == "cod":
      # COD orders are immediately confirmed
      order_status = "confirmed"
      payment_status = "completed"
      paid_at = now
      payment_intent_id = None
    else:
      # PayMongo (e-wallet/card) orders start as pending until payment confirmed
      order_status = "pending"
      payment_status = "pending"
      paid_at = None
      payment_intent_id = None
    
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
      "payment_intent_id": payment_intent_id,
      "paid_at": paid_at,
      "address": body.address.dict(),
      "items": group.get("items", []),
      "created_at": now,
      "updated_at": now,
    }
    result = orders_collection.insert_one(order_doc)
    order_doc["_id"] = result.inserted_id
    created_orders.append(order_doc)

  # Create payment intent for PayMongo orders
  checkout_url = None
  payment_intent_id = None
  if body.payment_method.lower() in ["paymongo"] and created_orders:
    total_amount = sum(order.get("total", 0) for order in created_orders)
    # Convert PHP to centavos
    amount_centavos = int(total_amount * 100)
    
    payment_result = create_payment_intent_for_ewallet(
      amount=amount_centavos,
      provider="gcash",  # Default to GCash, will be overridden by frontend if needed
      description=f"DaingGrader Order - {len(created_orders)} seller(s)",
      redirect_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/checkout/payment-callback"
    )
    
    if payment_result.get("success"):
      payment_intent_id = payment_result.get("payment_intent_id")
      checkout_url = payment_result.get("checkout_url")
      
      # Update all orders with the payment_intent_id
      orders_collection.update_many(
        {"user_id": user_id, "_id": {"$in": [o.get("_id") for o in created_orders]}},
        {"$set": {"payment_intent_id": payment_intent_id, "updated_at": now}}
      )
      
      # Update created_orders list with the payment_intent_id so it's returned to frontend
      for order in created_orders:
        order["payment_intent_id"] = payment_intent_id

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

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "user"),
    action="Placed order",
    category="Order",
    entity="Order",
    entity_id=str(created_orders[0].get("_id")) if created_orders else "",
    status="success",
    details=f"Orders created: {len(created_orders)}",
  )

  order_payloads = [_normalize_order(doc) for doc in created_orders]

  user_email = (user.get("email") or "").strip().lower()
  user_name = user.get("name") or user_email or "Customer"
  users_collection = _get_users_collection()
  email_status = []
  for order_payload in order_payloads:
    buyer_sent = False
    seller_sent = False
    buyer_error = ""
    seller_error = ""

    try:
      pdf_bytes = build_receipt_pdf_bytes(order_payload)

      if user_email:
        try:
          send_order_receipt_email(user_email, user_name, order_payload, pdf_bytes)
          buyer_sent = True
        except Exception as email_error:
          buyer_error = str(email_error)
          print(f"⚠️ Failed to send receipt email to buyer: {email_error}")

      seller_email = ""
      seller_name = "Seller"
      seller_id = (order_payload.get("seller_id") or "").strip()
      if users_collection is not None and seller_id:
        try:
          seller_user = users_collection.find_one({"_id": ObjectId(seller_id)})
          if seller_user:
            seller_email = (seller_user.get("email") or "").strip().lower()
            seller_name = seller_user.get("name") or seller_email or "Seller"
        except Exception:
          seller_email = ""

      if seller_email and seller_email != user_email:
        try:
          send_order_receipt_email(seller_email, seller_name, order_payload, pdf_bytes)
          seller_sent = True
        except Exception as email_error:
          seller_error = str(email_error)
          print(f"⚠️ Failed to send receipt email to seller: {email_error}")
    except Exception as email_error:
      buyer_error = buyer_error or str(email_error)
      print(f"⚠️ Failed to prepare receipt email: {email_error}")

    email_status.append({
      "order_id": order_payload.get("id"),
      "buyer_sent": buyer_sent,
      "seller_sent": seller_sent,
      "buyer_error": buyer_error,
      "seller_error": seller_error,
    })

  return {
    "status": "success",
    "orders": order_payloads,
    "order_ids": [o.get("id") for o in order_payloads],
    "order": order_payloads[0] if order_payloads else None,
    "email_status": email_status,
    "checkout_url": checkout_url,  # For PayMongo redirect
    "payment_intent_id": payment_intent_id,  # For callback reference
  }


@app.get("/orders")
def get_orders(page: int = 1, page_size: int = 10, user=Depends(_get_current_user)):
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


@app.get("/orders/seller")
def get_seller_orders(page: int = 1, page_size: int = 10, user=Depends(_require_seller_user)):
  orders_collection = _get_orders_collection()
  products_collection = _get_products_collection()
  if orders_collection is None or products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  if page < 1 or page_size < 1 or page_size > 50:
    raise HTTPException(status_code=400, detail="Invalid pagination parameters")

  seller_id = str(user.get("_id"))
  seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
  seller_product_ids = {str(p.get("_id")) for p in seller_products}
  if not seller_product_ids:
    return {"status": "success", "orders": [], "total": 0}

  docs = list(orders_collection.find({}).sort("created_at", -1))
  filtered = []
  for doc in docs:
    if str(doc.get("seller_id", "")) == seller_id:
      filtered.append(doc)
      continue

    items = doc.get("items", [])
    seller_items = [it for it in items if it.get("product_id") in seller_product_ids]
    if not seller_items:
      continue
    seller_total = sum(float(it.get("price", 0)) * int(it.get("qty", 1)) for it in seller_items)
    seller_total_items = sum(int(it.get("qty", 1)) for it in seller_items)
    cloned = dict(doc)
    cloned["items"] = seller_items
    cloned["total"] = seller_total
    cloned["total_items"] = seller_total_items
    filtered.append(cloned)

  total = len(filtered)
  start = (page - 1) * page_size
  paged = filtered[start : start + page_size]
  return {"status": "success", "orders": [_normalize_order(d) for d in paged], "total": total}


@app.put("/orders/{order_id}/cancel")
def cancel_order(order_id: str, user=Depends(_get_current_user)):
  """Cancel an order (customer only). Can only cancel orders in 'pending' or 'confirmed' status."""
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
      detail=f"Cannot cancel order with status '{current_status}'. Only pending or confirmed orders can be cancelled."
    )

  now = datetime.utcnow().isoformat()
  orders_collection.update_one(
    {"_id": oid},
    {"$set": {"status": "cancelled", "updated_at": now}}
  )

  updated = orders_collection.find_one({"_id": oid})

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=user_id,
    role=user.get("role", "user"),
    action="Cancelled order",
    category="Order",
    entity="Order",
    entity_id=order_id,
    status="success",
    details=f"Previous status: {current_status}",
  )

  return {"status": "success", "order": _normalize_order(updated)}


@app.patch("/orders/{order_id}/status")
def update_order_status(order_id: str, body: OrderStatusUpdateBody, user=Depends(_require_seller_user)):
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

  # Send email notification to customer for shipped / cancelled
  if status in {"shipped", "cancelled"}:
    try:
      db = get_db()
      users_collection = db["users"] if db is not None else None
      buyer_id = doc.get("user_id")
      customer_email = None
      customer_name = "Customer"
      if users_collection and buyer_id:
        try:
          buyer = users_collection.find_one({"_id": ObjectId(buyer_id)})
        except Exception:
          buyer = None
        if buyer:
          customer_email = buyer.get("email")
          customer_name = buyer.get("name", "Customer")
      if customer_email:
        order_number = doc.get("order_number") or order_id
        items = doc.get("items", [])
        total = float(doc.get("total", 0))
        address = doc.get("address", {})
        if status == "shipped":
          send_order_shipped_email(
            customer_email=customer_email,
            customer_name=customer_name,
            order_number=order_number,
            items=items,
            total=total,
            address=address,
          )
        else:
          send_order_cancelled_email(
            customer_email=customer_email,
            customer_name=customer_name,
            order_number=order_number,
            items=items,
            total=total,
          )
    except Exception as _email_err:
      print(f"[ORDER EMAIL] Failed to send status email: {_email_err}")

  _log_audit_event(
    actor=user.get("name", "Seller"),
    actor_id=str(user.get("_id")),
    role=user.get("role", "seller"),
    action="Updated order status",
    category="Order",
    entity="Order",
    entity_id=order_id,
    status="success",
    details=f"Status set to {status}",
  )

  return {"status": "success", "order": _normalize_order(updated)}


@app.patch("/orders/{order_id}/mark-delivered")
def mark_order_delivered(order_id: str, user=Depends(_get_current_user)):
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

  _log_audit_event(
    actor=user.get("name", "User"),
    actor_id=user_id,
    role="user",
    action="Marked order as delivered",
    category="Order",
    entity="Order",
    entity_id=order_id,
    status="success",
    details="User confirmed delivery",
  )

  return {"status": "success", "order": _normalize_order(updated)}


@app.get("/orders/{order_id}")
def get_order_detail(order_id: str, user=Depends(_get_current_user)):
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

  # Try to find the order directly by ID
  doc = orders_collection.find_one({"_id": oid})
  if not doc:
    raise HTTPException(status_code=404, detail="Order not found")

  # Access control: buyer can view their own order; seller can view if order contains their products
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
  # admins can view any order

  return {"status": "success", "order": _normalize_order(doc)}

@app.get("/orders/{order_id}/receipt.pdf")
def get_order_receipt_pdf(order_id: str, user=Depends(_get_current_user)):
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

@app.get("/seller/products")
def get_seller_products(
  search: str = "",
  category_id: str = "",
  in_stock: Optional[bool] = None,
  include_disabled: bool = True,
  page: int = 1,
  page_size: int = 5,
  user=Depends(_require_seller_user),
):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  if page < 1 or page_size < 1 or page_size > 100:
    raise HTTPException(status_code=400, detail="Invalid pagination parameters")
  query: Dict[str, Any] = {"seller_id": str(user.get("_id"))}
  if search:
    query["$or"] = [
      {"name": {"$regex": re.escape(search), "$options": "i"}},
      {"description": {"$regex": re.escape(search), "$options": "i"}},
    ]
  if category_id:
    try:
      query["category_id"] = ObjectId(category_id)
    except:
      raise HTTPException(status_code=400, detail="Invalid category ID")
  if in_stock is True:
    query["stock_qty"] = {"$gt": 0}
  if in_stock is False:
    query["stock_qty"] = {"$lte": 0}
  if not include_disabled:
    query["is_disabled"] = {"$ne": True}
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
    "page": page,
    "page_size": page_size,
  }

@app.get("/seller/products/{product_id}")
def get_seller_product(product_id: str, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  doc = collection.find_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if not doc:
    raise HTTPException(status_code=404, detail="Product not found")
  return {"status": "success", "product": _normalize_product(doc)}

@app.post("/seller/products")
def create_seller_product(body: ProductCreateBody, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  categories = _get_categories_collection()
  if collection is None or categories is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  name = (body.name or "").strip()
  if not name or len(name) < 2:
    raise HTTPException(status_code=400, detail="Product name must be at least 2 characters")
  if body.price <= 0:
    raise HTTPException(status_code=400, detail="Price must be greater than 0")
  if body.stock_qty < 0:
    raise HTTPException(status_code=400, detail="Stock must be >= 0")
  status = (body.status or "available").strip() or "available"
  if status not in {"available", "draft"}:
    raise HTTPException(status_code=400, detail="Invalid status value")

  category_name = ""
  category_oid = None
  if body.category_id:
    try:
      category_oid = ObjectId(body.category_id)
    except:
      raise HTTPException(status_code=400, detail="Invalid category ID")
    category_doc = categories.find_one({"_id": category_oid})
    if not category_doc:
      raise HTTPException(status_code=404, detail="Category not found")
    category_name = category_doc.get("name", "")

  now = datetime.utcnow().isoformat()
  doc = {
    "seller_id": str(user.get("_id")),
    "seller_name": user.get("name", ""),
    "name": name,
    "description": (body.description or "").strip(),
    "price": float(body.price),
    "category_id": category_oid,
    "category_name": category_name,
    "stock_qty": int(body.stock_qty),
    "status": status,
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

@app.patch("/seller/products/{product_id}")
def update_seller_product(product_id: str, body: ProductUpdateBody, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  categories = _get_categories_collection()
  if collection is None or categories is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  product = collection.find_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if not product:
    raise HTTPException(status_code=404, detail="Product not found")

  updates: Dict[str, Any] = {"updated_at": datetime.utcnow().isoformat()}
  if body.name is not None:
    name = body.name.strip()
    if not name or len(name) < 2:
      raise HTTPException(status_code=400, detail="Product name must be at least 2 characters")
    updates["name"] = name
  if body.description is not None:
    updates["description"] = body.description.strip()
  if body.price is not None:
    if body.price <= 0:
      raise HTTPException(status_code=400, detail="Price must be greater than 0")
    updates["price"] = float(body.price)
  if body.stock_qty is not None:
    if body.stock_qty < 0:
      raise HTTPException(status_code=400, detail="Stock must be >= 0")
    updates["stock_qty"] = int(body.stock_qty)
  if body.status is not None:
    status = body.status.strip() or "available"
    if status not in {"available", "draft"}:
      raise HTTPException(status_code=400, detail="Invalid status value")
    updates["status"] = status
  if body.main_image_index is not None:
    updates["main_image_index"] = int(body.main_image_index)
  if body.category_id is not None:
    if body.category_id == "":
      updates["category_id"] = None
      updates["category_name"] = ""
    else:
      try:
        category_oid = ObjectId(body.category_id)
      except:
        raise HTTPException(status_code=400, detail="Invalid category ID")
      category_doc = categories.find_one({"_id": category_oid})
      if not category_doc:
        raise HTTPException(status_code=404, detail="Category not found")
      updates["category_id"] = category_oid
      updates["category_name"] = category_doc.get("name", "")

  collection.update_one({"_id": oid}, {"$set": updates})
  updated = collection.find_one({"_id": oid})
  return {"status": "success", "product": _normalize_product(updated)}

@app.post("/seller/products/{product_id}/disable")
def disable_seller_product(product_id: str, body: ProductDisableBody, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  product = collection.find_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if not product:
    raise HTTPException(status_code=404, detail="Product not found")
  new_disabled = body.disabled if body.disabled is not None else not product.get("is_disabled", False)
  collection.update_one({"_id": oid}, {"$set": {"is_disabled": bool(new_disabled), "updated_at": datetime.utcnow().isoformat()}})
  return {"status": "success", "is_disabled": bool(new_disabled)}

@app.delete("/seller/products/{product_id}")
def delete_seller_product(product_id: str, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  result = collection.delete_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if result.deleted_count == 0:
    raise HTTPException(status_code=404, detail="Product not found")
  return {"status": "success"}

@app.post("/seller/products/{product_id}/images")
async def upload_seller_product_images(
  product_id: str,
  images: List[UploadFile] = File(...),
  main_index: Optional[int] = Form(None),
  user=Depends(_require_seller_user),
):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  product = collection.find_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if not product:
    raise HTTPException(status_code=404, detail="Product not found")

  uploaded_items = []
  for img in images:
    contents = await img.read()
    upload = cloudinary.uploader.upload(
      contents,
      folder=f"daing-products/{str(user.get('_id'))}",
      resource_type="image",
    )
    uploaded_items.append({
      "url": upload.get("secure_url"),
      "public_id": upload.get("public_id"),
      "uploaded_at": datetime.utcnow().isoformat(),
    })

  existing = product.get("images", [])
  new_images = existing + uploaded_items
  updates: Dict[str, Any] = {"images": new_images, "updated_at": datetime.utcnow().isoformat()}
  if main_index is not None:
    updates["main_image_index"] = int(main_index)
  elif product.get("main_image_index") is None and new_images:
    updates["main_image_index"] = 0
  collection.update_one({"_id": oid}, {"$set": updates})
  updated = collection.find_one({"_id": oid})
  return {"status": "success", "product": _normalize_product(updated)}

@app.delete("/seller/products/{product_id}/images/{index}")
def delete_seller_product_image(product_id: str, index: int, user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  if collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  try:
    oid = ObjectId(product_id)
  except:
    raise HTTPException(status_code=400, detail="Invalid product ID")
  product = collection.find_one({"_id": oid, "seller_id": str(user.get("_id"))})
  if not product:
    raise HTTPException(status_code=404, detail="Product not found")
  images = product.get("images", [])
  if index < 0 or index >= len(images):
    raise HTTPException(status_code=400, detail="Invalid image index")

  removed = images.pop(index)
  public_id = removed.get("public_id") if isinstance(removed, dict) else None
  if public_id and cloudinary:
    try:
      cloudinary.uploader.destroy(public_id)
    except Exception as e:
      print(f"⚠️ Failed to delete Cloudinary image: {e}")

  main_index = product.get("main_image_index", 0)
  if index == main_index:
    main_index = 0 if images else 0
  elif index < main_index:
    main_index = max(0, main_index - 1)

  collection.update_one(
    {"_id": oid},
    {"$set": {"images": images, "main_image_index": main_index, "updated_at": datetime.utcnow().isoformat()}},
  )
  updated = collection.find_one({"_id": oid})
  return {"status": "success", "product": _normalize_product(updated)}

# Public endpoint for getting product reviews (displayed on product detail page)
@app.get("/catalog/products/{product_id}/reviews")
def get_product_reviews_public(
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
  # Public query: get all reviews for this product (no seller auth required)
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

@app.get("/seller/products/{product_id}/reviews")
def get_seller_product_reviews(
  product_id: str,
  page: int = 1,
  page_size: int = 3,
  user=Depends(_require_seller_user),
):
  """Seller-only endpoint for viewing reviews of their own products in seller dashboard."""
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

@app.post("/products/{product_id}/reviews")
def create_product_review(product_id: str, body: ReviewCreateBody, user=Depends(_get_current_user)):
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

@app.get("/products/{product_id}/reviews/me")
def get_my_product_review(product_id: str, user=Depends(_get_current_user)):
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

@app.patch("/products/{product_id}/reviews/me")
def update_my_product_review(product_id: str, body: ReviewUpdateBody, user=Depends(_get_current_user)):
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

@app.delete("/products/{product_id}/reviews/me")
def delete_my_product_review(product_id: str, user=Depends(_get_current_user)):
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

@app.post("/seller/products/import-csv")
async def import_seller_products_csv(file: UploadFile = File(...), user=Depends(_require_seller_user)):
  collection = _get_products_collection()
  categories = _get_categories_collection()
  if collection is None or categories is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  if not file.filename.lower().endswith(".csv"):
    raise HTTPException(status_code=400, detail="Only CSV files are supported")

  raw = await file.read()
  text = raw.decode("utf-8-sig")
  reader = csv.DictReader(io.StringIO(text))
  required_cols = {"name", "price", "stock_qty", "category"}
  if not reader.fieldnames or not required_cols.issubset({c.strip().lower() for c in reader.fieldnames}):
    raise HTTPException(status_code=400, detail="CSV must include: name, price, stock_qty, category")

  inserted = 0
  errors = []
  now = datetime.utcnow().isoformat()
  for idx, row in enumerate(reader, start=2):
    try:
      name = (row.get("name") or "").strip()
      if not name:
        raise ValueError("Name is required")
      price = float(row.get("price") or 0)
      stock_qty = int(float(row.get("stock_qty") or 0))
      category_name = (row.get("category") or "").strip()
      description = (row.get("description") or "").strip()
      status = (row.get("status") or "available").strip() or "available"
      images_field = (row.get("images") or "").strip()
      main_image_index = row.get("main_image_index")
      main_index = int(main_image_index) if str(main_image_index).strip().isdigit() else 0

      if not category_name:
        raise ValueError("Category is required")
      cat_doc = categories.find_one({"name": {"$regex": f"^{re.escape(category_name)}$", "$options": "i"}})
      if not cat_doc:
        cat_doc = {
          "name": category_name,
          "description": "",
          "created_at": now,
          "updated_at": now,
          "created_by": str(user.get("_id")),
        }
        result = categories.insert_one(cat_doc)
        cat_doc["_id"] = result.inserted_id

      images = []
      if images_field:
        for url in [u.strip() for u in images_field.split("|") if u.strip()]:
          images.append({"url": url, "public_id": "", "uploaded_at": now})

      doc = {
        "seller_id": str(user.get("_id")),
        "seller_name": user.get("name", ""),
        "name": name,
        "description": description,
        "price": price,
        "category_id": cat_doc.get("_id"),
        "category_name": cat_doc.get("name", ""),
        "stock_qty": stock_qty,
        "status": status,
        "images": images,
        "main_image_index": main_index,
        "is_disabled": False,
        "sold_count": 0,
        "created_at": now,
        "updated_at": now,
      }
      collection.insert_one(doc)
      inserted += 1
    except Exception as e:
      errors.append({"row": idx, "error": str(e)})

  return {"status": "success", "inserted": inserted, "errors": errors}


# --- Seller Analytics Dashboard ---

@app.get("/seller/analytics/kpis")
def get_seller_kpis(user=Depends(_require_seller_user)):
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
    
    # --- Month-over-month change calculations ---
    now = datetime.utcnow()
    curr_month_start = datetime(now.year, now.month, 1)
    prev_month_start = datetime(now.year if now.month > 1 else now.year - 1, now.month - 1 if now.month > 1 else 12, 1)
    prev_month_end = curr_month_start

    # Products change (current month vs prev month)
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

    # Orders & earnings change this month vs prev month
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

    # Rating change: compare current month avg vs previous month avg
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
    print(f"❌ Error in get_seller_kpis: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/orders/recent")
def get_seller_recent_orders(limit: int = 3, user=Depends(_require_seller_user)):
  """Get recent orders for seller dashboard."""
  products_collection = _get_products_collection()
  orders_collection = _get_orders_collection()
  
  if products_collection is None or orders_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  seller_id = str(user.get("_id"))
  
  try:
    # Get seller product IDs
    seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
    seller_product_ids = {str(p.get("_id")) for p in seller_products}
    
    if not seller_product_ids:
      return {"status": "success", "orders": []}
    
    # Find recent orders containing seller's products
    docs = list(orders_collection.find({}).sort("created_at", -1).limit(limit * 3))  # Get more than needed for filtering
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
    print(f"❌ Error in get_seller_recent_orders: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/reviews/recent")
def get_seller_recent_reviews(limit: int = 5, user=Depends(_require_seller_user)):
  """Get recent reviews across all of the seller's products."""
  db = get_db()
  products_collection = _get_products_collection()
  if db is None or products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  seller_id = str(user.get("_id"))
  try:
    from bson import ObjectId
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
    print(f"❌ Error in get_seller_recent_reviews: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/products/top")
def get_seller_top_products(page: int = 1, page_size: int = 4, user=Depends(_require_seller_user)):
  """Get top selling products for seller dashboard."""
  products_collection = _get_products_collection()
  
  if products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  if page < 1 or page_size < 1 or page_size > 20:
    raise HTTPException(status_code=400, detail="Invalid pagination parameters")
  
  seller_id = str(user.get("_id"))
  
  try:
    # Get products sorted by sold_count
    pipeline = [
      {"$match": {"seller_id": seller_id, "is_disabled": {"$ne": True}}},
      {"$sort": {"sold_count": -1}},
    ]
    
    all_products = list(products_collection.aggregate(pipeline))
    total = len(all_products)
    
    # Paginate
    start = (page - 1) * page_size
    paged_products = all_products[start : start + page_size]
    
    # Format response
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
    print(f"❌ Error in get_seller_top_products: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/store/details")
def get_seller_store_details(user=Depends(_require_seller_user)):
  """Get store details: total stock, overall rating, total reviews, total sales, avg sales, avg orders."""
  db = get_db()
  products_collection = _get_products_collection()
  orders_collection = _get_orders_collection()

  if db is None or products_collection is None or orders_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  seller_id = str(user.get("_id"))

  try:
    # --- Store Details ---
    products = list(products_collection.find({"seller_id": seller_id, "is_disabled": {"$ne": True}}))
    seller_product_ids = {str(p.get("_id")) for p in products}
    seller_product_oids = [p.get("_id") for p in products if p.get("_id")]

    # Total stock / inventory
    total_stock = sum(int(p.get("stock_qty", 0)) for p in products)
    # Reference = total_stock itself (bar = 100%) or a minimum floor of 100
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

    # --- Order Details ---
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
    print(f"❌ Error in get_seller_store_details: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/sales/categories")
def get_seller_sales_by_category(user=Depends(_require_seller_user)):
  """Get sales breakdown by category for seller dashboard."""
  products_collection = _get_products_collection()
  
  if products_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")
  
  seller_id = str(user.get("_id"))
  
  try:
    # Aggregate sold count by category
    pipeline = [
      {"$match": {"seller_id": seller_id, "is_disabled": {"$ne": True}}},
      {"$group": {
        "_id": "$category_name",
        "total_sold": {"$sum": {"$ifNull": ["$sold_count", 0]}},
      }},
      {"$sort": {"total_sold": -1}},
    ]
    
    category_data = list(products_collection.aggregate(pipeline))
    
    # Calculate total and percentages
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
    print(f"❌ Error in get_seller_sales_by_category: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/seller/analytics/sales/overview")
def get_seller_sales_overview(
    year: int = None,
    half: int = None,
    granularity: str = "monthly",   # daily | monthly | yearly
    days: int = 7,                  # for granularity=daily: last N days
    count: int = 10,                # for granularity=yearly: last N years
    start_date: str = None,         # ISO date string, for custom range (daily buckets)
    end_date: str = None,           # ISO date string, for custom range (daily buckets)
    user=Depends(_require_seller_user)
):
  """
  Flexible sales chart data endpoint.
  - granularity=daily  → last `days` days (default 7), or between start_date/end_date
  - granularity=monthly → 12 months of `year` (default current year), filterable by half
  - granularity=yearly  → last `count` years (default 10)
  - start_date / end_date → override to daily buckets within that range
  """
  from datetime import datetime, timedelta

  orders_col = _get_orders_collection()
  if orders_col is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  seller_id = str(user.get("_id"))
  now = datetime.utcnow()
  current_year = now.year

  try:
    products_collection = _get_products_collection()
    if products_collection is None:
      raise HTTPException(status_code=500, detail="Database not configured")

    seller_products = list(products_collection.find({"seller_id": seller_id}, {"_id": 1}))
    seller_product_ids = {str(p.get("_id")) for p in seller_products}
    seller_product_oids = [p.get("_id") for p in seller_products if p.get("_id")]

    # Fetch all relevant orders
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

    # --- Available years ---
    years_set = set()
    for order in seller_orders:
      dt = _parse_created(order.get("created_at"))
      if dt:
        years_set.add(dt.year)
    available_years = sorted(years_set, reverse=True) or [current_year]

    # === Branch by granularity ===

    # --- Custom date range (daily buckets) ---
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

    # --- Daily (last N days) ---
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

    # --- Yearly (last N years) ---
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

    # --- Monthly (default) ---
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
    print(f"❌ Error in get_seller_sales_overview: {e}")
    import traceback
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ===== VOUCHER/DISCOUNT ENDPOINTS =====

def _get_vouchers_collection():
  try:
    db = get_db()
    return db["vouchers"]
  except Exception:
    return None


@app.get("/api/vouchers")
def list_vouchers(
  filter_by: str = "all",  # all, active, expired
  seller_id: Optional[str] = None,
  user=Depends(_get_current_user)
):
  """List vouchers. If seller_id param is provided, filter to that seller. Otherwise, list all (admin only)."""
  vouchers_collection = _get_vouchers_collection()
  if vouchers_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  user_id = str(user.get("_id"))
  user_role = user.get("role", "user")

  # If seller_id param is provided, filter to that seller (seller viewing own codes)
  if seller_id:
    query = {"seller_id": seller_id}
  else:
    # If no seller_id param and user is not admin, return only their own codes
    if user_role != "admin":
      query = {"seller_id": user_id}
    else:
      # Admin: return all vouchers
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
      v["seller_id"] = str(v["seller_id"])
      if v.get("created_at"):
        v["created_at"] = v["created_at"].isoformat()
      if v.get("expiration_date"):
        v["expiration_date"] = v["expiration_date"].isoformat()

    return {"status": "success", "vouchers": vouchers}
  except Exception as e:
    print(f"❌ Error listing vouchers: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/vouchers/{voucher_id}")
def get_voucher(voucher_id: str, user=Depends(_get_current_user)):
  """Get a single voucher details."""
  vouchers_collection = _get_vouchers_collection()
  if vouchers_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  try:
    voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
    if not voucher:
      raise HTTPException(status_code=404, detail="Voucher not found")

    voucher["_id"] = str(voucher["_id"])
    voucher["seller_id"] = str(voucher["seller_id"])
    if voucher.get("created_at"):
      voucher["created_at"] = voucher["created_at"].isoformat()
    if voucher.get("expiration_date"):
      voucher["expiration_date"] = voucher["expiration_date"].isoformat()

    return {"status": "success", "voucher": voucher}
  except Exception as e:
    print(f"❌ Error getting voucher: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/vouchers")
def create_voucher(body: VoucherCreateBody, user=Depends(_get_current_user)):
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
    print(f"❌ Error creating voucher: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.put("/api/vouchers/{voucher_id}")
def update_voucher(voucher_id: str, body: VoucherUpdateBody, user=Depends(_get_current_user)):
  """Update a voucher (only own vouchers can be edited)."""
  vouchers_collection = _get_vouchers_collection()
  if vouchers_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  user_id = str(user.get("_id"))

  try:
    voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
    if not voucher:
      raise HTTPException(status_code=404, detail="Voucher not found")

    # Only seller who created it can edit (admins can't edit others' codes)
    if str(voucher["seller_id"]) != user_id:
      raise HTTPException(status_code=403, detail="You can only edit your own voucher codes")

    update_data = {}

    if body.code is not None:
      if len(body.code) < 3 or len(body.code) > 20:
        raise HTTPException(status_code=400, detail="Code must be 3-20 characters")
      if not re.match(r"^[A-Za-z0-9_-]+$", body.code):
        raise HTTPException(status_code=400, detail="Code must be alphanumeric, dash, or underscore only")
      # Check if new code already exists (excluding self)
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
    if updated_voucher.get("created_at"):
      updated_voucher["created_at"] = updated_voucher["created_at"].isoformat()
    if updated_voucher.get("expiration_date"):
      updated_voucher["expiration_date"] = updated_voucher["expiration_date"].isoformat()

    return {"status": "success", "voucher": updated_voucher}
  except HTTPException:
    raise
  except Exception as e:
    print(f"❌ Error updating voucher: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.delete("/api/vouchers/{voucher_id}")
def delete_voucher(voucher_id: str, user=Depends(_get_current_user)):
  """Delete a voucher (only own vouchers can be deleted)."""
  vouchers_collection = _get_vouchers_collection()
  if vouchers_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

  user_id = str(user.get("_id"))

  try:
    voucher = vouchers_collection.find_one({"_id": ObjectId(voucher_id)})
    if not voucher:
      raise HTTPException(status_code=404, detail="Voucher not found")

    if str(voucher["seller_id"]) != user_id:
      raise HTTPException(status_code=403, detail="You can only delete your own voucher codes")

    vouchers_collection.delete_one({"_id": ObjectId(voucher_id)})
    return {"status": "success", "message": "Voucher deleted"}
  except HTTPException:
    raise
  except Exception as e:
    print(f"❌ Error deleting voucher: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/vouchers/validate")
def validate_voucher(code: str, order_total: float, user=Depends(_get_current_user)):
  """Validate a voucher code and return discount info."""
  vouchers_collection = _get_vouchers_collection()
  if vouchers_collection is None:
    raise HTTPException(status_code=500, detail="Database not configured")

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

    # Calculate discount
    if voucher["discount_type"] == "percentage":
      discount_value = order_total * (voucher["value"] / 100)
    else:
      discount_value = voucher["value"]

    return {
      "status": "success",
      "valid": True,
      "discount_value": discount_value,
      "discount_type": voucher["discount_type"],
      "voucher_id": str(voucher["_id"])
    }
  except HTTPException:
    raise
  except Exception as e:
    print(f"❌ Error validating voucher: {e}")
    raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
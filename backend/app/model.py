"""
AI Model Management Module
==========================
Handles YOLO model loading and inference.
"""

from ultralytics import YOLO
from pathlib import Path

# Global model instance
_model = None


def load_model(model_path: str = "best.pt") -> YOLO:
    """
    Load the YOLO model.
    
    Args:
        model_path: Path to the model weights file
        
    Returns:
        Loaded YOLO model
    """
    global _model
    
    try:
        print("Loading AI Model...")
        _model = YOLO(model_path)
        print("✅ AI Model Loaded Successfully!")
        return _model
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print("Did you forget to put best.pt in the folder?")
        raise e


def get_model() -> YOLO:
    """
    Get the loaded model instance.
    
    Returns:
        YOLO model instance
    """
    global _model
    if _model is None:
        _model = load_model()
    return _model


def run_inference(img, confidence_threshold: float = 0.7):
    """
    Run YOLO inference on an image.
    
    Args:
        img: OpenCV image (BGR format)
        confidence_threshold: Minimum confidence threshold (default: 0.7 / 70%)
        
    Returns:
        tuple: (results, filtered_indices, detected_fish_types, detected_confidences)
    """
    model = get_model()
    
    # Use 1280 image size for better detection accuracy
    # This matches the training configuration for best.pt
    results = model(img, imgsz=1280)
    
    boxes = results[0].boxes
    masks = results[0].masks
    
    has_masks = masks is not None and len(masks) > 0
    if has_masks:
        print("🎭 Segmentation model detected (1280px) - using polygon masks")
    else:
        print("📦 Detection model detected (1280px) - using bounding boxes only")
    
    detected_fish_types = []
    detected_confidences = []
    filtered_indices = []
    
    if boxes is not None and len(boxes) > 0:
        confidences = boxes.conf.cpu().numpy()
        high_conf_detections = confidences >= confidence_threshold
        
        if high_conf_detections.any():
            filtered_indices = [i for i, conf in enumerate(confidences) if conf >= confidence_threshold]
            
            for idx in filtered_indices:
                fish_type = model.names[int(boxes.cls[idx])]
                confidence = float(boxes.conf[idx])
                detected_fish_types.append(fish_type)
                detected_confidences.append(confidence)
    
    return results, filtered_indices, detected_fish_types, detected_confidences, has_masks

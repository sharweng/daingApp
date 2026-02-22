"""
Mold Detection and Spatial Distribution Analysis Module v2
==========================================================
Advanced mold detection using segmentation-based pixel analysis
with fish pose estimation and anatomical zone mapping.

Key Features:
1. Fish Orientation Detection - Detects if fish is flipped/rotated
2. Keypoint-based Anatomical Zones - Head, Body, Belly, Tail mapping
3. Normalized Coordinate System - Position mapping (0-1) for consistency
4. Shadow Removal - Preprocessing to reduce false positives
5. Pixel-based Severity - Accurate mold coverage calculation

Severity Levels:
- None: <0.5% coverage (negligible/no mold)
- Low: 0.5-5% coverage (minor contamination)
- Moderate: 5-15% coverage (noticeable contamination)
- Severe: >15% coverage (heavy contamination)
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from collections import Counter


# =============================================================================
# NUMPY TYPE CONVERSION HELPER
# =============================================================================

def convert_numpy_types(obj: Any) -> Any:
    """
    Recursively convert numpy types to native Python types for JSON serialization.
    
    This handles:
    - np.int32, np.int64 -> int
    - np.float32, np.float64 -> float
    - np.bool_ -> bool
    - np.ndarray -> list
    - Nested dicts and lists
    """
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        converted = [convert_numpy_types(item) for item in obj]
        return tuple(converted) if isinstance(obj, tuple) else converted
    elif isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return convert_numpy_types(obj.tolist())
    else:
        return obj


# =============================================================================
# FISH POSE ESTIMATION & ORIENTATION DETECTION
# =============================================================================

def detect_fish_orientation(mask: np.ndarray) -> Dict:
    """
    Detect fish orientation using PCA and contour analysis.
    
    This identifies:
    - Primary axis angle (rotation)
    - Head/tail direction
    - Dorsal/ventral orientation (flipped?)
    
    Returns:
        Dict with orientation info including angle, head_side, is_flipped
    """
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {"angle": 0, "head_side": "left", "is_flipped": False}
    
    # Get largest contour (main fish body)
    fish_contour = max(contours, key=cv2.contourArea)
    
    # Fit ellipse for orientation
    if len(fish_contour) >= 5:
        ellipse = cv2.fitEllipse(fish_contour)
        center, axes, angle = ellipse
    else:
        # Fallback to bounding box
        x, y, w, h = cv2.boundingRect(fish_contour)
        center = (x + w/2, y + h/2)
        angle = 0 if w > h else 90
    
    # Get extreme points to determine head/tail (convert to native Python int)
    leftmost = (int(fish_contour[fish_contour[:, :, 0].argmin()][0][0]), 
                int(fish_contour[fish_contour[:, :, 0].argmin()][0][1]))
    rightmost = (int(fish_contour[fish_contour[:, :, 0].argmax()][0][0]),
                 int(fish_contour[fish_contour[:, :, 0].argmax()][0][1]))
    topmost = (int(fish_contour[fish_contour[:, :, 1].argmin()][0][0]),
               int(fish_contour[fish_contour[:, :, 1].argmin()][0][1]))
    bottommost = (int(fish_contour[fish_contour[:, :, 1].argmax()][0][0]),
                  int(fish_contour[fish_contour[:, :, 1].argmax()][0][1]))
    
    # Detect head side using contour curvature analysis
    # Head typically has more curvature (rounded snout)
    head_side = detect_head_side(fish_contour, mask.shape)
    
    # Detect if fish is flipped (belly up vs down)
    # Usually the belly is the wider/thicker part
    is_flipped = detect_if_flipped(fish_contour, mask)
    
    return {
        "angle": float(angle),
        "head_side": head_side,
        "is_flipped": is_flipped,
        "center": (float(center[0]), float(center[1])),
        "extreme_points": {
            "leftmost": leftmost,
            "rightmost": rightmost,
            "topmost": topmost,
            "bottommost": bottommost
        }
    }


def detect_head_side(contour: np.ndarray, shape: Tuple[int, int]) -> str:
    """
    Determine which end of the fish is the head.
    
    The head typically:
    - Has more curvature (rounder)
    - Is slightly wider at that end
    - Has more area concentrated
    """
    h, w = shape
    
    # Get bounding box
    x, y, bw, bh = cv2.boundingRect(contour)
    
    # Split contour into left and right halves
    mid_x = x + bw // 2
    
    left_points = contour[contour[:, :, 0] < mid_x]
    right_points = contour[contour[:, :, 0] >= mid_x]
    
    # Calculate the spread (variance) of y-coordinates on each side
    # Head usually has more spread (wider)
    left_spread = np.std(left_points[:, 1]) if len(left_points) > 0 else 0
    right_spread = np.std(right_points[:, 1]) if len(right_points) > 0 else 0
    
    # Also check density (more points = more complex shape = head)
    left_density = len(left_points) / (bw/2 + 1)
    right_density = len(right_points) / (bw/2 + 1)
    
    # Combine metrics
    left_score = left_spread * 0.6 + left_density * 0.4
    right_score = right_spread * 0.6 + right_density * 0.4
    
    return "left" if left_score >= right_score else "right"


def detect_if_flipped(contour: np.ndarray, mask: np.ndarray) -> bool:
    """
    Detect if fish is flipped (belly facing up).
    
    For most fish, the dorsal (back) side is relatively straight,
    while the ventral (belly) side has more curvature.
    """
    x, y, w, h = cv2.boundingRect(contour)
    
    # Create a profile by summing pixels horizontally
    mid_y = y + h // 2
    
    # Count pixels in top half vs bottom half
    top_pixels = np.sum(mask[y:mid_y, x:x+w])
    bottom_pixels = np.sum(mask[mid_y:y+h, x:x+w])
    
    # If bottom has more area, the belly is likely facing down (normal)
    # If top has more area, fish might be flipped
    # This is simplified - real fish anatomy varies
    return bool(top_pixels > bottom_pixels * 1.15)


def estimate_fish_keypoints(mask: np.ndarray, orientation: Dict) -> Dict:
    """
    Estimate anatomical keypoints on the fish.
    
    Keypoints (in normalized 0-1 coordinates):
    - snout_tip: Tip of the nose/mouth
    - dorsal_fin_base: Base of dorsal fin
    - tail_fork: Where tail begins to split
    - belly_center: Center of belly region
    - gill_position: Approximate gill location
    """
    h, w = mask.shape
    
    # Find contour
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return create_default_keypoints()
    
    fish_contour = max(contours, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(fish_contour)
    
    # Determine head direction
    head_side = orientation.get("head_side", "left")
    is_flipped = orientation.get("is_flipped", False)
    
    # Get extreme points (convert to native Python int for normalize function)
    leftmost = (int(fish_contour[fish_contour[:, :, 0].argmin()][0][0]),
                int(fish_contour[fish_contour[:, :, 0].argmin()][0][1]))
    rightmost = (int(fish_contour[fish_contour[:, :, 0].argmax()][0][0]),
                 int(fish_contour[fish_contour[:, :, 0].argmax()][0][1]))
    
    # Normalize coordinates to 0-1 range within fish bounding box
    def normalize(point):
        nx = (point[0] - x) / bw if bw > 0 else 0.5
        ny = (point[1] - y) / bh if bh > 0 else 0.5
        return (float(np.clip(nx, 0, 1)), float(np.clip(ny, 0, 1)))
    
    # Assign keypoints based on orientation
    if head_side == "left":
        snout_tip = normalize(leftmost)
        tail_fork = normalize(rightmost)
    else:
        snout_tip = normalize(rightmost)
        tail_fork = normalize(leftmost)
    
    # Estimate other keypoints relative to head/tail axis
    # Gill position: ~20% from head
    gill_x = snout_tip[0] * 0.8 + tail_fork[0] * 0.2
    gill_y = 0.4 if not is_flipped else 0.6
    
    # Dorsal fin base: ~40% from head, on top
    dorsal_x = snout_tip[0] * 0.6 + tail_fork[0] * 0.4
    dorsal_y = 0.2 if not is_flipped else 0.8
    
    # Belly center: ~50% from head, on bottom
    belly_x = snout_tip[0] * 0.5 + tail_fork[0] * 0.5
    belly_y = 0.7 if not is_flipped else 0.3
    
    return {
        "snout_tip": snout_tip,
        "tail_fork": tail_fork,
        "gill_position": (float(gill_x), float(gill_y)),
        "dorsal_fin_base": (float(dorsal_x), float(dorsal_y)),
        "belly_center": (float(belly_x), float(belly_y)),
        "bounding_box": {"x": int(x), "y": int(y), "w": int(bw), "h": int(bh)}
    }


def create_default_keypoints() -> Dict:
    """Create default keypoints when detection fails."""
    return {
        "snout_tip": (0.0, 0.5),
        "tail_fork": (1.0, 0.5),
        "gill_position": (0.2, 0.4),
        "dorsal_fin_base": (0.4, 0.2),
        "belly_center": (0.5, 0.7),
        "bounding_box": None
    }


# =============================================================================
# SHADOW REMOVAL & PREPROCESSING
# =============================================================================

def remove_shadows(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Remove shadows from the fish image to improve mold detection accuracy.
    
    Shadow patterns in belly cavities can look like mold. This preprocessing
    helps distinguish true mold from shadows.
    """
    # Convert to LAB color space
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    # This normalizes lighting across the image
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_normalized = clahe.apply(l_channel)
    
    # Reconstruct image
    lab_normalized = cv2.merge([l_normalized, a_channel, b_channel])
    img_normalized = cv2.cvtColor(lab_normalized, cv2.COLOR_LAB2BGR)
    
    # Apply only within fish mask
    result = img.copy()
    result[mask > 0] = img_normalized[mask > 0]
    
    return result


def preprocess_for_mold_detection(img: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Preprocess image for better mold detection.
    
    Steps:
    1. Shadow removal
    2. Color normalization
    3. Noise reduction
    """
    # Remove shadows
    processed = remove_shadows(img, mask)
    
    # Apply bilateral filter to reduce noise while preserving edges
    processed = cv2.bilateralFilter(processed, 9, 75, 75)
    
    return processed


# =============================================================================
# ANATOMICAL ZONE MAPPING
# =============================================================================

def create_anatomical_zones(mask: np.ndarray, keypoints: Dict, orientation: Dict) -> Dict[str, np.ndarray]:
    """
    Create spatial zone masks for split fish (daing na hati sa gitna).
    
    Zones:
    - top: Upper half of the fish
    - bottom: Lower half of the fish
    
    These zones are suitable for split dried fish where the traditional
    head/body/belly/tail zones don't apply.
    """
    h, w = mask.shape
    bbox = keypoints.get("bounding_box")
    
    if bbox is None:
        # Fallback to simple rectangular zones
        return create_simple_zones(mask)
    
    x, y, bw, bh = bbox["x"], bbox["y"], bbox["w"], bbox["h"]
    
    # Initialize zone masks - using top/bottom for split fish
    zones = {
        "top": np.zeros((h, w), dtype=np.uint8),
        "bottom": np.zeros((h, w), dtype=np.uint8)
    }
    
    # Split at the middle horizontally (top and bottom halves)
    mid_y = y + bh // 2
    
    # Create zone masks - simple top/bottom split
    zones["top"][y:mid_y, x:x+bw] = 255
    zones["bottom"][mid_y:y+bh, x:x+bw] = 255
    
    # Apply fish mask to all zones
    for zone_name in zones:
        zones[zone_name] = cv2.bitwise_and(zones[zone_name], mask * 255)
    
    return zones


def create_simple_zones(mask: np.ndarray) -> Dict[str, np.ndarray]:
    """Fallback: create simple top/bottom zones for split fish."""
    h, w = mask.shape
    
    # Find fish bounding box
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {name: np.zeros((h, w), dtype=np.uint8) for name in ["top", "bottom"]}
    
    x, y, bw, bh = cv2.boundingRect(max(contours, key=cv2.contourArea))
    
    zones = {
        "top": np.zeros((h, w), dtype=np.uint8),
        "bottom": np.zeros((h, w), dtype=np.uint8)
    }
    
    # Simple top/bottom split
    mid_y = y + bh // 2
    zones["top"][y:mid_y, x:x+bw] = 255
    zones["bottom"][mid_y:y+bh, x:x+bw] = 255
    
    for zone_name in zones:
        zones[zone_name] = cv2.bitwise_and(zones[zone_name], mask * 255)
    
    return zones


# =============================================================================
# MOLD DETECTION (IMPROVED)
# =============================================================================

def detect_mold_patches(
    img: np.ndarray,
    fish_mask: np.ndarray,
    use_preprocessing: bool = True
) -> np.ndarray:
    """
    Detect mold patches using multi-method color and texture analysis.
    
    Improved version with:
    - Shadow removal preprocessing
    - Adaptive thresholds based on fish color
    - Multiple color space analysis (HSV, LAB)
    - Conservative detection to reduce false positives
    
    Args:
        img: BGR image
        fish_mask: Binary mask for fish area
        use_preprocessing: Whether to apply shadow removal
        
    Returns:
        Binary mask of detected mold patches
    """
    h, w = img.shape[:2]
    
    # Preprocess image
    if use_preprocessing:
        processed_img = preprocess_for_mold_detection(img, fish_mask)
    else:
        processed_img = img
    
    # Convert to different color spaces
    hsv = cv2.cvtColor(processed_img, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(processed_img, cv2.COLOR_BGR2LAB)
    gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY)
    
    # Initialize combined mold mask
    mold_mask = np.zeros((h, w), dtype=np.uint8)
    
    # Calculate fish color statistics for adaptive thresholding
    fish_pixels = gray[fish_mask > 0]
    if fish_pixels.size == 0:
        return mold_mask
    
    fish_mean = np.mean(fish_pixels)
    fish_std = np.std(fish_pixels)
    
    # =========================================================================
    # METHOD 1: GREEN/BLUE MOLD DETECTION (Primary indicator)
    # Most reliable indicator - actual mold colors
    # =========================================================================
    
    h_channel = hsv[:, :, 0]
    s_channel = hsv[:, :, 1]
    v_channel = hsv[:, :, 2]
    
    # Green mold (Aspergillus, Penicillium) - hue 35-85
    green_mold = (
        (h_channel >= 35) & (h_channel <= 85) & 
        (s_channel >= 35) & (v_channel >= 25) & (v_channel <= 200)
    ).astype(np.uint8) * 255
    
    # Blue-green mold (Cladosporium) - hue 80-130
    blue_mold = (
        (h_channel >= 80) & (h_channel <= 130) & 
        (s_channel >= 30) & (v_channel >= 25) & (v_channel <= 200)
    ).astype(np.uint8) * 255
    
    # White fuzzy mold (low saturation, mid brightness)
    white_mold = (
        (s_channel <= 30) & (v_channel >= 150) & (v_channel <= 240)
    ).astype(np.uint8) * 255
    
    # =========================================================================
    # METHOD 2: LAB COLOR SPACE ANOMALY DETECTION
    # Detect colors that deviate from normal dried fish (golden-brown)
    # =========================================================================
    
    l_channel = lab[:, :, 0]  # Lightness
    a_channel = lab[:, :, 1]  # Green-Red (128=neutral, <128=green, >128=red)
    b_channel = lab[:, :, 2]  # Blue-Yellow (128=neutral, <128=blue, >128=yellow)
    
    # Greenish areas (a < 118 is greenish, typical dried fish is warmer)
    greenish = (
        (a_channel < 118) & (l_channel > 20) & (l_channel < 150)
    ).astype(np.uint8) * 255
    
    # Bluish areas (b < 120 is bluish)
    bluish = (
        (b_channel < 120) & (l_channel > 20) & (l_channel < 150)
    ).astype(np.uint8) * 255
    
    # =========================================================================
    # METHOD 3: DARK SPOT DETECTION (Secondary indicator)
    # Only count very dark spots that are abnormal
    # =========================================================================
    
    # Adaptive dark threshold
    dark_threshold = max(35, fish_mean - 2.8 * fish_std)
    
    # Local darkness detection
    blur = cv2.GaussianBlur(gray, (31, 31), 0)
    local_dark = (blur.astype(np.float32) - gray.astype(np.float32) > 40).astype(np.uint8) * 255
    
    # Absolute darkness
    absolute_dark = (gray < dark_threshold).astype(np.uint8) * 255
    
    # Must be both locally dark AND absolutely dark
    dark_spots = cv2.bitwise_and(local_dark, absolute_dark)
    
    # Erode to remove edge artifacts
    dark_spots = cv2.erode(dark_spots, np.ones((5, 5), np.uint8), iterations=1)
    
    # =========================================================================
    # COMBINE ALL METHODS
    # =========================================================================
    
    # Primary mold indicators (high confidence)
    primary_mold = cv2.bitwise_or(green_mold, blue_mold)
    primary_mold = cv2.bitwise_or(primary_mold, greenish)
    primary_mold = cv2.bitwise_or(primary_mold, bluish)
    
    # Secondary indicators
    secondary_mold = cv2.bitwise_or(dark_spots, white_mold)
    
    # Combine all
    mold_mask = cv2.bitwise_or(primary_mold, secondary_mold)
    
    # Apply fish mask
    mold_mask = cv2.bitwise_and(mold_mask, fish_mask * 255)
    
    # =========================================================================
    # NOISE REDUCTION
    # =========================================================================
    
    kernel_small = np.ones((5, 5), np.uint8)
    kernel_large = np.ones((11, 11), np.uint8)
    
    # Close gaps
    mold_mask = cv2.morphologyEx(mold_mask, cv2.MORPH_CLOSE, kernel_large)
    
    # Remove isolated noise
    mold_mask = cv2.morphologyEx(mold_mask, cv2.MORPH_OPEN, kernel_small)
    
    # Smooth edges
    mold_mask = cv2.dilate(mold_mask, kernel_small, iterations=1)
    mold_mask = cv2.erode(mold_mask, kernel_small, iterations=1)
    
    # Remove small detections
    contours, _ = cv2.findContours(mold_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = 400  # Minimum pixel area for valid mold patch
    
    cleaned_mask = np.zeros_like(mold_mask)
    for cnt in contours:
        if cv2.contourArea(cnt) >= min_area:
            cv2.drawContours(cleaned_mask, [cnt], -1, 255, -1)
    
    return cleaned_mask


# =============================================================================
# MAIN ANALYSIS FUNCTIONS
# =============================================================================

def analyze_mold_with_masks(img: np.ndarray, masks, boxes) -> Dict:
    """
    Main function: Analyze mold presence using segmentation masks.
    
    This is the entry point for mold analysis that uses the YOLO
    segmentation masks for precise fish region detection.
    """
    if masks is None or len(masks) == 0:
        print("No masks available, using bounding box fallback")
        return analyze_mold_with_boxes(img, boxes)
    
    print("Analyzing mold using segmentation masks (v2)")
    
    fish_results = []
    h, w = img.shape[:2]
    
    for i, mask in enumerate(masks):
        try:
            # Get mask data and resize to image dimensions
            mask_data = mask.data[0].cpu().numpy()
            if mask_data.shape != (h, w):
                mask_resized = cv2.resize(
                    mask_data.astype(np.float32), (w, h), 
                    interpolation=cv2.INTER_LINEAR
                )
                mask_binary = (mask_resized > 0.5).astype(np.uint8)
            else:
                mask_binary = (mask_data > 0.5).astype(np.uint8)
            
            # Analyze this fish
            mold_info = analyze_single_fish_mold(img, mask_binary, i)
            if mold_info:
                fish_results.append(mold_info)
            
        except Exception as e:
            print(f"Error analyzing fish {i}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    return aggregate_mold_results(fish_results, (h, w))


def analyze_mold_with_boxes(img: np.ndarray, boxes) -> Dict:
    """
    Fallback: Analyze mold using bounding boxes when masks unavailable.
    """
    if boxes is None or len(boxes) == 0:
        return create_empty_mold_result()
    
    print("Using bounding boxes for mold detection")
    
    fish_results = []
    h, w = img.shape[:2]
    
    for i, box in enumerate(boxes):
        try:
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            # Create mask from bounding box with margins
            box_w, box_h = x2 - x1, y2 - y1
            margin_x, margin_y = int(box_w * 0.08), int(box_h * 0.08)
            
            region_mask = np.zeros((h, w), dtype=np.uint8)
            region_mask[y1+margin_y:y2-margin_y, x1+margin_x:x2-margin_x] = 1
            
            mold_info = analyze_single_fish_mold(img, region_mask, i)
            if mold_info:
                fish_results.append(mold_info)
            
        except Exception as e:
            print(f"⚠️ Error analyzing box {i}: {e}")
            continue
    
    return aggregate_mold_results(fish_results, (h, w))


def analyze_single_fish_mold(
    img: np.ndarray, 
    mask: np.ndarray, 
    region_index: int
) -> Optional[Dict]:
    """
    Analyze mold within a single fish region.
    
    Process:
    1. Detect fish orientation
    2. Estimate anatomical keypoints
    3. Create zone masks
    4. Detect mold with preprocessing
    5. Calculate per-zone statistics
    """
    # Validate mask
    total_fish_pixels = np.sum(mask)
    if total_fish_pixels < 100:
        return None
    
    h, w = mask.shape[:2]
    
    # Step 1: Detect fish orientation
    orientation = detect_fish_orientation(mask)
    print(f"  Fish {region_index}: head={orientation['head_side']}, flipped={orientation['is_flipped']}")
    
    # Step 2: Estimate keypoints
    keypoints = estimate_fish_keypoints(mask, orientation)
    
    # Step 3: Create anatomical zones
    zones = create_anatomical_zones(mask, keypoints, orientation)
    
    # Step 4: Detect mold
    mold_mask = detect_mold_patches(img, mask, use_preprocessing=True)
    
    # Step 5: Calculate mold coverage using pixel ratio
    # Severity = (Total Mold Pixels / Total Fish Body Pixels) × 100
    mold_pixel_count = int(np.sum(mold_mask > 0))
    coverage_percent = (mold_pixel_count / total_fish_pixels * 100) if total_fish_pixels > 0 else 0
    
    # Classify severity
    severity = classify_mold_severity(coverage_percent)
    
    # Analyze per-zone distribution
    zone_stats = analyze_zone_distribution(mold_mask, zones, mask)
    
    # Get mold patch coordinates
    mold_coords = get_mold_coordinates(mold_mask)
    
    # Analyze mold characteristics
    mold_chars = analyze_mold_characteristics(img, mold_mask)
    
    return convert_numpy_types({
        "region_index": int(region_index),
        "mold_detected": bool(coverage_percent > 0.5),
        "mold_coverage_percent": round(float(coverage_percent), 2),
        "mold_pixel_count": mold_pixel_count,
        "fish_pixel_count": int(total_fish_pixels),
        "severity": severity,
        "patch_count": int(len(mold_coords)),
        "orientation": orientation,
        "keypoints": keypoints,
        "spatial_distribution": {
            "zones": zone_stats,
            "total_patches": len(mold_coords),
            "fish_bounds": keypoints.get("bounding_box")
        },
        "characteristics": mold_chars,
        "mold_mask_coords": mold_coords
    })


def analyze_zone_distribution(
    mold_mask: np.ndarray, 
    zones: Dict[str, np.ndarray],
    fish_mask: np.ndarray
) -> Dict:
    """
    Calculate mold statistics per anatomical zone.
    """
    zone_stats = {}
    
    for zone_name, zone_mask in zones.items():
        # Pixels in this zone
        zone_pixels = int(np.sum(zone_mask > 0))
        
        # Mold pixels in this zone
        mold_in_zone = cv2.bitwise_and(mold_mask, zone_mask)
        mold_pixels = int(np.sum(mold_in_zone > 0))
        
        # Coverage percentage for this zone
        if zone_pixels > 0:
            coverage = round((mold_pixels / zone_pixels) * 100, 2)
        else:
            coverage = 0.0
        
        # Count patches in this zone
        if mold_pixels > 0:
            contours, _ = cv2.findContours(mold_in_zone, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            patch_count = len([c for c in contours if cv2.contourArea(c) >= 50])
        else:
            patch_count = 0
        
        zone_stats[zone_name] = {
            "fish_pixels": zone_pixels,
            "coverage_pixels": mold_pixels,
            "coverage_percent": float(coverage),
            "patch_count": patch_count
        }
    
    return zone_stats


def classify_mold_severity(coverage_percent: float) -> str:
    """
    Classify mold severity based on coverage percentage.
    
    Using industry-standard thresholds:
    - None: <0.5% (negligible)
    - Low: 0.5-5% (minor, may be acceptable)
    - Moderate: 5-15% (noticeable, quality concern)
    - Severe: >15% (heavy contamination, likely reject)
    """
    if coverage_percent < 0.5:
        return "None"
    elif coverage_percent < 5.0:
        return "Low"
    elif coverage_percent < 15.0:
        return "Moderate"
    else:
        return "Severe"


def get_mold_coordinates(mold_mask: np.ndarray) -> List[Dict]:
    """Get bounding boxes of mold patches for visualization."""
    contours, _ = cv2.findContours(mold_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    patches = []
    
    for i, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        if area < 50:
            continue
        
        x, y, w, h = cv2.boundingRect(cnt)
        patches.append({
            "id": int(i),
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "area": int(area)
        })
    
    return patches


def analyze_mold_characteristics(img: np.ndarray, mold_mask: np.ndarray) -> Dict:
    """Analyze color and texture characteristics of detected mold."""
    mold_pixels = img[mold_mask > 0]
    
    if mold_pixels.size == 0:
        return {
            "dominant_color": None,
            "color_variance": 0.0,
            "avg_darkness": 0.0,
            "avg_hsv": None
        }
    
    mold_pixels = mold_pixels.reshape(-1, 3)
    avg_color = np.mean(mold_pixels, axis=0)
    
    # Convert to HSV
    avg_color_img = avg_color.reshape(1, 1, 3).astype(np.uint8)
    avg_hsv = cv2.cvtColor(avg_color_img, cv2.COLOR_BGR2HSV)[0, 0]
    h, s, v = avg_hsv
    
    # Classify color
    if s < 30:
        dominant_color = "gray"
    elif h < 15 or h > 165:
        dominant_color = "red-brown"
    elif 15 <= h < 45:
        dominant_color = "yellow-brown"
    elif 45 <= h < 75:
        dominant_color = "green"
    elif 75 <= h < 105:
        dominant_color = "blue-green"
    else:
        dominant_color = "blue"
    
    # Calculate metrics
    color_variance = float(np.mean(np.std(mold_pixels, axis=0)))
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mold_gray = gray[mold_mask > 0]
    avg_darkness = 255 - float(np.mean(mold_gray)) if mold_gray.size > 0 else 0
    
    return {
        "dominant_color": dominant_color,
        "color_variance": round(color_variance, 2),
        "avg_darkness": round(avg_darkness, 1),
        "avg_hsv": [int(h), int(s), int(v)]
    }


# =============================================================================
# RESULT AGGREGATION
# =============================================================================

def aggregate_mold_results(fish_results: List[Dict], image_shape: Tuple[int, int]) -> Dict:
    """Aggregate mold analysis results across all detected fish."""
    if not fish_results:
        return create_empty_mold_result()
    
    # Calculate overall metrics
    total_coverage = sum(r["mold_coverage_percent"] for r in fish_results)
    avg_coverage = float(total_coverage / len(fish_results))
    
    # Total pixel counts
    total_mold_pixels = int(sum(r.get("mold_pixel_count", 0) for r in fish_results))
    total_fish_pixels = int(sum(r.get("fish_pixel_count", 0) for r in fish_results))
    
    # Fish with mold
    fish_with_mold = int(sum(1 for r in fish_results if r["mold_detected"]))
    
    # Overall severity (worst case)
    severity_priority = {"Severe": 4, "Moderate": 3, "Low": 2, "None": 1}
    severities = [r["severity"] for r in fish_results]
    overall_severity = max(severities, key=lambda x: severity_priority.get(x, 0))
    
    # Aggregate spatial distribution
    spatial_summary = aggregate_spatial_data(fish_results)
    
    # Total patches
    total_patches = int(sum(r["patch_count"] for r in fish_results))
    
    # Characteristics
    characteristics_summary = aggregate_characteristics(fish_results)
    
    return convert_numpy_types({
        "overall_severity": overall_severity,
        "avg_coverage_percent": round(avg_coverage, 2),
        "total_mold_pixels": total_mold_pixels,
        "total_fish_pixels": total_fish_pixels,
        "coverage_ratio": round(total_mold_pixels / total_fish_pixels * 100, 2) if total_fish_pixels > 0 else 0.0,
        "fish_analyzed": int(len(fish_results)),
        "fish_with_mold": fish_with_mold,
        "total_patches": total_patches,
        "fish_results": fish_results,
        "spatial_summary": spatial_summary,
        "characteristics": characteristics_summary,
        "analysis_method": "segmentation_v2"
    })


def aggregate_spatial_data(fish_results: List[Dict]) -> Dict:
    """Aggregate spatial distribution across all fish."""
    zone_summary = {
        "head": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
        "body_upper": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
        "belly": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
        "tail": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0}
    }
    
    for fish_result in fish_results:
        spatial = fish_result.get("spatial_distribution", {})
        zones = spatial.get("zones", {})
        
        for zone_name, zone_data in zones.items():
            if zone_name in zone_summary:
                patches = zone_data.get("patch_count", 0)
                zone_summary[zone_name]["total_patches"] += patches
                zone_summary[zone_name]["total_coverage"] += zone_data.get("coverage_pixels", 0)
                if patches > 0:
                    zone_summary[zone_name]["fish_affected"] += 1
    
    # Ensure native Python types
    for zone_name in zone_summary:
        zone_summary[zone_name]["total_patches"] = int(zone_summary[zone_name]["total_patches"])
        zone_summary[zone_name]["total_coverage"] = int(zone_summary[zone_name]["total_coverage"])
        zone_summary[zone_name]["fish_affected"] = int(zone_summary[zone_name]["fish_affected"])
    
    # Most affected zone
    most_affected = max(zone_summary.keys(), key=lambda z: zone_summary[z]["total_patches"])
    
    return {
        "zones": zone_summary,
        "total_fish_analyzed": int(len(fish_results)),
        "most_affected_zone": most_affected if zone_summary[most_affected]["total_patches"] > 0 else None
    }


def aggregate_characteristics(fish_results: List[Dict]) -> Dict:
    """Aggregate mold characteristics across all fish."""
    dominant_colors = []
    total_darkness = 0
    count = 0
    
    for result in fish_results:
        chars = result.get("characteristics", {})
        if chars.get("dominant_color"):
            dominant_colors.append(chars["dominant_color"])
            total_darkness += chars.get("avg_darkness", 0)
            count += 1
    
    if dominant_colors:
        color_counts = Counter(dominant_colors)
        most_common_color = color_counts.most_common(1)[0][0]
    else:
        most_common_color = None
    
    return {
        "most_common_color": most_common_color,
        "avg_darkness": round(float(total_darkness / count), 1) if count > 0 else 0.0,
        "color_distribution": dict(Counter(dominant_colors)) if dominant_colors else {}
    }


def create_empty_mold_result() -> Dict:
    """Create an empty mold analysis result."""
    return {
        "overall_severity": "None",
        "avg_coverage_percent": 0.0,
        "total_mold_pixels": 0,
        "total_fish_pixels": 0,
        "coverage_ratio": 0.0,
        "fish_analyzed": 0,
        "fish_with_mold": 0,
        "total_patches": 0,
        "fish_results": [],
        "spatial_summary": {
            "zones": {
                "head": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
                "body_upper": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
                "belly": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0},
                "tail": {"total_patches": 0, "total_coverage": 0, "fish_affected": 0}
            },
            "total_fish_analyzed": 0,
            "most_affected_zone": None
        },
        "characteristics": {
            "most_common_color": None,
            "avg_darkness": 0.0,
            "color_distribution": {}
        },
        "analysis_method": "none"
    }

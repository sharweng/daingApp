"""
Color Consistency Analysis Module
=================================
Measures visual uniformity of dried fish surfaces using pixel intensity
standard deviations to produce a "Consistency Score" for quality grading.

The system measures the wet appearance of the dried fish surface for visual 
uniformity using pixel values as standard deviations of intensities over 
the surface area of the sample. This metric distinguishes:
- Export quality: Even, golden-brown color (score >= 75)
- Local quality: Moderate color variation (score 50-75)  
- Reject: High color dispersion/discoloration (score < 50)
"""

import cv2
import numpy as np


def analyze_color_consistency_with_masks(img: np.ndarray, masks, boxes) -> dict:
    """
    Analyze color consistency using segmentation masks for accurate fish-only analysis.
    
    This measures the visual uniformity of the dried fish surface by calculating
    standard deviations of pixel intensities. Only analyzes pixels within the mask.
    
    Args:
        img: BGR image array
        masks: Segmentation masks from YOLO model
        boxes: Bounding boxes from YOLO model
        
    Returns:
        dict with:
        - consistency_score: 0-100 (higher = more uniform = better quality)
        - quality_grade: 'Export', 'Local', or 'Reject'
        - color_stats: detailed statistics for each fish region
    """
    if masks is None or len(masks) == 0:
        print("📦 No masks available, falling back to bounding box analysis")
        return analyze_color_consistency_with_boxes(img, boxes)
    
    print("🎭 Using segmentation masks for accurate color analysis")
    
    color_stats = []
    total_std = 0
    h, w = img.shape[:2]
    
    for i, mask in enumerate(masks):
        try:
            # Get mask data and resize to image dimensions
            mask_data = mask.data[0].cpu().numpy()
            
            # Resize mask to match image size if needed
            if mask_data.shape != (h, w):
                mask_resized = cv2.resize(mask_data.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
                mask_binary = (mask_resized > 0.5).astype(np.uint8)
            else:
                mask_binary = (mask_data > 0.5).astype(np.uint8)
            
            # Extract only the fish pixels using the mask
            fish_pixels = img[mask_binary == 1]
            
            if fish_pixels.size == 0:
                continue
            
            # Reshape to Nx3 for color analysis
            fish_pixels = fish_pixels.reshape(-1, 3)
            
            # Convert to LAB color space for better color analysis
            fish_pixels_img = fish_pixels.reshape(1, -1, 3).astype(np.uint8)
            lab_pixels = cv2.cvtColor(fish_pixels_img, cv2.COLOR_BGR2LAB).reshape(-1, 3)
            
            # Calculate statistics for each channel
            l_channel = lab_pixels[:, 0]  # Lightness
            a_channel = lab_pixels[:, 1]  # Green-Red
            b_channel = lab_pixels[:, 2]  # Blue-Yellow
            
            # Standard deviations (lower = more uniform)
            l_std = float(np.std(l_channel))
            a_std = float(np.std(a_channel))
            b_std = float(np.std(b_channel))
            
            # Mean values for color profile
            l_mean = float(np.mean(l_channel))
            a_mean = float(np.mean(a_channel))
            b_mean = float(np.mean(b_channel))
            
            # Combined standard deviation (weighted)
            # Lightness weighted higher as it's more perceptually important
            combined_std = (l_std * 0.5) + (a_std * 0.25) + (b_std * 0.25)
            total_std += combined_std
            
            # RGB standard deviations
            rgb_std = [float(np.std(fish_pixels[:, c])) for c in range(3)]
            
            # Count pixels for coverage info
            pixel_count = np.sum(mask_binary)
            coverage_percent = (pixel_count / (h * w)) * 100
            
            color_stats.append({
                "region_index": i,
                "l_std": round(l_std, 2),
                "a_std": round(a_std, 2),
                "b_std": round(b_std, 2),
                "l_mean": round(l_mean, 2),
                "a_mean": round(a_mean, 2),
                "b_mean": round(b_mean, 2),
                "combined_std": round(combined_std, 2),
                "rgb_std": [round(s, 2) for s in rgb_std],
                "pixel_count": int(pixel_count),
                "coverage_percent": round(coverage_percent, 2)
            })
            
        except Exception as e:
            print(f"⚠️ Error analyzing mask region {i}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    if not color_stats:
        return {
            "consistency_score": 0,
            "quality_grade": "Unknown",
            "color_stats": [],
            "avg_std_deviation": 0
        }
    
    # Calculate average standard deviation across all fish
    avg_std = total_std / len(color_stats)
    
    # Convert std deviation to consistency score (0-100)
    # Using exponential decay: lower std = higher score
    consistency_score = min(100, max(0, 100 * np.exp(-avg_std / 35)))
    
    # Determine quality grade based on score thresholds
    if consistency_score >= 75:
        quality_grade = "Export"
    elif consistency_score >= 50:
        quality_grade = "Local"
    else:
        quality_grade = "Reject"
    
    return {
        "consistency_score": round(consistency_score, 1),
        "quality_grade": quality_grade,
        "color_stats": color_stats,
        "avg_std_deviation": round(avg_std, 2),
        "analysis_method": "segmentation"
    }


def analyze_color_consistency_with_boxes(img: np.ndarray, boxes) -> dict:
    """
    Fallback: Analyze color consistency using bounding boxes (less accurate).
    Used when segmentation masks are not available.
    
    Args:
        img: BGR image array
        boxes: Bounding boxes from YOLO detection model
        
    Returns:
        dict with consistency score and quality grade
    """
    if boxes is None or len(boxes) == 0:
        return {
            "consistency_score": 0,
            "quality_grade": "Unknown",
            "color_stats": [],
            "avg_std_deviation": 0
        }
    
    print("📦 Using bounding box for color analysis (detection model)")
    
    color_stats = []
    total_std = 0
    
    for i, box in enumerate(boxes):
        try:
            # Get bounding box coordinates
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            
            # Ensure coordinates are within image bounds
            h, w = img.shape[:2]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            # Extract fish region (center 70% to reduce background noise)
            box_w, box_h = x2 - x1, y2 - y1
            margin_x, margin_y = int(box_w * 0.15), int(box_h * 0.15)
            x1, y1 = x1 + margin_x, y1 + margin_y
            x2, y2 = x2 - margin_x, y2 - margin_y
            
            fish_region = img[y1:y2, x1:x2]
            
            if fish_region.size == 0:
                continue
            
            # Convert to LAB color space
            lab_region = cv2.cvtColor(fish_region, cv2.COLOR_BGR2LAB)
            
            l_channel = lab_region[:, :, 0]
            a_channel = lab_region[:, :, 1]
            b_channel = lab_region[:, :, 2]
            
            l_std = float(np.std(l_channel))
            a_std = float(np.std(a_channel))
            b_std = float(np.std(b_channel))
            
            l_mean = float(np.mean(l_channel))
            a_mean = float(np.mean(a_channel))
            b_mean = float(np.mean(b_channel))
            
            combined_std = (l_std * 0.5) + (a_std * 0.25) + (b_std * 0.25)
            total_std += combined_std
            
            rgb_std = [float(np.std(fish_region[:, :, c])) for c in range(3)]
            
            color_stats.append({
                "region_index": i,
                "l_std": round(l_std, 2),
                "a_std": round(a_std, 2),
                "b_std": round(b_std, 2),
                "l_mean": round(l_mean, 2),
                "a_mean": round(a_mean, 2),
                "b_mean": round(b_mean, 2),
                "combined_std": round(combined_std, 2),
                "rgb_std": [round(s, 2) for s in rgb_std]
            })
            
        except Exception as e:
            print(f"⚠️ Error analyzing box region {i}: {e}")
            continue
    
    if not color_stats:
        return {
            "consistency_score": 0,
            "quality_grade": "Unknown",
            "color_stats": [],
            "avg_std_deviation": 0
        }
    
    avg_std = total_std / len(color_stats)
    consistency_score = min(100, max(0, 100 * np.exp(-avg_std / 35)))
    
    if consistency_score >= 75:
        quality_grade = "Export"
    elif consistency_score >= 50:
        quality_grade = "Local"
    else:
        quality_grade = "Reject"
    
    return {
        "consistency_score": round(consistency_score, 1),
        "quality_grade": quality_grade,
        "color_stats": color_stats,
        "avg_std_deviation": round(avg_std, 2),
        "analysis_method": "bounding_box"
    }

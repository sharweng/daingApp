"""
Image Drawing/Visualization Module
===================================
Functions for drawing segmentation masks, bounding boxes,
and analysis overlays on detection result images.
"""

import cv2
import numpy as np


def get_label_scale(img_width: int, img_height: int, base_scale: float = 1.0, min_scale: float = 1.0) -> tuple:
    """
    Calculate font scale and thickness based on image dimensions.
    Ensures labels are always readable regardless of image resolution.
    
    Args:
        img_width: Image width in pixels
        img_height: Image height in pixels
        base_scale: Base scale factor (default 2.0)
        min_scale: Minimum font scale (default 1.8)
        
    Returns:
        Tuple of (font_scale, thickness, padding)
    """
    # Use the smaller dimension to calculate scale
    min_dim = min(img_width, img_height)
    
    # Scale factor: larger images get bigger labels
    # Reference: 640px = base_scale, scales up linearly
    scale_factor = max(min_dim / 640, 1.0)
    
    font_scale = max(base_scale * scale_factor, min_scale)
    thickness = max(int(3 * scale_factor), 3)
    padding = max(int(12 * scale_factor), 12)
    
    return font_scale, thickness, padding


def draw_segmentation_results(img: np.ndarray, results, indices: list, model) -> np.ndarray:
    """
    Draw segmentation masks and labels on the image.
    Creates a semi-transparent colored overlay for each fish.
    
    Args:
        img: Original BGR image
        results: YOLO inference results
        indices: List of detection indices to draw
        model: YOLO model for class names
        
    Returns:
        Annotated image with masks and labels
    """
    annotated_img = img.copy()
    h, w = img.shape[:2]
    
    # Get dynamic label sizing
    font_scale, thickness, padding = get_label_scale(w, h)
    
    masks = results[0].masks
    boxes = results[0].boxes
    
    # Colors for different fish (BGR format)
    colors = [
        (255, 107, 107),  # Red
        (78, 205, 196),   # Teal
        (69, 183, 209),   # Blue
        (150, 206, 180),  # Green
        (255, 234, 167),  # Yellow
        (221, 160, 221),  # Plum
    ]
    
    for i, idx in enumerate(indices):
        color = colors[i % len(colors)]
        
        if masks is not None and idx < len(masks):
            # Get mask and resize to image dimensions
            mask_data = masks[idx].data[0].cpu().numpy()
            if mask_data.shape != (h, w):
                mask_resized = cv2.resize(mask_data.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
                mask_binary = (mask_resized > 0.5).astype(np.uint8)
            else:
                mask_binary = (mask_data > 0.5).astype(np.uint8)
            
            # Create colored overlay
            colored_mask = np.zeros_like(annotated_img)
            colored_mask[mask_binary == 1] = color
            
            # Blend with original image (semi-transparent)
            annotated_img = cv2.addWeighted(annotated_img, 1, colored_mask, 0.4, 0)
            
            # Draw polygon outline
            contours, _ = cv2.findContours(mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(annotated_img, contours, -1, color, max(2, thickness // 2))
        
        # Draw label with fish type and confidence
        if boxes is not None and idx < len(boxes):
            box = boxes[idx]
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            fish_type = model.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            
            # Label background with dynamic sizing
            label = f"{confidence:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
            
            # Draw label background
            cv2.rectangle(annotated_img, (x1, y1 - label_h - padding), (x1 + label_w + padding, y1), color, -1)
            cv2.putText(annotated_img, label, (x1 + padding // 2, y1 - padding // 2), font, font_scale, (255, 255, 255), thickness)
    
    return annotated_img


def draw_detection_boxes(img: np.ndarray, results, indices: list, model) -> np.ndarray:
    """
    Draw bounding boxes for detection display.
    
    Args:
        img: Original BGR image
        results: YOLO inference results
        indices: List of detection indices to draw
        model: YOLO model for class names
        
    Returns:
        Annotated image with bounding boxes
    """
    annotated_img = img.copy()
    h, w = img.shape[:2]
    boxes = results[0].boxes
    
    # Get dynamic label sizing
    font_scale, thickness, padding = get_label_scale(w, h)
    
    colors = [
        (255, 107, 107),  # Red
        (78, 205, 196),   # Teal
        (69, 183, 209),   # Blue
        (150, 206, 180),  # Green
        (255, 234, 167),  # Yellow
        (221, 160, 221),  # Plum
    ]
    
    for i, idx in enumerate(indices):
        color = colors[i % len(colors)]
        
        if boxes is not None and idx < len(boxes):
            box = boxes[idx]
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            fish_type = model.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            
            # Draw bounding box with dynamic thickness
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, max(3, thickness))
            
            # Label with dynamic sizing
            label = f"{confidence:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
            
            # Draw label background
            cv2.rectangle(annotated_img, (x1, y1 - label_h - padding), (x1 + label_w + padding, y1), color, -1)
            cv2.putText(annotated_img, label, (x1 + padding // 2, y1 - padding // 2), font, font_scale, (255, 255, 255), thickness)
    
    return annotated_img


def draw_combined_result_image(img: np.ndarray, results, indices: list, model, color_analysis: dict = None, mold_analysis: dict = None, hide_color_overlay: bool = True) -> np.ndarray:
    """
    Draw a single combined image with:
    - Bounding boxes around detected fish (always shown)
    - When hide_color_overlay is False: masks, mold patches, and info overlay
    
    Args:
        img: Original BGR image
        results: YOLO inference results
        indices: List of detection indices to draw
        model: YOLO model for class names
        color_analysis: Optional color consistency analysis results
        mold_analysis: Optional mold detection analysis results
        hide_color_overlay: When True, only draw bounding boxes (default True)
        
    Returns:
        Combined annotated image
    """
    annotated_img = img.copy()
    h, w = img.shape[:2]
    
    # Get dynamic label sizing
    font_scale, thickness, padding = get_label_scale(w, h)
    
    boxes = results[0].boxes
    masks = results[0].masks
    has_masks = masks is not None and len(masks) > 0
    
    # Colors for different fish (BGR format)
    colors = [
        (255, 107, 107),  # Red/Coral
        (78, 205, 196),   # Teal
        (69, 183, 209),   # Blue
        (150, 206, 180),  # Green
        (255, 234, 167),  # Yellow
        (221, 160, 221),  # Plum
    ]
    
    # When hide_color_overlay is True, only draw bounding boxes with labels
    if hide_color_overlay:
        for i, idx in enumerate(indices):
            color = colors[i % len(colors)]
            
            if boxes is not None and idx < len(boxes):
                box = boxes[idx]
                x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
                fish_type = model.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                
                # Draw bounding box (dynamic thickness)
                cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, max(4, thickness))
                
                # Label with fish number for identification (dynamic sizing)
                label = f"#{i+1} {confidence:.0%}"
                font = cv2.FONT_HERSHEY_SIMPLEX
                (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
                
                # Draw label background at top of box
                cv2.rectangle(annotated_img, (x1, y1 - label_h - padding), (x1 + label_w + padding, y1), color, -1)
                cv2.putText(annotated_img, label, (x1 + padding // 2, y1 - padding // 2), font, font_scale, (255, 255, 255), thickness)
        
        return annotated_img
    
    # Full visualization mode (hide_color_overlay is False)
    # Determine grade color if we have color analysis
    grade_color = (255, 255, 255)  # Default white
    if color_analysis:
        grade = color_analysis.get("quality_grade", "Unknown")
        if grade == "Export":
            grade_color = (80, 200, 120)  # Green (BGR)
        elif grade == "Local":
            grade_color = (80, 180, 255)  # Orange/Yellow (BGR)
        else:
            grade_color = (80, 80, 255)   # Red (BGR)
    
    # STEP 1: Draw semi-transparent polygon masks (if available)
    if has_masks:
        for i, idx in enumerate(indices):
            if idx < len(masks):
                color = colors[i % len(colors)]
                
                # Get mask and resize to image dimensions
                mask_data = masks[idx].data[0].cpu().numpy()
                if mask_data.shape != (h, w):
                    mask_resized = cv2.resize(mask_data.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
                    mask_binary = (mask_resized > 0.5).astype(np.uint8)
                else:
                    mask_binary = (mask_data > 0.5).astype(np.uint8)
                
                # Create colored overlay (semi-transparent fill)
                colored_mask = np.zeros_like(annotated_img)
                colored_mask[mask_binary == 1] = color
                annotated_img = cv2.addWeighted(annotated_img, 1, colored_mask, 0.3, 0)
                
                # Draw polygon outline with dynamic thickness
                contours, _ = cv2.findContours(mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                cv2.drawContours(annotated_img, contours, -1, color, max(2, thickness // 2))
    
    # STEP 2: Draw bounding boxes with labels on top
    for i, idx in enumerate(indices):
        color = colors[i % len(colors)]
        
        if boxes is not None and idx < len(boxes):
            box = boxes[idx]
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            fish_type = model.names[int(box.cls[0])]
            confidence = float(box.conf[0])
            
            # Draw bounding box (dynamic thickness)
            cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, max(4, thickness))
            
            # Label with dynamic sizing
            label = f"{confidence:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            (label_w, label_h), _ = cv2.getTextSize(label, font, font_scale, thickness)
            
            # Draw label background at top of box
            cv2.rectangle(annotated_img, (x1, y1 - label_h - padding), (x1 + label_w + padding, y1), color, -1)
            cv2.putText(annotated_img, label, (x1 + padding // 2, y1 - padding // 2), font, font_scale, (255, 255, 255), thickness)
    
    # STEP 3: Draw mold patches if detected (before overlay)
    if mold_analysis and mold_analysis.get("fish_with_mold", 0) > 0:
        annotated_img = draw_mold_patches(annotated_img, mold_analysis)
    
    # Info overlay removed - now shown in app UI instead
    
    return annotated_img


def draw_mold_patches(img: np.ndarray, mold_analysis: dict) -> np.ndarray:
    """
    Draw mold patches highlighted on the image as smooth organic shapes.
    
    Uses morphological operations to create smooth, blob-like regions
    instead of rectangular boxes for a more natural visualization.
    
    Args:
        img: Image to draw on
        mold_analysis: Mold analysis results with patch coordinates
        
    Returns:
        Image with mold patches highlighted
    """
    annotated_img = img.copy()
    h, w = annotated_img.shape[:2]
    
    # Colors for mold visualization
    mold_fill_color = (80, 80, 255)     # Lighter red for fill (BGR)
    mold_outline_color = (0, 0, 200)    # Dark red for outline (BGR)
    
    fish_results = mold_analysis.get("fish_results", [])
    
    for fish_result in fish_results:
        if not fish_result.get("mold_detected", False):
            continue
        
        # Get mold patch coordinates
        mold_coords = fish_result.get("mold_mask_coords", [])
        
        if not mold_coords:
            continue
        
        # Create a mask from all mold patches for this fish using circles/ellipses
        mold_mask = np.zeros((h, w), dtype=np.uint8)
        
        for patch in mold_coords:
            x = patch.get("x", 0)
            y = patch.get("y", 0)
            pw = patch.get("width", 0)
            ph = patch.get("height", 0)
            
            if pw > 0 and ph > 0:
                # Draw ellipse instead of rectangle for organic look
                center_x = x + pw // 2
                center_y = y + ph // 2
                axes = (pw // 2 + 5, ph // 2 + 5)  # Slightly larger for blending
                cv2.ellipse(mold_mask, (center_x, center_y), axes, 0, 0, 360, 255, -1)
        
        # Apply heavy smoothing to merge and round the shapes
        # First close gaps between nearby patches
        kernel_close = np.ones((25, 25), np.uint8)
        mold_mask = cv2.morphologyEx(mold_mask, cv2.MORPH_CLOSE, kernel_close)
        
        # Apply Gaussian blur to smooth edges
        mold_mask = cv2.GaussianBlur(mold_mask, (21, 21), 0)
        
        # Threshold to get binary mask with smooth edges
        _, mold_mask = cv2.threshold(mold_mask, 127, 255, cv2.THRESH_BINARY)
        
        # Additional smoothing pass
        kernel_smooth = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        mold_mask = cv2.morphologyEx(mold_mask, cv2.MORPH_OPEN, kernel_smooth)
        mold_mask = cv2.morphologyEx(mold_mask, cv2.MORPH_CLOSE, kernel_smooth)
        
        # Find contours of smoothed mold regions
        contours, _ = cv2.findContours(mold_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter to only significant contours and smooth them
        significant_contours = []
        for c in contours:
            if cv2.contourArea(c) >= 200:
                # Approximate contour to reduce jaggedness
                epsilon = 0.02 * cv2.arcLength(c, True)
                smoothed = cv2.approxPolyDP(c, epsilon, True)
                significant_contours.append(smoothed)
        
        if significant_contours:
            # Draw semi-transparent fill for all mold regions at once
            overlay = annotated_img.copy()
            cv2.drawContours(overlay, significant_contours, -1, mold_fill_color, -1)
            cv2.addWeighted(overlay, 0.4, annotated_img, 0.6, 0, annotated_img)
            
            # Draw smooth outline around mold regions
            cv2.drawContours(annotated_img, significant_contours, -1, mold_outline_color, 3)
    
    return annotated_img


def draw_no_detection_image(img: np.ndarray) -> np.ndarray:
    """
    Draw 'NO DAING DETECTED' overlay on image.
    
    Args:
        img: Original BGR image
        
    Returns:
        Image with no detection message overlay
    """
    result_img = img.copy()
    h, w = result_img.shape[:2]
    
    overlay = result_img.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.3, result_img, 0.7, 0, result_img)
    
    text = "NO DAING DETECTED"
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.5
    thickness = 3
    
    (text_w, text_h), _ = cv2.getTextSize(text, font, font_scale, thickness)
    text_x = (w - text_w) // 2
    text_y = (h + text_h) // 2
    
    cv2.putText(result_img, text, (text_x, text_y), font, font_scale, (0, 0, 0), thickness + 2)
    cv2.putText(result_img, text, (text_x, text_y), font, font_scale, (255, 255, 255), thickness)
    
    return result_img

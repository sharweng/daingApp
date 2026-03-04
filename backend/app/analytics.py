"""
Analytics Module
================
Handles analytics logging and aggregation for scan data.
"""

from datetime import datetime, timedelta

from .config import get_scans_collection


def log_scan_analytics(
    fish_types: list,
    confidences: list,
    is_daing: bool,
    scan_id: str = None,
    color_analysis: dict = None,
    mold_analysis: dict = None,
    user_id: str = None
) -> bool:
    """
    Log scan analytics to MongoDB including color consistency and mold data.
    
    Args:
        fish_types: List of detected fish types
        confidences: List of confidence scores
        is_daing: Whether daing was detected
        scan_id: Optional ID linking to history entry
        color_analysis: Optional color consistency analysis results
        mold_analysis: Optional mold detection analysis results
        user_id: Optional user ID for tracking user-specific analytics
        
    Returns:
        True if successful, False otherwise
    """
    scans_collection = get_scans_collection()
    if scans_collection is None:
        print("⚠️ MongoDB not connected, skipping analytics")
        return False
    
    try:
        scan_data = {
            "timestamp": datetime.now(),
            "is_daing": is_daing,
            "detections": [],
            "scan_id": scan_id,
            "color_analysis": color_analysis or {},
            "mold_analysis": mold_analysis or {},
            "user_id": user_id  # Can be None for unauthenticated scans
        }
        
        if is_daing and fish_types:
            for fish_type, confidence in zip(fish_types, confidences):
                scan_data["detections"].append({
                    "fish_type": fish_type,
                    "confidence": float(confidence)
                })
        
        scans_collection.insert_one(scan_data)
        grade = color_analysis.get('quality_grade', 'N/A') if color_analysis else 'N/A'
        score = color_analysis.get('consistency_score', 0) if color_analysis else 0
        mold_severity = mold_analysis.get('overall_severity', 'N/A') if mold_analysis else 'N/A'
        mold_coverage = mold_analysis.get('avg_coverage_percent', 0) if mold_analysis else 0
        print(f"Analytics logged: {'Daing' if is_daing else 'No Daing'} | Color: {score}% ({grade}) | Mold: {mold_severity} ({mold_coverage}%) (ID: {scan_id})")
        return True
    except Exception as e:
        print(f"Failed to log analytics: {e}")
        return False


def delete_analytics_by_scan_id(scan_id: str) -> bool:
    """
    Delete analytics record by scan_id.
    
    Args:
        scan_id: ID of the scan to delete analytics for
        
    Returns:
        True if record was deleted, False otherwise
    """
    scans_collection = get_scans_collection()
    if scans_collection is None:
        return False
    
    try:
        # First try to delete by scan_id (new method)
        result = scans_collection.delete_one({"scan_id": scan_id})
        if result.deleted_count > 0:
            print(f"Deleted analytics record for {scan_id}")
            return True
        
        # Fallback: try by timestamp parsing (for old records)
        timestamp_str = scan_id.replace("scan_", "")
        date_part = timestamp_str[:8]
        time_part = timestamp_str[9:15]
        
        target_time = datetime.strptime(f"{date_part}{time_part}", "%Y%m%d%H%M%S")
        start_time = target_time - timedelta(seconds=2)
        end_time = target_time + timedelta(seconds=2)
        
        result = scans_collection.delete_one({
            "timestamp": {"$gte": start_time, "$lte": end_time}
        })
        if result.deleted_count > 0:
            print(f"Deleted analytics record for {scan_id} (by timestamp)")
            return True
        
        print(f"No analytics record found for {scan_id}")
        return False
    except Exception as e:
        print(f"⚠️ Failed to delete analytics: {e}")
        return False


def get_analytics_summary(days: int = 7) -> dict:
    """
    Get comprehensive analytics summary from MongoDB.
    
    Args:
        days: Number of days for time-based analytics (default: 7)
    
    Returns:
        Analytics summary with totals, distributions, color consistency, and mold data
    """
    scans_collection = get_scans_collection()
    
    empty_response = {
        "status": "error",
        "message": "MongoDB not connected",
        "total_scans": 0,
        "daing_scans": 0,
        "non_daing_scans": 0,
        "fish_type_distribution": {},
        "average_confidence": {},
        "daily_scans": {},
        "color_consistency": {
            "average_score": 0,
            "grade_distribution": {"Export": 0, "Local": 0, "Reject": 0},
            "by_fish_type": {}
        },
        "mold_analysis": {
            "severity_distribution": {"None": 0, "Low": 0, "Moderate": 0, "Severe": 0},
            "average_coverage": 0,
            "spatial_zones": {
                "top": {"fish_affected": 0, "total_patches": 0},
                "bottom": {"fish_affected": 0, "total_patches": 0}
            },
            "by_fish_type": {}
        }
    }
    
    if scans_collection is None:
        return empty_response
    
    try:
        # Calculate time cutoff for filtering
        time_cutoff = datetime.now() - timedelta(days=days)
        time_filter = {"timestamp": {"$gte": time_cutoff}}
        
        # Total scans (within time range)
        total_scans = scans_collection.count_documents(time_filter)
        daing_scans = scans_collection.count_documents({**time_filter, "is_daing": True})
        non_daing_scans = total_scans - daing_scans
        
        # Fish type distribution (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True}},
            {"$unwind": "$detections"},
            {"$group": {"_id": "$detections.fish_type", "count": {"$sum": 1}}}
        ]
        fish_types = list(scans_collection.aggregate(pipeline))
        fish_type_distribution = {item["_id"]: item["count"] for item in fish_types}
        
        # Average confidence by fish type (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True}},
            {"$unwind": "$detections"},
            {"$group": {"_id": "$detections.fish_type", "avg_conf": {"$avg": "$detections.confidence"}}}
        ]
        avg_conf = list(scans_collection.aggregate(pipeline))
        average_confidence = {item["_id"]: round(item["avg_conf"], 4) for item in avg_conf}
        
        # Daily scans (within time range)
        pipeline = [
            {"$match": time_filter},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily = list(scans_collection.aggregate(pipeline))
        daily_scans = {item["_id"]: item["count"] for item in daily}
        
        # Color Consistency Analysis (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True, "color_analysis.consistency_score": {"$exists": True, "$gt": 0}}},
            {"$group": {
                "_id": None,
                "avg_score": {"$avg": "$color_analysis.consistency_score"},
                "count": {"$sum": 1}
            }}
        ]
        color_avg = list(scans_collection.aggregate(pipeline))
        avg_color_score = round(color_avg[0]["avg_score"], 1) if color_avg else 0
        
        # Quality grade distribution (within time range)
        grade_distribution = {"Export": 0, "Local": 0, "Reject": 0}
        for grade in ["Export", "Local", "Reject"]:
            count = scans_collection.count_documents({
                **time_filter,
                "is_daing": True,
                "color_analysis.quality_grade": grade
            })
            grade_distribution[grade] = count
        
        # Color consistency by fish type (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True, "color_analysis.consistency_score": {"$exists": True, "$gt": 0}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "avg_score": {"$avg": "$color_analysis.consistency_score"},
                "count": {"$sum": 1}
            }}
        ]
        color_by_type = list(scans_collection.aggregate(pipeline))
        color_by_fish_type = {
            item["_id"]: {
                "avg_score": round(item["avg_score"], 1),
                "count": item["count"]
            } for item in color_by_type
        }
        
        # =====================================================
        # MOLD ANALYSIS AGGREGATION (within time range)
        # =====================================================
        
        # Mold severity distribution (within time range)
        severity_distribution = {"None": 0, "Low": 0, "Moderate": 0, "Severe": 0}
        for severity in severity_distribution.keys():
            count = scans_collection.count_documents({
                **time_filter,
                "is_daing": True,
                "mold_analysis.overall_severity": severity
            })
            severity_distribution[severity] = count
        
        # Average mold coverage (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True, "mold_analysis.avg_coverage_percent": {"$exists": True}}},
            {"$group": {
                "_id": None,
                "avg_coverage": {"$avg": "$mold_analysis.avg_coverage_percent"},
                "count": {"$sum": 1}
            }}
        ]
        mold_avg = list(scans_collection.aggregate(pipeline))
        avg_mold_coverage = round(mold_avg[0]["avg_coverage"], 2) if mold_avg else 0
        
        # Spatial zone aggregation (top/bottom for split fish) - within time range
        spatial_zones = {
            "top": {"fish_affected": 0, "total_patches": 0},
            "bottom": {"fish_affected": 0, "total_patches": 0}
        }
        
        # Get all scans with spatial data (within time range)
        scans_with_mold = list(scans_collection.find({
            **time_filter,
            "is_daing": True,
            "mold_analysis.spatial_summary.zones": {"$exists": True}
        }, {"mold_analysis.spatial_summary.zones": 1}))
        
        for scan in scans_with_mold:
            zones = scan.get("mold_analysis", {}).get("spatial_summary", {}).get("zones", {})
            for zone_name, zone_data in zones.items():
                if zone_name in spatial_zones:
                    patches = zone_data.get("total_patches", 0)
                    spatial_zones[zone_name]["total_patches"] += patches
                    if patches > 0:
                        spatial_zones[zone_name]["fish_affected"] += 1
        
        # Mold analysis by fish type (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True, "mold_analysis.overall_severity": {"$exists": True}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "total_scans": {"$sum": 1},
                "contaminated_scans": {
                    "$sum": {
                        "$cond": [
                            {"$ne": ["$mold_analysis.overall_severity", "None"]},
                            1, 0
                        ]
                    }
                },
                "avg_coverage": {"$avg": "$mold_analysis.avg_coverage_percent"}
            }}
        ]
        mold_by_type = list(scans_collection.aggregate(pipeline))
        mold_by_fish_type = {
            item["_id"]: {
                "total_scans": item["total_scans"],
                "contaminated_scans": item["contaminated_scans"],
                "contamination_rate": round((item["contaminated_scans"] / item["total_scans"]) * 100, 1) if item["total_scans"] > 0 else 0,
                "avg_coverage": round(item["avg_coverage"] or 0, 2)
            } for item in mold_by_type
        }
        
        # =====================================================
        # DEFECT PATTERN ANALYSIS (within time range)
        # Tracks frequency and types of quality issues
        # =====================================================
        
        # Defect categories based on color analysis (not using mold for now)
        defect_frequency = {
            "poor_color_uniformity": 0,  # Low consistency score
            "color_discoloration": 0,     # Very low score indicating discoloration
            "acceptable_quality": 0       # Good score but not export grade
        }
        
        # Count defects by category (within time range)
        defect_frequency["poor_color_uniformity"] = scans_collection.count_documents({
            **time_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$lt": 50}
        })
        
        defect_frequency["color_discoloration"] = scans_collection.count_documents({
            **time_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$lt": 30}
        })
        
        defect_frequency["acceptable_quality"] = scans_collection.count_documents({
            **time_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$gte": 50, "$lt": 75}
        })
        
        # Identify primary defects for Reject and Local grade fish (within time range)
        pipeline = [
            {"$match": {
                **time_filter,
                "is_daing": True,
                "color_analysis.quality_grade": {"$in": ["Reject", "Local"]}
            }},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "total_affected": {"$sum": 1},
                "reject_count": {
                    "$sum": {"$cond": [{"$eq": ["$color_analysis.quality_grade", "Reject"]}, 1, 0]}
                },
                "local_count": {
                    "$sum": {"$cond": [{"$eq": ["$color_analysis.quality_grade", "Local"]}, 1, 0]}
                },
                "avg_score": {"$avg": "$color_analysis.consistency_score"},
                "avg_std_deviation": {"$avg": "$color_analysis.avg_std_deviation"}
            }},
            {"$sort": {"total_affected": -1}}
        ]
        defect_by_species = list(scans_collection.aggregate(pipeline))
        
        # Build species susceptibility data
        species_susceptibility = {}
        for item in defect_by_species:
            fish_type = item["_id"]
            total_for_type = fish_type_distribution.get(fish_type, 0)
            species_susceptibility[fish_type] = {
                "total_affected": item["total_affected"],
                "total_scans": total_for_type,
                "defect_rate": round((item["total_affected"] / total_for_type) * 100, 1) if total_for_type > 0 else 0,
                "reject_count": item["reject_count"],
                "local_count": item["local_count"],
                "avg_color_score": round(item["avg_score"] or 0, 1),
                "primary_issue": "poor_color_quality" if (item["avg_score"] or 0) < 50 else "moderate_variation"
            }
        
        # =====================================================
        # QUALITY GRADE CLASSIFICATION SUMMARY (within time range)
        # Comprehensive grading records by species and date
        # =====================================================
        
        # Quality classification by species (within time range)
        pipeline = [
            {"$match": {**time_filter, "is_daing": True, "color_analysis.quality_grade": {"$exists": True}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": {
                    "fish_type": "$detections.fish_type",
                    "grade": "$color_analysis.quality_grade"
                },
                "count": {"$sum": 1},
                "avg_confidence": {"$avg": "$detections.confidence"},
                "avg_color_score": {"$avg": "$color_analysis.consistency_score"}
            }}
        ]
        grade_by_species_raw = list(scans_collection.aggregate(pipeline))
        
        # Organize by fish type
        quality_by_species = {}
        for item in grade_by_species_raw:
            fish_type = item["_id"]["fish_type"]
            grade = item["_id"]["grade"]
            if fish_type not in quality_by_species:
                quality_by_species[fish_type] = {
                    "Export": {"count": 0, "avg_confidence": 0, "avg_color_score": 0},
                    "Local": {"count": 0, "avg_confidence": 0, "avg_color_score": 0},
                    "Reject": {"count": 0, "avg_confidence": 0, "avg_color_score": 0}
                }
            quality_by_species[fish_type][grade] = {
                "count": item["count"],
                "avg_confidence": round(item["avg_confidence"], 2),
                "avg_color_score": round(item["avg_color_score"], 1)
            }
        
        # Quality classification by date (configurable time range)
        pipeline = [
            {"$match": {
                "is_daing": True,
                "timestamp": {"$gte": time_cutoff},
                "color_analysis.quality_grade": {"$exists": True}
            }},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "grade": "$color_analysis.quality_grade"
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.date": 1}}
        ]
        grade_by_date_raw = list(scans_collection.aggregate(pipeline))
        
        # Organize by date
        quality_by_date = {}
        for item in grade_by_date_raw:
            date = item["_id"]["date"]
            grade = item["_id"]["grade"]
            if date not in quality_by_date:
                quality_by_date[date] = {"Export": 0, "Local": 0, "Reject": 0}
            quality_by_date[date][grade] = item["count"]
        
        return {
            "status": "success",
            "total_scans": total_scans,
            "daing_scans": daing_scans,
            "non_daing_scans": non_daing_scans,
            "fish_type_distribution": fish_type_distribution,
            "average_confidence": average_confidence,
            "daily_scans": daily_scans,
            "color_consistency": {
                "average_score": avg_color_score,
                "grade_distribution": grade_distribution,
                "by_fish_type": color_by_fish_type
            },
            "mold_analysis": {
                "severity_distribution": severity_distribution,
                "average_coverage": avg_mold_coverage,
                "spatial_zones": spatial_zones,
                "by_fish_type": mold_by_fish_type
            },
            "defect_patterns": {
                "frequency": defect_frequency,
                "species_susceptibility": species_susceptibility,
                "most_common_defect": max(defect_frequency, key=defect_frequency.get) if any(defect_frequency.values()) else None
            },
            "quality_classification": {
                "by_species": quality_by_species,
                "by_date": quality_by_date,
                "summary": {
                    "export_rate": round((grade_distribution["Export"] / daing_scans) * 100, 1) if daing_scans > 0 else 0,
                    "local_rate": round((grade_distribution["Local"] / daing_scans) * 100, 1) if daing_scans > 0 else 0,
                    "reject_rate": round((grade_distribution["Reject"] / daing_scans) * 100, 1) if daing_scans > 0 else 0
                }
            }
        }
    
    except Exception as e:
        print(f"Analytics error: {e}")
        import traceback
        traceback.print_exc()
        empty_response["message"] = str(e)
        return empty_response


def get_user_analytics_summary(user_id: str, days: int = 7) -> dict:
    """
    Get analytics summary for a specific user from MongoDB.
    
    Args:
        user_id: The user's ID
        days: Number of days for time-based analytics (default: 7)
        
    Returns:
        Analytics summary for the user with totals, distributions, color consistency, and mold data
    """
    scans_collection = get_scans_collection()
    
    empty_response = {
        "status": "error",
        "message": "MongoDB not connected",
        "total_scans": 0,
        "daing_scans": 0,
        "non_daing_scans": 0,
        "fish_type_distribution": {},
        "average_confidence": {},
        "daily_scans": {},
        "color_consistency": {
            "average_score": 0,
            "grade_distribution": {"Export": 0, "Local": 0, "Reject": 0},
            "by_fish_type": {}
        },
        "mold_analysis": {
            "severity_distribution": {"None": 0, "Low": 0, "Moderate": 0, "Severe": 0},
            "average_coverage": 0,
            "spatial_zones": {
                "top": {"fish_affected": 0, "total_patches": 0},
                "bottom": {"fish_affected": 0, "total_patches": 0}
            },
            "by_fish_type": {}
        }
    }
    
    if scans_collection is None:
        return empty_response
    
    try:
        # Calculate time cutoff for filtering
        time_cutoff = datetime.now() - timedelta(days=days)
        
        # Base filter for user within time range
        user_filter = {"user_id": user_id, "timestamp": {"$gte": time_cutoff}}
        
        # Total scans for this user (within time range)
        total_scans = scans_collection.count_documents(user_filter)
        daing_scans = scans_collection.count_documents({**user_filter, "is_daing": True})
        non_daing_scans = total_scans - daing_scans
        
        # Fish type distribution (within time range)
        pipeline = [
            {"$match": {**user_filter, "is_daing": True}},
            {"$unwind": "$detections"},
            {"$group": {"_id": "$detections.fish_type", "count": {"$sum": 1}}}
        ]
        fish_types = list(scans_collection.aggregate(pipeline))
        fish_type_distribution = {item["_id"]: item["count"] for item in fish_types}
        
        # Average confidence by fish type (within time range)
        pipeline = [
            {"$match": {**user_filter, "is_daing": True}},
            {"$unwind": "$detections"},
            {"$group": {"_id": "$detections.fish_type", "avg_conf": {"$avg": "$detections.confidence"}}}
        ]
        avg_conf = list(scans_collection.aggregate(pipeline))
        average_confidence = {item["_id"]: round(item["avg_conf"], 4) for item in avg_conf}
        
        # Daily scans (within time range)
        pipeline = [
            {"$match": user_filter},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily = list(scans_collection.aggregate(pipeline))
        daily_scans = {item["_id"]: item["count"] for item in daily}
        
        # Color Consistency Analysis (within time range)
        pipeline = [
            {"$match": {**user_filter, "is_daing": True, "color_analysis.consistency_score": {"$exists": True, "$gt": 0}}},
            {"$group": {
                "_id": None,
                "avg_score": {"$avg": "$color_analysis.consistency_score"},
                "count": {"$sum": 1}
            }}
        ]
        color_avg = list(scans_collection.aggregate(pipeline))
        avg_color_score = round(color_avg[0]["avg_score"], 1) if color_avg else 0
        
        # Quality grade distribution (within time range)
        grade_distribution = {"Export": 0, "Local": 0, "Reject": 0}
        for grade in ["Export", "Local", "Reject"]:
            count = scans_collection.count_documents({
                **user_filter,
                "is_daing": True,
                "color_analysis.quality_grade": grade
            })
            grade_distribution[grade] = count
        
        # Color consistency by fish type (within time range)
        pipeline = [
            {"$match": {**user_filter, "is_daing": True, "color_analysis.consistency_score": {"$exists": True, "$gt": 0}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "avg_score": {"$avg": "$color_analysis.consistency_score"},
                "count": {"$sum": 1}
            }}
        ]
        color_by_type = list(scans_collection.aggregate(pipeline))
        color_by_fish_type = {
            item["_id"]: {
                "avg_score": round(item["avg_score"], 1),
                "count": item["count"]
            } for item in color_by_type
        }
        
        # Mold severity distribution
        severity_distribution = {"None": 0, "Low": 0, "Moderate": 0, "Severe": 0}
        for severity in severity_distribution.keys():
            count = scans_collection.count_documents({
                **user_filter,
                "is_daing": True,
                "mold_analysis.overall_severity": severity
            })
            severity_distribution[severity] = count
        
        # Average mold coverage
        pipeline = [
            {"$match": {**user_filter, "is_daing": True, "mold_analysis.avg_coverage_percent": {"$exists": True}}},
            {"$group": {
                "_id": None,
                "avg_coverage": {"$avg": "$mold_analysis.avg_coverage_percent"},
                "count": {"$sum": 1}
            }}
        ]
        mold_avg = list(scans_collection.aggregate(pipeline))
        avg_mold_coverage = round(mold_avg[0]["avg_coverage"], 2) if mold_avg else 0
        
        # Spatial zone aggregation (top/bottom for split fish)
        spatial_zones = {
            "top": {"fish_affected": 0, "total_patches": 0},
            "bottom": {"fish_affected": 0, "total_patches": 0}
        }
        
        scans_with_mold = list(scans_collection.find({
            **user_filter,
            "is_daing": True,
            "mold_analysis.spatial_summary.zones": {"$exists": True}
        }, {"mold_analysis.spatial_summary.zones": 1}))
        
        for scan in scans_with_mold:
            zones = scan.get("mold_analysis", {}).get("spatial_summary", {}).get("zones", {})
            for zone_name, zone_data in zones.items():
                if zone_name in spatial_zones:
                    patches = zone_data.get("total_patches", 0)
                    spatial_zones[zone_name]["total_patches"] += patches
                    if patches > 0:
                        spatial_zones[zone_name]["fish_affected"] += 1
        
        # Mold analysis by fish type
        pipeline = [
            {"$match": {**user_filter, "is_daing": True, "mold_analysis.overall_severity": {"$exists": True}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "total_scans": {"$sum": 1},
                "contaminated_scans": {
                    "$sum": {
                        "$cond": [
                            {"$ne": ["$mold_analysis.overall_severity", "None"]},
                            1, 0
                        ]
                    }
                },
                "avg_coverage": {"$avg": "$mold_analysis.avg_coverage_percent"}
            }}
        ]
        mold_by_type = list(scans_collection.aggregate(pipeline))
        mold_by_fish_type = {
            item["_id"]: {
                "total_scans": item["total_scans"],
                "contaminated_scans": item["contaminated_scans"],
                "contamination_rate": round((item["contaminated_scans"] / item["total_scans"]) * 100, 1) if item["total_scans"] > 0 else 0,
                "avg_coverage": round(item["avg_coverage"] or 0, 2)
            } for item in mold_by_type
        }
        
        # =====================================================
        # DEFECT PATTERN ANALYSIS (User-specific)
        # =====================================================
        
        defect_frequency = {
            "poor_color_uniformity": 0,
            "color_discoloration": 0,
            "acceptable_quality": 0
        }
        
        defect_frequency["poor_color_uniformity"] = scans_collection.count_documents({
            **user_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$lt": 50}
        })
        
        defect_frequency["color_discoloration"] = scans_collection.count_documents({
            **user_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$lt": 30}
        })
        
        defect_frequency["acceptable_quality"] = scans_collection.count_documents({
            **user_filter,
            "is_daing": True,
            "color_analysis.consistency_score": {"$exists": True, "$gte": 50, "$lt": 75}
        })
        
        # Species susceptibility for user
        pipeline = [
            {"$match": {
                **user_filter,
                "is_daing": True,
                "color_analysis.quality_grade": {"$in": ["Reject", "Local"]}
            }},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": "$detections.fish_type",
                "total_affected": {"$sum": 1},
                "reject_count": {
                    "$sum": {"$cond": [{"$eq": ["$color_analysis.quality_grade", "Reject"]}, 1, 0]}
                },
                "local_count": {
                    "$sum": {"$cond": [{"$eq": ["$color_analysis.quality_grade", "Local"]}, 1, 0]}
                },
                "avg_score": {"$avg": "$color_analysis.consistency_score"}
            }},
            {"$sort": {"total_affected": -1}}
        ]
        defect_by_species = list(scans_collection.aggregate(pipeline))
        
        species_susceptibility = {}
        for item in defect_by_species:
            fish_type = item["_id"]
            total_for_type = fish_type_distribution.get(fish_type, 0)
            species_susceptibility[fish_type] = {
                "total_affected": item["total_affected"],
                "total_scans": total_for_type,
                "defect_rate": round((item["total_affected"] / total_for_type) * 100, 1) if total_for_type > 0 else 0,
                "reject_count": item["reject_count"],
                "local_count": item["local_count"],
                "avg_color_score": round(item["avg_score"] or 0, 1),
                "primary_issue": "poor_color_quality" if (item["avg_score"] or 0) < 50 else "moderate_variation"
            }
        
        # =====================================================
        # QUALITY GRADE CLASSIFICATION (User-specific)
        # =====================================================
        
        pipeline = [
            {"$match": {**user_filter, "is_daing": True, "color_analysis.quality_grade": {"$exists": True}}},
            {"$unwind": "$detections"},
            {"$group": {
                "_id": {
                    "fish_type": "$detections.fish_type",
                    "grade": "$color_analysis.quality_grade"
                },
                "count": {"$sum": 1},
                "avg_confidence": {"$avg": "$detections.confidence"},
                "avg_color_score": {"$avg": "$color_analysis.consistency_score"}
            }}
        ]
        grade_by_species_raw = list(scans_collection.aggregate(pipeline))
        
        quality_by_species = {}
        for item in grade_by_species_raw:
            fish_type = item["_id"]["fish_type"]
            grade = item["_id"]["grade"]
            if fish_type not in quality_by_species:
                quality_by_species[fish_type] = {
                    "Export": {"count": 0, "avg_confidence": 0, "avg_color_score": 0},
                    "Local": {"count": 0, "avg_confidence": 0, "avg_color_score": 0},
                    "Reject": {"count": 0, "avg_confidence": 0, "avg_color_score": 0}
                }
            quality_by_species[fish_type][grade] = {
                "count": item["count"],
                "avg_confidence": round(item["avg_confidence"], 2),
                "avg_color_score": round(item["avg_color_score"], 1)
            }
        
        # Quality by date for user (configurable time range)
        pipeline = [
            {"$match": {
                **user_filter,
                "is_daing": True,
                "timestamp": {"$gte": time_cutoff},
                "color_analysis.quality_grade": {"$exists": True}
            }},
            {"$group": {
                "_id": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "grade": "$color_analysis.quality_grade"
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.date": 1}}
        ]
        grade_by_date_raw = list(scans_collection.aggregate(pipeline))
        
        quality_by_date = {}
        for item in grade_by_date_raw:
            date = item["_id"]["date"]
            grade = item["_id"]["grade"]
            if date not in quality_by_date:
                quality_by_date[date] = {"Export": 0, "Local": 0, "Reject": 0}
            quality_by_date[date][grade] = item["count"]
        
        return {
            "status": "success",
            "total_scans": total_scans,
            "daing_scans": daing_scans,
            "non_daing_scans": non_daing_scans,
            "fish_type_distribution": fish_type_distribution,
            "average_confidence": average_confidence,
            "daily_scans": daily_scans,
            "color_consistency": {
                "average_score": avg_color_score,
                "grade_distribution": grade_distribution,
                "by_fish_type": color_by_fish_type
            },
            "mold_analysis": {
                "severity_distribution": severity_distribution,
                "average_coverage": avg_mold_coverage,
                "spatial_zones": spatial_zones,
                "by_fish_type": mold_by_fish_type
            },
            "defect_patterns": {
                "frequency": defect_frequency,
                "species_susceptibility": species_susceptibility,
                "most_common_defect": max(defect_frequency, key=defect_frequency.get) if any(defect_frequency.values()) else None
            },
            "quality_classification": {
                "by_species": quality_by_species,
                "by_date": quality_by_date,
                "summary": {
                    "export_rate": round((grade_distribution["Export"] / daing_scans) * 100, 1) if daing_scans > 0 else 0,
                    "local_rate": round((grade_distribution["Local"] / daing_scans) * 100, 1) if daing_scans > 0 else 0,
                    "reject_rate": round((grade_distribution["Reject"] / daing_scans) * 100, 1) if daing_scans > 0 else 0
                }
            }
        }
    
    except Exception as e:
        print(f"User analytics error: {e}")
        import traceback
        traceback.print_exc()
        empty_response["message"] = str(e)
        return empty_response

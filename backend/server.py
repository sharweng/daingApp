"""
Daing Grader Backend Server
===========================
AI-powered dried fish grading system using YOLOv8 segmentation
with color consistency analysis for quality assessment.

This is the main entry point for the FastAPI server.
Supports both mobile app and web frontend.

The application has been modularized into:
- app/config.py: Configuration and database connections
- app/model.py: AI model loading and inference
- app/color_analysis.py: Color consistency analysis
- app/drawing.py: Image visualization and annotation
- app/history.py: History management
- app/analytics.py: Analytics logging and aggregation
- app/dataset.py: Dataset management
- app/routes.py: API route handlers
- app/auth.py: Authentication (session + JWT)
- app/contact.py: Contact form
- app/payment.py: Payment processing
"""

import os
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

# Initialize the app module (loads config, model, etc.)
from app.config import init_mongodb
from app.model import load_model
from app.routes import router
from app.contact import router as contact_router
from app.payment import router as payment_router
from app.ecommerce import router as ecommerce_router
from app.community import router as community_router

# Create FastAPI app
app = FastAPI(
    title="Daing Grader API",
    description="AI-powered dried fish grading system",
    version="2.0.0"
)

# ============================================
# CORS MIDDLEWARE (for web frontend)
# ============================================
_cors_origins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:51732",  # Vite preview port
    "http://localhost:3000",   # Alternative dev port
]
if _url := os.getenv("FRONTEND_URL", "").strip():
    _cors_origins.append(_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)
app.include_router(contact_router, tags=["contact"])
app.include_router(payment_router, tags=["payment"])
app.include_router(ecommerce_router, tags=["ecommerce"])
app.include_router(community_router, tags=["community"])

# Dataset directory
DATASET_DIR = Path("dataset")
DATASET_DIR.mkdir(exist_ok=True)

# Load model on startup
@app.on_event("startup")
async def startup_event():
    """Initialize model and connections on startup."""
    try:
        load_model("best.pt")
    except Exception as e:
        print(f"⚠️ Model loading deferred: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

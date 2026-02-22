"""
Daing Grader Backend Server
===========================
AI-powered dried fish grading system using YOLOv8 segmentation
with color consistency analysis for quality assessment.

This is the main entry point for the FastAPI server.
The application has been modularized into:
- app/config.py: Configuration and database connections
- app/model.py: AI model loading and inference
- app/color_analysis.py: Color consistency analysis
- app/drawing.py: Image visualization and annotation
- app/history.py: History management
- app/analytics.py: Analytics logging and aggregation
- app/dataset.py: Dataset management
- app/routes.py: API route handlers
"""

from fastapi import FastAPI
from pathlib import Path

# Initialize the app module (loads config, model, etc.)
from app.config import init_mongodb
from app.model import load_model
from app.routes import router

# Create FastAPI app
app = FastAPI(
    title="Daing Grader API",
    description="AI-powered dried fish grading system",
    version="2.0.0"
)

# Include routes
app.include_router(router)

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

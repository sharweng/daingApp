"""
MongoDB connection for DaingGrader backend.
Use this module when you add login/signup/logout — no existing files are modified.

Setup:
  1. Create a free cluster at https://www.mongodb.com/cloud/atlas (MongoDB Atlas).
  2. Get your connection string (e.g. mongodb+srv://user:pass@cluster.mongodb.net/dainggrader).
  3. Add to your .env file:  MONGODB_URI=mongodb+srv://...
  4. Install:  pip install pymongo
  5. Import and use:  from mongodb import get_db
"""

import os
from typing import Optional

# Optional: only import pymongo when you use MongoDB (so existing server.py doesn't break)
_client = None


def get_mongo_client():
    """Returns a MongoDB client. Call this when you implement auth (login/signup/logout)."""
    global _client
    if _client is not None:
        return _client
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise ValueError(
            "MONGODB_URI is not set in .env. "
            "Add it for auth features (e.g. MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dainggrader)"
        )
    try:
        from pymongo import MongoClient
        _client = MongoClient(uri)
        # Optional: ping to verify connection
        _client.admin.command("ping")
        return _client
    except ImportError:
        raise ImportError("Install pymongo: pip install pymongo")


# for web backend: use daing_grader so web users live in same DB as mobile (history, scans)
def get_db(database_name: str = "daing_grader"):
    """Returns the database. Use when you add auth (e.g. users collection)."""
    return get_mongo_client()[database_name]

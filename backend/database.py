import os
import sqlite3
import pymongo
from bson import ObjectId
import datetime
from typing import Optional

# MongoDB Connection Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = pymongo.MongoClient(MONGO_URI)
mongo_db = client["arbiter_db"]

# Default SQLite target database file for query optimizations (E-Commerce Demo)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'optimizer.db')

def get_user_db_path(user_id: Optional[str] = None) -> str:
    """
    Fetches the SQLite database path associated with the given user_id from MongoDB.
    Defaults to the preloaded e-commerce demo database path if none is found.
    """
    if not user_id:
        return DB_PATH
    
    try:
        record = mongo_db["user_databases"].find_one({"user_id": user_id})
        if record and os.path.exists(record["db_path"]):
            return record["db_path"]
    except Exception as e:
        print("Error fetching user database path from MongoDB:", e)
    return DB_PATH

def get_db_connection(user_id: Optional[str] = None):
    """
    Creates and returns a connection to the SQLite database associated with the user.
    If no user_id is provided, routes to the default demo database.
    """
    path = get_user_db_path(user_id)
    conn = sqlite3.connect(path)
    # Use Row factory to access columns by name
    conn.row_factory = sqlite3.Row
    return conn

def log_query_execution(user_id: Optional[str], query: str, features: dict, predicted_cost: float, actual_cost: float):
    """
    Saves execution results and featurized query plan in MongoDB query_logs collection.
    """
    try:
        log_entry = {
            "user_id": user_id or "guest",
            "query": query,
            "features": features,
            "predicted_cost": predicted_cost,
            "actual_cost": actual_cost,
            "timestamp": datetime.datetime.utcnow()
        }
        mongo_db["query_logs"].insert_one(log_entry)
    except Exception as e:
        print("Failed to write query log to MongoDB:", e)

def get_query_history_from_mongo(user_id: Optional[str], limit: int = 100):
    """
    Reads query logs list associated with the user_id from MongoDB.
    """
    uid = user_id or "guest"
    try:
        cursor = mongo_db["query_logs"].find({"user_id": uid}).sort("timestamp", -1).limit(limit)
        history = []
        for doc in cursor:
            history.append({
                "id": str(doc["_id"]),
                "query": doc["query"],
                "features": doc["features"],
                "predicted_cost_ms": doc["predicted_cost"],
                "actual_cost_ms": doc["actual_cost"],
                "timestamp": doc["timestamp"].isoformat() if isinstance(doc["timestamp"], datetime.datetime) else str(doc["timestamp"])
            })
        return history
    except Exception as e:
        print("Error fetching query logs from MongoDB:", e)
        return []

def init_db():
    """
    Initialize SQLite logs table fallback (unused, but kept for structural consistency
    and preventing imports errors during bootstrap).
    """
    pass

if __name__ == '__main__':
    # Test MongoDB Connection
    try:
        client.admin.command('ping')
        print("Connected successfully to MongoDB database at:", MONGO_URI)
    except Exception as e:
        print("MongoDB connection failed:", e)

import os
import time
import json
import sqlite3
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import database
from database import get_db_connection, get_logs_connection, init_db
from optimizer import optimize_query
from model import get_model_metadata, retrain_on_logs
from feature_extractor import clear_table_size_cache

app = FastAPI(
    title="Arbiter DB Query Optimizer API",
    description="Machine Learning assisted query planner and cost estimation engine for SQLite.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits access from local UI developers (localhost:3000, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to ensure database query_logs table is created
@app.on_event("startup")
def on_startup():
    init_db()

# Pydantic input models
class QueryRequest(BaseModel):
    sql: str

@app.get("/")
def root():
    return {"message": "Welcome to the Arbiter DB Query Optimizer API. Use /query/execute to run SQL queries and /query/optimize to get ML-optimized plans."}
@app.post("/query/execute")
def execute_query(request: QueryRequest):
    """
    Executes a raw SQL statement, measures execution latency,
    and returns columns, rows, and execution statistics.
    """
    sql = request.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        t_start = time.perf_counter()
        
        cursor.execute(sql)
        
        # Check if the query returns rows (DQL like SELECT) or is a DML (INSERT, etc.)
        if cursor.description:
            columns = [col[0] for col in cursor.description]
            # Convert row objects to basic list representation for JSON serialization
            rows = [list(row) for row in cursor.fetchall()]
        else:
            columns = []
            rows = []
            conn.commit()  # commit writes if DML
            
        t_end = time.perf_counter()
        latency_ms = (t_end - t_start) * 1000.0
        
        return {
            "sql": sql,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_time_ms": round(latency_ms, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database execution error: {str(e)}")
    finally:
        conn.close()

@app.post("/query/optimize")
def optimize_sql(request: QueryRequest):
    """
    Featurizes and evaluates SQL query execution plans (Plan A vs Plan B)
    using the ML cost estimator. Executes the recommended plan and logs query stats.
    """
    sql = request.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
        
    # Check if the query starts with SELECT (only optimize SELECT statements)
    if not sql.upper().startswith("SELECT") and not sql.upper().startswith("EXPLAIN"):
        raise HTTPException(
            status_code=400, 
            detail="The ML Optimizer currently only supports SELECT query plans."
        )
        
    try:
        results = optimize_query(sql)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer evaluation error: {str(e)}")

@app.get("/query/history")
def get_query_history():
    """
    Returns query history logs stored in the query_logs table,
    comparing predicted costs vs actual latency.
    """
    conn = get_logs_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, query, features, predicted_cost, actual_cost, timestamp FROM query_logs ORDER BY timestamp DESC LIMIT 100")
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                "id": row["id"],
                "query": row["query"],
                "features": json.loads(row["features"]),
                "predicted_cost_ms": round(row["predicted_cost"], 2),
                "actual_cost_ms": round(row["actual_cost"], 2),
                "timestamp": row["timestamp"]
            })
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading history: {str(e)}")
    finally:
        conn.close()

@app.get("/model/stats")
def get_model_stats():
    """
    Returns the current machine learning model parameters, evaluation metrics,
    training sizes, and feature importances.
    """
    try:
        stats = get_model_metadata()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching model stats: {str(e)}")

@app.post("/model/retrain")
def retrain_model():
    """
    Triggers model retraining on combined baseline data and database logs.
    Includes a guard to ensure that at least 100 queries have been logged.
    """
    conn = get_logs_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM query_logs")
        total_logs = cursor.fetchone()[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database check failed: {str(e)}")
    finally:
        conn.close()
        
    # Guard: Require at least 100 logged queries to retrain to prevent model overfitting.
    if total_logs < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Overfitting guard active: need at least 100 logged queries to retrain (current logs: {total_logs})."
        )
        
    try:
        print("Starting model retraining...")
        model_metadata = retrain_on_logs()
        return {
            "status": "success",
            "message": "Model retrained successfully on accumulated query logs.",
            "metrics": {
                "mae_ms": model_metadata["mae_ms"],
                "r2_score": model_metadata["r2_score"],
                "training_samples": model_metadata["training_samples"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retraining model: {str(e)}")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/database/status")
def get_database_status():
    """
    Returns the active database metadata, file size, table count, and schema details.
    """
    db_path = database.ACTIVE_DB_PATH
    is_demo = (db_path == database.DB_PATH)
    name = os.path.basename(db_path)
    
    # Calculate size in MB
    try:
        size_bytes = os.path.getsize(db_path)
        size_mb = round(size_bytes / (1024 * 1024), 2)
    except Exception:
        size_mb = 0.0
        
    tables_info = []
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in cursor.fetchall()]
        
        for table in tables:
            # Row count
            try:
                cursor.execute(f"SELECT count(*) FROM [{table}]")
                row_count = cursor.fetchone()[0]
            except Exception:
                row_count = 0
                
            # Columns
            try:
                cursor.execute(f"PRAGMA table_info([{table}])")
                columns = [col['name'] for col in cursor.fetchall()]
            except Exception:
                columns = []
                
            tables_info.append({
                "name": table,
                "row_count": row_count,
                "columns": columns
            })
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read database status: {str(e)}")
        
    return {
        "is_demo": is_demo,
        "database_name": name,
        "size_mb": size_mb,
        "table_count": len(tables_info),
        "tables": tables_info
    }

@app.post("/database/upload")
async def upload_database(file: UploadFile = File(...)):
    """
    Saves an uploaded SQLite database file and dynamically updates the active target database.
    Verifies that the uploaded file is a valid SQLite3 database.
    """
    if not file.filename.endswith(('.db', '.sqlite', '.sqlite3')):
        raise HTTPException(status_code=400, detail="Only .db, .sqlite, and .sqlite3 file formats are supported.")
        
    # Generate path for the uploaded file
    target_path = os.path.join(UPLOAD_DIR, "user_database.db")
    
    # Save the file
    try:
        with open(target_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write uploaded file: {str(e)}")
        
    # Verify the SQLite file is valid
    try:
        test_conn = sqlite3.connect(target_path)
        test_cursor = test_conn.cursor()
        # Run a simple query to confirm SQLite is able to open it
        test_cursor.execute("PRAGMA schema_version;")
        test_cursor.fetchone()
        test_conn.close()
    except Exception as e:
        # Delete invalid file to cleanup
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=400, detail=f"The uploaded file is not a valid SQLite database: {str(e)}")
        
    # Update active database
    database.set_active_database(target_path)
    
    # Clear the table sizes cache
    clear_table_size_cache()
    
    # Return status of the newly loaded database
    return get_database_status()

@app.post("/database/reset")
def reset_database():
    """
    Swaps the active target database back to the default e-commerce database.
    """
    database.reset_active_database()
    
    # Clear the table sizes cache
    clear_table_size_cache()
    
    # Return status of default database
    return get_database_status()

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

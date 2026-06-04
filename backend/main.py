import time
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection, init_db
from optimizer import optimize_query
from model import get_model_metadata, retrain_on_logs

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
    conn = get_db_connection()
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
    conn = get_db_connection()
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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

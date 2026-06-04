import subprocess
import time
import urllib.request
import urllib.error
import json
import sys

def run_test():
    print("Starting FastAPI server in a background process...")
    # Start uvicorn server
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for the server to spin up
    time.sleep(2)
    
    try:
        # Test 1: POST /query/execute
        print("\n--- Test 1: POST /query/execute ---")
        req_data = json.dumps({"sql": "SELECT name, age FROM users LIMIT 3;"}).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:8000/query/execute",
            data=req_data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Response:", json.dumps(data, indent=2))
            assert data["row_count"] == 3
            assert len(data["columns"]) == 2
            
        # Test 2: POST /query/optimize (index optimization trigger)
        print("\n--- Test 2: POST /query/optimize (Index Suggestion) ---")
        # Run a query on users with unindexed age filter
        req_data = json.dumps({"sql": "SELECT * FROM users WHERE age = 35;"}).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:8000/query/optimize",
            data=req_data,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Response:", json.dumps(data, indent=2))
            assert "plan_a" in data
            assert "plan_b" in data
            assert data["plan_b"]["optimization_type"] == "index"
            
        # Test 3: GET /model/stats
        print("\n--- Test 3: GET /model/stats ---")
        with urllib.request.urlopen("http://127.0.0.1:8000/model/stats") as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Response:", json.dumps(data, indent=2))
            assert data["model"] == "RandomForestRegressor"
            assert "mae_ms" in data
            assert "r2_score" in data
            
        # Test 4: GET /query/history
        print("\n--- Test 4: GET /query/history ---")
        with urllib.request.urlopen("http://127.0.0.1:8000/query/history") as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("Response size:", len(data))
            assert len(data) >= 1  # The optimize test should have written a log
            print("Sample history log:", json.dumps(data[0], indent=2))
            
        # Test 5: POST /model/retrain (expecting overfitting guard error)
        print("\n--- Test 5: POST /model/retrain (Overfitting Guard) ---")
        req = urllib.request.Request(
            "http://127.0.0.1:8000/model/retrain",
            method="POST"
        )
        try:
            urllib.request.urlopen(req)
            print("ERROR: Expected HTTP 400 bad request due to guard, but request succeeded.")
            sys.exit(1)
        except urllib.error.HTTPError as e:
            err_data = json.loads(e.read().decode('utf-8'))
            print("Received expected HTTP error:", e.code)
            print("Error details:", json.dumps(err_data, indent=2))
            assert e.code == 400
            assert "Overfitting guard active" in err_data["detail"]
            
        print("\nAll integration tests passed successfully!")
        
    finally:
        print("\nShutting down FastAPI server...")
        server_process.terminate()
        server_process.wait()
        print("Server process shut down.")

if __name__ == '__main__':
    run_test()

import os
import time
import json
import re
import sqlite3
import shutil
import hashlib
import jwt
import datetime
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

# SMTP Email Configuration & Environment Initialization
def load_dotenv():
    # Search for .env files in common locations and load them manually
    for env_file in [".env", "../.env", "backend/.env", "../backend/.env"]:
        if os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip('"').strip("'")
                            if key and val and key not in os.environ:
                                os.environ[key] = val
            except Exception as e:
                print(f"Error reading {env_file} manual parse: {e}")

# Load environment variables early so import modules like database can access them
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from bson import ObjectId
import database
from database import get_db_connection, init_db, get_query_history_from_mongo
from optimizer import optimize_query
from model import get_model_metadata, retrain_on_logs
from feature_extractor import clear_table_size_cache

app = FastAPI(
    title="Arbiter DB Query Optimizer API",
    description="Machine Learning assisted query planner and cost estimation engine for SQLite.",
    version="1.0.0"
)

# Enable CORS for frontend integration
origins = [
    "https://arbiter-neon-seven.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cleaned_url = frontend_url.rstrip("/")
    if cleaned_url not in origins:
        origins.append(cleaned_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Auth Configuration
JWT_SECRET = os.getenv("JWT_SECRET")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "Arbiter")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", None)
SMTP_FROM = os.getenv("SMTP_FROM", "noreply@arbiter.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

def send_verification_email(email: str, name: str, token: str):
    verify_link = f"{FRONTEND_URL}/verify?token={token}"
    
    # Check if Resend is configured
    if RESEND_API_KEY:
        print(f"Sending verification email to {email} via Resend API...")
        import urllib.request
        import urllib.error
        import json
        
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "ArbiterApp/1.0"
        }
        
        # HTML template
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
              <h2 style="color: #D85B53; text-align: center;">Welcome to Arbiter!</h2>
              <p>Hi {name},</p>
              <p>Thank you for signing up for Arbiter, the ML-assisted Database Query Optimizer.</p>
              <p>Please click the button below to verify your email address and activate your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_link}" style="background-color: #D85B53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;"><a href="{verify_link}">{verify_link}</a></p>
              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #777777; text-align: center;">This link will expire in 24 hours. If you did not sign up for an Arbiter account, please ignore this email.</p>
            </div>
          </body>
        </html>
        """
        
        data = {
            "from": SMTP_FROM,
            "to": [email],
            "subject": "Verify Your Arbiter Account",
            "html": html_content
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(data).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                print(f"Successfully sent email via Resend API to {email}")
                return
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8")
            print(f"Resend API error sending email to {email}: {e.code} - {err_msg}")
        except Exception as e:
            print(f"Resend network error sending email to {email}: {e}")

    # Fallback to SMTP
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("\n" + "="*80)
        print(f"VERIFICATION FALLBACK - LINK FOR {email}:")
        print(verify_link)
        print("="*80 + "\n")
        print("SMTP credentials are not configured and Resend API is not set. Verification link printed to console only.")
        return

    print(f"Sending verification email to {email} via SMTP...")

    try:
        # Build the message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify Your Arbiter Account"
        msg["From"] = SMTP_FROM
        msg["To"] = email

        # HTML and Plaintext body
        text = f"Hi {name},\n\nPlease verify your Arbiter account by clicking the link below:\n{verify_link}\n\nThanks!\nThe Arbiter Team"
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
              <h2 style="color: #D85B53; text-align: center;">Welcome to Arbiter!</h2>
              <p>Hi {name},</p>
              <p>Thank you for signing up for Arbiter, the ML-assisted Database Query Optimizer.</p>
              <p>Please click the button below to verify your email address and activate your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_link}" style="background-color: #D85B53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all;"><a href="{verify_link}">{verify_link}</a></p>
              <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #777777; text-align: center;">This link will expire in 24 hours. If you did not sign up for an Arbiter account, please ignore this email.</p>
            </div>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)

        # Connect and send
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, email, msg.as_string())
        server.quit()
        print(f"Successfully sent verification email via SMTP to {email}")
    except Exception as e:
        print(f"Error sending email via SMTP to {email}: {e}")

def utc_now() -> datetime.datetime:
    """Generates a timezone-naive UTC datetime to replace deprecated utcnow()."""
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

def hash_password(password: str) -> str:
    """Hashes a password securely using PBKDF2 with a static salt for simplicity."""
    salt = b"arbiter_static_salt_for_simplicity"
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return pwd_hash.hex()

def create_jwt_token(user_id: str, email: str) -> str:
    """Generates a JWT token valid for 24 hours."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": utc_now() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extracts and decodes the JWT bearer token from the Authorization header if present.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except Exception:
        return None

# Pydantic input models
class QueryRequest(BaseModel):
    sql: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ResendVerificationRequest(BaseModel):
    email: str

# Startup event
@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root():
    return {"message": "Welcome to the Arbiter DB Query Optimizer API. Use /query/execute to run SQL queries and /query/optimize to get ML-optimized plans."}

# Auth Endpoints
@app.post("/auth/signup")
def signup(request_body: SignupRequest, background_tasks: BackgroundTasks):
    email = request_body.email.strip().lower()
    if not email or not request_body.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
        
    # Check if user already exists in MongoDB
    user = database.mongo_db["users"].find_one({"email": email})
    if user:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")
        
    # Create user
    try:
        verification_token = uuid.uuid4().hex
        expiry = utc_now() + datetime.timedelta(hours=24)
        
        user_doc = {
            "name": request_body.name.strip(),
            "email": email,
            "password_hash": hash_password(request_body.password),
            "created_at": utc_now(),
            "is_verified": False,
            "verification_token": verification_token,
            "verification_token_expires": expiry
        }
        res = database.mongo_db["users"].insert_one(user_doc)
        user_id = str(res.inserted_id)
        
        # Queue email sending in the background
        background_tasks.add_task(
            send_verification_email, 
            email, 
            request_body.name.strip(), 
            verification_token
        )
        
        return {"message": "Verification email sent. Please check your inbox to activate your account."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sign up: {str(e)}")

@app.post("/auth/login")
def login(request_body: LoginRequest):
    email = request_body.email.strip().lower()
    user = database.mongo_db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Check password
    h = hash_password(request_body.password)
    if user["password_hash"] != h:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    # Check verification status
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=400, 
            detail="Email address not verified. Please check your inbox for the verification link."
        )
        
    user_id = str(user["_id"])
    token = create_jwt_token(user_id, email)
    return {"token": token, "email": email, "name": user.get("name", "")}

@app.get("/auth/verify")
def verify_email(token: str):
    if not token:
        raise HTTPException(status_code=400, detail="Token parameter is required.")
        
    # Find user with matching token and make sure it has not expired
    now = utc_now()
    user = database.mongo_db["users"].find_one({
        "verification_token": token,
        "verification_token_expires": {"$gt": now}
    })
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
        
    # Verify the user
    try:
        database.mongo_db["users"].update_one(
            {"_id": user["_id"]},
            {
                "$set": {"is_verified": True},
                "$unset": {"verification_token": "", "verification_token_expires": ""}
            }
        )
        return {"message": "Email verified successfully. You can now log in."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify email: {str(e)}")

@app.post("/auth/resend-verification")
def resend_verification(request_body: ResendVerificationRequest, background_tasks: BackgroundTasks):
    email = request_body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
        
    user = database.mongo_db["users"].find_one({"email": email})
    if not user:
        # For security, we don't disclose if email doesn't exist. Just return a success message.
        return {"message": "If the email is registered and not verified, a new verification link has been sent."}
        
    if user.get("is_verified", False):
        raise HTTPException(status_code=400, detail="This email address is already verified.")
        
    try:
        verification_token = uuid.uuid4().hex
        expiry = utc_now() + datetime.timedelta(hours=24)
        
        database.mongo_db["users"].update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "verification_token": verification_token,
                    "verification_token_expires": expiry
                }
            }
        )
        
        background_tasks.add_task(
            send_verification_email, 
            email, 
            user.get("name", "User"), 
            verification_token
        )
        
        return {"message": "Verification email sent. Please check your inbox."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resend verification: {str(e)}")

@app.get("/auth/me")
def get_me(request: Request):
    user_id = get_user_id_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        user = database.mongo_db["users"].find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"email": user["email"], "name": user.get("name", ""), "id": user_id}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid session credentials: {str(e)}")

# Query Endpoints
@app.post("/query/execute")
def execute_query(request_body: QueryRequest, request: Request):
    """
    Executes a raw SQL statement on the user's specific database workspace (or the demo DB if free),
    measures execution latency, and returns columns, rows, and execution statistics.
    """
    user_id = get_user_id_from_request(request)
    sql = request_body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
        
    conn = get_db_connection(user_id)
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
def optimize_sql(request_body: QueryRequest, request: Request):
    """
    Featurizes and evaluates SQL query execution plans (Plan A vs Plan B)
    using the ML cost estimator. Executes the recommended plan and logs query stats to MongoDB.
    """
    user_id = get_user_id_from_request(request)
    sql = request_body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="SQL query cannot be empty")
        
    # Strip leading comments and whitespace
    cleaned_sql = re.sub(r'^\s*(?:--.*?\n|/\*.*?\*/)\s*', '', sql, flags=re.DOTALL).strip()
    upper_cleaned = cleaned_sql.upper()
    
    if not any(upper_cleaned.startswith(prefix) for prefix in ["SELECT", "EXPLAIN", "WITH"]):
        raise HTTPException(
            status_code=400, 
            detail="The ML Optimizer currently only supports SELECT, EXPLAIN, and WITH query plans."
        )
        
    try:
        results = optimize_query(sql, user_id=user_id)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimizer evaluation error: {str(e)}")

@app.get("/query/history")
def get_query_history(request: Request):
    """
    Returns query history logs stored in MongoDB query_logs collection for the user.
    """
    user_id = get_user_id_from_request(request)
    return get_query_history_from_mongo(user_id)

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
def retrain_model(request: Request):
    """
    Triggers model retraining on combined baseline data and database logs.
    Includes a guard to ensure that at least 100 queries have been logged for this user.
    """
    user_id = get_user_id_from_request(request)
    
    # Check logs count for user
    query_filter = {"user_id": user_id or "guest"}
    try:
        total_logs = database.mongo_db["query_logs"].count_documents(query_filter)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database check failed: {str(e)}")
        
    # Guard: Require at least 100 logged queries to retrain to prevent model overfitting.
    if total_logs < 100:
        raise HTTPException(
            status_code=400,
            detail=f"Overfitting guard active: need at least 100 logged queries to retrain (current logs: {total_logs})."
        )
        
    try:
        print("Starting model retraining...")
        model_metadata = retrain_on_logs(user_id)
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

# Database Management Endpoints
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/database/status")
def get_database_status(request: Request):
    """
    Returns the active database metadata, file size, table count, and schema details.
    Free users will always get the status of the demo database.
    """
    user_id = get_user_id_from_request(request)
    db_path = database.get_user_db_path(user_id)
    is_demo = (db_path == database.DB_PATH)
    
    # Retrieve original database name from MongoDB if it is a custom upload
    name = os.path.basename(db_path)
    if not is_demo and user_id:
        record = database.mongo_db["user_databases"].find_one({"user_id": user_id})
        if record:
            name = record.get("db_name", name)

    
    # Calculate size in MB
    try:
        size_bytes = os.path.getsize(db_path)
        size_mb = round(size_bytes / (1024 * 1024), 2)
    except Exception:
        size_mb = 0.0
        
    tables_info = []
    try:
        conn = get_db_connection(user_id)
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
async def upload_database(request: Request, file: UploadFile = File(...)):
    """
    Saves an uploaded SQLite database file and updates the active target database mapping for the user in MongoDB.
    Verifies that the uploaded file is a valid SQLite3 database.
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        raise HTTPException(
            status_code=403,
            detail="Uploading a custom database is a premium feature. Please log in to optimize your own databases."
        )
        
    if not file.filename.endswith(('.db', '.sqlite', '.sqlite3')):
        raise HTTPException(status_code=400, detail="Only .db, .sqlite, and .sqlite3 file formats are supported.")
        
    # Create user-specific uploads folder
    user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
    os.makedirs(user_upload_dir, exist_ok=True)
    target_path = os.path.join(user_upload_dir, "user_database.db")
    
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
        test_cursor.execute("PRAGMA schema_version;")
        test_cursor.fetchone()
        test_conn.close()
    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=400, detail=f"The uploaded file is not a valid SQLite database: {str(e)}")
        
    # Get file size in MB
    try:
        size_bytes = os.path.getsize(target_path)
        size_mb = round(size_bytes / (1024 * 1024), 2)
    except Exception:
        size_mb = 0.0

    # Save mapping in MongoDB
    try:
        database.mongo_db["user_databases"].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "db_path": target_path,
                    "db_name": file.filename,
                    "size_mb": size_mb,
                    "updated_at": utc_now()
                }
            },
            upsert=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save database metadata in MongoDB: {str(e)}")
    
    # Clear cache
    clear_table_size_cache()
    
    # Return status of the newly loaded database
    return get_database_status(request)

@app.post("/database/reset")
def reset_database(request: Request):
    """
    Deletes the custom SQLite database mapping for the user in MongoDB, reverting back to the demo database.
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    try:
        # Delete record from MongoDB
        database.mongo_db["user_databases"].delete_one({"user_id": user_id})
        
        # Optionally, delete the uploaded file from disk to save space
        user_upload_dir = os.path.join(UPLOAD_DIR, user_id)
        if os.path.exists(user_upload_dir):
            shutil.rmtree(user_upload_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset database: {str(e)}")
        
    # Clear cache
    clear_table_size_cache()
    
    # Return status of default database
    return get_database_status(request)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

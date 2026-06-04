import os
import sqlite3

# Define the absolute path to the default SQLite database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'optimizer.db')
# Define the absolute path to the logs SQLite database file
LOGS_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs.db')

# Module-level variable to store the path of the currently active query database
ACTIVE_DB_PATH = DB_PATH

def get_db_connection():
    """
    Creates and returns a connection to the currently active SQLite query database.
    Sets the isolation_level to None to enable autocommit mode,
    which allows transactional CREATE INDEX and ROLLBACK for Plan B evaluation.
    """
    conn = sqlite3.connect(ACTIVE_DB_PATH)
    # Use Row factory to access columns by name
    conn.row_factory = sqlite3.Row
    return conn

def get_logs_connection():
    """
    Creates and returns a connection to the persistent query logs database.
    """
    conn = sqlite3.connect(LOGS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def set_active_database(path: str):
    """
    Sets the active query database path.
    """
    global ACTIVE_DB_PATH
    ACTIVE_DB_PATH = os.path.abspath(path)

def reset_active_database():
    """
    Resets the active query database path to the default optimizer.db database.
    """
    global ACTIVE_DB_PATH
    ACTIVE_DB_PATH = DB_PATH

def init_db():
    """
    Initializes the SQLite database schema in the logs database.
    Creates the query_logs table for tracking optimizer histories.
    """
    conn = get_logs_connection()
    cursor = conn.cursor()
    
    # Create the query_logs table if it does not exist
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        features TEXT NOT NULL,          -- JSON string of extracted features
        predicted_cost REAL NOT NULL,    -- Predicted latency in milliseconds
        actual_cost REAL NOT NULL,       -- Actual measured latency in milliseconds
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", LOGS_DB_PATH)


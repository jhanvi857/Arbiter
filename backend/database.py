import os
import sqlite3

# Define the absolute path to the SQLite database file
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'optimizer.db')

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Sets the isolation_level to None to enable autocommit mode,
    which allows transactional CREATE INDEX and ROLLBACK for Plan B evaluation.
    """
    conn = sqlite3.connect(DB_PATH)
    # Use Row factory to access columns by name
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite database schema.
    Creates the query_logs table for tracking optimizer histories.
    """
    conn = get_db_connection()
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
    print("Database initialized successfully at:", DB_PATH)

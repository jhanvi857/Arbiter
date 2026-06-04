import os
import random
import time
import csv
import sqlite3
from database import get_db_connection, init_db
from feature_extractor import extract_features, clear_table_size_cache

# Constants for synthetic data sizes
NUM_USERS = 2000
NUM_PRODUCTS = 500
NUM_ORDERS = 5000
NUM_ORDER_ITEMS = 50000

COUNTRIES = ["USA", "Canada", "UK", "Germany", "France", "India", "Japan", "Australia", "Brazil", "Egypt"]
CATEGORIES = ["Electronics", "Clothing", "Home", "Books", "Beauty", "Sports", "Toys", "Automotive", "Tools", "Garden"]
STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"]

FIRST_NAMES = ["John", "Jane", "Alex", "Emily", "Michael", "Sarah", "David", "Jessica", "James", "Ashley", 
               "Robert", "Patricia", "Charles", "Linda", "Joseph", "Barbara", "Thomas", "Susan", "Daniel", "Margaret"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson",
              "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White"]

PRODUCT_ADJECTIVES = ["Premium", "Super", "Eco", "Smart", "Mini", "Pro", "Ultra", "Max", "Mega", "Classic"]
PRODUCT_NOUNS = ["Phone", "Shirt", "Lamp", "Book", "Cream", "Ball", "Toy", "Wrench", "Drill", "Pot"]

def create_sample_tables(conn):
    """
    Creates sample tables for the DB query optimizer simulation.
    Note that we leave some foreign keys indexed, but columns like
    users.age, orders.status, and products.price unindexed on purpose
    so that our optimizer can recommend index creations.
    """
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        age INTEGER,
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # 2. Products Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        stock INTEGER
    );
    """)
    
    # 3. Orders Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        order_date DATETIME,
        status TEXT,
        total_amount REAL DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    """)
    
    # 4. Order Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL,
        FOREIGN KEY(order_id) REFERENCES orders(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
    );
    """)
    
    # Indexes (create index on join keys to simulate typical indexes)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);")

def populate_database(conn):
    """Populates the database with realistic synthetic data."""
    cursor = conn.cursor()
    
    # Check if tables are already populated
    cursor.execute("SELECT count(*) FROM users")
    if cursor.fetchone()[0] >= NUM_USERS:
        print("Database already populated. Skipping generation.")
        return
        
    print("Populating database with synthetic records...")
    
    # 1. Populate Users
    users_data = []
    for i in range(NUM_USERS):
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{i}@example.com"
        age = random.randint(18, 75)
        country = random.choice(COUNTRIES)
        users_data.append((name, email, age, country))
        
    cursor.executemany(
        "INSERT INTO users (name, email, age, country) VALUES (?, ?, ?, ?)",
        users_data
    )
    print(f"Inserted {NUM_USERS} users.")
    
    # 2. Populate Products
    products_data = []
    for i in range(NUM_PRODUCTS):
        adj = random.choice(PRODUCT_ADJECTIVES)
        noun = random.choice(PRODUCT_NOUNS)
        name = f"{adj} {noun} {i}"
        category = random.choice(CATEGORIES)
        price = round(random.uniform(5.0, 500.0), 2)
        stock = random.randint(5, 1000)
        products_data.append((name, category, price, stock))
        
    cursor.executemany(
        "INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)",
        products_data
    )
    print(f"Inserted {NUM_PRODUCTS} products.")
    
    # 3. Populate Orders
    orders_data = []
    start_ts = time.time() - 365 * 24 * 3600  # 1 year ago
    for i in range(NUM_ORDERS):
        user_id = random.randint(1, NUM_USERS)
        # Random date over the past year
        order_date_sec = start_ts + random.uniform(0, 365 * 24 * 3600)
        order_date = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(order_date_sec))
        status = random.choice(STATUSES)
        orders_data.append((user_id, order_date, status, 0.0))
        
    cursor.executemany(
        "INSERT INTO orders (user_id, order_date, status, total_amount) VALUES (?, ?, ?, ?)",
        orders_data
    )
    print(f"Inserted {NUM_ORDERS} orders.")
    
    # Fetch product prices for order items
    cursor.execute("SELECT id, price FROM products")
    product_prices = {row[0]: row[1] for row in cursor.fetchall()}
    
    # 4. Populate Order Items
    order_items_data = []
    order_totals = {i: 0.0 for i in range(1, NUM_ORDERS + 1)}
    
    for _ in range(NUM_ORDER_ITEMS):
        order_id = random.randint(1, NUM_ORDERS)
        product_id = random.randint(1, NUM_PRODUCTS)
        qty = random.randint(1, 5)
        price = product_prices[product_id]
        
        order_items_data.append((order_id, product_id, qty, price))
        order_totals[order_id] += qty * price
        
    cursor.executemany(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        order_items_data
    )
    print(f"Inserted {NUM_ORDER_ITEMS} order items.")
    
    # Update orders total amounts
    print("Updating order total amounts...")
    update_data = [(total, order_id) for order_id, total in order_totals.items()]
    cursor.executemany(
        "UPDATE orders SET total_amount = ? WHERE id = ?",
        update_data
    )
    conn.commit()
    print("Database population complete.")

def generate_query_variations():
    """Generates a list of 500+ varied SQL queries to run and capture features/latencies."""
    queries = []
    
    # We will generate ~60 queries per template to hit 600 queries total.
    # We choose random parameters for each query to create variance.
    
    # Template 1: Table scan on users with filter on age (unindexed)
    for _ in range(60):
        age = random.randint(18, 75)
        queries.append(f"SELECT * FROM users WHERE age = {age};")
        
    # Template 2: Sort and filter on products price (unindexed)
    for _ in range(60):
        price = round(random.uniform(10, 400), 2)
        limit = random.choice([10, 20, 50, 100])
        queries.append(f"SELECT * FROM products WHERE price > {price} ORDER BY price ASC LIMIT {limit};")
        
    # Template 3: Table scan on orders with filter on status (unindexed)
    for _ in range(60):
        status = random.choice(STATUSES)
        queries.append(f"SELECT * FROM orders WHERE status = '{status}';")
        
    # Template 4: Table scan on order_items (unindexed price)
    for _ in range(60):
        price = round(random.uniform(5, 300), 2)
        queries.append(f"SELECT * FROM order_items WHERE price > {price};")
        
    # Template 5: Table scan and sort on order_items (large table)
    for _ in range(60):
        qty = random.randint(1, 5)
        limit = random.choice([5, 10, 50, 100])
        queries.append(f"SELECT * FROM order_items WHERE quantity = {qty} ORDER BY price DESC LIMIT {limit};")
        
    # Template 6: Join users and orders, uses index on orders.user_id, filtered on country (unindexed)
    for _ in range(60):
        country = random.choice(COUNTRIES)
        queries.append(f"SELECT u.name, o.order_date, o.total_amount FROM users u JOIN orders o ON u.id = o.user_id WHERE u.country = '{country}';")
        
    # Template 7: Join products and order_items, grouped by name (indexed product_id)
    for _ in range(60):
        category = random.choice(CATEGORIES)
        queries.append(f"SELECT p.name, sum(oi.quantity) as total_qty FROM products p JOIN order_items oi ON p.id = oi.product_id WHERE p.category = '{category}' GROUP BY p.name;")
        
    # Template 8: Join and aggregation (users + orders)
    for _ in range(60):
        queries.append("SELECT u.country, count(o.id) as num_orders, sum(o.total_amount) as total_spend FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.country ORDER BY total_spend DESC;")
        
    # Template 9: Join on order_items and products, filtered on price range
    for _ in range(60):
        price_low = round(random.uniform(5, 100), 2)
        price_high = price_low + round(random.uniform(50, 150), 2)
        queries.append(f"SELECT oi.id, p.name, oi.price, oi.quantity FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.price BETWEEN {price_low} AND {price_high};")
        
    # Template 10: Heavy 4-way join with filter, order, and limit
    for _ in range(60):
        age = random.randint(20, 60)
        category = random.choice(CATEGORIES)
        limit = random.choice([10, 20, 50])
        queries.append(f"""SELECT u.name, p.name, oi.quantity, o.order_date 
FROM users u 
JOIN orders o ON u.id = o.user_id 
JOIN order_items oi ON o.id = oi.order_id 
JOIN products p ON oi.product_id = p.id 
WHERE u.age > {age} AND p.category = '{category}' 
ORDER BY o.order_date DESC 
LIMIT {limit};""")

    # Shuffle queries to interleave different styles
    random.shuffle(queries)
    return queries

def run_profiling(conn, queries):
    """
    Executes each query, measures actual latency in milliseconds,
    extracts ML features, and saves them to a list of dicts.
    """
    print(f"Starting profiling of {len(queries)} queries...")
    results = []
    
    # Warm up database to fill caches slightly (mimic production cache)
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM order_items JOIN orders ON order_items.order_id = orders.id")
    cursor.fetchall()
    
    # Clear cache before starting so table sizes can load properly
    clear_table_size_cache()
    
    for idx, sql in enumerate(queries):
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1}/{len(queries)} queries...")
            
        try:
            # 1. Extract features using our feature_extractor
            features = extract_features(sql, conn)
            
            # 2. Measure actual latency (perform multiple runs if needed for stability, 
            # but a single precise time.perf_counter measure is standard. We will run it once 
            # to keep it fast, but we ensure we fetch all results to represent true scan time.)
            t_start = time.perf_counter()
            cursor.execute(sql)
            rows = cursor.fetchall()
            t_end = time.perf_counter()
            
            latency_ms = (t_end - t_start) * 1000.0
            
            # Save metrics
            row_data = {
                "query": sql,
                "num_tables": features["num_tables"],
                "num_conditions": features["num_conditions"],
                "has_join": features["has_join"],
                "has_group_by": features["has_group_by"],
                "has_order_by": features["has_order_by"],
                "has_limit": features["has_limit"],
                "scan_cost_estimate": features["scan_cost_estimate"],
                "actual_latency_ms": latency_ms
            }
            results.append(row_data)
            
        except Exception as e:
            # Skip queries that fail (shouldn't happen with our generated templates)
            print(f"Query failed: {sql}. Error: {e}")
            
    return results

def save_to_csv(data, filename):
    """Saves the profiling data to a CSV file."""
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    keys = ["num_tables", "num_conditions", "has_join", "has_group_by", "has_order_by", "has_limit", "scan_cost_estimate", "actual_latency_ms"]
    
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(data)
        
    print(f"Data saved to {filepath} (Total: {len(data)} rows).")

def main():
    # Setup database logging schema first
    init_db()
    
    conn = get_db_connection()
    
    try:
        # Create and populate sample database
        create_sample_tables(conn)
        populate_database(conn)
        
        # Generate queries
        queries = generate_query_variations()
        
        # Run profiling
        profile_data = run_profiling(conn, queries)
        
        # Save results to training_data.csv
        save_to_csv(profile_data, "training_data.csv")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()

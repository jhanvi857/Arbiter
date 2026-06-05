import os
import random
import time
import csv
import sqlite3
import shutil
from database import init_db
from feature_extractor import extract_features, clear_table_size_cache

# Base scaling parameters
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
    """Creates sample tables with appropriate indexes for simulation."""
    cursor = conn.cursor()
    
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
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        price REAL,
        stock INTEGER
    );
    """)
    
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
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);")

def populate_database(conn, scale_factor=1.0):
    """Populates the database with realistic synthetic data scaled by scale_factor."""
    cursor = conn.cursor()
    
    # Calculate scaled bounds
    num_users = int(NUM_USERS * scale_factor)
    num_products = int(NUM_PRODUCTS * scale_factor)
    num_orders = int(NUM_ORDERS * scale_factor)
    num_order_items = int(NUM_ORDER_ITEMS * scale_factor)
    
    print(f"Populating scale {scale_factor} (Users: {num_users}, Products: {num_products}, Orders: {num_orders}, Order Items: {num_order_items})...")
    
    # Enable synchronous transactions for massive speedup
    cursor.execute("PRAGMA synchronous = OFF;")
    cursor.execute("PRAGMA journal_mode = MEMORY;")
    
    # 1. Populate Users
    users_data = []
    for i in range(num_users):
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
    
    # 2. Populate Products
    products_data = []
    for i in range(num_products):
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
    
    # 3. Populate Orders
    orders_data = []
    start_ts = time.time() - 365 * 24 * 3600
    for i in range(num_orders):
        user_id = random.randint(1, num_users)
        order_date_sec = start_ts + random.uniform(0, 365 * 24 * 3600)
        order_date = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(order_date_sec))
        status = random.choice(STATUSES)
        orders_data.append((user_id, order_date, status, 0.0))
        
    cursor.executemany(
        "INSERT INTO orders (user_id, order_date, status, total_amount) VALUES (?, ?, ?, ?)",
        orders_data
    )
    
    # Fetch product prices
    cursor.execute("SELECT id, price FROM products")
    product_prices = {row[0]: row[1] for row in cursor.fetchall()}
    
    # 4. Populate Order Items
    order_items_data = []
    order_totals = {i: 0.0 for i in range(1, num_orders + 1)}
    
    for _ in range(num_order_items):
        order_id = random.randint(1, num_orders)
        product_id = random.randint(1, num_products)
        qty = random.randint(1, 5)
        price = product_prices.get(product_id, 19.99)
        
        order_items_data.append((order_id, product_id, qty, price))
        order_totals[order_id] += qty * price
        
    cursor.executemany(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        order_items_data
    )
    
    # Update orders total amounts
    update_data = [(total, order_id) for order_id, total in order_totals.items()]
    cursor.executemany(
        "UPDATE orders SET total_amount = ? WHERE id = ?",
        update_data
    )
    conn.commit()

def generate_query_variations():
    """
    Generates a list of (SQL, template_id) queries with randomized parameters.
    Returns 40 query templates.
    """
    queries = []
    
    # Helper lists
    price_val = lambda: round(random.uniform(10.0, 400.0), 2)
    age_val = lambda: random.randint(18, 75)
    country_val = lambda: random.choice(COUNTRIES)
    category_val = lambda: random.choice(CATEGORIES)
    status_val = lambda: random.choice(STATUSES)
    limit_val = lambda: random.choice([5, 10, 20, 50, 100])
    qty_val = lambda: random.randint(1, 5)
    stock_val = lambda: random.randint(50, 800)
    
    # Template 1: Table scan with filter on age (unindexed)
    queries.append((f"SELECT * FROM users WHERE age = {age_val()};", 1))
    
    # Template 2: Sort and filter on products price (unindexed)
    queries.append((f"SELECT * FROM products WHERE price > {price_val()} ORDER BY price ASC LIMIT {limit_val()};", 2))
    
    # Template 3: Filter on country
    queries.append((f"SELECT * FROM users WHERE country = '{country_val()}';", 3))
    
    # Template 4: Filter on status
    queries.append((f"SELECT * FROM orders WHERE status = '{status_val()}';", 4))
    
    # Template 5: Large table scan and sort
    queries.append((f"SELECT * FROM order_items WHERE quantity = {qty_val()} ORDER BY price DESC LIMIT {limit_val()};", 5))
    
    # Template 6: Inner join with country filter
    queries.append((f"SELECT u.name, o.order_date, o.total_amount FROM users u JOIN orders o ON u.id = o.user_id WHERE u.country = '{country_val()}';", 6))
    
    # Template 7: LEFT JOIN products and order items
    queries.append((f"SELECT p.name, oi.quantity FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id WHERE p.category = '{category_val()}';", 7))
    
    # Template 8: Group by and aggregation spending
    queries.append(("SELECT u.country, count(o.id) as num_orders, sum(o.total_amount) as total_spend FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.country ORDER BY total_spend DESC;", 8))
    
    # Template 9: Join on range price
    price_low = round(random.uniform(5.0, 100.0), 2)
    price_high = price_low + round(random.uniform(50.0, 150.0), 2)
    queries.append((f"SELECT oi.id, p.name, oi.price, oi.quantity FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.price BETWEEN {price_low} AND {price_high};", 9))
    
    # Template 10: Heavy 4-way join
    queries.append((f"SELECT u.name, p.name, oi.quantity, o.order_date FROM users u JOIN orders o ON u.id = o.user_id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE u.age > {age_val()} AND p.category = '{category_val()}' ORDER BY o.order_date DESC LIMIT {limit_val()};", 10))
    
    # Template 11: EXISTS subquery
    queries.append((f"SELECT u.name, u.email FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.status = '{status_val()}');", 11))
    
    # Template 12: NOT EXISTS subquery
    queries.append(("SELECT u.name, u.email FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);", 12))
    
    # Template 13: IN clause
    cat1, cat2 = random.sample(CATEGORIES, 2)
    queries.append((f"SELECT p.name, p.price FROM products p WHERE p.category IN ('{cat1}', '{cat2}') AND p.price > {price_val()};", 13))
    
    # Template 14: NOT IN subquery
    queries.append((f"SELECT o.id, o.total_amount FROM orders o WHERE o.user_id NOT IN (SELECT u.id FROM users u WHERE u.country = '{country_val()}');", 14))
    
    # Template 15: HAVING average price
    queries.append((f"SELECT category, AVG(price) as avg_price FROM products GROUP BY category HAVING AVG(price) > {price_val()};", 15))
    
    # Template 16: HAVING spend threshold with Join
    queries.append((f"SELECT u.name, SUM(o.total_amount) as total_spent FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.name HAVING SUM(o.total_amount) > {price_val() * 10};", 16))
    
    # Template 17: UNION
    country1, country2 = random.sample(COUNTRIES, 2)
    queries.append((f"SELECT name, country, age FROM users WHERE country = '{country1}' UNION SELECT name, country, age FROM users WHERE country = '{country2}';", 17))
    
    # Template 18: UNION ALL
    queries.append((f"SELECT name, 'High Stock' as stock_level FROM products WHERE stock > {stock_val()} UNION ALL SELECT name, 'Low Stock' as stock_level FROM products WHERE stock <= {stock_val()};", 18))
    
    # Template 19: DISTINCT columns
    queries.append((f"SELECT DISTINCT country FROM users WHERE age > {age_val()};", 19))
    
    # Template 20: DISTINCT with aggregate
    queries.append(("SELECT category, COUNT(DISTINCT name) as dist_names FROM products GROUP BY category;", 20))
    
    # Template 21: CTE simple
    queries.append((f"WITH high_val_orders AS (SELECT id, user_id, total_amount FROM orders WHERE total_amount > {price_val() * 3}) SELECT u.name, hvo.total_amount FROM users u JOIN high_val_orders hvo ON u.id = hvo.user_id;", 21))
    
    # Template 22: CTE aggregation
    queries.append((f"WITH user_spend AS (SELECT user_id, SUM(total_amount) as total_spend FROM orders GROUP BY user_id) SELECT u.name, us.total_spend FROM users u JOIN user_spend us ON u.id = us.user_id WHERE us.total_spend > {price_val() * 5};", 22))
    
    # Template 23: Subquery in SELECT
    queries.append((f"SELECT u.name, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count FROM users u WHERE u.country = '{country_val()}';", 23))
    
    # Template 24: Subquery in FROM
    queries.append(("SELECT avg(order_count) as avg_orders FROM (SELECT user_id, count(*) as order_count FROM orders GROUP BY user_id);", 24))
    
    # Template 25: Correlated subquery average price
    queries.append(("SELECT oi.id, oi.price FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.price > (SELECT AVG(p2.price) FROM products p2 WHERE p2.category = p.category);", 25))
    
    # Template 26: Correlated subquery NOT EXISTS
    queries.append((f"SELECT u.name FROM users u WHERE {age_val()} < u.age AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.status = 'pending');", 26))
    
    # Template 27: LEFT JOIN multiple conditions
    queries.append((f"SELECT u.name, o.total_amount FROM users u LEFT JOIN orders o ON u.id = o.user_id AND o.status = '{status_val()}' WHERE u.age > {age_val()};", 27))
    
    # Template 28: Multiple CTEs
    queries.append((f"WITH user_order_count AS (SELECT user_id, COUNT(*) as cnt FROM orders GROUP BY user_id), active_users AS (SELECT id, name FROM users WHERE country = '{country_val()}') SELECT au.name, uoc.cnt FROM active_users au JOIN user_order_count uoc ON au.id = uoc.user_id;", 28))
    
    # Template 29: Nested subquery IN with JOIN
    queries.append((f"SELECT p.name, p.price FROM products p WHERE p.id IN (SELECT oi.product_id FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.status = '{status_val()}');", 29))
    
    # Template 30: Complex OR filter logic
    cat1, cat2 = random.sample(CATEGORIES, 2)
    p1, p2 = price_val(), price_val()
    queries.append((f"SELECT * FROM products WHERE (category = '{cat1}' AND price < {p1}) OR (category = '{cat2}' AND price > {p2});", 30))
    
    # Template 31: Complex date filter with order & limit
    start_ts = time.time() - 180 * 24 * 3600
    date_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_ts))
    queries.append((f"SELECT * FROM orders WHERE order_date >= '{date_str}' AND status = '{status_val()}' ORDER BY order_date DESC LIMIT {limit_val()};", 31))
    
    # Template 32: CASE WHEN conditional aggregation
    queries.append((f"SELECT country, SUM(CASE WHEN age > {age_val()} THEN 1 ELSE 0 END) as senior_count, COUNT(*) as total_count FROM users GROUP BY country;", 32))
    
    # Template 33: Self-join
    queries.append((f"SELECT u1.name as name1, u2.name as name2, u1.country FROM users u1 JOIN users u2 ON u1.country = u2.country AND u1.id < u2.id WHERE u1.age = {age_val()} LIMIT {limit_val()};", 33))
    
    # Template 34: CTE on stats
    queries.append((f"WITH cat_stats AS (SELECT category, AVG(price) as avg_p, MAX(price) as max_p FROM products GROUP BY category) SELECT p.name, p.price, cs.avg_p FROM products p JOIN cat_stats cs ON p.category = cs.category WHERE p.price > cs.avg_p AND cs.max_p > {price_val()};", 34))
    
    # Template 35: Subquery in HAVING
    queries.append((f"SELECT category, AVG(price) as avg_price FROM products GROUP BY category HAVING AVG(price) > (SELECT AVG(price) FROM products WHERE category = '{category_val()}');", 35))
    
    # Template 36: Complex inner joins
    queries.append((f"SELECT o.id, u.name, p.name FROM orders o JOIN users u ON o.user_id = u.id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE u.country = '{country_val()}' AND o.status = '{status_val()}';", 36))
    
    # Template 37: Multi-sort limit
    queries.append((f"SELECT * FROM order_items WHERE price < {price_val()} ORDER BY quantity DESC, price ASC LIMIT {limit_val()};", 37))
    
    # Template 38: CTE top spenders
    queries.append(("WITH top_spenders AS (SELECT user_id, SUM(total_amount) as total_amt FROM orders GROUP BY user_id ORDER BY total_amt DESC LIMIT 10) SELECT u.name, ts.total_amt FROM users u JOIN top_spenders ts ON u.id = ts.user_id;", 38))
    
    # Template 39: Nested subquery distinct count
    queries.append((f"SELECT p.name, (SELECT COUNT(DISTINCT order_id) FROM order_items WHERE product_id = p.id) as distinct_orders FROM products p WHERE p.price > {price_val()};", 39))
    
    # Template 40: Mixed OR join
    queries.append((f"SELECT u.name, o.id FROM users u JOIN orders o ON u.id = o.user_id WHERE u.country = '{country_val()}' OR o.total_amount > {price_val() * 5};", 40))
    
    return queries

def run_profiling(conn, db_label):
    """Profiles variations of the 40 templates on the current database connection."""
    print(f"Profiling queries on database: {db_label}...")
    results = []
    
    # Warm up
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT count(*) FROM order_items JOIN orders ON order_items.order_id = orders.id")
        cursor.fetchall()
    except Exception:
        pass
        
    clear_table_size_cache()
    
    # We will generate 5 variations of each of the 40 templates
    for variation in range(5):
        queries = generate_query_variations() # Randomizes values each time
        for sql, template_id in queries:
            try:
                features = extract_features(sql, conn)
                
                # Measure latency
                t_start = time.perf_counter()
                cursor.execute(sql)
                cursor.fetchall()
                t_end = time.perf_counter()
                
                latency_ms = (t_end - t_start) * 1000.0
                
                row_data = {
                    "template_id": template_id,
                    "num_tables": features["num_tables"],
                    "num_conditions": features["num_conditions"],
                    "has_join": features["has_join"],
                    "join_count": features["join_count"],
                    "has_group_by": features["has_group_by"],
                    "has_order_by": features["has_order_by"],
                    "has_limit": features["has_limit"],
                    "limit_val": features["limit_val"],
                    "scan_cost_estimate": features["scan_cost_estimate"],
                    "table_sizes": features["table_sizes"],
                    "index_usage_count": features["index_usage_count"],
                    "aggregation_count": features["aggregation_count"],
                    "sort_columns_count": features["sort_columns_count"],
                    "nested_subquery_count": features["nested_subquery_count"],
                    "actual_latency_ms": latency_ms
                }
                results.append(row_data)
            except Exception as e:
                print(f"Failed query [{template_id}]: {sql}. Error: {e}")
                
    return results

def save_to_csv(data, filename):
    """Saves profiling results to a CSV file."""
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    keys = [
        "template_id",
        "num_tables",
        "num_conditions",
        "has_join",
        "join_count",
        "has_group_by",
        "has_order_by",
        "has_limit",
        "limit_val",
        "scan_cost_estimate",
        "table_sizes",
        "index_usage_count",
        "aggregation_count",
        "sort_columns_count",
        "nested_subquery_count",
        "actual_latency_ms"
    ]
    
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(data)
        
    print(f"Data saved to {filepath} (Total: {len(data)} rows).")

def main():
    init_db()
    
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    db_configs = [
        ("small", 0.2, os.path.join(backend_dir, "scale_s.db")),
        ("medium", 1.0, os.path.join(backend_dir, "scale_m.db")),
        ("large", 2.5, os.path.join(backend_dir, "scale_l.db"))
    ]
    
    all_profile_data = []
    
    for label, factor, path in db_configs:
        if os.path.exists(path):
            os.remove(path)
            
        print(f"\nCreating database: {path} (scale factor={factor})")
        conn = sqlite3.connect(path)
        conn.row_factory = sqlite3.Row
        try:
            create_sample_tables(conn)
            populate_database(conn, factor)
            
            profile_data = run_profiling(conn, label)
            all_profile_data.extend(profile_data)
        finally:
            conn.close()
            
    # Save the consolidated training data
    save_to_csv(all_profile_data, "training_data.csv")
    
    # Deploy the Medium DB as optimizer.db for application usage
    medium_db_path = db_configs[1][2]
    target_optimizer_path = os.path.join(backend_dir, "optimizer.db")
    
    if os.path.exists(target_optimizer_path):
        os.remove(target_optimizer_path)
    shutil.copy2(medium_db_path, target_optimizer_path)
    print(f"\nCopied Medium DB {medium_db_path} to {target_optimizer_path}")
    
    # Clean up scale_s and scale_l databases
    for label, factor, path in db_configs:
        if label in ["small", "large"] and os.path.exists(path):
            os.remove(path)
            print(f"Cleaned up temporary database: {path}")

if __name__ == "__main__":
    main()

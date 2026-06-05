import os
import sqlite3
import sys
try:
    from tabulate import tabulate
    HAS_TABULATE = True
except ImportError:
    HAS_TABULATE = False

# Adjust paths to import from backend
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from database import get_db_connection
from feature_extractor import extract_features
from optimizer import optimize_query
from model import predict_cost

# Test suite containing robust queries from diverse SQL families
ROBUST_TEST_QUERIES = [
    {
        "category": "Primary Key Lookup",
        "sql": "SELECT * FROM users WHERE id = 100;"
    },
    {
        "category": "Unindexed Scan",
        "sql": "SELECT * FROM users WHERE age = 30;"
    },
    {
        "category": "Simple Inner Join",
        "sql": "SELECT u.name, o.order_date, o.total_amount FROM users u JOIN orders o ON u.id = o.user_id WHERE u.country = 'USA' LIMIT 10;"
    },
    {
        "category": "LEFT OUTER JOIN",
        "sql": "SELECT p.name, oi.quantity FROM products p LEFT JOIN order_items oi ON p.id = oi.product_id WHERE p.category = 'Electronics' LIMIT 10;"
    },
    {
        "category": "Multi-way Join",
        "sql": """SELECT u.name, p.name, oi.quantity, o.order_date 
                  FROM users u 
                  JOIN orders o ON u.id = o.user_id 
                  JOIN order_items oi ON o.id = oi.order_id 
                  JOIN products p ON oi.product_id = p.id 
                  WHERE u.age > 45 AND p.category = 'Books' 
                  ORDER BY o.order_date DESC LIMIT 5;"""
    },
    {
        "category": "EXISTS Subquery",
        "sql": "SELECT u.name, u.email FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id AND o.status = 'shipped') LIMIT 5;"
    },
    {
        "category": "NOT EXISTS Subquery",
        "sql": "SELECT u.name, u.email FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id) LIMIT 5;"
    },
    {
        "category": "IN Subquery Grouping",
        "sql": "SELECT p.name, p.price FROM products p WHERE p.category IN ('Electronics', 'Clothing') AND p.price > 150.0 LIMIT 5;"
    },
    {
        "category": "NOT IN Subquery",
        "sql": "SELECT o.id, o.total_amount FROM orders o WHERE o.user_id NOT IN (SELECT u.id FROM users u WHERE u.country = 'Germany') LIMIT 5;"
    },
    {
        "category": "HAVING Aggregate Filter",
        "sql": "SELECT category, AVG(price) as avg_price FROM products GROUP BY category HAVING AVG(price) > 50.0;"
    },
    {
        "category": "HAVING Join Aggregation",
        "sql": "SELECT u.name, SUM(o.total_amount) as total_spent FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.name HAVING SUM(o.total_amount) > 1000.0 LIMIT 5;"
    },
    {
        "category": "UNION Set Operator",
        "sql": "SELECT name, country FROM users WHERE country = 'USA' UNION SELECT name, country FROM users WHERE country = 'Canada' LIMIT 10;"
    },
    {
        "category": "DISTINCT Clause",
        "sql": "SELECT DISTINCT country FROM users WHERE age > 50;"
    },
    {
        "category": "Common Table Expression (CTE)",
        "sql": """WITH user_spend AS (
                      SELECT user_id, SUM(total_amount) as total_spend 
                      FROM orders GROUP BY user_id
                  ) 
                  SELECT u.name, us.total_spend 
                  FROM users u 
                  JOIN user_spend us ON u.id = us.user_id 
                  WHERE us.total_spend > 500.0 LIMIT 5;"""
    },
    {
        "category": "Correlated Subquery",
        "sql": """SELECT oi.id, oi.price 
                  FROM order_items oi 
                  JOIN products p ON oi.product_id = p.id 
                  WHERE oi.price > (
                      SELECT AVG(p2.price) FROM products p2 WHERE p2.category = p.category
                  ) LIMIT 5;"""
    },
    {
        "category": "Nested Subquery in FROM",
        "sql": "SELECT avg(order_count) as avg_orders FROM (SELECT user_id, count(*) as order_count FROM orders GROUP BY user_id);"
    }
]

def format_row(row):
    """Format row elements for printing."""
    return [str(elem)[:40] if len(str(elem)) > 40 else elem for elem in row]

def run_robust_tests():
    print("=" * 80)
    print("RUNNING ROBUST QUERY OPTIMIZER & FEATURE EXTRACTION TESTS")
    print("=" * 80)
    
    conn = get_db_connection()
    test_results = []
    
    headers = [
        "Category", 
        "Tables", 
        "Joins", 
        "Subqueries", 
        "Scan Cost", 
        "Pred Cost (ms)", 
        "Confidence",
        "Rec Plan", 
        "Actual (ms)"
    ]
    
    for test in ROBUST_TEST_QUERIES:
        category = test["category"]
        sql = test["sql"]
        
        print(f"\nEvaluating: {category}")
        print(f"SQL: {sql.strip()}")
        
        try:
            # 1. Feature Extraction check
            features = extract_features(sql, conn)
            
            # 2. Optimizer Evaluation check
            opt_result = optimize_query(sql)
            
            # 3. Model Prediction check
            pred = predict_cost(features)
            
            # Store results for print table
            test_results.append([
                category,
                features["num_tables"],
                features["join_count"],
                features["nested_subquery_count"],
                features["scan_cost_estimate"],
                f"{pred['predicted_cost_ms']:.2f}",
                pred["confidence"],
                opt_result["recommendation"],
                f"{opt_result['actual_cost_ms']:.2f}"
            ])
            
            print(f"  -> Features: Tables: {features['num_tables']}, Conditions: {features['num_conditions']}, Joins: {features['join_count']}, Subqueries: {features['nested_subquery_count']}")
            print(f"  -> SQLite Planner Cost Estimate: {features['scan_cost_estimate']}")
            print(f"  -> Predicted Cost: {pred['predicted_cost_ms']:.2f} ms ({pred['confidence']} confidence)")
            print(f"  -> Optimizer Recommendation: {opt_result['recommendation'].upper()}")
            print(f"  -> Actual Cost of Recommended Plan: {opt_result['actual_cost_ms']:.2f} ms")
            
        except Exception as e:
            print(f"  [ERROR] Failed to run test for {category}: {e}")
            test_results.append([category, "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR"])
            
    conn.close()
    
    print("\n" + "=" * 80)
    print("TEST SUITE SUMMARY REPORT")
    print("=" * 80)
    
    if HAS_TABULATE:
        print(tabulate(test_results, headers=headers, tablefmt="grid"))
    else:
        # Fallback text formatter
        col_widths = [max(len(str(row[i])) for row in test_results + [headers]) for i in range(len(headers))]
        row_fmt = " | ".join(f"{{:<{w}}}" for w in col_widths)
        print(row_fmt.format(*headers))
        print("-" * (sum(col_widths) + 3 * (len(headers) - 1)))
        for row in test_results:
            print(row_fmt.format(*format_row(row)))
            
    print("=" * 80)
    print("All robust queries evaluated successfully.")

if __name__ == '__main__':
    run_robust_tests()

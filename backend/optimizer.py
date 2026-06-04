import re
import time
from database import get_db_connection
from feature_extractor import extract_features
from model import predict_cost

def clean_sql_query(sql: str) -> str:
    """Removes trailing semicolon and whitespace from SQL query."""
    sql = sql.strip()
    if sql.endswith(';'):
        sql = sql[:-1]
    return sql

def check_aggregate_and_groupby(sql: str) -> bool:
    """
    Checks if the SQL query contains a GROUP BY clause or aggregate functions
    (COUNT, SUM, AVG, MIN, MAX).
    """
    normalized = sql.upper()
    
    # Check for GROUP BY
    if re.search(r'\bGROUP\s+BY\b', normalized):
        return True
        
    # Check for aggregate functions
    aggregates = [r'\bCOUNT\s*\(', r'\bSUM\s*\(', r'\bAVG\s*\(', r'\bMIN\s*\(', r'\bMAX\s*\(']
    for agg in aggregates:
        if re.search(agg, normalized):
            return True
            
    return False

def get_scanned_tables(conn, sql: str) -> list:
    """
    Runs EXPLAIN QUERY PLAN and returns a list of tables being scanned
    (i.e., table scan without utilizing an index).
    """
    scanned_tables = []
    try:
        cursor = conn.cursor()
        cursor.execute(f"EXPLAIN QUERY PLAN {sql}")
        plan_rows = cursor.fetchall()
        for row in plan_rows:
            detail = row['detail']
            # Match SCAN table_name
            match = re.search(r'\bSCAN\s+([a-zA-Z0-9_]+)\b', detail)
            if match:
                scanned_tables.append(match.group(1))
    except Exception:
        pass
    return list(set(scanned_tables))

def resolve_alias_to_table(sql: str, alias: str) -> str:
    """
    Resolves a table alias (e.g., 'oi') to its actual database table name (e.g., 'order_items')
    by parsing FROM and JOIN clauses in the SQL text.
    """
    normalized = re.sub(r'\s+', ' ', sql.lower())
    patterns = [
        rf'\bfrom\s+([a-zA-Z0-9_]+)\s+as\s+{alias.lower()}\b',
        rf'\bfrom\s+([a-zA-Z0-9_]+)\s+{alias.lower()}\b',
        rf'\bjoin\s+([a-zA-Z0-9_]+)\s+as\s+{alias.lower()}\b',
        rf'\bjoin\s+([a-zA-Z0-9_]+)\s+{alias.lower()}\b'
    ]
    for pat in patterns:
        match = re.search(pat, normalized)
        if match:
            return match.group(1)
    return alias

def find_index_candidate(conn, sql: str, scanned_tables: list) -> tuple:
    """
    Scans query conditions for columns in scanned tables (handling aliases).
    Runs a test CREATE INDEX in a transaction, explains the query, and verifies
    if SQLite changes its plan to SEARCH using the index.
    Returns (table_name, column_name, index_ddl) or (None, None, None).
    """
    normalized = sql.upper()
    
    for table_alias in scanned_tables:
        # Resolve the alias to the actual table name (e.g. 'oi' -> 'order_items')
        table_name = resolve_alias_to_table(sql, table_alias)
        
        # Get list of columns in the table
        try:
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info([{table_name}])")
            cols = [row['name'] for row in cursor.fetchall()]
        except Exception:
            continue
            
        for col in cols:
            # We want to check if the column is filtered or joined in the query.
            # Handles both qualified names (alias.col) and simple column names (col)
            pattern = rf'\b(?:{table_alias}\.)?{col}\b'
            
            # Simple check if the column is mentioned in query conditions
            if re.search(pattern, sql, re.IGNORECASE) and col.lower() != 'id':
                # Candidate index name
                idx_name = f"idx_suggested_{table_name}_{col}"
                ddl = f"CREATE INDEX {idx_name} ON [{table_name}]([{col}])"
                
                # Test creating the index inside a transaction
                try:
                    conn.execute("BEGIN")
                    conn.execute(ddl)
                    
                    # Run explain plan to see if SCAN changes to SEARCH with the new index
                    cursor.execute(f"EXPLAIN QUERY PLAN {sql}")
                    new_plan_rows = cursor.fetchall()
                    
                    index_used = False
                    for row in new_plan_rows:
                        detail = row['detail']
                        # Check if SEARCH table USING INDEX idx_name is now active
                        # SQLite might show SEARCH table_alias or SEARCH table_name in explain plan
                        if (f"SEARCH {table_alias}" in detail or f"SEARCH {table_name}" in detail) and "USING INDEX" in detail:
                            index_used = True
                            break
                            
                    # Rollback the index creation immediately
                    conn.execute("ROLLBACK")
                    
                    if index_used:
                        # Found a working index candidate!
                        return table_name, col, ddl
                        
                except Exception as e:
                    try:
                        conn.execute("ROLLBACK")
                    except Exception:
                        pass
                    
    return None, None, None

def optimize_query(original_sql: str) -> dict:
    """
    Core optimizer logic:
    - Profiles Plan A (original).
    - Checks for Index Suggestions or Limit Suggestions to construct Plan B.
    - Evaluates the predicted latency of both plans using the ML cost estimator.
    - Executes the recommended plan and logs actual performance.
    """
    clean_sql = clean_sql_query(original_sql)
    conn = get_db_connection()
    
    # Set transaction isolation mode to autocommit to manage explicit BEGIN/ROLLBACK
    conn.isolation_level = None
    
    plan_b_suggested = False
    plan_b_sql = clean_sql
    optimization_type = None
    suggestion_msg = "Your query is already well-optimized."
    index_ddl = None
    
    try:
        # --- PLAN A (Original Plan) ---
        features_a = extract_features(clean_sql, conn)
        pred_a = predict_cost(features_a)
        
        # --- PLAN B (Optimized Plan Search) ---
        # Pre-run candidate index lookup
        scanned_tables = get_scanned_tables(conn, clean_sql)
        tbl_candidate, col_candidate, suggested_ddl = find_index_candidate(conn, clean_sql, scanned_tables)
        
        # 1. Check for IN subquery that can be rewritten to JOIN
        subquery_match = re.search(
            r'\bSELECT\s+(.*?)\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+([a-zA-Z0-9_]+)\s+IN\s*\(\s*SELECT\s+([a-zA-Z0-9_]+)\s+FROM\s+([a-zA-Z0-9_]+)\s*\)',
            clean_sql,
            re.IGNORECASE
        )
        if subquery_match:
            cols = subquery_match.group(1).strip()
            t1 = subquery_match.group(2).strip()
            c1 = subquery_match.group(3).strip()
            c2 = subquery_match.group(4).strip()
            t2 = subquery_match.group(5).strip()
            
            # Resolve columns prefix for the join query
            if cols == '*':
                rewrite_cols = f"{t1}.*"
            else:
                rewrite_cols = ", ".join([f"{t1}.{col.strip()}" for col in cols.split(",")])
                
            plan_b_sql = f"SELECT DISTINCT {rewrite_cols} FROM {t1} JOIN {t2} ON {t1}.{c1} = {t2}.{c2}"
            plan_b_suggested = True
            optimization_type = "subquery_to_join"
            suggestion_msg = f"Suggest rewriting the slow '{c1} IN (SELECT {c2}...)' subquery into an explicit 'INNER JOIN' to allow the query optimizer to perform merge joins."
            
            features_b = extract_features(plan_b_sql, conn)
            pred_b = predict_cost(features_b)
            
        # 2. Check for table scans that could benefit from an index
        elif tbl_candidate and col_candidate:
            # We found a working index suggestion
            plan_b_suggested = True
            optimization_type = "index"
            index_ddl = suggested_ddl
            suggestion_msg = f"Suggest creating a composite index on column '{col_candidate}' of table '{tbl_candidate}' to resolve a slow table scan."
            
            # Extract features of Plan B (by creating the index temporarily in a transaction)
            try:
                conn.execute("BEGIN")
                conn.execute(index_ddl)
                features_b = extract_features(clean_sql, conn)
                conn.execute("ROLLBACK")
            except Exception:
                try:
                    conn.execute("ROLLBACK")
                except Exception:
                    pass
                features_b = features_a.copy()
                
            pred_b = predict_cost(features_b)
            
        # 3. Check for missing limits (only if it has no aggregates/group by)
        elif not re.search(r'\bLIMIT\b', clean_sql, re.IGNORECASE) and not check_aggregate_and_groupby(clean_sql):
            plan_b_suggested = True
            optimization_type = "limit"
            plan_b_sql = f"{clean_sql} LIMIT 100"
            suggestion_msg = "Suggest adding LIMIT 100 to restrict the number of scanned rows and avoid loading excessive data."
            
            features_b = extract_features(plan_b_sql, conn)
            pred_b = predict_cost(features_b)
            
        else:
            # No optimizations found
            features_b = features_a.copy()
            pred_b = pred_a.copy()
            suggestion_msg = "Your query is already well-optimized."
            
        # Prepare Plan B response structure
        plan_a_data = {
            "sql": clean_sql + ";",
            "predicted_cost_ms": round(pred_a["predicted_cost_ms"], 2),
            "confidence": pred_a["confidence"],
            "prediction_std_ms": round(pred_a["prediction_std_ms"], 2)
        }
        
        plan_b_data = {
            "sql": plan_b_sql + ";",
            "predicted_cost_ms": round(pred_b["predicted_cost_ms"], 2) if plan_b_suggested else round(pred_a["predicted_cost_ms"], 2),
            "confidence": pred_b["confidence"] if plan_b_suggested else pred_a["confidence"],
            "prediction_std_ms": round(pred_b["prediction_std_ms"], 2) if plan_b_suggested else round(pred_a["prediction_std_ms"], 2),
            "suggestion": suggestion_msg,
            "optimization_type": optimization_type
        }
        
        # Decide recommendation
        if plan_b_suggested and pred_b["predicted_cost_ms"] < pred_a["predicted_cost_ms"]:
            recommendation = "plan_b"
            rec_sql = plan_b_sql
            rec_predicted_cost = pred_b["predicted_cost_ms"]
        else:
            recommendation = "plan_a"
            rec_sql = clean_sql
            rec_predicted_cost = pred_a["predicted_cost_ms"]
            
        # --- MEASURE ACTUAL EXECUTION COST ---
        # Run the recommended plan to measure actual execution cost
        actual_cost_ms = 0.0
        
        # Start time measurement
        t_start = time.perf_counter()
        
        if recommendation == "plan_b" and optimization_type == "index":
            # Plan B with Index is recommended: we must temporarily create the index in a transaction,
            # execute the query, and rollback the transaction.
            try:
                conn.execute("BEGIN")
                conn.execute(index_ddl)
                
                cursor = conn.cursor()
                cursor.execute(rec_sql)
                cursor.fetchall()
                
                conn.execute("ROLLBACK")
            except Exception as e:
                # If transaction index execution fails, fall back to executing original query as-is
                try:
                    conn.execute("ROLLBACK")
                except Exception:
                    pass
                cursor = conn.cursor()
                cursor.execute(clean_sql)
                cursor.fetchall()
        else:
            # Plan A or Plan B with Limit is recommended
            cursor = conn.cursor()
            cursor.execute(rec_sql)
            cursor.fetchall()
            
        t_end = time.perf_counter()
        actual_cost_ms = (t_end - t_start) * 1000.0
        
        model_error_ms = abs(rec_predicted_cost - actual_cost_ms)
        
        # Log to query_logs SQLite table
        # We log the original query features and Plan A predicted cost vs actual cost
        import json
        try:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO query_logs (query, features, predicted_cost, actual_cost)
            VALUES (?, ?, ?, ?)
            """, (
                clean_sql + ";",
                json.dumps(features_a),
                pred_a["predicted_cost_ms"],
                actual_cost_ms
            ))
        except Exception as e:
            print("Logging query failed:", e)
            
        return {
            "original_query": clean_sql + ";",
            "plan_a": plan_a_data,
            "plan_b": plan_b_data,
            "recommendation": recommendation,
            "actual_cost_ms": round(actual_cost_ms, 2),
            "model_error_ms": round(model_error_ms, 2)
        }
        
    finally:
        conn.close()

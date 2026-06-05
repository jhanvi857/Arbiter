import re
import sqlparse
from database import get_db_connection
from typing import Optional

# Cache for table sizes to avoid querying the database repeatedly
# Keyed by {db_file_path: {table_name: count}}
_table_sizes_cache = {}

def clear_table_size_cache():
    """Clears the cached table sizes."""
    global _table_sizes_cache
    _table_sizes_cache.clear()

def get_table_size(conn, table_name: str) -> int:
    """
    Fetches the size (number of rows) of a table from SQLite.
    Caches results per database path namespace to optimize performance.
    """
    global _table_sizes_cache
    
    # Retrieve connection's database file path to separate caches
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA database_list;")
        db_file = cursor.fetchone()[2]  # SQLite path is in the 3rd column of database_list
    except Exception:
        db_file = 'default'
        
    # Initialize cache for this database file if not present
    if db_file not in _table_sizes_cache:
        _table_sizes_cache[db_file] = {}
        
    # Normalize table name (strip brackets/quotes if any)
    clean_name = table_name.replace('[', '').replace(']', '').replace('"', '').replace('`', '')
    
    if clean_name in _table_sizes_cache[db_file]:
        return _table_sizes_cache[db_file][clean_name]
    
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT count(*) FROM [{clean_name}]")
        row = cursor.fetchone()
        count = row[0] if row else 0
        _table_sizes_cache[db_file][clean_name] = count
        return count
    except Exception:
        # Fallback to a default size if the table does not exist or has errors
        return 1000

def count_conditions(query: str) -> int:
    """
    Counts the number of comparison and logical operations in the query.
    Used as a proxy for filtering complexity (num_conditions).
    """
    # Normalize spaces and uppercase
    normalized = " " + re.sub(r'\s+', ' ', query.upper()) + " "
    
    # Define comparison operators (in order of length to avoid double matching)
    comp_ops = ['>=', '<=', '!=', '<>', '>', '<', '=']
    count = 0
    
    # Temporarily remove and count comparison operators
    temp = normalized
    for op in comp_ops:
        matches = temp.count(op)
        count += matches
        temp = temp.replace(op, ' ')
        
    # Count other conditions with word boundaries to avoid matching keywords inside identifiers
    word_ops = [
        r'\bLIKE\b',
        r'\bIN\b',
        r'\bBETWEEN\b',
        r'\bIS\s+NULL\b',
        r'\bIS\s+NOT\s+NULL\b'
    ]
    for pattern in word_ops:
        matches = len(re.findall(pattern, temp))
        count += matches
        
    return count

def extract_limit_value(query: str) -> Optional[int]:
    """
    Extracts the integer limit value from the query if it exists.
    """
    match = re.search(r'\bLIMIT\s+(\d+)\b', query, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def extract_features(query: str, conn=None) -> dict:
    """
    Parses and extracts 14 advanced machine learning features from a SQL query.
    Requires a connection to SQLite database to run EXPLAIN QUERY PLAN and read table sizes.
    """
    # Create connection if not provided
    close_conn = False
    if conn is None:
        conn = get_db_connection()
        close_conn = True
        
    # Standard text-based query flags
    has_join = 1 if re.search(r'\bJOIN\b', query, re.IGNORECASE) or ',' in query.split('FROM')[-1].split('WHERE')[0] else 0
    join_count = len(re.findall(r'\bJOIN\b', query, re.IGNORECASE))
    
    has_group_by = 1 if re.search(r'\bGROUP\s+BY\b', query, re.IGNORECASE) else 0
    has_order_by = 1 if re.search(r'\bORDER\s+BY\b', query, re.IGNORECASE) else 0
    has_limit = 1 if re.search(r'\bLIMIT\b', query, re.IGNORECASE) else 0
    
    limit_val = extract_limit_value(query)
    if limit_val is None:
        limit_val = 100000.0  # Large default number representing "unlimited" for numerical scaling
    else:
        limit_val = float(limit_val)
        
    num_conditions = count_conditions(query)
    
    # 1. Count sort columns
    sort_columns_count = 0
    order_match = re.search(r'\bORDER\s+BY\b\s+([^;LIMIT\n]+)', query, re.IGNORECASE)
    if order_match:
        sort_columns_count = len(order_match.group(1).split(','))
        
    # 2. Count subqueries (SELECT count minus main select)
    nested_subquery_count = max(0, len(re.findall(r'\bSELECT\b', query, re.IGNORECASE)) - 1)
    
    # 3. Count aggregate functions
    aggregates = [r'\bCOUNT\s*\(', r'\bSUM\s*\(', r'\bAVG\s*\(', r'\bMIN\s*\(', r'\bMAX\s*\(']
    aggregation_count = 0
    for agg in aggregates:
        aggregation_count += len(re.findall(agg, query.upper()))
        
    # Run EXPLAIN QUERY PLAN to parse the query structure and SQLite's query plan
    scan_cost_estimate = 0.0
    tables_found = set()
    index_usage_count = 0
    
    try:
        cursor = conn.cursor()
        cursor.execute(f"EXPLAIN QUERY PLAN {query}")
        plan_rows = cursor.fetchall()
        
        for row in plan_rows:
            if hasattr(row, 'keys') and 'detail' in row.keys():
                detail = row['detail']
            else:
                try:
                    detail = row['detail']
                except Exception:
                    detail = row[-1]
            
            # Match SCAN table_name
            scan_match = re.search(r'\bSCAN\s+([a-zA-Z0-9_]+)\b', detail)
            if scan_match:
                table_name = scan_match.group(1)
                tables_found.add(table_name)
                scan_cost_estimate += get_table_size(conn, table_name)
                
            # Match SEARCH table_name
            search_match = re.search(r'\bSEARCH\s+([a-zA-Z0-9_]+)\b', detail)
            if search_match:
                table_name = search_match.group(1)
                tables_found.add(table_name)
                
                # Check search complexity (Primary key lookup vs Index traversal)
                if "USING INTEGER PRIMARY KEY" in detail:
                    scan_cost_estimate += 1.0
                    index_usage_count += 1
                elif "USING INDEX" in detail or "USING COVERING INDEX" in detail:
                    table_sz = get_table_size(conn, table_name)
                    scan_cost_estimate += max(1.0, 0.05 * table_sz)
                    index_usage_count += 1
                else:
                    table_sz = get_table_size(conn, table_name)
                    scan_cost_estimate += max(1.0, 0.10 * table_sz)
            
            # Temp sorting/aggregations add a fixed routing cost
            if "USE TEMP B-TREE" in detail:
                scan_cost_estimate += 500.0
                
    except Exception:
        pass
 
    if not tables_found:
        from_matches = re.findall(r'\b(?:FROM|JOIN)\s+([a-zA-Z0-9_]+)\b', query, re.IGNORECASE)
        for tbl in from_matches:
            tables_found.add(tbl)
            
    num_tables = len(tables_found)
    table_sizes = sum(get_table_size(conn, tbl) for tbl in tables_found)
    
    if has_limit and limit_val < 100000.0:
        if not has_group_by and not has_order_by:
            scan_cost_estimate = min(scan_cost_estimate, limit_val)
            
    if close_conn:
        conn.close()
        
    return {
        "num_tables": num_tables,
        "num_conditions": num_conditions,
        "has_join": has_join,
        "join_count": join_count,
        "has_group_by": has_group_by,
        "has_order_by": has_order_by,
        "has_limit": has_limit,
        "limit_val": limit_val,
        "scan_cost_estimate": scan_cost_estimate,
        "table_sizes": float(table_sizes),
        "index_usage_count": index_usage_count,
        "aggregation_count": aggregation_count,
        "sort_columns_count": sort_columns_count,
        "nested_subquery_count": nested_subquery_count
    }

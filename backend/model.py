import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from database import get_db_connection, get_logs_connection

# Path to save/load the trained model
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cost_model.pkl')
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data.csv')

# The 7 features our model expects
FEATURE_COLS = [
    "num_tables",
    "num_conditions",
    "has_join",
    "has_group_by",
    "has_order_by",
    "has_limit",
    "scan_cost_estimate"
]

def load_data_and_train():
    """
    Loads training_data.csv, splits it into training and testing sets,
    compares Linear Regression vs Random Forest Regressor, and saves
    the Random Forest model.
    Returns metrics dictionary.
    """
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Training data not found at {CSV_PATH}. Please run data_generator.py first.")
        
    df = pd.read_csv(CSV_PATH)
    
    X = df[FEATURE_COLS]
    y = df["actual_latency_ms"]
    
    # 80/20 Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # --- MODEL A: Linear Regression (Baseline) ---
    # Linear regression is simple and explainable, but it assumes a linear relationship
    # between our query features and latency, which is rarely true in complex query planners.
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    
    lr_train_preds = lr.predict(X_train)
    lr_test_preds = lr.predict(X_test)
    
    lr_mae = mean_absolute_error(y_test, lr_test_preds)
    lr_r2 = r2_score(y_test, lr_test_preds)
    
    # --- MODEL B: Random Forest Regressor (Main Model) ---
    # Random Forest is highly suitable here because query execution costs exhibit
    # non-linear transitions (e.g. index SCAN vs SEARCH is a step function)
    # and interactions (e.g., LIMIT combined with ORDER BY behaves differently).
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    rf_train_preds = rf.predict(X_train)
    rf_test_preds = rf.predict(X_test)
    
    rf_mae = mean_absolute_error(y_test, rf_test_preds)
    rf_r2 = r2_score(y_test, rf_test_preds)
    
    # Extract feature importances
    importances = rf.feature_importances_
    feature_importance_dict = {col: float(imp) for col, imp in zip(FEATURE_COLS, importances)}
    
    # Save the Random Forest model (wrapped in metadata)
    model_data = {
        "model": rf,
        "mae_ms": float(rf_mae),
        "r2_score": float(rf_r2),
        "training_samples": len(df),
        "feature_importances": feature_importance_dict
    }
    
    joblib.dump(model_data, MODEL_PATH)
    
    print("=" * 60)
    print("MODEL TRAINING & COMPARISON COMPLETED")
    print("=" * 60)
    print(f"Total dataset size: {len(df)} samples")
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
    print("-" * 60)
    print("Baseline: Linear Regression")
    print(f"  MAE: {lr_mae:.4f} ms")
    print(f"  R² Score: {lr_r2:.4f}")
    print("-" * 60)
    print("Main Model: Random Forest Regressor")
    print(f"  MAE: {rf_mae:.4f} ms")
    print(f"  R² Score: {rf_r2:.4f}")
    print("-" * 60)
    print("Random Forest Feature Importances:")
    for col, imp in sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True):
        print(f"  {col}: {imp:.4f}")
    print("=" * 60)
    
    return model_data

def predict_cost(features: dict) -> dict:
    """
    Predicts the execution cost (latency) of a query based on its features.
    Also returns a confidence level by checking standard deviation of predictions
    across all estimators in the Random Forest.
    """
    if not os.path.exists(MODEL_PATH):
        # If model doesn't exist, train it first
        print("Model file not found. Running training first...")
        model_data = load_data_and_train()
    else:
        model_data = joblib.load(MODEL_PATH)
        
    rf = model_data["model"]
    
    # Prepare input features vector
    X = np.array([[features[col] for col in FEATURE_COLS]])
    
    # Get overall prediction
    predicted_cost_ms = rf.predict(X)[0]
    
    # Compute confidence: calculate standard deviation of individual estimator predictions
    # This represents the consensus or variance between all 100 decision trees.
    estimator_predictions = [tree.predict(X)[0] for tree in rf.estimators_]
    pred_std = np.std(estimator_predictions)
    
    # Classify confidence level based on standard deviation
    # Under 2ms variance is High, 2ms-8ms is Medium, above 8ms is Low.
    if pred_std < 2.0:
        confidence = "High"
    elif pred_std < 8.0:
        confidence = "Medium"
    else:
        confidence = "Low"
        
    return {
        "predicted_cost_ms": float(predicted_cost_ms),
        "prediction_std_ms": float(pred_std),
        "confidence": confidence
    }

def get_model_metadata() -> dict:
    """Retrieves saved model details and metrics."""
    if not os.path.exists(MODEL_PATH):
        model_data = load_data_and_train()
    else:
        model_data = joblib.load(MODEL_PATH)
        
    return {
        "model": "RandomForestRegressor",
        "mae_ms": model_data["mae_ms"],
        "r2_score": model_data["r2_score"],
        "training_samples": model_data["training_samples"],
        "feature_importances": model_data["feature_importances"]
    }

def retrain_on_logs() -> dict:
    """
    Reads query logs from the database query_logs table,
    combines them with the baseline training_data.csv, and retrains the model.
    Note: A guard will be checked in FastAPI to ensure at least 100 logs have accumulated.
    """
    import json
    
    # 1. Load initial training dataset
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Training data not found at {CSV_PATH}")
    df_base = pd.read_csv(CSV_PATH)
    
    # 2. Retrieve logged queries from SQLite query_logs
    conn = get_logs_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT features, actual_cost FROM query_logs")
        rows = cursor.fetchall()
    finally:
        conn.close()
        
    log_rows = []
    for r in rows:
        features_dict = json.loads(r['features'])
        row_data = {col: features_dict[col] for col in FEATURE_COLS}
        row_data["actual_latency_ms"] = r['actual_cost']
        log_rows.append(row_data)
        
    if log_rows:
        df_logs = pd.DataFrame(log_rows)
        # Combine base CSV with the database log entries
        df_combined = pd.concat([df_base, df_logs], ignore_index=True)
        # Temporarily save combined data back to training_data.csv to persist the logged data
        df_combined.to_csv(CSV_PATH, index=False)
        print(f"Appended {len(log_rows)} query log entries to training dataset.")
        
    # 3. Retrain and save
    return load_data_and_train()

if __name__ == '__main__':
    load_data_and_train()

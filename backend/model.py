import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor
from database import mongo_db
from typing import Optional

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cost_model.pkl')
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data.csv')

FEATURE_COLS = [
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
    "nested_subquery_count"
]

def load_data_and_train():
    """
    Loads training_data.csv, performs random and template splits,
    compares Linear Regression, Random Forest, and XGBoost Regressors,
    and saves the Random Forest model with metrics metadata.
    """
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Training data not found at {CSV_PATH}. Please run data_generator.py first.")
        
    df = pd.read_csv(CSV_PATH)
    
    # Check for missing columns and fill them with default values
    for col in FEATURE_COLS:
        if col not in df.columns:
            if col == "limit_val":
                df[col] = 100000.0
            else:
                df[col] = 0.0
                
    # Fill actual latency NaN values
    if "actual_latency_ms" not in df.columns:
        raise ValueError("actual_latency_ms column is missing in training data.")
        
    X = df[FEATURE_COLS]
    y = df["actual_latency_ms"]
    
    #  EVALUATION 1: Random Split In-Distribution 80/20
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Model A: Linear Regression
    lr_r = LinearRegression()
    lr_r.fit(X_train_r, y_train_r)
    lr_r_preds = lr_r.predict(X_test_r)
    
    lr_r_mae = mean_absolute_error(y_test_r, lr_r_preds)
    lr_r_rmse = np.sqrt(mean_squared_error(y_test_r, lr_r_preds))
    lr_r_r2 = r2_score(y_test_r, lr_r_preds)
    
    # Model B: Random Forest Regressor
    rf_r = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_r.fit(X_train_r, y_train_r)
    rf_r_preds = rf_r.predict(X_test_r)
    
    rf_r_mae = mean_absolute_error(y_test_r, rf_r_preds)
    rf_r_rmse = np.sqrt(mean_squared_error(y_test_r, rf_r_preds))
    rf_r_r2 = r2_score(y_test_r, rf_r_preds)
    
    # Model C: XGBoost Regressor
    xgb_r = XGBRegressor(n_estimators=100, random_state=42)
    xgb_r.fit(X_train_r, y_train_r)
    xgb_r_preds = xgb_r.predict(X_test_r)
    
    xgb_r_mae = mean_absolute_error(y_test_r, xgb_r_preds)
    xgb_r_rmse = np.sqrt(mean_squared_error(y_test_r, xgb_r_preds))
    xgb_r_r2 = r2_score(y_test_r, xgb_r_preds)
    
    #  EVALUATION 2: Template Split (Generalization to Unseen Query Structures) 
    # Withhold templates 33-40 (8 templates = 20% of templates) completely for testing.
    # Train on templates 1-32.
    train_mask = df["template_id"] <= 32
    test_mask = df["template_id"] > 32
    
    X_train_t = df.loc[train_mask, FEATURE_COLS]
    y_train_t = df.loc[train_mask, "actual_latency_ms"]
    X_test_t = df.loc[test_mask, FEATURE_COLS]
    y_test_t = df.loc[test_mask, "actual_latency_ms"]
    
    # Model A: Linear Regression
    lr_t = LinearRegression()
    lr_t.fit(X_train_t, y_train_t)
    lr_t_preds = lr_t.predict(X_test_t)
    
    lr_t_mae = mean_absolute_error(y_test_t, lr_t_preds)
    lr_t_rmse = np.sqrt(mean_squared_error(y_test_t, lr_t_preds))
    lr_t_r2 = r2_score(y_test_t, lr_t_preds)
    
    # Model B: Random Forest
    rf_t = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_t.fit(X_train_t, y_train_t)
    rf_t_preds = rf_t.predict(X_test_t)
    
    rf_t_mae = mean_absolute_error(y_test_t, rf_t_preds)
    rf_t_rmse = np.sqrt(mean_squared_error(y_test_t, rf_t_preds))
    rf_t_r2 = r2_score(y_test_t, rf_t_preds)
    
    # Model C: XGBoost
    xgb_t = XGBRegressor(n_estimators=100, random_state=42)
    xgb_t.fit(X_train_t, y_train_t)
    xgb_t_preds = xgb_t.predict(X_test_t)
    
    xgb_t_mae = mean_absolute_error(y_test_t, xgb_t_preds)
    xgb_t_rmse = np.sqrt(mean_squared_error(y_test_t, xgb_t_preds))
    xgb_t_r2 = r2_score(y_test_t, xgb_t_preds)
    
    # Fit final Random Forest on the entire dataset for deployment
    rf_final = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_final.fit(X, y)
    
    # Extract feature importances
    importances = rf_final.feature_importances_
    feature_importance_dict = {col: float(imp) for col, imp in zip(FEATURE_COLS, importances)}
    
    model_data = {
        "model": rf_final,
        "mae_ms": float(rf_r_mae),
        "rmse_ms": float(rf_r_rmse),
        "r2_score": float(rf_r_r2),
        
        # In-distribution comparison metrics
        "rf_mae_ms": float(rf_r_mae),
        "rf_rmse_ms": float(rf_r_rmse),
        "rf_r2_score": float(rf_r_r2),
        
        "xgb_mae_ms": float(xgb_r_mae),
        "xgb_rmse_ms": float(xgb_r_rmse),
        "xgb_r2_score": float(xgb_r_r2),
        
        "lr_mae_ms": float(lr_r_mae),
        "lr_rmse_ms": float(lr_r_rmse),
        "lr_r2_score": float(lr_r_r2),
        
        # Out-of-distribution (Template-split) metrics
        "rf_unseen_mae_ms": float(rf_t_mae),
        "rf_unseen_rmse_ms": float(rf_t_rmse),
        "rf_unseen_r2_score": float(rf_t_r2),
        
        "xgb_unseen_mae_ms": float(xgb_t_mae),
        "xgb_unseen_rmse_ms": float(xgb_t_rmse),
        "xgb_unseen_r2_score": float(xgb_t_r2),
        
        "lr_unseen_mae_ms": float(lr_t_mae),
        "lr_unseen_rmse_ms": float(lr_t_rmse),
        "lr_unseen_r2_score": float(lr_t_r2),
        
        "training_samples": len(df),
        "feature_importances": feature_importance_dict
    }
    
    joblib.dump(model_data, MODEL_PATH)
    
    print("=" * 65)
    print("MODEL TRAINING & MULTI-MODEL COMPARISON COMPLETED")
    print("=" * 65)
    print(f"Total dataset size : {len(df)} samples")
    print(f"Random split train size: {len(X_train_r)}, Test size: {len(X_test_r)}")
    print(f"Template split train size: {len(X_train_t)} (32 templates), Test size: {len(X_test_t)} (8 templates)")
    print("-" * 65)
    print("EVALUATION 1: Random Split (In-Distribution Validation)")
    print("-" * 65)
    print(f"  Linear Regression  -> MAE: {lr_r_mae:.4f} ms | RMSE: {lr_r_rmse:.4f} ms | R²: {lr_r_r2:.4f}")
    print(f"  Random Forest      -> MAE: {rf_r_mae:.4f} ms | RMSE: {rf_r_rmse:.4f} ms | R²: {rf_r_r2:.4f}")
    print(f"  XGBoost Regressor  -> MAE: {xgb_r_mae:.4f} ms | RMSE: {xgb_r_rmse:.4f} ms | R²: {xgb_r_r2:.4f}")
    print("-" * 65)
    print("EVALUATION 2: Template Split (Generalization to Unseen Query Structures)")
    print("-" * 65)
    print(f"  Linear Regression  -> MAE: {lr_t_mae:.4f} ms | RMSE: {lr_t_rmse:.4f} ms | R²: {lr_t_r2:.4f}")
    print(f"  Random Forest      -> MAE: {rf_t_mae:.4f} ms | RMSE: {rf_t_rmse:.4f} ms | R²: {rf_t_r2:.4f}")
    print(f"  XGBoost Regressor  -> MAE: {xgb_t_mae:.4f} ms | RMSE: {xgb_t_rmse:.4f} ms | R²: {xgb_t_r2:.4f}")
    print("-" * 65)
    print("Random Forest Feature Importances:")
    for col, imp in sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True):
        print(f"  {col}: {imp:.4f}")
    print("=" * 65)
    
    return model_data

def predict_cost(features: dict) -> dict:
    """Predicts the execution latency of a query using the Random Forest model."""
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Running training first...")
        model_data = load_data_and_train()
    else:
        model_data = joblib.load(MODEL_PATH)
        
    rf = model_data["model"]
    X = np.array([[features[col] for col in FEATURE_COLS]])
    predicted_cost_ms = rf.predict(X)[0]
    
    estimator_predictions = [tree.predict(X)[0] for tree in rf.estimators_]
    pred_std = np.std(estimator_predictions)
    
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
        "mae_ms": model_data.get("mae_ms", 0.0),
        "rmse_ms": model_data.get("rmse_ms", 0.0),
        "r2_score": model_data.get("r2_score", 0.0),
        
        "rf_mae_ms": model_data.get("rf_mae_ms", 0.0),
        "rf_rmse_ms": model_data.get("rf_rmse_ms", 0.0),
        "rf_r2_score": model_data.get("rf_r2_score", 0.0),
        
        "xgb_mae_ms": model_data.get("xgb_mae_ms", 0.0),
        "xgb_rmse_ms": model_data.get("xgb_rmse_ms", 0.0),
        "xgb_r2_score": model_data.get("xgb_r2_score", 0.0),
        
        "lr_mae_ms": model_data.get("lr_mae_ms", 0.0),
        "lr_rmse_ms": model_data.get("lr_rmse_ms", 0.0),
        "lr_r2_score": model_data.get("lr_r2_score", 0.0),
        
        "rf_unseen_mae_ms": model_data.get("rf_unseen_mae_ms", 0.0),
        "rf_unseen_rmse_ms": model_data.get("rf_unseen_rmse_ms", 0.0),
        "rf_unseen_r2_score": model_data.get("rf_unseen_r2_score", 0.0),
        
        "xgb_unseen_mae_ms": model_data.get("xgb_unseen_mae_ms", 0.0),
        "xgb_unseen_rmse_ms": model_data.get("xgb_unseen_rmse_ms", 0.0),
        "xgb_unseen_r2_score": model_data.get("xgb_unseen_r2_score", 0.0),
        
        "lr_unseen_mae_ms": model_data.get("lr_unseen_mae_ms", 0.0),
        "lr_unseen_rmse_ms": model_data.get("lr_unseen_rmse_ms", 0.0),
        "lr_unseen_r2_score": model_data.get("lr_unseen_r2_score", 0.0),
        
        "training_samples": model_data["training_samples"],
        "feature_importances": model_data["feature_importances"]
    }

def retrain_on_logs(user_id: str = None) -> dict:
    """Reads queries logs from MongoDB, appends them to training CSV, and retrains."""
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Training data not found at {CSV_PATH}")
    df_base = pd.read_csv(CSV_PATH)
    
    try:
        query_filter = {}
        if user_id:
            query_filter = {"user_id": user_id}
        cursor = mongo_db["query_logs"].find(query_filter)
        rows = list(cursor)
    except Exception as e:
        print("Error fetching logs from MongoDB:", e)
        rows = []
        
    log_rows = []
    for r in rows:
        features_dict = r['features']
        row_data = {}
        # Keep track of template_id: for logs, assign a default unseen or fallback template_id = 99
        row_data["template_id"] = 99
        for col in FEATURE_COLS:
            if col in features_dict:
                row_data[col] = features_dict[col]
            elif col == "limit_val":
                row_data[col] = 100000.0
            else:
                row_data[col] = 0.0
        row_data["actual_latency_ms"] = r['actual_cost']
        log_rows.append(row_data)
        
    if log_rows:
        df_logs = pd.DataFrame(log_rows)
        df_combined = pd.concat([df_base, df_logs], ignore_index=True)
        df_combined.to_csv(CSV_PATH, index=False)
        print(f"Appended {len(log_rows)} query log entries to training dataset.")
        
    return load_data_and_train()

if __name__ == '__main__':
    load_data_and_train()

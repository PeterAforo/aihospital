"""
AI Duration Prediction Model Training Script
Trains a Gradient Boosting model to predict appointment durations
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
from datetime import datetime

def load_training_data(data_path: str) -> pd.DataFrame:
    """Load and preprocess training data from CSV"""
    df = pd.read_csv(data_path)
    
    # Filter valid records
    df = df[df['actual_duration_minutes'].notna()]
    df = df[(df['actual_duration_minutes'] >= 5) & (df['actual_duration_minutes'] <= 120)]
    
    return df

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create features for the model"""
    # Time-based features
    if 'start_time' in df.columns:
        df['hour'] = pd.to_datetime(df['start_time'], format='%H:%M').dt.hour
    elif 'appointment_time' in df.columns:
        df['hour'] = pd.to_datetime(df['appointment_time'], format='%H:%M').dt.hour
    else:
        df['hour'] = 9  # Default
    
    df['is_morning'] = (df['hour'] < 12).astype(int)
    df['is_afternoon'] = ((df['hour'] >= 12) & (df['hour'] < 17)).astype(int)
    
    # Day of week features
    if 'appointment_date' in df.columns:
        df['day_of_week'] = pd.to_datetime(df['appointment_date']).dt.dayofweek
    elif 'day_of_week' not in df.columns:
        df['day_of_week'] = 0
    
    df['is_monday'] = (df['day_of_week'] == 0).astype(int)
    df['is_friday'] = (df['day_of_week'] == 4).astype(int)
    
    # Encode categorical variables
    label_encoders = {}
    categorical_cols = ['appointment_type_id', 'doctor_id']
    
    for col in categorical_cols:
        if col in df.columns:
            le = LabelEncoder()
            df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le
    
    # Save encoders for prediction
    joblib.dump(label_encoders, 'label_encoders.pkl')
    
    return df

def train_model(df: pd.DataFrame) -> tuple:
    """Train the duration prediction model"""
    # Define features
    feature_cols = [
        'appointment_type_id_encoded',
        'doctor_id_encoded',
        'patient_age',
        'day_of_week',
        'hour',
        'is_morning',
        'is_afternoon',
        'is_monday',
        'is_friday',
        'is_first_appointment',
        'patient_complexity'
    ]
    
    # Filter to available features
    available_features = [col for col in feature_cols if col in df.columns]
    
    if len(available_features) < 3:
        print("Warning: Not enough features available. Using basic features.")
        available_features = ['hour', 'day_of_week']
        for col in available_features:
            if col not in df.columns:
                df[col] = 0
    
    X = df[available_features].fillna(0)
    y = df['actual_duration_minutes']
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n=== Model Performance ===")
    print(f"Mean Absolute Error: {mae:.2f} minutes")
    print(f"R² Score: {r2:.3f}")
    print(f"Features used: {available_features}")
    
    # Feature importance
    print(f"\n=== Feature Importance ===")
    for feat, imp in sorted(zip(available_features, model.feature_importances_), 
                            key=lambda x: x[1], reverse=True):
        print(f"  {feat}: {imp:.4f}")
    
    # Save model
    model_info = {
        'model': model,
        'features': available_features,
        'mae': mae,
        'r2': r2,
        'trained_at': datetime.now().isoformat(),
        'sample_size': len(df)
    }
    
    joblib.dump(model_info, 'duration_model.pkl')
    print(f"\nModel saved to duration_model.pkl")
    
    return model, available_features, mae, r2

def generate_sample_data(output_path: str, n_samples: int = 1000):
    """Generate sample training data for testing"""
    np.random.seed(42)
    
    appointment_types = ['new_consultation', 'follow_up', 'procedure', 'vaccination', 'prenatal']
    doctors = [f'doctor_{i}' for i in range(1, 6)]
    
    data = []
    for _ in range(n_samples):
        apt_type = np.random.choice(appointment_types)
        doctor = np.random.choice(doctors)
        
        # Base duration by type
        base_durations = {
            'new_consultation': 30,
            'follow_up': 20,
            'procedure': 60,
            'vaccination': 15,
            'prenatal': 30
        }
        base = base_durations[apt_type]
        
        # Add variability
        hour = np.random.randint(8, 17)
        day_of_week = np.random.randint(0, 5)
        patient_age = np.random.randint(1, 90)
        is_first = np.random.choice([0, 1], p=[0.7, 0.3])
        complexity = np.random.randint(0, 5)
        
        # Calculate actual duration with noise
        duration = base
        duration += (hour < 10) * 5  # Morning appointments longer
        duration += (day_of_week == 0) * 5  # Monday appointments longer
        duration += is_first * 10  # First appointments longer
        duration += complexity * 3  # Complex patients take longer
        duration += np.random.normal(0, 5)  # Random noise
        duration = max(5, min(120, duration))  # Clamp
        
        data.append({
            'appointment_type_id': apt_type,
            'doctor_id': doctor,
            'patient_age': patient_age,
            'day_of_week': day_of_week,
            'appointment_time': f"{hour:02d}:00",
            'is_first_appointment': is_first,
            'patient_complexity': complexity,
            'actual_duration_minutes': round(duration)
        })
    
    df = pd.DataFrame(data)
    df.to_csv(output_path, index=False)
    print(f"Generated {n_samples} sample records to {output_path}")
    return df

if __name__ == '__main__':
    data_path = 'training_data.csv'
    
    # Generate sample data if not exists
    if not os.path.exists(data_path):
        print("No training data found. Generating sample data...")
        df = generate_sample_data(data_path)
    else:
        df = load_training_data(data_path)
    
    print(f"Loaded {len(df)} training samples")
    
    # Engineer features
    df = engineer_features(df)
    
    # Train model
    train_model(df)

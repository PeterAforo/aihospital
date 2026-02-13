"""
AI Duration Prediction Flask API
Provides REST endpoint for predicting appointment durations
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load model on startup
model_info = None
label_encoders = None

def load_model():
    global model_info, label_encoders
    
    model_path = 'duration_model.pkl'
    encoders_path = 'label_encoders.pkl'
    
    if os.path.exists(model_path):
        model_info = joblib.load(model_path)
        print(f"Model loaded. MAE: {model_info.get('mae', 'N/A')}, R²: {model_info.get('r2', 'N/A')}")
    else:
        print("Warning: No trained model found. Run train_model.py first.")
        model_info = None
    
    if os.path.exists(encoders_path):
        label_encoders = joblib.load(encoders_path)
    else:
        label_encoders = {}

# Default durations when model unavailable
DEFAULT_DURATIONS = {
    'new_consultation': 30,
    'follow_up': 20,
    'procedure': 60,
    'vaccination': 15,
    'prenatal': 30,
    'checkup': 25,
    'emergency': 45,
    'telemedicine': 20,
}

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'model_loaded': model_info is not None,
        'model_mae': model_info.get('mae') if model_info else None,
        'model_r2': model_info.get('r2') if model_info else None,
    })

@app.route('/predict-duration', methods=['POST'])
def predict_duration():
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract features
        appointment_type_id = data.get('appointment_type_id', 'follow_up')
        doctor_id = data.get('doctor_id', 'unknown')
        patient_age = data.get('patient_age', 40)
        day_of_week = data.get('day_of_week', 0)
        hour = data.get('hour', 9)
        is_first_appointment = data.get('is_first_appointment', 0)
        patient_complexity = data.get('patient_complexity', 0)
        
        # If no model, use defaults
        if model_info is None:
            default_duration = DEFAULT_DURATIONS.get(
                str(appointment_type_id).lower(), 
                30
            )
            # Apply simple adjustments
            duration = default_duration
            if is_first_appointment:
                duration += 10
            if patient_complexity > 2:
                duration += patient_complexity * 3
            if hour < 10:
                duration += 5
            if day_of_week == 0:
                duration += 5
            
            # Round to nearest 5 minutes
            duration = round(duration / 5) * 5
            
            return jsonify({
                'predicted_duration_minutes': int(duration),
                'confidence': 0.6,
                'model_used': False,
                'message': 'Using default durations (no trained model)'
            })
        
        # Prepare features for model
        model = model_info['model']
        features = model_info['features']
        
        feature_values = {
            'hour': hour,
            'day_of_week': day_of_week,
            'is_morning': 1 if hour < 12 else 0,
            'is_afternoon': 1 if 12 <= hour < 17 else 0,
            'is_monday': 1 if day_of_week == 0 else 0,
            'is_friday': 1 if day_of_week == 4 else 0,
            'patient_age': patient_age,
            'is_first_appointment': is_first_appointment,
            'patient_complexity': patient_complexity,
        }
        
        # Encode categorical variables
        if 'appointment_type_id_encoded' in features:
            if label_encoders and 'appointment_type_id' in label_encoders:
                try:
                    feature_values['appointment_type_id_encoded'] = \
                        label_encoders['appointment_type_id'].transform([str(appointment_type_id)])[0]
                except ValueError:
                    feature_values['appointment_type_id_encoded'] = 0
            else:
                feature_values['appointment_type_id_encoded'] = 0
        
        if 'doctor_id_encoded' in features:
            if label_encoders and 'doctor_id' in label_encoders:
                try:
                    feature_values['doctor_id_encoded'] = \
                        label_encoders['doctor_id'].transform([str(doctor_id)])[0]
                except ValueError:
                    feature_values['doctor_id_encoded'] = 0
            else:
                feature_values['doctor_id_encoded'] = 0
        
        # Create feature vector
        X = pd.DataFrame([{feat: feature_values.get(feat, 0) for feat in features}])
        
        # Predict
        prediction = model.predict(X)[0]
        
        # Round to nearest 5 minutes
        duration = round(prediction / 5) * 5
        duration = max(10, min(120, duration))  # Clamp between 10-120 minutes
        
        # Calculate confidence based on model R²
        confidence = min(0.95, max(0.5, model_info.get('r2', 0.7)))
        
        return jsonify({
            'predicted_duration_minutes': int(duration),
            'confidence': round(confidence, 2),
            'model_used': True,
            'raw_prediction': round(prediction, 2)
        })
        
    except Exception as e:
        print(f"Prediction error: {e}")
        return jsonify({
            'error': str(e),
            'predicted_duration_minutes': 30,
            'confidence': 0.5,
            'model_used': False
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info_endpoint():
    if model_info is None:
        return jsonify({
            'loaded': False,
            'message': 'No model loaded. Run train_model.py first.'
        })
    
    return jsonify({
        'loaded': True,
        'features': model_info.get('features', []),
        'mae': model_info.get('mae'),
        'r2': model_info.get('r2'),
        'trained_at': model_info.get('trained_at'),
        'sample_size': model_info.get('sample_size')
    })

@app.route('/retrain', methods=['POST'])
def retrain():
    """Trigger model retraining (expects CSV data in request)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        file.save('training_data.csv')
        
        # Import and run training
        from train_model import load_training_data, engineer_features, train_model
        
        df = load_training_data('training_data.csv')
        df = engineer_features(df)
        model, features, mae, r2 = train_model(df)
        
        # Reload model
        load_model()
        
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'mae': mae,
            'r2': r2,
            'sample_size': len(df)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    load_model()
    
    port = int(os.environ.get('AI_SERVICE_PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    print(f"Starting AI Duration Prediction Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)

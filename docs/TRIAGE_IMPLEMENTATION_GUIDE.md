# Triage & Vital Signs Module - Implementation Guide

## 🎯 Implementation Overview

**Module Position:** Critical link between check-in and consultation  
**Implementation Time:** 1-2 weeks  
**Complexity:** Medium (simpler than appointments, more complex than registration)  
**Impact:** HIGH - Completes patient intake flow, enables priority-based care  

---

## 📋 QUICK START - Copy This to Windsurf

```
I'm building a triage and vital signs module for a hospital management system in Ghana based on triage_module_implementation.json.

This module sits between patient check-in and doctor consultation. Nurses use it to:
1. Capture vital signs (BP, temperature, pulse, respiratory rate, SpO2, weight, height, pain)
2. Document chief complaint
3. Assign triage priority level (Red/Orange/Yellow/Green/Blue - Manchester Triage System)
4. Re-prioritize the walk-in queue based on clinical urgency

Let's build this step by step, starting with the database schema.

Ready to begin?
```

---

## 📊 ARCHITECTURE OVERVIEW

```
Patient Flow with Triage:

Registration → Check-in → TRIAGE → Queue (Prioritized) → Doctor
     ✅           ✅         🆕            ✅              ❌

What Triage Does:
┌────────────────────────────────────────┐
│  BEFORE TRIAGE                         │
│  Walk-in Queue:                        │
│  1. Kwame (arrived 9:00 AM)           │
│  2. Ama (arrived 9:10 AM)             │
│  3. Kofi (arrived 9:15 AM)            │
│                                        │
│  Order: First-come, first-served      │
└────────────────────────────────────────┘
                 ↓
         [TRIAGE STATION]
         Nurse measures vitals
         Assigns priority levels
                 ↓
┌────────────────────────────────────────┐
│  AFTER TRIAGE                          │
│  Prioritized Queue:                    │
│  🔴 Kofi (Red - Chest pain)           │
│  🟠 Kwame (Orange - High BP)          │
│  🟢 Ama (Green - Routine)             │
│                                        │
│  Order: Priority level, then arrival  │
└────────────────────────────────────────┘
```

---

## STEP 1: Database Schema

### Windsurf Prompt:
```
Based on triage_module_implementation.json, create the complete Prisma database schema for the triage module.

Include these tables:
1. triage_records - Main triage assessment table
2. vital_signs_history - Vital signs tracking over time (for trending)
3. triage_alerts - Critical alerts sent to doctors

Key requirements:

**triage_records table:**
- All vital signs fields (BP systolic/diastolic, temperature, pulse, respiratory rate, SpO2, weight, height, BMI, pain scale)
- Assessment fields (chief complaint, duration, severity, clinical notes)
- Triage classification (level 1-5, color, suggested level, override reason)
- Links to: patient, appointment, nurse (triaged_by)
- Unique constraint: One triage per appointment
- Auto-calculate BMI from weight and height

**vital_signs_history table:**
- Track vital signs over time for trending
- Support multiple sources (triage, consultation, nursing rounds)
- Enable charting vital signs over multiple visits

**triage_alerts table:**
- Log critical alerts (Red triage, critical vitals)
- Track who was alerted and when acknowledged
- Support array of recipients

**Validation:**
- BP systolic > diastolic
- Triage level 1-5
- Temperature site enum (oral, axillary, tympanic, rectal)
- Pulse rhythm enum (regular, irregular)

**Indexes:**
- patient_id + triage_date (for history lookup)
- appointment_id (unique - one triage per appointment)
- triage_level (for filtering by priority)
- tenant_id + triage_date (for analytics)

Create:
1. schema.prisma file with all tables and relations
2. Migration file
3. Seed file with:
   - Triage level reference data (Red/Orange/Yellow/Green/Blue with colors and descriptions)
   - 20 sample triage records with realistic vital signs
   - Include some critical cases (Red/Orange) for testing alerts

Location: backend/prisma/
```

---

## STEP 2: Vital Signs Validation Utilities

### Windsurf Prompt:
```
Create comprehensive validation utilities for vital signs with age-specific ranges.

Based on triage_module_implementation.json vital_signs_specification:

File: src/utils/vital-signs-validators.ts

Functions needed:

1. **validateBloodPressure(systolic, diastolic, age?)**
```typescript
interface BPValidation {
  isValid: boolean;
  category: 'normal' | 'elevated' | 'high' | 'critical_low' | 'critical_high';
  message?: string;
  severityLevel: number; // 0-5 for triage suggestion
}

// Logic:
// - Systolic must be > diastolic
// - Range: 50-300 mmHg (systolic), 30-200 mmHg (diastolic)
// - Critical low: <90 systolic → severityLevel 1 (Red)
// - Critical high: >180 systolic or >120 diastolic → severityLevel 1 (Red)
// - High: 160-180 or 100-120 → severityLevel 2 (Orange)
// - Normal adult: 90-120 / 60-80
```

2. **validateTemperature(temp, site, age?)**
```typescript
interface TempValidation {
  isValid: boolean;
  category: 'hypothermia' | 'normal' | 'fever' | 'high_fever' | 'hyperpyrexia';
  severityLevel: number;
  message?: string;
}

// Logic:
// - Range: 30-45°C
// - Hypothermia: <35°C → severityLevel 1 (Red)
// - Normal: 36.5-37.5°C
// - Fever: 37.5-39°C → severityLevel 3 (Yellow)
// - High fever: 39-40°C → severityLevel 2 (Orange)
// - Hyperpyrexia: >40°C → severityLevel 1 (Red)
// - Site adjustment: Oral readings ~0.5°C higher than axillary
```

3. **validatePulseRate(rate, age)**
```typescript
interface PulseValidation {
  isValid: boolean;
  category: 'bradycardia' | 'normal' | 'tachycardia';
  severityLevel: number;
  normalRange: { min: number; max: number };
}

// Age-specific ranges:
// - Adult (18+): 60-100 bpm
// - Child (6-12): 70-110 bpm
// - Toddler (1-3): 90-140 bpm
// - Infant (3-12 months): 100-150 bpm
// - Newborn (0-3 months): 100-160 bpm
// 
// Critical:
// - <50 bpm → severityLevel 1 (Red) for adults
// - >120 bpm → severityLevel 1 (Red) for adults
```

4. **validateRespiratoryRate(rate, age)**
```typescript
// Age-specific ranges:
// - Adult: 12-20 /min
// - Child (6-12): 18-22 /min
// - Toddler (1-3): 20-30 /min
// - Infant: 30-60 /min
//
// Critical:
// - <10 /min (adult) → severityLevel 1 (Red)
// - >30 /min (adult) → severityLevel 1 (Red)
```

5. **validateSpO2(spo2)**
```typescript
interface SpO2Validation {
  isValid: boolean;
  category: 'severe_hypoxemia' | 'hypoxemia' | 'mild_hypoxemia' | 'normal';
  severityLevel: number;
}

// Ranges:
// - Normal: 95-100%
// - Mild hypoxemia: 94-95% → severityLevel 3 (Yellow)
// - Hypoxemia: 90-93% → severityLevel 2 (Orange)
// - Severe: <90% → severityLevel 1 (Red)
```

6. **calculateBMI(weight, height)**
```typescript
interface BMIResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese_1' | 'obese_2' | 'obese_3';
}

// Formula: weight (kg) / (height (m))²
// Categories:
// - Underweight: <18.5
// - Normal: 18.5-24.9
// - Overweight: 25-29.9
// - Obese Class 1: 30-34.9
// - Obese Class 2: 35-39.9
// - Obese Class 3: ≥40
```

7. **validatePainScale(pain)**
```typescript
// Range: 0-10
// Categorize:
// - None: 0
// - Mild: 1-3
// - Moderate: 4-6
// - Severe: 7-9 → severityLevel 2 (Orange)
// - Worst: 10 → severityLevel 1 (Red) if combined with other symptoms
```

8. **suggestTriageLevel(vitalSigns, painScale?, chiefComplaint?)**
```typescript
interface TriageSuggestion {
  suggestedLevel: number; // 1-5
  levelName: string; // "Red - Immediate"
  confidence: number; // 0-1
  triggers: string[]; // What caused this suggestion
  recommendation: string;
}

// Algorithm:
// 1. Collect severity levels from all vital signs
// 2. Take the highest severity level
// 3. Consider pain scale (severe pain elevates priority)
// 4. Keyword analysis on chief complaint:
//    - "chest pain", "can't breathe", "unconscious" → Red
//    - "severe headache", "high fever" → Orange
// 5. Return suggestion with confidence score
```

Include comprehensive unit tests for all edge cases:
- Pediatric vs adult ranges
- Critical values triggering Red triage
- Normal values returning Green
- Invalid inputs (negative, out of range)

File: src/utils/vital-signs-validators.test.ts
```

---

## STEP 3: Triage API Endpoints

### Windsurf Prompt:
```
Create all triage management API endpoints.

Based on triage_module_implementation.json api_endpoints:

Endpoints to implement:

1. **GET /api/triage/queue**
   - Get patients awaiting triage (status = CHECKED_IN, no triage record)
   - Sort by check-in time
   - Include patient summary, allergies, appointment details
   - Calculate wait time (now - checked_in_at)

2. **POST /api/triage**
   - Create triage record
   - Validate all vital signs using validators from Step 2
   - Auto-calculate BMI
   - Get suggested triage level
   - Save triage record
   - Update appointment status to TRIAGED
   - Re-prioritize queue (call queue service to update priorities)
   - If triage level = 1 (Red): Send alert to doctor on duty
   - If triage level = 2 (Orange): Move to front of queue
   - Create vital_signs_history record

3. **GET /api/triage/:id**
   - Get complete triage record with related data
   - Include: patient, appointment, nurse who triaged
   - Include: calculated values (BMI, pulse pressure, MAP)

4. **PUT /api/triage/:id**
   - Update triage record (within 24 hours only)
   - Re-validate vital signs
   - If triage level changes significantly, re-prioritize queue
   - Create audit log of changes

5. **GET /api/triage/patient/:patientId/history**
   - Fetch all triage records for a patient
   - Return vital signs trend data for charting
   - Group by: blood pressure, temperature, weight over time

6. **POST /api/triage/suggest-level**
   - Real-time triage level suggestion
   - Input: vital signs, pain scale, chief complaint
   - Output: suggested level with confidence and triggers
   - Used as nurse enters data (real-time assistance)

7. **GET /api/triage/analytics**
   - Date range analytics
   - Metrics: total triaged, avg time, level distribution
   - Nurse performance breakdown
   - Critical alerts generated

Validation rules:
- Vital signs must be within acceptable ranges
- BP systolic > diastolic
- Triage level 1-5
- Appointment must exist and be CHECKED_IN
- Cannot create duplicate triage for same appointment

Side effects to implement:
- Update appointment.status = 'TRIAGED'
- Update appointment.triaged_at = NOW()
- Call QueueService.reprioritize(doctorId) to reorder queue
- If Red triage: Call AlertService.sendCriticalAlert(doctorId, triageId)
- Create vital_signs_history entry

Error handling:
- 400: Invalid vital signs
- 404: Appointment not found
- 409: Triage already exists for this appointment
- 500: Database error

Implementation structure:
- Routes: src/routes/triage.routes.ts
- Controllers: src/controllers/triage.controller.ts
- Services: src/services/triage.service.ts
- DTOs: src/dtos/triage.dto.ts (request/response types)

Include transaction support for POST /api/triage to ensure:
1. Triage record created
2. Appointment updated
3. Queue reprioritized
All succeed or all fail (atomicity)
```

---

## STEP 4: Queue Reprioritization Service

### Windsurf Prompt:
```
Enhance the existing walk-in queue service to support triage-based prioritization.

Based on triage_module_implementation.json integration_points.with_queue_module:

File: src/services/queue.service.ts

Add new method:

**reprioritizeByTriageLevel(doctorId: string, date: Date)**

Logic:
```typescript
async reprioritizeByTriageLevel(doctorId: string, date: Date) {
  // 1. Get all appointments for this doctor today that are:
  //    - Status: CHECKED_IN or TRIAGED
  //    - is_walk_in: true (or all appointments in queue)
  
  // 2. Join with triage_records to get triage level
  
  // 3. Sort by:
  //    a) Triage level (1 first, then 2, 3, 4, 5)
  //    b) Within same level: checked_in_at (FIFO)
  
  // 4. Update queue_position for each appointment
  
  // 5. Recalculate estimated_wait_minutes based on new order
  
  // 6. Broadcast queue update via WebSocket
  
  // 7. Return updated queue
}
```

Example output:
```typescript
// Before triage:
Queue = [
  { patient: "Kofi", checked_in_at: "9:00", triage_level: null, position: 1 },
  { patient: "Ama", checked_in_at: "9:10", triage_level: null, position: 2 },
  { patient: "Yaw", checked_in_at: "9:15", triage_level: null, position: 3 }
]

// After triage:
Queue = [
  { patient: "Yaw", checked_in_at: "9:15", triage_level: 1, position: 1 }, // Red - jumped to #1
  { patient: "Kofi", checked_in_at: "9:00", triage_level: 2, position: 2 }, // Orange - #2
  { patient: "Ama", checked_in_at: "9:10", triage_level: 4, position: 3 } // Green - stays #3
]
```

Update existing **getWalkInQueue** method:
- Join with triage_records
- Include triage_level in response
- Display triage color badge in UI

Update **callNextWalkIn** method:
- Select highest priority (lowest triage_level number) first
- If multiple patients with same level, FIFO

Integration points:
- Called automatically after POST /api/triage
- Called when appointment status changes
- WebSocket broadcast to update queue display in real-time
```

---

## STEP 5: Triage Alerts Service

### Windsurf Prompt:
```
Create a service to send critical triage alerts to doctors.

File: src/services/triage-alert.service.ts

Features:

1. **sendCriticalAlert(triageId, doctorId)**
   - Triggered when triage level = 1 (Red - Immediate)
   - Get triage details, patient info, vital signs
   - Format alert message
   - Send SMS to doctor on duty
   - Send push notification (if mobile app exists)
   - Create record in triage_alerts table
   - Return alert ID

2. **acknowledgeAlert(alertId, doctorId)**
   - Mark alert as acknowledged
   - Record who acknowledged and when
   - Update triage_alerts.acknowledged_by and acknowledged_at

3. **getUnacknowledgedAlerts(doctorId)**
   - Fetch alerts sent to this doctor that haven't been acknowledged
   - Used in doctor dashboard to show pending critical patients

Alert message template:
```
🚨 CRITICAL PATIENT ALERT

Patient: Kwame Mensah (45M)
MRN: RDG-2024-00001
Triage: RED - IMMEDIATE

Chief Complaint: Chest pain with shortness of breath

Vital Signs:
- BP: 180/110 mmHg ⚠️
- HR: 125 bpm ⚠️
- SpO2: 88% ⚠️
- Temp: 37.2°C

Location: Triage Room
Time: 10:45 AM

IMMEDIATE ATTENTION REQUIRED
```

Integration with SMS service:
```typescript
import { SMSService } from './sms.service';

constructor(
  private smsService: SMSService,
  private prisma: PrismaClient
) {}

async sendCriticalAlert(triageId: string, doctorId: string) {
  // Get triage + patient data
  const triage = await this.getTriageWithDetails(triageId);
  
  // Get doctor's phone
  const doctor = await this.getDoctor(doctorId);
  
  // Format message
  const message = this.formatAlertMessage(triage);
  
  // Send SMS
  await this.smsService.sendSMS({
    to: doctor.phone,
    message: message
  });
  
  // Log alert
  await this.prisma.triageAlerts.create({
    data: {
      triageId,
      alertType: 'red_triage',
      alertMessage: message,
      sentTo: [doctorId],
      sentAt: new Date()
    }
  });
}
```

File: src/services/triage-alert.service.ts
Tests: src/services/triage-alert.service.test.ts
```

---

## STEP 6: Frontend - Triage Station Main Interface

### Windsurf Prompt:
```
Create the main triage station interface for nurses.

Component: TriageStation

Route: /triage
Users: Triage nurses

Layout:
```
┌─────────────────────────────────────────────────────┐
│  [Logo]  Triage Station      [Nurse: Alice]  [9:45] │
├───────────────┬─────────────────────────────────────┤
│               │  Current Patient: Kwame Mensah      │
│  QUEUE        │  Age: 45, Male, MRN: RDG-2024-00001│
│  (30% width)  │  ⚠️ Allergies: Penicillin           │
│               │  Timer: 02:34 ⏱️                    │
│  🟢 Waiting   ├─────────────────────────────────────┤
│  (3)          │                                     │
│               │  [VITAL SIGNS FORM]                 │
│  W-001 Kwame  │  - Blood Pressure                   │
│  09:15 • 30m  │  - Temperature                      │
│  [Active]     │  - Pulse Rate                       │
│               │  - Respiratory Rate                 │
│  W-002 Ama    │  - SpO2                            │
│  09:20 • 25m  │  - Weight & Height                  │
│  [Waiting]    │  - Pain Assessment                  │
│               │                                     │
│  W-003 Kofi   │  [CHIEF COMPLAINT]                  │
│  09:25 • 20m  │  - Complaint text                   │
│  [Waiting]    │  - Duration, Severity               │
│               │                                     │
│               │  [TRIAGE LEVEL]                     │
│               │  System suggests: 🟠 Orange         │
│               │  [🔴][🟠][🟡][🟢][🔵]              │
│               │                                     │
│               │  [Cancel] [Save Triage] ✅          │
└───────────────┴─────────────────────────────────────┘
```

Implementation:

```tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout, Card, Button, message } from 'antd';

export const TriageStation: React.FC = () => {
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({});
  const [assessment, setAssessment] = useState<Assessment>({});
  const [triageLevel, setTriageLevel] = useState<number | null>(null);
  const [triageStartTime, setTriageStartTime] = useState<Date | null>(null);
  
  // Fetch queue
  const { data: queue, refetch } = useQuery(
    ['triage-queue'],
    () => fetchTriageQueue(),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );
  
  // Save triage mutation
  const saveTriage = useMutation(
    (data: TriageSubmission) => createTriage(data),
    {
      onSuccess: () => {
        message.success('Triage saved successfully!');
        // Clear form and load next patient
        clearForm();
        loadNextPatient();
        refetch();
      },
      onError: (error) => {
        message.error('Failed to save triage');
      }
    }
  );
  
  // Load patient from queue
  const loadPatient = (patient: Patient) => {
    setCurrentPatient(patient);
    setTriageStartTime(new Date());
    // Pre-populate any existing data
    // Show patient allergies prominently
  };
  
  // Real-time triage suggestion
  const { data: suggestion } = useQuery(
    ['triage-suggestion', vitalSigns],
    () => getTriageSuggestion(vitalSigns, assessment),
    { 
      enabled: isVitalSignsComplete(vitalSigns),
      refetchOnMount: false 
    }
  );
  
  const handleSubmit = () => {
    // Validate
    if (!validateForm()) {
      message.error('Please complete all required fields');
      return;
    }
    
    // Submit
    saveTriage.mutate({
      patientId: currentPatient.id,
      appointmentId: currentPatient.appointmentId,
      vitalSigns,
      assessment,
      triageLevel: triageLevel || suggestion.suggestedLevel
    });
  };
  
  return (
    <Layout>
      <Sider width="30%">
        <TriageQueue 
          queue={queue} 
          onSelectPatient={loadPatient}
          currentPatientId={currentPatient?.id}
        />
      </Sider>
      
      <Content>
        {currentPatient ? (
          <>
            <PatientHeader 
              patient={currentPatient}
              startTime={triageStartTime}
            />
            
            <VitalSignsForm
              values={vitalSigns}
              onChange={setVitalSigns}
            />
            
            <ChiefComplaintForm
              values={assessment}
              onChange={setAssessment}
            />
            
            <TriageLevelSelector
              suggestion={suggestion}
              selected={triageLevel}
              onSelect={setTriageLevel}
            />
            
            <div className="actions">
              <Button onClick={clearForm}>Cancel</Button>
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={saveTriage.isLoading}
              >
                Save Triage
              </Button>
            </div>
          </>
        ) : (
          <Empty description="Select a patient from the queue to begin triage" />
        )}
      </Content>
    </Layout>
  );
};
```

Features to implement:
- Auto-save draft to localStorage every 30 seconds
- Timer showing how long current triage has taken
- Keyboard shortcuts (Tab to navigate, Ctrl+S to save)
- Warning if nurse tries to close without saving
- Allergies displayed prominently in red banner
- Real-time validation of vital signs
- Visual feedback (red/orange/green) for abnormal values

Components:
- src/pages/triage/TriageStation.tsx
- src/components/triage/TriageQueue.tsx
- src/components/triage/VitalSignsForm.tsx
- src/components/triage/ChiefComplaintForm.tsx
- src/components/triage/TriageLevelSelector.tsx
- src/hooks/useTriageForm.ts
```

---

## STEP 7: Frontend - Vital Signs Form Component

### Windsurf Prompt:
```
Create the vital signs entry form with real-time validation and visual feedback.

Component: VitalSignsForm

Features:
1. Two-column responsive grid layout
2. Real-time validation as user types
3. Color-coded feedback (Green=normal, Orange=borderline, Red=critical)
4. Auto-calculations (BMI, pulse pressure)
5. Unit conversions (°C ↔ °F)
6. Age-appropriate ranges

Implementation:

```tsx
import React from 'react';
import { Form, Input, Select, InputNumber, Row, Col, Tag } from 'antd';
import { validateBloodPressure, validateTemperature, calculateBMI } from '@/utils/vital-signs-validators';

interface VitalSignsFormProps {
  values: VitalSigns;
  onChange: (values: VitalSigns) => void;
  patientAge?: number;
}

export const VitalSignsForm: React.FC<VitalSignsFormProps> = ({
  values,
  onChange,
  patientAge = 45
}) => {
  const [bpValidation, setBPValidation] = useState(null);
  const [tempValidation, setTempValidation] = useState(null);
  
  // Validate BP as user types
  useEffect(() => {
    if (values.bpSystolic && values.bpDiastolic) {
      const validation = validateBloodPressure(
        values.bpSystolic,
        values.bpDiastolic,
        patientAge
      );
      setBPValidation(validation);
    }
  }, [values.bpSystolic, values.bpDiastolic]);
  
  // Auto-calculate BMI
  useEffect(() => {
    if (values.weight && values.height) {
      const bmi = calculateBMI(values.weight, values.height);
      onChange({ ...values, bmi: bmi.bmi, bmiCategory: bmi.category });
    }
  }, [values.weight, values.height]);
  
  const getFieldStyle = (validation: any) => {
    if (!validation) return {};
    return {
      borderColor: validation.severityLevel === 1 ? '#DC2626' : 
                   validation.severityLevel === 2 ? '#EA580C' : 
                   '#16A34A',
      borderWidth: 2
    };
  };
  
  return (
    <Card title="Vital Signs">
      <Form layout="vertical">
        <Row gutter={16}>
          {/* Blood Pressure */}
          <Col span={12}>
            <Form.Item label="Blood Pressure (mmHg)">
              <Input.Group compact>
                <InputNumber
                  placeholder="Systolic"
                  value={values.bpSystolic}
                  onChange={(val) => onChange({ ...values, bpSystolic: val })}
                  min={50}
                  max={300}
                  style={getFieldStyle(bpValidation)}
                />
                <Input
                  style={{ width: 30, borderLeft: 0, pointerEvents: 'none' }}
                  placeholder="/"
                  disabled
                />
                <InputNumber
                  placeholder="Diastolic"
                  value={values.bpDiastolic}
                  onChange={(val) => onChange({ ...values, bpDiastolic: val })}
                  min={30}
                  max={200}
                  style={getFieldStyle(bpValidation)}
                />
              </Input.Group>
              {bpValidation && (
                <div style={{ marginTop: 4 }}>
                  <Tag color={bpValidation.severityLevel === 1 ? 'red' : 
                              bpValidation.severityLevel === 2 ? 'orange' : 'green'}>
                    {bpValidation.category.toUpperCase()}
                  </Tag>
                  {bpValidation.message && (
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {bpValidation.message}
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Normal: 90-120 / 60-80 mmHg
              </div>
            </Form.Item>
          </Col>
          
          {/* Temperature */}
          <Col span={12}>
            <Form.Item label="Temperature">
              <Input.Group compact>
                <InputNumber
                  placeholder="Temp"
                  value={values.temperature}
                  onChange={(val) => onChange({ ...values, temperature: val })}
                  min={30}
                  max={45}
                  step={0.1}
                  precision={1}
                  style={{ width: '50%' }}
                />
                <Select
                  value={values.temperatureSite || 'oral'}
                  onChange={(val) => onChange({ ...values, temperatureSite: val })}
                  style={{ width: '50%' }}
                >
                  <Select.Option value="oral">Oral</Select.Option>
                  <Select.Option value="axillary">Axillary</Select.Option>
                  <Select.Option value="tympanic">Tympanic</Select.Option>
                  <Select.Option value="rectal">Rectal</Select.Option>
                </Select>
              </Input.Group>
              {values.temperature && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                  {(values.temperature * 9/5 + 32).toFixed(1)}°F
                </div>
              )}
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Normal: 36.5-37.5°C
              </div>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          {/* Pulse Rate */}
          <Col span={12}>
            <Form.Item label="Pulse Rate (bpm)">
              <Input.Group compact>
                <InputNumber
                  placeholder="Rate"
                  value={values.pulseRate}
                  onChange={(val) => onChange({ ...values, pulseRate: val })}
                  min={30}
                  max={250}
                  style={{ width: '60%' }}
                />
                <Select
                  value={values.pulseRhythm || 'regular'}
                  onChange={(val) => onChange({ ...values, pulseRhythm: val })}
                  style={{ width: '40%' }}
                >
                  <Select.Option value="regular">Regular</Select.Option>
                  <Select.Option value="irregular">Irregular</Select.Option>
                </Select>
              </Input.Group>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Normal: 60-100 bpm
              </div>
            </Form.Item>
          </Col>
          
          {/* Respiratory Rate */}
          <Col span={12}>
            <Form.Item label="Respiratory Rate (/min)">
              <InputNumber
                placeholder="Rate"
                value={values.respiratoryRate}
                onChange={(val) => onChange({ ...values, respiratoryRate: val })}
                min={5}
                max={60}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Normal: 12-20 /min
              </div>
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          {/* SpO2 */}
          <Col span={8}>
            <Form.Item label="SpO2 (%)">
              <InputNumber
                placeholder="SpO2"
                value={values.spo2}
                onChange={(val) => onChange({ ...values, spo2: val })}
                min={70}
                max={100}
                suffix="%"
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                Normal: 95-100%
              </div>
            </Form.Item>
          </Col>
          
          {/* Weight */}
          <Col span={8}>
            <Form.Item label="Weight (kg)">
              <InputNumber
                placeholder="Weight"
                value={values.weight}
                onChange={(val) => onChange({ ...values, weight: val })}
                min={0.5}
                max={300}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          
          {/* Height */}
          <Col span={8}>
            <Form.Item label="Height (cm)">
              <InputNumber
                placeholder="Height"
                value={values.height}
                onChange={(val) => onChange({ ...values, height: val })}
                min={40}
                max={250}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        {/* BMI (auto-calculated) */}
        {values.bmi && (
          <Row>
            <Col span={24}>
              <div style={{ padding: 12, background: '#F0F9FF', borderRadius: 4 }}>
                <strong>BMI:</strong> {values.bmi.toFixed(1)} kg/m² 
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {values.bmiCategory}
                </Tag>
              </div>
            </Col>
          </Row>
        )}
        
        {/* Pain Assessment */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="Pain Assessment">
              <div>
                <div style={{ marginBottom: 8 }}>Pain Scale (0-10):</div>
                <Slider
                  min={0}
                  max={10}
                  value={values.painScale || 0}
                  onChange={(val) => onChange({ ...values, painScale: val })}
                  marks={{
                    0: '0 - No pain',
                    3: '3 - Mild',
                    6: '6 - Moderate',
                    9: '9 - Severe',
                    10: '10 - Worst'
                  }}
                />
              </div>
              {values.painScale > 0 && (
                <>
                  <Input
                    placeholder="Pain location (e.g., chest, abdomen)"
                    value={values.painLocation}
                    onChange={(e) => onChange({ ...values, painLocation: e.target.value })}
                    style={{ marginTop: 8 }}
                  />
                  <Select
                    placeholder="Pain character"
                    value={values.painCharacter}
                    onChange={(val) => onChange({ ...values, painCharacter: val })}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    <Select.Option value="sharp">Sharp</Select.Option>
                    <Select.Option value="dull">Dull</Select.Option>
                    <Select.Option value="burning">Burning</Select.Option>
                    <Select.Option value="throbbing">Throbbing</Select.Option>
                    <Select.Option value="cramping">Cramping</Select.Option>
                  </Select>
                </>
              )}
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};
```

Include:
- Real-time validation for all fields
- Color-coded borders (green/orange/red)
- Age-appropriate ranges shown
- Auto-calculations (BMI, pulse pressure, MAP)
- Unit conversions (°C to °F)
- Responsive layout (mobile-friendly)

File: src/components/triage/VitalSignsForm.tsx
```

---

## STEP 8: Frontend - Triage Level Selector

### Windsurf Prompt:
```
Create the triage level selection component with visual Manchester Triage System levels.

Component: TriageLevelSelector

Display:
- System suggestion (if available)
- 5 level cards (Red/Orange/Yellow/Green/Blue)
- Override reason if nurse selects different from suggestion

Implementation:

```tsx
import React, { useState } from 'react';
import { Card, Row, Col, Input, Alert } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const TRIAGE_LEVELS = [
  {
    level: 1,
    name: 'Red - Immediate',
    color: '#DC2626',
    targetTime: 'Immediate (0 min)',
    description: 'Life-threatening',
    icon: '🚨'
  },
  {
    level: 2,
    name: 'Orange - Very Urgent',
    color: '#EA580C',
    targetTime: 'Within 10 minutes',
    description: 'Potentially serious',
    icon: '⚠️'
  },
  {
    level: 3,
    name: 'Yellow - Urgent',
    color: '#EAB308',
    targetTime: 'Within 60 minutes',
    description: 'Moderate symptoms',
    icon: '⏰'
  },
  {
    level: 4,
    name: 'Green - Standard',
    color: '#16A34A',
    targetTime: 'Within 2 hours',
    description: 'Non-urgent',
    icon: '✅'
  },
  {
    level: 5,
    name: 'Blue - Non-urgent',
    color: '#3B82F6',
    targetTime: 'Within 4 hours',
    description: 'Very minor',
    icon: 'ℹ️'
  }
];

interface TriageLevelSelectorProps {
  suggestion?: {
    suggestedLevel: number;
    levelName: string;
    confidence: number;
    triggers: string[];
    recommendation: string;
  };
  selected: number | null;
  onSelect: (level: number, overrideReason?: string) => void;
}

export const TriageLevelSelector: React.FC<TriageLevelSelectorProps> = ({
  suggestion,
  selected,
  onSelect
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  
  const handleSelect = (level: number) => {
    if (suggestion && level !== suggestion.suggestedLevel) {
      // Override - need reason
      setShowReasonInput(true);
    }
    onSelect(level, overrideReason);
  };
  
  const isOverride = selected && suggestion && selected !== suggestion.suggestedLevel;
  
  return (
    <Card title="Triage Priority Level">
      {/* System Suggestion */}
      {suggestion && (
        <Alert
          type="info"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="System Suggestion"
          description={
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                {suggestion.levelName}
              </div>
              <div style={{ marginBottom: 4 }}>
                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: 12 }}>
                <strong>Triggers:</strong>
                <ul style={{ marginTop: 4, marginBottom: 0 }}>
                  {suggestion.triggers.map((trigger, i) => (
                    <li key={i}>{trigger}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                {suggestion.recommendation}
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Level Cards */}
      <Row gutter={[8, 8]}>
        {TRIAGE_LEVELS.map((level) => (
          <Col span={24 / TRIAGE_LEVELS.length} key={level.level}>
            <Card
              hoverable
              onClick={() => handleSelect(level.level)}
              style={{
                borderColor: selected === level.level ? level.color : '#d9d9d9',
                borderWidth: selected === level.level ? 3 : 1,
                backgroundColor: selected === level.level ? `${level.color}10` : '#fff',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>
                {level.icon}
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: level.color,
                  margin: '0 auto 8px'
                }}
              />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {level.name}
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                {level.targetTime}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {level.description}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Override Reason */}
      {isOverride && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type="warning"
            message="Override Detected"
            description={`You selected ${TRIAGE_LEVELS[selected - 1].name} but system suggested ${suggestion.levelName}.`}
            style={{ marginBottom: 8 }}
          />
          <Input.TextArea
            placeholder="Please explain why you're overriding the system suggestion..."
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={3}
            required
          />
        </div>
      )}
    </Card>
  );
};
```

Features:
- Visual color-coded cards
- Click to select
- Show system suggestion prominently
- Alert if nurse overrides suggestion
- Require reason for override
- Mobile-responsive (stack on small screens)

File: src/components/triage/TriageLevelSelector.tsx
```

---

## STEP 9: Frontend - Patient Vital Signs Trending Chart

### Windsurf Prompt:
```
Create a vital signs trending chart for doctors to view during consultation.

Component: VitalSignsTrendChart

Route: Embedded in patient profile or consultation view
Users: Doctors, nurses

Display multiple vital signs trends over time (last 10 visits).

Implementation:

```tsx
import React from 'react';
import { Card, Tabs } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useQuery } from '@tanstack/react-query';

interface VitalSignsTrendChartProps {
  patientId: string;
}

export const VitalSignsTrendChart: React.FC<VitalSignsTrendChartProps> = ({ patientId }) => {
  const { data: history } = useQuery(
    ['vital-signs-history', patientId],
    () => fetchVitalSignsHistory(patientId)
  );
  
  if (!history || history.length === 0) {
    return <Empty description="No vital signs history available" />;
  }
  
  // Transform data for charts
  const chartData = history.map(record => ({
    date: format(new Date(record.triageDate), 'MMM dd'),
    systolic: record.bpSystolic,
    diastolic: record.bpDiastolic,
    temperature: record.temperature,
    pulse: record.pulseRate,
    spo2: record.spo2,
    weight: record.weight
  }));
  
  return (
    <Card title="Vital Signs Trends">
      <Tabs defaultActiveKey="bp">
        {/* Blood Pressure */}
        <Tabs.TabPane tab="Blood Pressure" key="bp">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[60, 200]} label={{ value: 'mmHg', angle: -90 }} />
              <Tooltip />
              <Legend />
              
              {/* Reference lines for normal range */}
              <ReferenceLine y={120} stroke="#16A34A" strokeDasharray="3 3" label="Normal high (120)" />
              <ReferenceLine y={80} stroke="#16A34A" strokeDasharray="3 3" label="Normal low (80)" />
              <ReferenceLine y={140} stroke="#EA580C" strokeDasharray="3 3" label="High (140)" />
              
              <Line type="monotone" dataKey="systolic" stroke="#DC2626" strokeWidth={2} name="Systolic" />
              <Line type="monotone" dataKey="diastolic" stroke="#3B82F6" strokeWidth={2} name="Diastolic" />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.TabPane>
        
        {/* Temperature */}
        <Tabs.TabPane tab="Temperature" key="temp">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[35, 41]} label={{ value: '°C', angle: -90 }} />
              <Tooltip />
              <Legend />
              
              <ReferenceLine y={37.5} stroke="#16A34A" strokeDasharray="3 3" label="Fever threshold" />
              <ReferenceLine y={39} stroke="#EA580C" strokeDasharray="3 3" label="High fever" />
              
              <Line type="monotone" dataKey="temperature" stroke="#DC2626" strokeWidth={2} name="Temperature" />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.TabPane>
        
        {/* Pulse Rate */}
        <Tabs.TabPane tab="Pulse" key="pulse">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[40, 140]} label={{ value: 'bpm', angle: -90 }} />
              <Tooltip />
              <Legend />
              
              <ReferenceLine y={60} stroke="#16A34A" strokeDasharray="3 3" label="Normal low (60)" />
              <ReferenceLine y={100} stroke="#16A34A" strokeDasharray="3 3" label="Normal high (100)" />
              
              <Line type="monotone" dataKey="pulse" stroke="#3B82F6" strokeWidth={2} name="Pulse Rate" />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.TabPane>
        
        {/* SpO2 */}
        <Tabs.TabPane tab="SpO2" key="spo2">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[85, 100]} label={{ value: '%', angle: -90 }} />
              <Tooltip />
              <Legend />
              
              <ReferenceLine y={95} stroke="#16A34A" strokeDasharray="3 3" label="Normal (95%)" />
              <ReferenceLine y={90} stroke="#DC2626" strokeDasharray="3 3" label="Critical (<90%)" />
              
              <Line type="monotone" dataKey="spo2" stroke="#16A34A" strokeWidth={2} name="SpO2" />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.TabPane>
        
        {/* Weight */}
        <Tabs.TabPane tab="Weight" key="weight">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'kg', angle: -90 }} />
              <Tooltip />
              <Legend />
              
              <Line type="monotone" dataKey="weight" stroke="#8B5CF6" strokeWidth={2} name="Weight" />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.TabPane>
      </Tabs>
    </Card>
  );
};
```

Features:
- Multiple tabs for different vital signs
- Reference lines showing normal ranges
- Color-coded (green=normal range, red/orange=abnormal thresholds)
- Responsive
- Tooltips on hover showing exact values

Use: Recharts library
File: src/components/triage/VitalSignsTrendChart.tsx
```

---

## STEP 10: Testing & Integration

### Windsurf Prompt:
```
Create comprehensive tests for the triage module.

Based on triage_module_implementation.json testing requirements:

1. **Unit Tests**

File: src/utils/vital-signs-validators.test.ts
```typescript
describe('Vital Signs Validation', () => {
  describe('validateBloodPressure', () => {
    it('should mark critical high BP as Red triage', () => {
      const result = validateBloodPressure(190, 115);
      expect(result.severityLevel).toBe(1); // Red
      expect(result.category).toBe('critical_high');
    });
    
    it('should mark normal BP as normal', () => {
      const result = validateBloodPressure(110, 70);
      expect(result.severityLevel).toBe(0);
      expect(result.category).toBe('normal');
    });
    
    it('should reject systolic < diastolic', () => {
      const result = validateBloodPressure(80, 120);
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('suggestTriageLevel', () => {
    it('should suggest Red for critical vitals', () => {
      const result = suggestTriageLevel({
        bpSystolic: 190,
        bpDiastolic: 115,
        heartRate: 130,
        spo2: 85
      }, 9);
      
      expect(result.suggestedLevel).toBe(1);
      expect(result.triggers).toContain('Critical BP');
      expect(result.triggers).toContain('Low SpO2');
    });
    
    it('should suggest Orange for high fever + pain', () => {
      const result = suggestTriageLevel({
        temperature: 39.5
      }, 8);
      
      expect(result.suggestedLevel).toBe(2);
    });
    
    it('should suggest Green for normal vitals', () => {
      const result = suggestTriageLevel({
        bpSystolic: 110,
        bpDiastolic: 70,
        temperature: 37.0,
        heartRate: 75,
        spo2: 98
      }, 0);
      
      expect(result.suggestedLevel).toBe(4);
    });
  });
});
```

2. **Integration Tests**

File: tests/integration/triage.test.ts
```typescript
describe('Triage API', () => {
  describe('POST /api/triage', () => {
    it('should create triage and update appointment status', async () => {
      // Create patient and appointment first
      const appointment = await createTestAppointment({
        status: 'CHECKED_IN'
      });
      
      const triageData = {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        vitalSigns: {
          bpSystolic: 120,
          bpDiastolic: 80,
          temperature: 37.0,
          pulseRate: 75,
          respiratoryRate: 16,
          spo2: 98,
          weight: 70,
          height: 170
        },
        assessment: {
          chiefComplaint: 'Routine checkup',
          symptomSeverity: 'mild'
        },
        triageLevel: 4
      };
      
      const response = await request(app)
        .post('/api/triage')
        .send(triageData)
        .expect(201);
      
      expect(response.body.data.triageRecord).toBeDefined();
      expect(response.body.data.triageRecord.bmi).toBeCloseTo(24.2, 1);
      
      // Verify appointment updated
      const updatedAppointment = await prisma.appointments.findUnique({
        where: { id: appointment.id }
      });
      expect(updatedAppointment.status).toBe('TRIAGED');
    });
    
    it('should send alert for Red triage', async () => {
      const triageData = {
        // ... patient with critical vitals
        triageLevel: 1
      };
      
      const response = await request(app)
        .post('/api/triage')
        .send(triageData)
        .expect(201);
      
      expect(response.body.data.alertSent).toBe(true);
      
      // Verify alert created
      const alerts = await prisma.triageAlerts.findMany({
        where: { triageId: response.body.data.triageRecord.id }
      });
      expect(alerts).toHaveLength(1);
    });
    
    it('should prevent duplicate triage', async () => {
      const appointment = await createTestAppointment();
      
      // Create first triage
      await createTriage({ appointmentId: appointment.id });
      
      // Try to create second triage
      await request(app)
        .post('/api/triage')
        .send({ appointmentId: appointment.id, ... })
        .expect(409); // Conflict
    });
  });
  
  describe('GET /api/triage/queue', () => {
    it('should return only untriaged patients', async () => {
      // Create 3 patients
      const p1 = await createTestAppointment({ status: 'CHECKED_IN' });
      const p2 = await createTestAppointment({ status: 'CHECKED_IN' });
      const p3 = await createTestAppointment({ status: 'CHECKED_IN' });
      
      // Triage one
      await createTriage({ appointmentId: p2.id });
      
      const response = await request(app)
        .get('/api/triage/queue')
        .expect(200);
      
      expect(response.body.data.queue).toHaveLength(2);
      expect(response.body.data.queue.map(p => p.appointmentId))
        .toContain(p1.id);
      expect(response.body.data.queue.map(p => p.appointmentId))
        .not.toContain(p2.id); // Already triaged
    });
  });
});
```

3. **E2E Tests (Cypress)**

File: cypress/e2e/triage.cy.ts
```typescript
describe('Triage Station', () => {
  it('should complete full triage workflow', () => {
    // Login as nurse
    cy.login('nurse@hospital.com', 'password');
    
    // Navigate to triage station
    cy.visit('/triage');
    
    // Select patient from queue
    cy.contains('W-001').click();
    
    // Enter vital signs
    cy.get('[data-testid="bp-systolic"]').type('120');
    cy.get('[data-testid="bp-diastolic"]').type('80');
    cy.get('[data-testid="temperature"]').type('37.0');
    cy.get('[data-testid="pulse-rate"]').type('75');
    cy.get('[data-testid="respiratory-rate"]').type('16');
    cy.get('[data-testid="spo2"]').type('98');
    cy.get('[data-testid="weight"]').type('70');
    cy.get('[data-testid="height"]').type('170');
    
    // BMI should auto-calculate
    cy.contains('BMI: 24.2').should('be.visible');
    
    // Enter chief complaint
    cy.get('[data-testid="chief-complaint"]').type('Routine checkup');
    
    // System should suggest triage level
    cy.contains('System suggests: Green - Standard').should('be.visible');
    
    // Select triage level
    cy.get('[data-testid="triage-level-4"]').click();
    
    // Save
    cy.contains('Save Triage').click();
    
    // Success message
    cy.contains('Triage saved successfully').should('be.visible');
    
    // Patient should disappear from queue
    cy.contains('W-001').should('not.exist');
  });
  
  it('should alert on critical vitals', () => {
    cy.login('nurse@hospital.com', 'password');
    cy.visit('/triage');
    
    cy.contains('W-002').click();
    
    // Enter critical BP
    cy.get('[data-testid="bp-systolic"]').type('190');
    cy.get('[data-testid="bp-diastolic"]').type('120');
    
    // Should show red warning
    cy.contains('CRITICAL').should('be.visible');
    
    // System should suggest Red
    cy.contains('Red - Immediate').should('be.visible');
  });
});
```

Run all tests:
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run cypress:run
```
```

---

## 📊 IMPLEMENTATION CHECKLIST

### Week 1: Backend Core
- [ ] Database schema (all 3 tables)
- [ ] Vital signs validators
- [ ] Triage CRUD APIs
- [ ] Queue reprioritization service
- [ ] Alert service

### Week 2: Frontend
- [ ] Triage station main page
- [ ] Vital signs form component
- [ ] Chief complaint form
- [ ] Triage level selector
- [ ] Queue panel
- [ ] Vital signs trend chart
- [ ] Testing (unit + integration + E2E)

---

## 🎯 SUCCESS CRITERIA

**Functional:**
✅ All patients triaged before seeing doctor  
✅ Vital signs captured for >95% of patients  
✅ Triage level assigned 100% of patients  
✅ Red alerts sent within 30 seconds  
✅ Queue auto-reprioritizes after triage  

**Performance:**
✅ Average triage time <5 minutes  
✅ Wait for triage <15 minutes  
✅ 12+ patients triaged per nurse per hour  
✅ Form save <1 second  

**User Satisfaction:**
✅ Nurses: 4.5+ stars (easy to use)  
✅ Doctors: 4.5+ stars (accurate prioritization)  
✅ Clinical impact: Emergency cases seen within 5 min  

---

## 💡 PRO TIPS

1. **Start with database** - Get schema right first
2. **Test validators thoroughly** - Critical for patient safety
3. **Real-time validation** - Don't wait until submit to validate
4. **Color code everything** - Visual feedback helps nurses work faster
5. **Auto-calculations** - BMI, pulse pressure - reduce manual work
6. **Mobile-first** - Many nurses use tablets
7. **Keyboard shortcuts** - Tab navigation, Ctrl+S to save
8. **Auto-save drafts** - Don't lose work if browser crashes

---

## 🚀 AFTER TRIAGE MODULE

With triage complete, your patient flow will be:

```
Registration ✅ → Appointment ✅ → Triage ✅ → Consultation ❌ → Lab/Pharmacy ❌ → Billing ❌
```

**Next module:** EMR/Clinical Consultation (where doctors document patient encounters)

Ready to start? Begin with **Step 1: Database Schema**! 🎯

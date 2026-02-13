# Appointment Scheduling Module - Implementation Guide

## 🎯 Your Implementation Strategy

Based on your selections:
- ✅ **Challenge**: Managing walk-ins vs appointments (hybrid system)
- ✅ **Booking Channels**: ALL 5 (Reception, Portal, Phone, WhatsApp, Walk-in)
- ✅ **Slot Optimization**: AI-powered based on historical data

This is the **most comprehensive and advanced** appointment system. You're building something that will revolutionize patient flow in Ghana hospitals!

---

## 📋 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                   BOOKING CHANNELS                       │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│Reception │ Portal   │  Phone   │ WhatsApp │  Walk-in    │
│  (Web)   │ (Patient)│ (Agents) │   (Bot)  │  (Queue)    │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘
     │          │          │          │            │
     └──────────┴──────────┴──────────┴────────────┘
                         │
              ┌──────────▼────────────┐
              │  APPOINTMENT ENGINE   │
              │  - Slot Management    │
              │  - AI Optimization    │
              │  - Conflict Detection │
              │  - Queue Management   │
              └──────────┬────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
┌────▼─────┐    ┌───────▼────────┐   ┌─────▼──────┐
│  Doctor  │    │   Walk-in      │   │    SMS/    │
│ Schedule │    │     Queue      │   │  WhatsApp  │
│Management│    │   Management   │   │  Gateway   │
└──────────┘    └────────────────┘   └────────────┘
```

---

## STEP 1: Database Schema

### Windsurf Prompt:
```
Based on appointment_scheduling_implementation.json, create the complete Prisma database schema for appointment scheduling.

Include these tables:
1. doctor_schedules - Weekly schedule templates
2. schedule_exceptions - Leave, holidays, special hours
3. appointment_types - Types with durations and colors
4. appointments - Main appointments table
5. walk_in_queue - Active walk-in queue (view or table)
6. appointment_reminders - SMS/WhatsApp log
7. appointment_reschedule_history - Audit trail
8. ai_slot_predictions - AI model predictions

Key requirements:
- Support hybrid scheduling (appointments + walk-in buffer)
- Track appointment status flow (SCHEDULED → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED)
- Store booking channel (reception, portal, phone, whatsapp, walkin)
- Queue management (queue_number, priority, estimated_wait)
- AI predictions storage
- SMS delivery tracking

Additional features:
- Soft delete support
- Comprehensive indexing for performance
- Status enums
- Multi-tenancy support

Create:
1. schema.prisma file with all tables and relations
2. Initial migration
3. Seed file with:
   - 6 default appointment types
   - Sample doctor schedules (2-3 doctors)
   - Ghana public holidays for 2024
   - 50 sample appointments (various statuses)

Location: backend/prisma/
```

---

## STEP 2: Doctor Schedule Management API

### Windsurf Prompt:
```
Create the doctor schedule management system.

Based on appointment_scheduling_implementation.json:

1. **API Endpoints**

POST /api/schedules/doctors/:doctorId/weekly
- Create weekly schedule template
- Specify working hours per day of week
- Set appointment types allowed
- Set location (room number)

GET /api/schedules/doctors/:doctorId/weekly
- Get doctor's weekly template

PUT /api/schedules/doctors/:doctorId/exceptions
- Add exception for specific date (leave, half-day, holiday)
- Override working hours for special dates

GET /api/schedules/doctors/:doctorId/availability
- Query params: date
- Returns: Working hours for that specific date
- Considers: Weekly template + Exceptions + Public holidays

2. **Business Logic**

ScheduleService with methods:
- getDoctorAvailability(doctorId, date): Returns working hours
- isWorkingDay(doctorId, date): Boolean
- getWorkingHours(doctorId, date): { startTime, endTime }
- addException(doctorId, date, type, hours)
- bulkAddExceptions(doctorId, dates[]) // For holiday imports

3. **Ghana Public Holidays Integration**

Create constant file with 2024 Ghana public holidays:
- New Year's Day (Jan 1)
- Independence Day (Mar 6)
- Good Friday (Mar 29)
- Easter Monday (Apr 1)
- May Day (May 1)
- Founders' Day (Aug 4)
- Kwame Nkrumah Memorial Day (Sep 21)
- Christmas (Dec 25)
- Boxing Day (Dec 26)

Automatically block appointments on these dates.

4. **Validation**

- Start time must be before end time
- No overlapping schedules for same doctor
- Exception dates must be future dates
- Working hours must be within reasonable range (6 AM - 10 PM)

Implementation structure:
- Routes: src/routes/schedule.routes.ts
- Controllers: src/controllers/schedule.controller.ts
- Services: src/services/schedule.service.ts
- Constants: src/constants/public-holidays.ts
- DTOs: src/dtos/schedule.dto.ts
```

---

## STEP 3: AI Slot Duration Prediction

### Windsurf Prompt:
```
Create an AI-powered appointment duration prediction system.

Based on appointment_scheduling_implementation.json ai_slot_optimization:

1. **Data Collection Service**

File: src/services/appointment-analytics.service.ts

Methods:
- collectHistoricalData(doctorId, months=6): Query completed appointments
- calculateActualDurations(): completed_at - started_at
- extractFeatures(appointment): Return feature vector
  Features to extract:
  - appointment_type
  - doctor_id  
  - patient_age
  - day_of_week (0-6)
  - time_of_day (morning/afternoon/evening)
  - is_first_appointment
  - patient_complexity (count of chronic conditions)
  
- prepareTrainingData(): Export to CSV for ML model

2. **Python ML Model** (Separate microservice)

File: ai-services/duration-predictor/train_model.py

```python
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

def train_duration_model(data_path):
    # Load data
    df = pd.read_csv(data_path)
    
    # Feature engineering
    df['hour'] = pd.to_datetime(df['start_time']).dt.hour
    df['is_morning'] = df['hour'] < 12
    
    # Features and target
    features = ['appointment_type_id', 'doctor_id', 'patient_age', 
                'day_of_week', 'hour', 'is_first_appointment', 
                'patient_complexity']
    X = df[features]
    y = df['actual_duration_minutes']
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    # Train model
    model = GradientBoostingRegressor(n_estimators=100, max_depth=5)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f'MAE: {mae:.2f} minutes')
    print(f'R²: {r2:.3f}')
    
    # Save model
    joblib.dump(model, 'duration_model.pkl')
    
    return model
```

Create prediction API:
File: ai-services/duration-predictor/app.py

```python
from flask import Flask, request, jsonify
import joblib
import pandas as pd

app = Flask(__name__)
model = joblib.load('duration_model.pkl')

@app.route('/predict-duration', methods=['POST'])
def predict_duration():
    data = request.json
    
    # Create feature vector
    features = pd.DataFrame([{
        'appointment_type_id': data['appointment_type_id'],
        'doctor_id': data['doctor_id'],
        'patient_age': data['patient_age'],
        'day_of_week': data['day_of_week'],
        'hour': data['hour'],
        'is_first_appointment': data['is_first_appointment'],
        'patient_complexity': data['patient_complexity']
    }])
    
    # Predict
    duration = model.predict(features)[0]
    
    # Round to nearest 5 minutes
    duration = round(duration / 5) * 5
    
    return jsonify({
        'predicted_duration_minutes': int(duration),
        'confidence': 0.85  # TODO: Calculate actual confidence interval
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

3. **Integration with Booking System**

In Node.js backend:

File: src/services/ai-prediction.service.ts

```typescript
import axios from 'axios';

export class AIPredictionService {
  private aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
  
  async predictDuration(params: {
    appointmentTypeId: string;
    doctorId: string;
    patientAge: number;
    appointmentDate: Date;
    isFirstAppointment: boolean;
    patientComplexity: number;
  }): Promise<number> {
    try {
      const response = await axios.post(`${this.aiServiceUrl}/predict-duration`, {
        appointment_type_id: params.appointmentTypeId,
        doctor_id: params.doctorId,
        patient_age: params.patientAge,
        day_of_week: params.appointmentDate.getDay(),
        hour: params.appointmentDate.getHours(),
        is_first_appointment: params.isFirstAppointment,
        patient_complexity: params.patientComplexity
      });
      
      return response.data.predicted_duration_minutes;
    } catch (error) {
      // Fallback to default duration if AI service unavailable
      console.error('AI prediction failed, using default duration:', error);
      return this.getDefaultDuration(params.appointmentTypeId);
    }
  }
  
  private getDefaultDuration(appointmentTypeId: string): number {
    // Fallback durations
    const defaults = {
      'new_consultation': 30,
      'follow_up': 20,
      'procedure': 60,
      'vaccination': 15
    };
    return defaults[appointmentTypeId] || 30;
  }
}
```

4. **Monthly Retraining Script**

File: scripts/retrain-duration-model.ts

```typescript
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function retrainDurationModel() {
  console.log('Collecting training data...');
  
  // Get last 6 months of completed appointments
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const appointments = await prisma.appointments.findMany({
    where: {
      status: 'COMPLETED',
      completed_at: { gte: sixMonthsAgo },
      actual_duration_minutes: { not: null }
    },
    include: {
      patient: true,
      appointmentType: true
    }
  });
  
  // Convert to CSV
  const csv = convertToCSV(appointments);
  fs.writeFileSync('./ai-services/duration-predictor/training_data.csv', csv);
  
  console.log(`Exported ${appointments.length} appointments for training`);
  
  // Run Python training script
  exec('python ai-services/duration-predictor/train_model.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Training failed:', error);
      return;
    }
    console.log('Training output:', stdout);
    console.log('Model retrained successfully!');
  });
}

function convertToCSV(appointments: any[]): string {
  // Implementation
}

retrainDurationModel();
```

Set up cron job to run monthly:
```bash
0 0 1 * * node scripts/retrain-duration-model.js
```

Deliverables:
- Node.js data collection service
- Python ML training script
- Flask prediction API
- Integration service in backend
- Monthly retraining script
- Docker setup for AI service
- Fallback to default durations if AI unavailable
```

---

## STEP 4: Appointment Booking API (Core)

### Windsurf Prompt:
```
Create the core appointment booking API with conflict detection and AI integration.

Based on appointment_scheduling_implementation.json api_endpoints:

1. **POST /api/appointments/available-slots**

This is the CRITICAL endpoint - used by all booking channels.

```typescript
interface AvailableSlotsRequest {
  doctorId: string;
  date: Date;
  appointmentTypeId?: string; // For AI duration prediction
  patientId?: string; // For personalized prediction
}

interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "09:30"
  durationMinutes: number;
  isAvailable: boolean;
  slotType: 'appointment' | 'walk_in_buffer' | 'emergency_buffer';
  bookedBy?: string; // Patient name if booked
}

interface AvailableSlotsResponse {
  date: string;
  doctor: DoctorSummary;
  workingHours: { start: string; end: string };
  slots: TimeSlot[];
  walkInQueueLength: number;
  estimatedWaitForWalkIn: number; // minutes
}
```

Algorithm:
```
1. Get doctor's working hours for that date (schedule template + exceptions)
2. Get all existing appointments for that doctor on that date
3. If appointmentTypeId provided:
   - Call AI service to predict optimal duration
4. Else:
   - Use default duration for appointment type
5. Calculate slot allocation:
   - Total minutes available
   - Allocate 70% for appointments, 20% for walk-in buffer, 10% for emergency
   - Adjust based on day/time patterns (e.g., Monday mornings get 30% walk-in)
6. Generate time slots:
   - Start from working_hours.start
   - Create slots until working_hours.end
   - Skip lunch break (12-1 PM)
   - Mark booked slots as unavailable
   - Mark walk-in buffer slots with slotType='walk_in_buffer'
7. Return slots array
```

2. **POST /api/appointments**

Create appointment with conflict detection:

```typescript
interface CreateAppointmentRequest {
  patientId: string;
  doctorId: string;
  appointmentTypeId: string;
  appointmentDate: Date;
  startTime: string; // "09:00"
  durationMinutes?: number; // Optional, will use AI if not provided
  bookingChannel: 'reception' | 'portal' | 'phone' | 'whatsapp' | 'walkin';
  chiefComplaint?: string;
  specialInstructions?: string;
  isWalkIn?: boolean;
  priority?: number; // 0=normal, 1=urgent, 2=emergency
}
```

Business logic:
```
1. Validate slot is still available (double-check to prevent race conditions)
2. If durationMinutes not provided:
   - Get patient age, complexity
   - Call AI prediction service
   - Use predicted duration
3. Check for conflicts:
   - Query existing appointments for this doctor at this time
   - If conflict found, return 409 error with alternative slots
4. Create appointment record
5. If isWalkIn:
   - Generate queue number (W-XXX)
   - Add to walk_in_queue
   - Calculate estimated wait time
   - Send queue SMS
6. Else:
   - Send booking confirmation SMS
7. Create reminder job for 24 hours before
8. Return created appointment
```

Implement transaction to prevent double-booking:
```typescript
async createAppointment(data: CreateAppointmentRequest) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check for conflicts with SELECT FOR UPDATE (row lock)
    const conflicts = await tx.appointments.findMany({
      where: {
        doctorId: data.doctorId,
        appointmentDate: data.appointmentDate,
        startTime: { lte: calculateEndTime(data.startTime, data.durationMinutes) },
        endTime: { gte: data.startTime },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      }
    });
    
    if (conflicts.length > 0) {
      throw new ConflictError('Slot already booked');
    }
    
    // 2. Create appointment
    const appointment = await tx.appointments.create({ data });
    
    return appointment;
  });
}
```

3. **Other Endpoints**

Implement these endpoints based on JSON spec:
- GET /api/appointments/:id
- PUT /api/appointments/:id
- POST /api/appointments/:id/cancel
- POST /api/appointments/:id/reschedule
- POST /api/appointments/:id/check-in
- POST /api/appointments/:id/complete
- POST /api/appointments/no-show/:id
- GET /api/appointments/search

Files to create:
- src/routes/appointment.routes.ts
- src/controllers/appointment.controller.ts
- src/services/appointment.service.ts
- src/services/slot-allocation.service.ts
- src/dtos/appointment.dto.ts
- src/utils/time-utils.ts (for time calculations)
```

---

## STEP 5: Walk-in Queue Management

### Windsurf Prompt:
```
Create the walk-in queue management system.

Based on appointment_scheduling_implementation.json walk_in_integration:

1. **POST /api/appointments/walk-in/add**

Add patient to walk-in queue:

```typescript
interface AddWalkInRequest {
  patientId: string;
  doctorId: string;
  priority?: number; // 0=normal, 1=urgent, 2=emergency
}

interface AddWalkInResponse {
  queueNumber: string; // "W-005"
  queuePosition: number; // 5
  estimatedWaitMinutes: number; // 45
  doctor: DoctorSummary;
  smsSent: boolean;
}
```

Logic:
```
1. Get current walk-in queue for this doctor today
2. Generate queue number:
   - Format: W-XXX (W for walk-in, XXX is sequential number)
   - Query max queue number for today, increment
3. Calculate queue position:
   - Count patients ahead in queue
   - Factor in priority (emergency=highest, urgent=middle, normal=lowest)
4. Estimate wait time:
   - Get average consultation duration for this doctor
   - Calculate: queue_position × average_duration
   - Add buffer (15% for unpredictability)
5. Create appointment record:
   - is_walk_in = true
   - status = CHECKED_IN (they're already at hospital)
   - queue_number = generated number
6. Send SMS:
   - "You're #5 in queue for Dr. Mensah. Est. wait: 45 mins. We'll SMS when ready."
7. Return queue info
```

2. **GET /api/appointments/walk-in/queue**

Get current queue for a doctor:

```typescript
interface QueueResponse {
  doctor: DoctorSummary;
  date: string;
  currentPatient: {
    queueNumber: string;
    patientName: string;
    startedAt: string;
  } | null;
  queue: Array<{
    queueNumber: string;
    patientName: string;
    patientPhoto?: string;
    priority: number;
    estimatedWaitMinutes: number;
    checkedInAt: string;
  }>;
  totalInQueue: number;
  averageWaitTime: number;
}
```

Logic:
```
1. Get current patient (status = IN_PROGRESS, is_walk_in = true)
2. Get queue (status = CHECKED_IN, is_walk_in = true, today)
3. Sort by priority DESC, then queue_position ASC
4. For each in queue:
   - Calculate position (index + 1)
   - Estimate wait time dynamically based on current patient's progress
5. Calculate average wait time from completed walk-ins today
6. Return queue data
```

3. **POST /api/appointments/walk-in/next**

Call next patient from queue:

```typescript
interface CallNextWalkInRequest {
  doctorId: string;
}

interface CallNextWalkInResponse {
  nextPatient: {
    appointmentId: string;
    patient: PatientSummary;
    queueNumber: string;
    smsSent: boolean;
  };
  updatedQueue: QueueResponse;
}
```

Logic:
```
1. Mark current patient as COMPLETED (if exists)
2. Get next patient from queue (highest priority, then oldest check-in time)
3. Update appointment status to IN_PROGRESS
4. Send SMS: "It's your turn! Please proceed to Room 201."
5. Update queue display (remove this patient from waiting list)
6. Recalculate estimated wait times for remaining patients
7. Return next patient info
```

4. **Real-time Queue Updates**

Implement WebSocket or Server-Sent Events for real-time updates:

```typescript
// src/services/queue-websocket.service.ts
import { WebSocketServer, WebSocket } from 'ws';

export class QueueWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();
  
  init(server: any) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      // Extract doctorId from query params
      const doctorId = new URL(req.url, 'http://localhost').searchParams.get('doctorId');
      
      if (!doctorId) {
        ws.close();
        return;
      }
      
      // Add client to doctor's subscriber list
      if (!this.clients.has(doctorId)) {
        this.clients.set(doctorId, new Set());
      }
      this.clients.get(doctorId)!.add(ws);
      
      // Send initial queue state
      this.sendQueueUpdate(doctorId);
      
      ws.on('close', () => {
        this.clients.get(doctorId)?.delete(ws);
      });
    });
  }
  
  async sendQueueUpdate(doctorId: string) {
    const queue = await this.getQueue(doctorId);
    const message = JSON.stringify({ type: 'queue_update', data: queue });
    
    this.clients.get(doctorId)?.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  private async getQueue(doctorId: string) {
    // Fetch queue from database
    // Return queue data
  }
}
```

Call `queueWebSocketService.sendQueueUpdate(doctorId)` whenever queue changes:
- Patient added to queue
- Patient called (status → IN_PROGRESS)
- Patient removed from queue
- Appointment completed

5. **Queue Display TV Screen API**

```typescript
// GET /api/queue-display/:doctorId
// Public endpoint (no auth) for TV display

interface QueueDisplayResponse {
  hospital: {
    name: string;
    logo: string;
  };
  doctor: {
    name: string;
    specialty: string;
  };
  currentTime: string;
  nowServing: {
    queueNumber: string;
    patientName: string; // First name only for privacy
    roomNumber: string;
  } | null;
  queue: Array<{
    queueNumber: string;
    patientName: string; // First name only
    status: 'NEXT' | 'WAITING';
  }>;
}
```

This endpoint refreshes every 30 seconds on TV screen.

Files to create:
- src/services/walk-in-queue.service.ts
- src/services/queue-websocket.service.ts
- src/controllers/walk-in.controller.ts
- src/routes/walk-in.routes.ts
```

---

## STEP 6: SMS & WhatsApp Notifications

### Windsurf Prompt:
```
Integrate SMS and WhatsApp notifications using Hubtel (Ghana provider).

Based on appointment_scheduling_implementation.json sms_whatsapp_notifications:

1. **SMS Service (Hubtel)**

File: src/services/sms.service.ts

```typescript
import axios from 'axios';

export class SMSService {
  private clientId = process.env.HUBTEL_CLIENT_ID!;
  private clientSecret = process.env.HUBTEL_CLIENT_SECRET!;
  private apiUrl = 'https://sms.hubtel.com/v1/messages/send';
  
  async sendSMS(params: {
    to: string; // Phone number: +233XXXXXXXXX
    message: string;
    appointmentId?: string; // For logging
  }): Promise<boolean> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          From: 'YourHospital', // Sender ID (register with Hubtel)
          To: params.to,
          Content: params.message
        },
        {
          auth: {
            username: this.clientId,
            password: this.clientSecret
          }
        }
      );
      
      // Log SMS sent
      if (params.appointmentId) {
        await this.logSMS({
          appointmentId: params.appointmentId,
          sentTo: params.to,
          message: params.message,
          deliveryStatus: 'sent',
          cost: 0.05 // GHS 0.05 per SMS
        });
      }
      
      return response.data.status === 'Success';
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }
  
  async sendBookingConfirmation(appointment: Appointment) {
    const message = this.formatBookingConfirmation(appointment);
    return this.sendSMS({
      to: appointment.patient.phone_primary,
      message,
      appointmentId: appointment.id
    });
  }
  
  async send24HourReminder(appointment: Appointment) {
    const message = `Reminder: Your appointment with Dr. ${appointment.doctor.lastName} is TOMORROW at ${appointment.startTime}.\n\nReply:\n1-CONFIRM\n2-RESCHEDULE\n3-CANCEL\n\n-${hospitalName}`;
    
    return this.sendSMS({
      to: appointment.patient.phone_primary,
      message,
      appointmentId: appointment.id
    });
  }
  
  async send2HourReminder(appointment: Appointment) {
    const message = `Your appointment with Dr. ${appointment.doctor.lastName} is in 2 HOURS at ${appointment.startTime}.\n\nSee you soon at ${hospitalName}!`;
    
    return this.sendSMS({
      to: appointment.patient.phone_primary,
      message,
      appointmentId: appointment.id
    });
  }
  
  async sendWalkInQueueUpdate(params: {
    phone: string;
    queueNumber: string;
    doctorName: string;
    estimatedWait: number;
  }) {
    const message = `You're ${params.queueNumber} in queue for Dr. ${params.doctorName}.\n\nEstimated wait: ${params.estimatedWait} minutes.\n\nWe'll SMS when you're next!`;
    
    return this.sendSMS({
      to: params.phone,
      message
    });
  }
  
  async sendWalkInTurnNow(params: {
    phone: string;
    roomNumber: string;
  }) {
    const message = `It's your turn!\n\nPlease proceed to Room ${params.roomNumber}.`;
    
    return this.sendSMS({
      to: params.phone,
      message
    });
  }
  
  private formatBookingConfirmation(appointment: Appointment): string {
    return `Hi ${appointment.patient.firstName},\n\nYour appointment is confirmed:\n📅 ${formatDate(appointment.appointmentDate)}\n🕐 ${appointment.startTime}\n👨‍⚕️ Dr. ${appointment.doctor.lastName}\n📍 ${hospitalName}\n\nReply CANCEL to cancel.\n\n-${hospitalName}`;
  }
  
  private async logSMS(data: any) {
    await prisma.appointmentReminders.create({ data });
  }
}
```

2. **WhatsApp Service**

File: src/services/whatsapp.service.ts

```typescript
import axios from 'axios';

export class WhatsAppService {
  private apiUrl = process.env.WHATSAPP_API_URL!;
  private token = process.env.WHATSAPP_TOKEN!;
  
  async sendMessage(params: {
    to: string; // +233XXXXXXXXX
    message: string;
    buttons?: Array<{ id: string; title: string }>;
  }) {
    // Implementation using WhatsApp Business API
    // Similar to SMS but with richer formatting
  }
  
  async sendBookingConfirmation(appointment: Appointment) {
    return this.sendMessage({
      to: appointment.patient.phone_primary,
      message: this.formatConfirmation(appointment),
      buttons: [
        { id: 'view_details', title: 'View Details' },
        { id: 'add_calendar', title: 'Add to Calendar' }
      ]
    });
  }
  
  // Additional methods similar to SMS service
}
```

3. **Reminder Scheduler**

Use node-cron or BullMQ for job scheduling:

File: src/services/reminder-scheduler.service.ts

```typescript
import cron from 'node-cron';
import { subHours } from 'date-fns';

export class ReminderSchedulerService {
  constructor(
    private smsService: SMSService,
    private whatsappService: WhatsAppService
  ) {}
  
  start() {
    // Run every hour to check for reminders to send
    cron.schedule('0 * * * *', async () => {
      await this.send24HourReminders();
      await this.send2HourReminders();
    });
  }
  
  async send24HourReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get appointments scheduled for tomorrow that haven't received 24h reminder
    const appointments = await prisma.appointments.findMany({
      where: {
        appointmentDate: tomorrow,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminder_24h_sent: false
      },
      include: { patient: true, doctor: true }
    });
    
    for (const apt of appointments) {
      // Send SMS reminder
      await this.smsService.send24HourReminder(apt);
      
      // Mark as sent
      await prisma.appointments.update({
        where: { id: apt.id },
        data: { reminder_24h_sent: true }
      });
    }
    
    console.log(`Sent ${appointments.length} 24-hour reminders`);
  }
  
  async send2HourReminders() {
    const in2Hours = new Date();
    in2Hours.setHours(in2Hours.getHours() + 2);
    
    // Get appointments in 2 hours
    const appointments = await prisma.appointments.findMany({
      where: {
        appointmentDate: new Date(),
        startTime: { gte: in2Hours.toTimeString().slice(0, 5), lte: ... },
        reminder_2h_sent: false,
        status: { notIn: ['CANCELLED', 'COMPLETED', 'NO_SHOW'] }
      },
      include: { patient: true, doctor: true }
    });
    
    for (const apt of appointments) {
      await this.smsService.send2HourReminder(apt);
      
      await prisma.appointments.update({
        where: { id: apt.id },
        data: { reminder_2h_sent: true }
      });
    }
  }
}
```

4. **SMS Reply Handling** (Optional but recommended)

Handle patient replies to confirmation SMS:

```typescript
// POST /api/sms/webhook (Hubtel callback)

async handleSMSReply(req: Request, res: Response) {
  const { From, Content } = req.body;
  
  // Parse reply
  const reply = Content.trim().toLowerCase();
  
  if (reply === '1' || reply.includes('confirm')) {
    // Mark appointment as confirmed
    await this.confirmAppointment(From);
    
    // Send confirmation receipt
    await smsService.sendSMS({
      to: From,
      message: 'Thank you for confirming! See you tomorrow.'
    });
  } else if (reply === '2' || reply.includes('reschedule')) {
    // Send reschedule link
    await smsService.sendSMS({
      to: From,
      message: `To reschedule, visit ${portalUrl}/reschedule or call ${hospitalPhone}.`
    });
  } else if (reply === '3' || reply.includes('cancel')) {
    // Cancel appointment
    await this.cancelAppointment(From, 'Patient cancelled via SMS');
    
    await smsService.sendSMS({
      to: From,
      message: 'Your appointment has been cancelled. Book again anytime.'
    });
  }
  
  res.sendStatus(200);
}
```

Environment variables needed:
```
HUBTEL_CLIENT_ID=your_client_id
HUBTEL_CLIENT_SECRET=your_client_secret
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/your_phone_number_id/messages
WHATSAPP_TOKEN=your_whatsapp_token
```

Files to create:
- src/services/sms.service.ts
- src/services/whatsapp.service.ts
- src/services/reminder-scheduler.service.ts
- src/controllers/sms-webhook.controller.ts
```

---

## STEP 7: Frontend - Appointment Calendar

### Windsurf Prompt:
```
Create the main appointment calendar interface using FullCalendar.

Component: AppointmentCalendar

Features:
1. **Multi-View Calendar**
   - Day view (timeline, 8am-6pm)
   - Week view (7-day grid)
   - Month view (calendar with appointment counts)
   - List view (table of appointments)

2. **Doctor Filter**
   - Dropdown to select doctor
   - "All Doctors" option to see hospital-wide schedule
   - Multi-select for comparing 2-3 doctors

3. **Status Color Coding**
   - SCHEDULED: Blue
   - CONFIRMED: Green
   - CHECKED_IN: Orange
   - IN_PROGRESS: Purple
   - COMPLETED: Gray
   - NO_SHOW: Red
   - CANCELLED: Light gray (strikethrough)

4. **Appointment Card** (on calendar)
   - Time slot
   - Patient name (first name only for privacy)
   - Appointment type icon
   - Status badge
   - Click to view details

5. **Quick Actions** (right-click or hover menu)
   - Check In
   - Start Consultation
   - Complete
   - Reschedule
   - Cancel
   - View Patient Record

6. **Walk-in Queue Panel** (Sidebar)
   - Shows current walk-in queue
   - "Now Serving" section
   - Waiting patients list
   - [Add to Queue] button
   - [Call Next] button
   - Real-time updates via WebSocket

7. **Book Appointment Button**
   - Opens BookAppointmentModal

Implementation:

```tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

export const AppointmentCalendar: React.FC = () => {
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'list'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Fetch appointments
  const { data, refetch } = useQuery(
    ['appointments', selectedDoctor, view],
    () => fetchAppointments(selectedDoctor, getDateRange(view))
  );
  
  // WebSocket for real-time updates
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/appointments?doctorId=${selectedDoctor}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'appointment_updated') {
        refetch();
      }
    };
    
    return () => ws.close();
  }, [selectedDoctor]);
  
  // Transform appointments to FullCalendar events
  const events = appointments.map(apt => ({
    id: apt.id,
    title: `${apt.patient.firstName} - ${apt.appointmentType.name}`,
    start: `${apt.appointmentDate}T${apt.startTime}`,
    end: `${apt.appointmentDate}T${apt.endTime}`,
    backgroundColor: getColorByStatus(apt.status),
    extendedProps: { appointment: apt }
  }));
  
  // Handle event click
  const handleEventClick = (info: any) => {
    setSelectedAppointment(info.event.extendedProps.appointment);
    setShowDetailsModal(true);
  };
  
  // Handle date/time click (create appointment)
  const handleDateClick = (info: any) => {
    setPreselectedDoctor(selectedDoctor);
    setPreselectedDate(info.date);
    setShowBookingModal(true);
  };
  
  return (
    <div className="appointment-calendar">
      <div className="calendar-header">
        <Select
          placeholder="Select Doctor"
          value={selectedDoctor}
          onChange={setSelectedDoctor}
          options={doctors}
        />
        
        <Radio.Group value={view} onChange={e => setView(e.target.value)}>
          <Radio.Button value="day">Day</Radio.Button>
          <Radio.Button value="week">Week</Radio.Button>
          <Radio.Button value="month">Month</Radio.Button>
          <Radio.Button value="list">List</Radio.Button>
        </Radio.Group>
        
        <Button type="primary" onClick={() => setShowBookingModal(true)}>
          + Book Appointment
        </Button>
      </div>
      
      <div className="calendar-body">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={getViewName(view)}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          editable={true}
          eventDrop={handleEventDrop} // Drag & drop reschedule
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          slotDuration="00:15:00"
          allDaySlot={false}
          height="auto"
        />
        
        <WalkInQueuePanel doctorId={selectedDoctor} />
      </div>
      
      <BookAppointmentModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        preselectedDoctor={preselectedDoctor}
        preselectedDate={preselectedDate}
        onSuccess={refetch}
      />
      
      <AppointmentDetailsModal
        visible={showDetailsModal}
        appointment={selectedAppointment}
        onClose={() => setShowDetailsModal(false)}
        onUpdate={refetch}
      />
    </div>
  );
};
```

Use:
- @fullcalendar/react
- Ant Design for UI components
- React Query for data fetching
- WebSocket for real-time updates
- date-fns for date manipulation

Component: src/components/appointments/AppointmentCalendar.tsx
```

---

## STEP 8: Frontend - Book Appointment Modal

### Windsurf Prompt:
```
Create a multi-step appointment booking wizard.

Component: BookAppointmentModal

Props:
- visible: boolean
- onClose: () => void
- preselectedDoctor?: string
- preselectedDate?: Date
- onSuccess: () => void

Steps:

**Step 1: Select Patient**
- Search patient by name, phone, MRN
- Quick register new patient (opens PatientQuickRegistration)
- Display patient summary card when selected

**Step 2: Select Doctor & Type**
- Doctor dropdown (or use preselected)
- Specialty filter (if doctor not preselected)
- Appointment type selector (cards with icons)
- Show doctor's photo, bio, specialty

**Step 3: Choose Date & Time**
- Calendar to select date (next 30 days)
- Fetch available slots for selected doctor and date
- Display slots as time buttons
- Show AI-predicted duration for each slot
- If no slots available, show "Next Available: [date]"
- Show alternative doctors with availability

**Step 4: Add Details**
- Chief complaint (textarea)
- Special instructions (textarea)
- SMS reminder opt-in (checkbox, default: yes)

**Step 5: Confirm**
- Review summary:
  - Patient: Name, MRN, Photo
  - Doctor: Name, Specialty, Photo
  - Date & Time
  - Appointment Type
  - Duration
  - Chief Complaint
- [Back] [Confirm Booking]

**Success Screen**
- ✅ Appointment Confirmed!
- Appointment details
- SMS confirmation sent
- [Print Appointment Card] [Book Another] [View in Calendar]

Implementation:

```tsx
export const BookAppointmentModal: React.FC<Props> = ({
  visible,
  onClose,
  preselectedDoctor,
  preselectedDate,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    patientId: null,
    doctorId: preselectedDoctor || null,
    appointmentTypeId: null,
    appointmentDate: preselectedDate || null,
    startTime: null,
    durationMinutes: null,
    chiefComplaint: '',
    specialInstructions: '',
    smsReminderOptIn: true
  });
  
  const steps = [
    { title: 'Patient', component: SelectPatientStep },
    { title: 'Doctor & Type', component: SelectDoctorStep },
    { title: 'Date & Time', component: SelectDateTimeStep },
    { title: 'Details', component: AddDetailsStep },
    { title: 'Confirm', component: ConfirmStep }
  ];
  
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handleSubmit = async () => {
    try {
      const appointment = await createAppointment(formData);
      message.success('Appointment booked successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      message.error('Booking failed. Please try again.');
    }
  };
  
  const CurrentStepComponent = steps[currentStep].component;
  
  return (
    <Modal
      title="Book Appointment"
      visible={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Steps current={currentStep}>
        {steps.map(step => (
          <Steps.Step key={step.title} title={step.title} />
        ))}
      </Steps>
      
      <div className="step-content">
        <CurrentStepComponent
          formData={formData}
          onChange={setFormData}
          onNext={handleNext}
          onBack={() => setCurrentStep(currentStep - 1)}
        />
      </div>
    </Modal>
  );
};
```

**SelectDateTimeStep Implementation:**

```tsx
const SelectDateTimeStep: React.FC<StepProps> = ({ formData, onChange, onNext, onBack }) => {
  const [selectedDate, setSelectedDate] = useState(formData.appointmentDate);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Fetch available slots
  const { data: slots, isLoading } = useQuery(
    ['available-slots', formData.doctorId, selectedDate],
    () => fetchAvailableSlots({
      doctorId: formData.doctorId,
      date: selectedDate,
      appointmentTypeId: formData.appointmentTypeId
    }),
    { enabled: !!formData.doctorId && !!selectedDate }
  );
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };
  
  const handleTimeSelect = (slot: TimeSlot) => {
    setSelectedTime(slot.startTime);
    onChange({
      ...formData,
      appointmentDate: selectedDate,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes
    });
  };
  
  return (
    <div className="select-datetime-step">
      <div className="calendar-section">
        <Calendar
          value={selectedDate}
          onChange={handleDateChange}
          disabledDate={isDateDisabled} // Disable past dates, holidays
        />
      </div>
      
      <div className="slots-section">
        <h3>Available Times for {formatDate(selectedDate)}</h3>
        
        {isLoading && <Spin />}
        
        {slots && slots.length === 0 && (
          <Empty description="No slots available on this date">
            <Button onClick={showNextAvailable}>
              Show Next Available Date
            </Button>
          </Empty>
        )}
        
        <div className="time-slots-grid">
          {slots?.filter(s => s.isAvailable).map(slot => (
            <Card
              key={slot.startTime}
              className={`time-slot-card ${selectedTime === slot.startTime ? 'selected' : ''}`}
              onClick={() => handleTimeSelect(slot)}
            >
              <div className="time">{slot.startTime}</div>
              <div className="duration">{slot.durationMinutes} min</div>
            </Card>
          ))}
        </div>
      </div>
      
      <div className="step-actions">
        <Button onClick={onBack}>Back</Button>
        <Button
          type="primary"
          onClick={onNext}
          disabled={!selectedTime}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
```

Components to create:
- src/components/appointments/BookAppointmentModal.tsx
- src/components/appointments/steps/
  - SelectPatientStep.tsx
  - SelectDoctorStep.tsx
  - SelectDateTimeStep.tsx
  - AddDetailsStep.tsx
  - ConfirmStep.tsx
```

---

## STEP 9: Frontend - Walk-in Queue Component

### Windsurf Prompt:
```
Create the walk-in queue management component with real-time updates.

Component: WalkInQueuePanel

Props:
- doctorId: string | null
- onAppointmentUpdate: () => void

Features:
1. **Header**
   - Doctor selector dropdown
   - Date picker (default: today)
   - Queue stats (Total waiting, Avg wait time)

2. **Now Serving Section**
   - Large card showing current patient
   - Patient name, queue number
   - Time started
   - [Complete] button

3. **Queue List**
   - List of waiting patients
   - Each card shows:
     - Queue number (W-005)
     - Patient photo + name
     - Priority badge (Emergency/Urgent)
     - Time checked in
     - Estimated wait (updates in real-time)
     - [Call Now] [Remove] buttons
   - Drag-and-drop to reorder (manual override)

4. **Actions**
   - [Add to Queue] button (opens AddWalkInModal)
   - [Call Next] button
   - [Refresh] button

5. **Real-time Updates**
   - WebSocket connection for live queue changes
   - Auto-update estimated wait times
   - Visual notification when queue changes

Implementation:

```tsx
export const WalkInQueuePanel: React.FC<Props> = ({ doctorId, onAppointmentUpdate }) => {
  const [queue, setQueue] = useState<QueueData | null>(null);
  
  // Fetch initial queue
  const { data, refetch } = useQuery(
    ['walk-in-queue', doctorId],
    () => fetchWalkInQueue(doctorId),
    { enabled: !!doctorId, refetchInterval: 30000 } // Fallback polling
  );
  
  // WebSocket for real-time updates
  useEffect(() => {
    if (!doctorId) return;
    
    const ws = new WebSocket(`${WS_URL}/queue?doctorId=${doctorId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'queue_update') {
        setQueue(update.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Fall back to polling
    };
    
    return () => ws.close();
  }, [doctorId]);
  
  // Update estimated wait times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(queue => {
        if (!queue) return queue;
        return {
          ...queue,
          queue: queue.queue.map((patient, index) => ({
            ...patient,
            estimatedWaitMinutes: calculateWait(index, queue.currentPatient)
          }))
        };
      });
    }, 60000);
    
    return () => clearInterval(interval);
  }, [queue]);
  
  const handleCallNext = async () => {
    try {
      const result = await callNextWalkIn(doctorId);
      message.success(`Called ${result.nextPatient.patient.firstName}`);
      onAppointmentUpdate();
    } catch (error) {
      message.error('Failed to call next patient');
    }
  };
  
  const handleCompleteCurrentPatient = async () => {
    if (!queue?.currentPatient) return;
    
    try {
      await completeAppointment(queue.currentPatient.appointmentId);
      message.success('Consultation completed');
      refetch();
    } catch (error) {
      message.error('Failed to complete appointment');
    }
  };
  
  if (!doctorId) {
    return (
      <Card className="walk-in-queue-panel">
        <Empty description="Select a doctor to view walk-in queue" />
      </Card>
    );
  }
  
  return (
    <Card
      className="walk-in-queue-panel"
      title={
        <Space>
          <UserOutlined />
          <span>Walk-in Queue</span>
          <Badge count={queue?.totalInQueue || 0} />
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
          >
            Add to Queue
          </Button>
          <Button
            icon={<RedoOutlined />}
            onClick={refetch}
          />
        </Space>
      }
    >
      {/* Now Serving */}
      {queue?.currentPatient && (
        <Card
          className="now-serving"
          size="small"
          title="Now Serving"
          style={{ backgroundColor: '#e6f7ff', marginBottom: 16 }}
        >
          <Space>
            <Avatar src={queue.currentPatient.patientPhoto} size={48} />
            <div>
              <div className="queue-number">{queue.currentPatient.queueNumber}</div>
              <div className="patient-name">{queue.currentPatient.patientName}</div>
              <div className="started-at">
                Started: {formatTime(queue.currentPatient.startedAt)}
              </div>
            </div>
          </Space>
          <Button
            type="primary"
            onClick={handleCompleteCurrentPatient}
            style={{ marginTop: 8 }}
          >
            Complete Consultation
          </Button>
        </Card>
      )}
      
      {/* Queue */}
      <div className="queue-header">
        <Text strong>Waiting ({queue?.totalInQueue || 0})</Text>
        <Text type="secondary">Avg wait: {queue?.averageWaitTime || 0} min</Text>
      </div>
      
      {queue?.queue.length === 0 && (
        <Empty description="No patients in queue" />
      )}
      
      <List
        dataSource={queue?.queue || []}
        renderItem={(patient, index) => (
          <List.Item
            className="queue-item"
            actions={[
              <Button
                type="link"
                icon={<PhoneOutlined />}
                onClick={() => callPatient(patient)}
              >
                Call Now
              </Button>,
              <Button
                type="link"
                danger
                icon={<CloseOutlined />}
                onClick={() => removeFromQueue(patient)}
              >
                Remove
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar src={patient.patientPhoto} />}
              title={
                <Space>
                  <Tag color="blue">{patient.queueNumber}</Tag>
                  {patient.priority > 0 && (
                    <Tag color="red">
                      {patient.priority === 2 ? 'EMERGENCY' : 'URGENT'}
                    </Tag>
                  )}
                  <span>{patient.patientName}</span>
                </Space>
              }
              description={
                <Space>
                  <ClockCircleOutlined />
                  <span>Wait: ~{patient.estimatedWaitMinutes} min</span>
                  <span>•</span>
                  <span>Checked in: {formatTime(patient.checkedInAt)}</span>
                </Space>
              }
            />
          </List.Item>
        )}
      />
      
      {queue && queue.queue.length > 0 && (
        <Button
          type="primary"
          size="large"
          block
          icon={<ArrowRightOutlined />}
          onClick={handleCallNext}
          style={{ marginTop: 16 }}
        >
          Call Next Patient
        </Button>
      )}
      
      <AddWalkInModal
        visible={showAddModal}
        doctorId={doctorId}
        onClose={() => setShowAddModal(false)}
        onSuccess={refetch}
      />
    </Card>
  );
};
```

Components:
- src/components/appointments/WalkInQueuePanel.tsx
- src/components/appointments/AddWalkInModal.tsx
- src/hooks/useWalkInQueue.ts (WebSocket hook)
```

---

## STEP 10: WhatsApp Booking Bot

### Windsurf Prompt:
```
Create a WhatsApp booking chatbot using WhatsApp Business API.

Based on appointment_scheduling_implementation.json channel_4_whatsapp_booking:

1. **WhatsApp Service Integration**

File: src/services/whatsapp-bot.service.ts

```typescript
import { WhatsAppService } from './whatsapp.service';

export class WhatsAppBotService {
  constructor(
    private whatsappService: WhatsAppService,
    private appointmentService: AppointmentService,
    private patientService: PatientService
  ) {}
  
  async handleIncomingMessage(message: WhatsAppMessage) {
    const { from, text } = message;
    
    // Get or create conversation session
    let session = await this.getSession(from);
    if (!session) {
      session = await this.createSession(from);
      return this.sendGreeting(from);
    }
    
    // Parse user intent
    const intent = await this.parseIntent(text, session);
    
    // Route to appropriate handler
    switch (intent.action) {
      case 'book_appointment':
        return this.handleBookingFlow(from, text, session);
      case 'check_appointment':
        return this.handleCheckAppointment(from, session);
      case 'reschedule':
        return this.handleReschedule(from, text, session);
      case 'cancel':
        return this.handleCancel(from, text, session);
      default:
        return this.sendHelp(from);
    }
  }
  
  private async handleBookingFlow(
    phone: string,
    text: string,
    session: Session
  ) {
    switch (session.step) {
      case 'started':
        return this.askForPhone(phone);
      
      case 'phone_provided':
        // Look up patient by phone
        const patient = await this.patientService.findByPhone(text);
        if (!patient) {
          return this.sendMessage(phone, "I couldn't find your record. Please call the hospital to register first.");
        }
        session.patientId = patient.id;
        session.step = 'select_doctor';
        return this.showDoctors(phone);
      
      case 'select_doctor':
        // User selected doctor
        const doctorId = await this.parseDoctorSelection(text);
        session.doctorId = doctorId;
        session.step = 'select_date';
        return this.showDates(phone);
      
      case 'select_date':
        const date = await this.parseDate(text);
        session.date = date;
        session.step = 'select_time';
        return this.showAvailableSlots(phone, session.doctorId, date);
      
      case 'select_time':
        const time = await this.parseTime(text);
        session.time = time;
        session.step = 'confirm';
        return this.confirmBooking(phone, session);
      
      case 'confirm':
        if (text.toLowerCase().includes('confirm') || text.toLowerCase().includes('yes')) {
          return this.createAppointment(phone, session);
        } else {
          session.step = 'select_date';
          return this.showDates(phone);
        }
    }
  }
  
  private async showDoctors(phone: string) {
    const doctors = await this.getDoctors();
    
    const buttons = doctors.map(d => ({
      id: d.id,
      title: `Dr. ${d.lastName} (${d.specialty})`
    }));
    
    return this.whatsappService.sendInteractiveMessage({
      to: phone,
      message: 'Which doctor would you like to see?',
      buttons: buttons.slice(0, 3), // WhatsApp allows max 3 buttons
      footer: 'Reply with doctor name or number'
    });
  }
  
  private async showAvailableSlots(phone: string, doctorId: string, date: Date) {
    const slots = await this.appointmentService.getAvailableSlots({
      doctorId,
      date
    });
    
    const availableSlots = slots.filter(s => s.isAvailable).slice(0, 6);
    
    if (availableSlots.length === 0) {
      return this.sendMessage(phone, 
        "No slots available on this date. Try tomorrow or next week."
      );
    }
    
    const buttons = availableSlots.map(s => ({
      id: s.startTime,
      title: s.startTime
    }));
    
    return this.whatsappService.sendInteractiveMessage({
      to: phone,
      message: `Available times for ${formatDate(date)}:`,
      buttons: buttons.slice(0, 3)
    });
  }
  
  private async confirmBooking(phone: string, session: Session) {
    const doctor = await this.getDoctor(session.doctorId);
    const patient = await this.getPatient(session.patientId);
    
    const message = `
Confirm booking:

👤 Patient: ${patient.firstName} ${patient.lastName}
👨‍⚕️ Doctor: Dr. ${doctor.lastName}
📅 Date: ${formatDate(session.date)}
🕐 Time: ${session.time}
📍 ${hospitalName}

Reply CONFIRM to book or CHANGE to modify.
    `.trim();
    
    return this.sendMessage(phone, message);
  }
  
  private async createAppointment(phone: string, session: Session) {
    try {
      const appointment = await this.appointmentService.create({
        patientId: session.patientId,
        doctorId: session.doctorId,
        appointmentDate: session.date,
        startTime: session.time,
        bookingChannel: 'whatsapp'
      });
      
      const message = `
✅ Appointment confirmed!

You'll receive a reminder 24 hours before.

See you on ${formatDate(session.date)} at ${session.time}! 🏥
      `.trim();
      
      // Send location
      await this.whatsappService.sendLocation({
        to: phone,
        latitude: hospitalLatitude,
        longitude: hospitalLongitude,
        name: hospitalName,
        address: hospitalAddress
      });
      
      // Clear session
      await this.clearSession(phone);
      
      return this.sendMessage(phone, message);
    } catch (error) {
      return this.sendMessage(phone, 
        "Sorry, booking failed. Please try again or call the hospital."
      );
    }
  }
  
  private async parseIntent(text: string, session: Session): Promise<Intent> {
    const lowerText = text.toLowerCase();
    
    // Simple keyword matching (can be replaced with NLP)
    if (lowerText.includes('book') || lowerText.includes('appointment')) {
      return { action: 'book_appointment' };
    }
    if (lowerText.includes('check') || lowerText.includes('when')) {
      return { action: 'check_appointment' };
    }
    if (lowerText.includes('reschedule') || lowerText.includes('change')) {
      return { action: 'reschedule' };
    }
    if (lowerText.includes('cancel')) {
      return { action: 'cancel' };
    }
    
    return { action: 'unknown' };
  }
  
  private async sendHelp(phone: string) {
    return this.sendMessage(phone, `
I can help you with:
1️⃣ Book appointment
2️⃣ Check appointment
3️⃣ Reschedule
4️⃣ Cancel

What would you like to do?
    `.trim());
  }
}
```

2. **WhatsApp Webhook** (Receive messages)

```typescript
// POST /api/whatsapp/webhook

export class WhatsAppWebhookController {
  constructor(private botService: WhatsAppBotService) {}
  
  async handleWebhook(req: Request, res: Response) {
    const { entry } = req.body;
    
    if (!entry || !entry[0].changes) {
      return res.sendStatus(400);
    }
    
    const change = entry[0].changes[0];
    const message = change.value.messages?.[0];
    
    if (!message) {
      return res.sendStatus(200);
    }
    
    // Process message asynchronously
    this.botService.handleIncomingMessage({
      from: message.from,
      text: message.text?.body,
      timestamp: message.timestamp
    }).catch(error => {
      console.error('Bot processing error:', error);
    });
    
    // Acknowledge immediately
    res.sendStatus(200);
  }
  
  // Webhook verification (required by WhatsApp)
  verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
}
```

3. **Session Management**

Store conversation state in Redis for fast access:

```typescript
import Redis from 'ioredis';

export class SessionManager {
  private redis = new Redis(process.env.REDIS_URL);
  
  async getSession(phone: string): Promise<Session | null> {
    const data = await this.redis.get(`whatsapp:session:${phone}`);
    return data ? JSON.parse(data) : null;
  }
  
  async setSession(phone: string, session: Session) {
    await this.redis.set(
      `whatsapp:session:${phone}`,
      JSON.stringify(session),
      'EX',
      3600 // Expire after 1 hour
    );
  }
  
  async clearSession(phone: string) {
    await this.redis.del(`whatsapp:session:${phone}`);
  }
}
```

4. **Setup Instructions**

1. Register for WhatsApp Business API
2. Set up webhook URL: https://yourdomain.com/api/whatsapp/webhook
3. Get access token and phone number ID from Meta
4. Configure environment variables:
```
WHATSAPP_API_URL=https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token (set this yourself)
REDIS_URL=redis://localhost:6379
```

Files to create:
- src/services/whatsapp-bot.service.ts
- src/services/session-manager.service.ts
- src/controllers/whatsapp-webhook.controller.ts
- src/routes/whatsapp.routes.ts

Note: For Phase 1, can start with simple keyword matching.
For Phase 2, integrate Dialogflow or custom NLP for better understanding.
```

---

## 📊 IMPLEMENTATION TIMELINE

**Week 1-2: Core Scheduling**
- Database schema
- Doctor schedule management
- Appointment CRUD APIs
- Available slots generation

**Week 3-4: Walk-in Queue**
- Queue management APIs
- WebSocket real-time updates
- Queue display system

**Week 5-6: SMS/WhatsApp**
- Hubtel SMS integration
- Reminder scheduler
- WhatsApp bot (basic)

**Week 7-8: Frontend Core**
- Appointment calendar
- Booking modal
- Walk-in queue panel

**Week 9-10: AI Optimization**
- Historical data collection
- ML model training
- Prediction integration

**Week 11-12: Portal & Polish**
- Patient portal booking
- Phone booking interface
- Testing & refinement

---

## 🎯 SUCCESS CRITERIA

✅ **Functional**
- All 5 booking channels work
- Walk-ins coexist with appointments
- No double-bookings
- Real-time queue updates
- SMS delivery >95%

✅ **Performance**
- Doctor utilization >85%
- No-show rate <15%
- Walk-in wait <45 min
- Booking time <2 min

✅ **User Satisfaction**
- Receptionists: 4.5+ stars
- Doctors: 4.5+ stars
- Patients: 4.5+ stars

---

Good luck! Start with Step 1 (Database Schema) and work through sequentially. 🚀

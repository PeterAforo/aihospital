import axios from 'axios';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

const DEFAULT_DURATIONS: Record<string, number> = {
  new_consultation: 30,
  follow_up: 20,
  procedure: 60,
  vaccination: 15,
  prenatal: 30,
  checkup: 25,
  emergency: 45,
  telemedicine: 20,
  CONSULTATION: 30,
  FOLLOW_UP: 20,
  PROCEDURE: 60,
  CHECKUP: 25,
  EMERGENCY: 45,
};

export interface PredictionParams {
  appointmentTypeId: string;
  doctorId: string;
  patientId?: string;
  appointmentDate: Date;
}

export interface PredictionResult {
  predictedDurationMinutes: number;
  confidence: number;
  modelUsed: boolean;
}

class AIPredictionService {
  private isServiceAvailable: boolean = true;
  private lastHealthCheck: Date = new Date(0);
  private healthCheckInterval: number = 60000; // 1 minute

  async predictDuration(params: PredictionParams): Promise<PredictionResult> {
    // Check if AI service is available
    if (!this.isServiceAvailable && Date.now() - this.lastHealthCheck.getTime() < this.healthCheckInterval) {
      return this.getFallbackPrediction(params);
    }

    try {
      // Get patient info for complexity calculation
      let patientAge = 40;
      let patientComplexity = 0;
      let isFirstAppointment = false;

      if (params.patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: params.patientId },
          select: {
            dateOfBirth: true,
            chronicConditions: { select: { id: true } },
            appointments: { select: { id: true }, take: 1 },
          },
        });

        if (patient) {
          if (patient.dateOfBirth) {
            patientAge = Math.floor(
              (Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
            );
          }
          patientComplexity = patient.chronicConditions?.length || 0;
          isFirstAppointment = (patient.appointments?.length || 0) === 0;
        }
      }

      const response = await axios.post(
        `${AI_SERVICE_URL}/predict-duration`,
        {
          appointment_type_id: params.appointmentTypeId,
          doctor_id: params.doctorId,
          patient_age: patientAge,
          day_of_week: params.appointmentDate.getDay(),
          hour: params.appointmentDate.getHours() || 9,
          is_first_appointment: isFirstAppointment ? 1 : 0,
          patient_complexity: patientComplexity,
        },
        { timeout: 5000 }
      );

      this.isServiceAvailable = true;
      this.lastHealthCheck = new Date();

      return {
        predictedDurationMinutes: response.data.predicted_duration_minutes,
        confidence: response.data.confidence,
        modelUsed: response.data.model_used,
      };
    } catch (error: any) {
      logger.warn(`AI prediction service unavailable: ${error.message}`);
      this.isServiceAvailable = false;
      this.lastHealthCheck = new Date();
      
      return this.getFallbackPrediction(params);
    }
  }

  private async getFallbackPrediction(params: PredictionParams): Promise<PredictionResult> {
    // Try to get from AI predictions table
    const cachedPrediction = await prisma.aISlotPrediction.findFirst({
      where: {
        doctorId: params.doctorId,
        appointmentTypeId: params.appointmentTypeId,
        dayOfWeek: params.appointmentDate.getDay(),
      },
    });

    if (cachedPrediction) {
      return {
        predictedDurationMinutes: cachedPrediction.predictedDurationMinutes,
        confidence: cachedPrediction.confidenceScore || 0.7,
        modelUsed: false,
      };
    }

    // Try to get from appointment type config
    const appointmentType = await prisma.appointmentTypeConfig.findUnique({
      where: { id: params.appointmentTypeId },
    });

    if (appointmentType) {
      return {
        predictedDurationMinutes: appointmentType.defaultDurationMinutes,
        confidence: 0.6,
        modelUsed: false,
      };
    }

    // Use hardcoded defaults
    const defaultDuration = DEFAULT_DURATIONS[params.appointmentTypeId] || 30;
    
    return {
      predictedDurationMinutes: defaultDuration,
      confidence: 0.5,
      modelUsed: false,
    };
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
      this.isServiceAvailable = response.data.status === 'ok';
      this.lastHealthCheck = new Date();
      return this.isServiceAvailable;
    } catch {
      this.isServiceAvailable = false;
      this.lastHealthCheck = new Date();
      return false;
    }
  }

  async getModelInfo(): Promise<any> {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/model-info`, { timeout: 3000 });
      return response.data;
    } catch {
      return { loaded: false, error: 'AI service unavailable' };
    }
  }

  async savePrediction(
    tenantId: string,
    doctorId: string,
    appointmentTypeId: string,
    dayOfWeek: number,
    timeOfDay: string,
    prediction: PredictionResult
  ): Promise<void> {
    try {
      await prisma.aISlotPrediction.upsert({
        where: {
          tenantId_doctorId_appointmentTypeId_dayOfWeek_timeOfDay: {
            tenantId,
            doctorId,
            appointmentTypeId,
            dayOfWeek,
            timeOfDay,
          },
        },
        update: {
          predictedDurationMinutes: prediction.predictedDurationMinutes,
          confidenceScore: prediction.confidence,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          doctorId,
          appointmentTypeId,
          dayOfWeek,
          timeOfDay,
          predictedDurationMinutes: prediction.predictedDurationMinutes,
          confidenceScore: prediction.confidence,
          modelVersion: 'v1.0',
        },
      });
    } catch (error) {
      logger.error('Failed to save AI prediction:', error);
    }
  }
}

export const aiPredictionService = new AIPredictionService();

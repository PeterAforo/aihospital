import { z } from 'zod';

// ==================== ENUMS ====================

export const TemperatureSiteEnum = z.enum(['ORAL', 'AXILLARY', 'TYMPANIC', 'RECTAL']);
export const PulseRhythmEnum = z.enum(['REGULAR', 'IRREGULAR']);
export const RespiratoryPatternEnum = z.enum(['REGULAR', 'IRREGULAR', 'LABORED']);
export const PainCharacterEnum = z.enum(['SHARP', 'DULL', 'BURNING', 'THROBBING', 'CRAMPING', 'ACHING', 'STABBING']);

// ==================== VITAL SIGNS SCHEMA ====================

export const VitalSignsSchema = z.object({
  bpSystolic: z.number().int().min(50).max(300).optional(),
  bpDiastolic: z.number().int().min(30).max(200).optional(),
  temperature: z.number().min(30).max(45).optional(),
  temperatureSite: TemperatureSiteEnum.optional(),
  pulseRate: z.number().int().min(30).max(250).optional(),
  pulseRhythm: PulseRhythmEnum.optional(),
  respiratoryRate: z.number().int().min(5).max(60).optional(),
  respiratoryPattern: RespiratoryPatternEnum.optional(),
  spo2: z.number().int().min(70).max(100).optional(),
  weight: z.number().min(0.5).max(300).optional(),
  height: z.number().int().min(40).max(250).optional(),
  painScale: z.number().int().min(0).max(10).optional(),
  painLocation: z.string().max(200).optional(),
  painCharacter: PainCharacterEnum.optional(),
}).refine(
  (data) => {
    if (data.bpSystolic && data.bpDiastolic) {
      return data.bpSystolic > data.bpDiastolic;
    }
    return true;
  },
  { message: 'Systolic BP must be greater than diastolic BP' }
);

// ==================== ASSESSMENT SCHEMA ====================

export const AssessmentSchema = z.object({
  chiefComplaint: z.string().min(1).max(500),
  symptomDuration: z.string().max(100).optional(),
  symptomSeverity: z.enum(['mild', 'moderate', 'severe']).optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  clinicalNotes: z.string().max(2000).optional(),
});

// ==================== CREATE TRIAGE SCHEMA ====================

export const CreateTriageSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
  vitalSigns: VitalSignsSchema,
  assessment: AssessmentSchema,
  triageLevel: z.number().int().min(1).max(5),
  overrideReason: z.string().max(500).optional(),
});

export type CreateTriageInput = z.infer<typeof CreateTriageSchema>;

// ==================== UPDATE TRIAGE SCHEMA ====================

export const UpdateTriageSchema = z.object({
  vitalSigns: VitalSignsSchema.optional(),
  assessment: AssessmentSchema.partial().optional(),
  triageLevel: z.number().int().min(1).max(5).optional(),
  overrideReason: z.string().max(500).optional(),
});

export type UpdateTriageInput = z.infer<typeof UpdateTriageSchema>;

// ==================== SUGGEST LEVEL SCHEMA ====================

export const SuggestLevelSchema = z.object({
  vitalSigns: VitalSignsSchema,
  chiefComplaint: z.string().optional(),
  painScale: z.number().int().min(0).max(10).optional(),
  patientAge: z.number().min(0).max(150).optional(),
});

export type SuggestLevelInput = z.infer<typeof SuggestLevelSchema>;

// ==================== QUERY SCHEMAS ====================

export const TriageQueueQuerySchema = z.object({
  date: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
});

export const TriageHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const TriageAnalyticsQuerySchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  nurseId: z.string().uuid().optional(),
});

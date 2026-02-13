/**
 * Vital Signs Validation Utilities
 * Based on Manchester Triage System and WHO guidelines
 * Includes age-specific ranges for pediatric patients
 */

// ==================== INTERFACES ====================

export interface BPValidation {
  isValid: boolean;
  category: 'normal' | 'elevated' | 'high' | 'critical_low' | 'critical_high';
  message?: string;
  severityLevel: number; // 1-5 (1=Red, 5=Blue)
}

export interface TemperatureValidation {
  isValid: boolean;
  category: 'hypothermia' | 'normal' | 'fever' | 'high_fever' | 'hyperpyrexia';
  severityLevel: number;
  message?: string;
}

export interface PulseValidation {
  isValid: boolean;
  category: 'bradycardia' | 'normal' | 'tachycardia';
  severityLevel: number;
  normalRange: { min: number; max: number };
  message?: string;
}

export interface RespiratoryValidation {
  isValid: boolean;
  category: 'bradypnea' | 'normal' | 'tachypnea';
  severityLevel: number;
  normalRange: { min: number; max: number };
  message?: string;
}

export interface SpO2Validation {
  isValid: boolean;
  category: 'severe_hypoxemia' | 'hypoxemia' | 'mild_hypoxemia' | 'normal';
  severityLevel: number;
  message?: string;
}

export interface BMIResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese_1' | 'obese_2' | 'obese_3';
}

export interface PainValidation {
  isValid: boolean;
  category: 'none' | 'mild' | 'moderate' | 'severe' | 'worst';
  severityLevel: number;
  message?: string;
}

export interface VitalSigns {
  bpSystolic?: number;
  bpDiastolic?: number;
  temperature?: number;
  temperatureSite?: 'oral' | 'axillary' | 'tympanic' | 'rectal';
  pulseRate?: number;
  respiratoryRate?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  painScale?: number;
}

export interface TriageSuggestion {
  suggestedLevel: number; // 1-5
  levelName: string;
  levelColor: string;
  confidence: number; // 0-1
  triggers: string[];
  recommendation: string;
}

// ==================== TRIAGE LEVEL DEFINITIONS ====================

export const TRIAGE_LEVELS = {
  1: { name: 'Red - Immediate', color: '#DC2626', targetTime: 'Immediate (0 minutes)' },
  2: { name: 'Orange - Very Urgent', color: '#EA580C', targetTime: 'Within 10 minutes' },
  3: { name: 'Yellow - Urgent', color: '#EAB308', targetTime: 'Within 60 minutes' },
  4: { name: 'Green - Standard', color: '#16A34A', targetTime: 'Within 2 hours' },
  5: { name: 'Blue - Non-urgent', color: '#3B82F6', targetTime: 'Within 4 hours' },
};

// ==================== AGE-SPECIFIC RANGES ====================

interface AgeRange {
  heartRate: { min: number; max: number };
  respiratoryRate: { min: number; max: number };
  systolicBP: { min: number; max: number };
}

const AGE_RANGES: Record<string, AgeRange> = {
  newborn: { // 0-3 months
    heartRate: { min: 100, max: 160 },
    respiratoryRate: { min: 30, max: 60 },
    systolicBP: { min: 60, max: 90 },
  },
  infant: { // 3-12 months
    heartRate: { min: 100, max: 150 },
    respiratoryRate: { min: 24, max: 40 },
    systolicBP: { min: 70, max: 100 },
  },
  toddler: { // 1-3 years
    heartRate: { min: 90, max: 140 },
    respiratoryRate: { min: 20, max: 30 },
    systolicBP: { min: 80, max: 110 },
  },
  preschool: { // 3-6 years
    heartRate: { min: 80, max: 120 },
    respiratoryRate: { min: 20, max: 25 },
    systolicBP: { min: 90, max: 110 },
  },
  schoolAge: { // 6-12 years
    heartRate: { min: 70, max: 110 },
    respiratoryRate: { min: 18, max: 22 },
    systolicBP: { min: 90, max: 120 },
  },
  adolescent: { // 12-18 years
    heartRate: { min: 60, max: 100 },
    respiratoryRate: { min: 12, max: 20 },
    systolicBP: { min: 100, max: 120 },
  },
  adult: { // 18+ years
    heartRate: { min: 60, max: 100 },
    respiratoryRate: { min: 12, max: 20 },
    systolicBP: { min: 90, max: 120 },
  },
};

function getAgeCategory(ageInYears?: number): string {
  if (ageInYears === undefined || ageInYears === null) return 'adult';
  if (ageInYears < 0.25) return 'newborn';
  if (ageInYears < 1) return 'infant';
  if (ageInYears < 3) return 'toddler';
  if (ageInYears < 6) return 'preschool';
  if (ageInYears < 12) return 'schoolAge';
  if (ageInYears < 18) return 'adolescent';
  return 'adult';
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate blood pressure readings
 */
export function validateBloodPressure(
  systolic: number,
  diastolic: number,
  ageInYears?: number
): BPValidation {
  // Basic validation
  if (systolic < 50 || systolic > 300) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Systolic BP must be between 50-300 mmHg',
      severityLevel: 4,
    };
  }

  if (diastolic < 30 || diastolic > 200) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Diastolic BP must be between 30-200 mmHg',
      severityLevel: 4,
    };
  }

  if (systolic <= diastolic) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Systolic must be greater than diastolic',
      severityLevel: 4,
    };
  }

  const ageCategory = getAgeCategory(ageInYears);
  const ranges = AGE_RANGES[ageCategory];

  // Critical low (shock)
  if (systolic < 90) {
    return {
      isValid: true,
      category: 'critical_low',
      message: 'Critical hypotension - possible shock',
      severityLevel: 1,
    };
  }

  // Critical high (hypertensive crisis)
  if (systolic > 180 || diastolic > 120) {
    return {
      isValid: true,
      category: 'critical_high',
      message: 'Hypertensive crisis - immediate attention required',
      severityLevel: 1,
    };
  }

  // High (Stage 2 hypertension)
  if (systolic >= 160 || diastolic >= 100) {
    return {
      isValid: true,
      category: 'high',
      message: 'Stage 2 hypertension',
      severityLevel: 2,
    };
  }

  // Elevated (Stage 1 hypertension)
  if (systolic >= 140 || diastolic >= 90) {
    return {
      isValid: true,
      category: 'elevated',
      message: 'Stage 1 hypertension',
      severityLevel: 3,
    };
  }

  // Normal
  if (systolic >= ranges.systolicBP.min && systolic <= ranges.systolicBP.max) {
    return {
      isValid: true,
      category: 'normal',
      severityLevel: 4,
    };
  }

  return {
    isValid: true,
    category: 'elevated',
    message: 'Blood pressure slightly elevated',
    severityLevel: 3,
  };
}

/**
 * Validate temperature readings
 */
export function validateTemperature(
  temp: number,
  site: 'oral' | 'axillary' | 'tympanic' | 'rectal' = 'oral',
  ageInYears?: number
): TemperatureValidation {
  // Basic validation
  if (temp < 30 || temp > 45) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Temperature must be between 30-45°C',
      severityLevel: 4,
    };
  }

  // Adjust for measurement site (normalize to oral equivalent)
  let adjustedTemp = temp;
  if (site === 'axillary') {
    adjustedTemp = temp + 0.5; // Axillary is ~0.5°C lower
  } else if (site === 'rectal') {
    adjustedTemp = temp - 0.5; // Rectal is ~0.5°C higher
  }

  // Hypothermia (critical)
  if (adjustedTemp < 35) {
    return {
      isValid: true,
      category: 'hypothermia',
      message: 'Hypothermia - critical',
      severityLevel: 1,
    };
  }

  // Hyperpyrexia (critical)
  if (adjustedTemp > 40) {
    return {
      isValid: true,
      category: 'hyperpyrexia',
      message: 'Hyperpyrexia - critical high fever',
      severityLevel: 1,
    };
  }

  // High fever
  if (adjustedTemp >= 39) {
    return {
      isValid: true,
      category: 'high_fever',
      message: 'High fever',
      severityLevel: 2,
    };
  }

  // Fever
  if (adjustedTemp > 37.5) {
    return {
      isValid: true,
      category: 'fever',
      message: 'Fever',
      severityLevel: 3,
    };
  }

  // Normal
  if (adjustedTemp >= 36.5 && adjustedTemp <= 37.5) {
    return {
      isValid: true,
      category: 'normal',
      severityLevel: 4,
    };
  }

  // Low normal (not quite hypothermia)
  return {
    isValid: true,
    category: 'normal',
    message: 'Temperature slightly low',
    severityLevel: 4,
  };
}

/**
 * Validate pulse/heart rate
 */
export function validatePulseRate(rate: number, ageInYears?: number): PulseValidation {
  // Basic validation
  if (rate < 30 || rate > 250) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Pulse rate must be between 30-250 bpm',
      severityLevel: 4,
      normalRange: { min: 60, max: 100 },
    };
  }

  const ageCategory = getAgeCategory(ageInYears);
  const ranges = AGE_RANGES[ageCategory];
  const normalRange = ranges.heartRate;

  // Critical bradycardia (adult)
  if (ageCategory === 'adult' && rate < 50) {
    return {
      isValid: true,
      category: 'bradycardia',
      message: 'Severe bradycardia',
      severityLevel: 1,
      normalRange,
    };
  }

  // Critical tachycardia (adult)
  if (ageCategory === 'adult' && rate > 120) {
    return {
      isValid: true,
      category: 'tachycardia',
      message: 'Severe tachycardia',
      severityLevel: 1,
      normalRange,
    };
  }

  // Bradycardia
  if (rate < normalRange.min) {
    const severity = rate < normalRange.min - 20 ? 2 : 3;
    return {
      isValid: true,
      category: 'bradycardia',
      message: 'Heart rate below normal',
      severityLevel: severity,
      normalRange,
    };
  }

  // Tachycardia
  if (rate > normalRange.max) {
    const severity = rate > normalRange.max + 30 ? 2 : 3;
    return {
      isValid: true,
      category: 'tachycardia',
      message: 'Heart rate above normal',
      severityLevel: severity,
      normalRange,
    };
  }

  // Normal
  return {
    isValid: true,
    category: 'normal',
    severityLevel: 4,
    normalRange,
  };
}

/**
 * Validate respiratory rate
 */
export function validateRespiratoryRate(rate: number, ageInYears?: number): RespiratoryValidation {
  // Basic validation
  if (rate < 5 || rate > 60) {
    return {
      isValid: false,
      category: 'normal',
      message: 'Respiratory rate must be between 5-60 breaths/min',
      severityLevel: 4,
      normalRange: { min: 12, max: 20 },
    };
  }

  const ageCategory = getAgeCategory(ageInYears);
  const ranges = AGE_RANGES[ageCategory];
  const normalRange = ranges.respiratoryRate;

  // Critical bradypnea (adult)
  if (ageCategory === 'adult' && rate < 10) {
    return {
      isValid: true,
      category: 'bradypnea',
      message: 'Severe respiratory depression',
      severityLevel: 1,
      normalRange,
    };
  }

  // Critical tachypnea (adult)
  if (ageCategory === 'adult' && rate > 30) {
    return {
      isValid: true,
      category: 'tachypnea',
      message: 'Severe respiratory distress',
      severityLevel: 1,
      normalRange,
    };
  }

  // Bradypnea
  if (rate < normalRange.min) {
    return {
      isValid: true,
      category: 'bradypnea',
      message: 'Respiratory rate below normal',
      severityLevel: 2,
      normalRange,
    };
  }

  // Tachypnea
  if (rate > normalRange.max) {
    const severity = rate > normalRange.max + 10 ? 2 : 3;
    return {
      isValid: true,
      category: 'tachypnea',
      message: 'Respiratory rate above normal',
      severityLevel: severity,
      normalRange,
    };
  }

  // Normal
  return {
    isValid: true,
    category: 'normal',
    severityLevel: 4,
    normalRange,
  };
}

/**
 * Validate oxygen saturation (SpO2)
 */
export function validateSpO2(spo2: number): SpO2Validation {
  // Basic validation
  if (spo2 < 70 || spo2 > 100) {
    return {
      isValid: false,
      category: 'normal',
      message: 'SpO2 must be between 70-100%',
      severityLevel: 4,
    };
  }

  // Severe hypoxemia
  if (spo2 < 90) {
    return {
      isValid: true,
      category: 'severe_hypoxemia',
      message: 'Severe hypoxemia - immediate oxygen required',
      severityLevel: 1,
    };
  }

  // Hypoxemia
  if (spo2 < 94) {
    return {
      isValid: true,
      category: 'hypoxemia',
      message: 'Hypoxemia - supplemental oxygen recommended',
      severityLevel: 2,
    };
  }

  // Mild hypoxemia
  if (spo2 < 95) {
    return {
      isValid: true,
      category: 'mild_hypoxemia',
      message: 'Mild hypoxemia',
      severityLevel: 3,
    };
  }

  // Normal
  return {
    isValid: true,
    category: 'normal',
    severityLevel: 4,
  };
}

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg: number, heightCm: number): BMIResult | null {
  if (weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: BMIResult['category'];
  if (bmi < 18.5) {
    category = 'underweight';
  } else if (bmi < 25) {
    category = 'normal';
  } else if (bmi < 30) {
    category = 'overweight';
  } else if (bmi < 35) {
    category = 'obese_1';
  } else if (bmi < 40) {
    category = 'obese_2';
  } else {
    category = 'obese_3';
  }

  return {
    bmi: Math.round(bmi * 10) / 10,
    category,
  };
}

/**
 * Validate pain scale (0-10)
 */
export function validatePainScale(pain: number): PainValidation {
  if (pain < 0 || pain > 10) {
    return {
      isValid: false,
      category: 'none',
      message: 'Pain scale must be between 0-10',
      severityLevel: 4,
    };
  }

  if (pain === 0) {
    return {
      isValid: true,
      category: 'none',
      severityLevel: 5,
    };
  }

  if (pain <= 3) {
    return {
      isValid: true,
      category: 'mild',
      severityLevel: 4,
    };
  }

  if (pain <= 6) {
    return {
      isValid: true,
      category: 'moderate',
      severityLevel: 3,
    };
  }

  if (pain <= 9) {
    return {
      isValid: true,
      category: 'severe',
      message: 'Severe pain',
      severityLevel: 2,
    };
  }

  return {
    isValid: true,
    category: 'worst',
    message: 'Worst pain imaginable',
    severityLevel: 1,
  };
}

/**
 * Calculate pulse pressure (systolic - diastolic)
 */
export function calculatePulsePressure(systolic: number, diastolic: number): number {
  return systolic - diastolic;
}

/**
 * Calculate Mean Arterial Pressure (MAP)
 * MAP = DBP + (SBP - DBP) / 3
 */
export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round((diastolic + (systolic - diastolic) / 3) * 10) / 10;
}

// ==================== CHIEF COMPLAINT KEYWORDS ====================

const RED_KEYWORDS = [
  'chest pain',
  'can\'t breathe',
  'cannot breathe',
  'difficulty breathing',
  'unconscious',
  'unresponsive',
  'seizure',
  'stroke',
  'heart attack',
  'severe bleeding',
  'choking',
  'anaphylaxis',
  'allergic reaction severe',
  'collapse',
  'cardiac arrest',
];

const ORANGE_KEYWORDS = [
  'severe headache',
  'worst headache',
  'high fever',
  'severe pain',
  'vomiting blood',
  'blood in stool',
  'severe abdominal pain',
  'pregnant bleeding',
  'fracture',
  'broken bone',
  'diabetic',
  'confusion',
  'altered mental',
];

/**
 * Analyze chief complaint for triage keywords
 */
function analyzeChiefComplaint(complaint: string): { level: number; triggers: string[] } {
  const lowerComplaint = complaint.toLowerCase();
  const triggers: string[] = [];

  // Check for RED keywords
  for (const keyword of RED_KEYWORDS) {
    if (lowerComplaint.includes(keyword)) {
      triggers.push(`Chief complaint contains "${keyword}"`);
      return { level: 1, triggers };
    }
  }

  // Check for ORANGE keywords
  for (const keyword of ORANGE_KEYWORDS) {
    if (lowerComplaint.includes(keyword)) {
      triggers.push(`Chief complaint contains "${keyword}"`);
      return { level: 2, triggers };
    }
  }

  return { level: 4, triggers: [] };
}

// ==================== MAIN TRIAGE SUGGESTION FUNCTION ====================

/**
 * Suggest triage level based on vital signs, pain scale, and chief complaint
 */
export function suggestTriageLevel(
  vitalSigns: VitalSigns,
  chiefComplaint?: string,
  ageInYears?: number
): TriageSuggestion {
  const triggers: string[] = [];
  let highestSeverity = 5; // Start with lowest (Blue)

  // Validate blood pressure
  if (vitalSigns.bpSystolic && vitalSigns.bpDiastolic) {
    const bpResult = validateBloodPressure(vitalSigns.bpSystolic, vitalSigns.bpDiastolic, ageInYears);
    if (bpResult.isValid && bpResult.severityLevel < highestSeverity) {
      highestSeverity = bpResult.severityLevel;
      if (bpResult.message) {
        triggers.push(`BP ${vitalSigns.bpSystolic}/${vitalSigns.bpDiastolic}: ${bpResult.message}`);
      }
    }
  }

  // Validate temperature
  if (vitalSigns.temperature) {
    const tempResult = validateTemperature(
      vitalSigns.temperature,
      vitalSigns.temperatureSite || 'oral',
      ageInYears
    );
    if (tempResult.isValid && tempResult.severityLevel < highestSeverity) {
      highestSeverity = tempResult.severityLevel;
      if (tempResult.message) {
        triggers.push(`Temp ${vitalSigns.temperature}°C: ${tempResult.message}`);
      }
    }
  }

  // Validate pulse rate
  if (vitalSigns.pulseRate) {
    const pulseResult = validatePulseRate(vitalSigns.pulseRate, ageInYears);
    if (pulseResult.isValid && pulseResult.severityLevel < highestSeverity) {
      highestSeverity = pulseResult.severityLevel;
      if (pulseResult.message) {
        triggers.push(`HR ${vitalSigns.pulseRate} bpm: ${pulseResult.message}`);
      }
    }
  }

  // Validate respiratory rate
  if (vitalSigns.respiratoryRate) {
    const rrResult = validateRespiratoryRate(vitalSigns.respiratoryRate, ageInYears);
    if (rrResult.isValid && rrResult.severityLevel < highestSeverity) {
      highestSeverity = rrResult.severityLevel;
      if (rrResult.message) {
        triggers.push(`RR ${vitalSigns.respiratoryRate}/min: ${rrResult.message}`);
      }
    }
  }

  // Validate SpO2
  if (vitalSigns.spo2) {
    const spo2Result = validateSpO2(vitalSigns.spo2);
    if (spo2Result.isValid && spo2Result.severityLevel < highestSeverity) {
      highestSeverity = spo2Result.severityLevel;
      if (spo2Result.message) {
        triggers.push(`SpO2 ${vitalSigns.spo2}%: ${spo2Result.message}`);
      }
    }
  }

  // Validate pain scale
  if (vitalSigns.painScale !== undefined) {
    const painResult = validatePainScale(vitalSigns.painScale);
    if (painResult.isValid && painResult.severityLevel < highestSeverity) {
      highestSeverity = painResult.severityLevel;
      if (painResult.message) {
        triggers.push(`Pain ${vitalSigns.painScale}/10: ${painResult.message}`);
      }
    }
  }

  // Analyze chief complaint
  if (chiefComplaint) {
    const complaintAnalysis = analyzeChiefComplaint(chiefComplaint);
    if (complaintAnalysis.level < highestSeverity) {
      highestSeverity = complaintAnalysis.level;
      triggers.push(...complaintAnalysis.triggers);
    }
  }

  // Get triage level info
  const levelInfo = TRIAGE_LEVELS[highestSeverity as keyof typeof TRIAGE_LEVELS];

  // Calculate confidence based on number of data points
  const dataPoints = [
    vitalSigns.bpSystolic,
    vitalSigns.temperature,
    vitalSigns.pulseRate,
    vitalSigns.respiratoryRate,
    vitalSigns.spo2,
    vitalSigns.painScale,
    chiefComplaint,
  ].filter((v) => v !== undefined && v !== null).length;

  const confidence = Math.min(0.5 + dataPoints * 0.1, 1);

  // Generate recommendation
  let recommendation: string;
  switch (highestSeverity) {
    case 1:
      recommendation = 'IMMEDIATE ATTENTION REQUIRED - Alert doctor immediately';
      break;
    case 2:
      recommendation = 'Patient should be seen within 10 minutes';
      break;
    case 3:
      recommendation = 'Patient should be seen within 60 minutes';
      break;
    case 4:
      recommendation = 'Patient can wait in normal queue (up to 2 hours)';
      break;
    default:
      recommendation = 'Non-urgent - can be rescheduled if needed';
  }

  return {
    suggestedLevel: highestSeverity,
    levelName: levelInfo.name,
    levelColor: levelInfo.color,
    confidence,
    triggers,
    recommendation,
  };
}

/**
 * Validate all vital signs and return combined result
 */
export function validateAllVitalSigns(
  vitalSigns: VitalSigns,
  ageInYears?: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate BP
  if (vitalSigns.bpSystolic && vitalSigns.bpDiastolic) {
    const bpResult = validateBloodPressure(vitalSigns.bpSystolic, vitalSigns.bpDiastolic, ageInYears);
    if (!bpResult.isValid) {
      errors.push(bpResult.message || 'Invalid blood pressure');
    } else if (bpResult.severityLevel <= 2) {
      warnings.push(bpResult.message || 'Abnormal blood pressure');
    }
  }

  // Validate temperature
  if (vitalSigns.temperature) {
    const tempResult = validateTemperature(
      vitalSigns.temperature,
      vitalSigns.temperatureSite || 'oral',
      ageInYears
    );
    if (!tempResult.isValid) {
      errors.push(tempResult.message || 'Invalid temperature');
    } else if (tempResult.severityLevel <= 2) {
      warnings.push(tempResult.message || 'Abnormal temperature');
    }
  }

  // Validate pulse
  if (vitalSigns.pulseRate) {
    const pulseResult = validatePulseRate(vitalSigns.pulseRate, ageInYears);
    if (!pulseResult.isValid) {
      errors.push(pulseResult.message || 'Invalid pulse rate');
    } else if (pulseResult.severityLevel <= 2) {
      warnings.push(pulseResult.message || 'Abnormal pulse rate');
    }
  }

  // Validate respiratory rate
  if (vitalSigns.respiratoryRate) {
    const rrResult = validateRespiratoryRate(vitalSigns.respiratoryRate, ageInYears);
    if (!rrResult.isValid) {
      errors.push(rrResult.message || 'Invalid respiratory rate');
    } else if (rrResult.severityLevel <= 2) {
      warnings.push(rrResult.message || 'Abnormal respiratory rate');
    }
  }

  // Validate SpO2
  if (vitalSigns.spo2) {
    const spo2Result = validateSpO2(vitalSigns.spo2);
    if (!spo2Result.isValid) {
      errors.push(spo2Result.message || 'Invalid SpO2');
    } else if (spo2Result.severityLevel <= 2) {
      warnings.push(spo2Result.message || 'Abnormal SpO2');
    }
  }

  // Validate pain scale
  if (vitalSigns.painScale !== undefined) {
    const painResult = validatePainScale(vitalSigns.painScale);
    if (!painResult.isValid) {
      errors.push(painResult.message || 'Invalid pain scale');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

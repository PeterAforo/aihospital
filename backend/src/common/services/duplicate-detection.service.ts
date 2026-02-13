/**
 * Duplicate Detection Service
 * Multi-factor probabilistic matching for patient records
 */

import { prisma } from '../utils/prisma.js';
import { calculateNameSimilarity, soundexMatch, normalizeGhanaPhone } from '../utils/patient-validators.js';

export interface PatientInput {
  firstName: string;
  lastName: string;
  otherNames?: string;
  dateOfBirth: Date | string;
  phone: string;
  phoneSecondary?: string;
  ghanaCardNumber?: string;
  nhisNumber?: string;
  city?: string;
  region?: string;
}

export interface DuplicateMatch {
  patientId: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string;
  ghanaCardNumber?: string | null;
  photoUrl?: string | null;
  score: number;
  matchingFactors: MatchingFactor[];
}

export interface MatchingFactor {
  field: string;
  weight: number;
  matched: boolean;
  details?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateScore: number;
  potentialDuplicates: DuplicateMatch[];
  verdict: 'definite' | 'high_probability' | 'possible' | 'unique';
  message: string;
}

// Scoring weights
const WEIGHTS = {
  GHANA_CARD_EXACT: 100,
  PHONE_EXACT: 40,
  NAME_SIMILARITY: 30,
  DOB_EXACT: 20,
  ADDRESS_SIMILARITY: 10,
};

// Decision thresholds
const THRESHOLDS = {
  DEFINITE: 100,
  HIGH_PROBABILITY: 70,
  POSSIBLE: 40,
};

class DuplicateDetectionService {
  /**
   * Check for potential duplicate patients
   */
  async checkForDuplicates(
    tenantId: string,
    patientData: PatientInput,
    excludePatientId?: string
  ): Promise<DuplicateCheckResult> {
    const normalizedPhone = normalizeGhanaPhone(patientData.phone);
    const dob = typeof patientData.dateOfBirth === 'string' 
      ? new Date(patientData.dateOfBirth) 
      : patientData.dateOfBirth;

    // Build search conditions
    const searchConditions: any[] = [];

    // 1. Ghana Card exact match (highest priority)
    if (patientData.ghanaCardNumber) {
      searchConditions.push({
        ghanaCardNumber: patientData.ghanaCardNumber.toUpperCase(),
      });
    }

    // 2. Phone exact match
    searchConditions.push({
      OR: [
        { phonePrimary: normalizedPhone },
        { phoneSecondary: normalizedPhone },
      ],
    });

    // 3. Name + DOB combination
    searchConditions.push({
      AND: [
        {
          OR: [
            { firstName: { contains: patientData.firstName, mode: 'insensitive' } },
            { lastName: { contains: patientData.lastName, mode: 'insensitive' } },
          ],
        },
        { dateOfBirth: dob },
      ],
    });

    // 4. Similar names (for fuzzy matching)
    searchConditions.push({
      OR: [
        { firstName: { contains: patientData.firstName.substring(0, 3), mode: 'insensitive' } },
        { lastName: { contains: patientData.lastName.substring(0, 3), mode: 'insensitive' } },
      ],
    });

    // Query potential matches
    const whereClause: any = {
      tenantId,
      isActive: true,
      isMerged: false,
      OR: searchConditions,
    };

    if (excludePatientId) {
      whereClause.id = { not: excludePatientId };
    }

    const potentialMatches = await prisma.patient.findMany({
      where: whereClause,
      take: 20, // Limit results for performance
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        otherNames: true,
        dateOfBirth: true,
        phonePrimary: true,
        phoneSecondary: true,
        ghanaCardNumber: true,
        city: true,
        region: true,
        photoUrl: true,
        nhisInfo: {
          select: {
            nhisNumber: true,
          },
        },
      },
    });

    // Score each potential match
    const scoredMatches: DuplicateMatch[] = [];

    for (const match of potentialMatches) {
      const { score, factors } = this.calculateMatchScore(patientData, match, normalizedPhone, dob);
      
      if (score >= THRESHOLDS.POSSIBLE) {
        scoredMatches.push({
          patientId: match.id,
          mrn: match.mrn,
          firstName: match.firstName,
          lastName: match.lastName,
          dateOfBirth: match.dateOfBirth,
          phone: match.phonePrimary,
          ghanaCardNumber: match.ghanaCardNumber,
          photoUrl: match.photoUrl,
          score,
          matchingFactors: factors,
        });
      }
    }

    // Sort by score descending
    scoredMatches.sort((a, b) => b.score - a.score);

    // Determine verdict
    const highestScore = scoredMatches.length > 0 ? scoredMatches[0].score : 0;
    const verdict = this.getVerdict(highestScore);
    const isDuplicate = highestScore >= THRESHOLDS.HIGH_PROBABILITY;

    return {
      isDuplicate,
      duplicateScore: highestScore,
      potentialDuplicates: scoredMatches.slice(0, 5), // Return top 5 matches
      verdict,
      message: this.getVerdictMessage(verdict, scoredMatches.length),
    };
  }

  /**
   * Calculate match score between new patient data and existing patient
   */
  private calculateMatchScore(
    newPatient: PatientInput,
    existingPatient: any,
    normalizedPhone: string,
    dob: Date
  ): { score: number; factors: MatchingFactor[] } {
    const factors: MatchingFactor[] = [];
    let totalScore = 0;

    // 1. Ghana Card exact match (definite duplicate)
    if (newPatient.ghanaCardNumber && existingPatient.ghanaCardNumber) {
      const matched = newPatient.ghanaCardNumber.toUpperCase() === existingPatient.ghanaCardNumber.toUpperCase();
      factors.push({
        field: 'Ghana Card',
        weight: WEIGHTS.GHANA_CARD_EXACT,
        matched,
        details: matched ? 'Exact match' : 'No match',
      });
      if (matched) {
        totalScore += WEIGHTS.GHANA_CARD_EXACT;
      }
    }

    // 2. Phone exact match
    const phoneMatched = 
      normalizedPhone === existingPatient.phonePrimary ||
      normalizedPhone === existingPatient.phoneSecondary ||
      (newPatient.phoneSecondary && (
        normalizeGhanaPhone(newPatient.phoneSecondary) === existingPatient.phonePrimary ||
        normalizeGhanaPhone(newPatient.phoneSecondary) === existingPatient.phoneSecondary
      ));
    
    factors.push({
      field: 'Phone Number',
      weight: WEIGHTS.PHONE_EXACT,
      matched: !!phoneMatched,
      details: phoneMatched ? 'Exact match' : 'No match',
    });
    if (phoneMatched) {
      totalScore += WEIGHTS.PHONE_EXACT;
    }

    // 3. Name similarity
    const fullNameNew = `${newPatient.firstName} ${newPatient.lastName}`.toLowerCase();
    const fullNameExisting = `${existingPatient.firstName} ${existingPatient.lastName}`.toLowerCase();
    const nameSimilarity = calculateNameSimilarity(fullNameNew, fullNameExisting);
    const nameMatched = nameSimilarity >= 80;
    
    factors.push({
      field: 'Name',
      weight: WEIGHTS.NAME_SIMILARITY,
      matched: nameMatched,
      details: `${nameSimilarity}% similarity`,
    });
    if (nameMatched) {
      // Scale the score based on similarity
      totalScore += Math.round((nameSimilarity / 100) * WEIGHTS.NAME_SIMILARITY);
    }

    // 4. Date of birth exact match
    const existingDob = new Date(existingPatient.dateOfBirth);
    const dobMatched = 
      dob.getFullYear() === existingDob.getFullYear() &&
      dob.getMonth() === existingDob.getMonth() &&
      dob.getDate() === existingDob.getDate();
    
    factors.push({
      field: 'Date of Birth',
      weight: WEIGHTS.DOB_EXACT,
      matched: dobMatched,
      details: dobMatched ? 'Exact match' : 'No match',
    });
    if (dobMatched) {
      totalScore += WEIGHTS.DOB_EXACT;
    }

    // 5. Address similarity (city + region)
    const addressMatched = 
      newPatient.city?.toLowerCase() === existingPatient.city?.toLowerCase() &&
      newPatient.region?.toLowerCase() === existingPatient.region?.toLowerCase();
    
    if (newPatient.city && newPatient.region) {
      factors.push({
        field: 'Address',
        weight: WEIGHTS.ADDRESS_SIMILARITY,
        matched: addressMatched,
        details: addressMatched ? 'City and region match' : 'No match',
      });
      if (addressMatched) {
        totalScore += WEIGHTS.ADDRESS_SIMILARITY;
      }
    }

    // Cap score at 100
    return { score: Math.min(totalScore, 100), factors };
  }

  /**
   * Get verdict based on score
   */
  private getVerdict(score: number): 'definite' | 'high_probability' | 'possible' | 'unique' {
    if (score >= THRESHOLDS.DEFINITE) return 'definite';
    if (score >= THRESHOLDS.HIGH_PROBABILITY) return 'high_probability';
    if (score >= THRESHOLDS.POSSIBLE) return 'possible';
    return 'unique';
  }

  /**
   * Get user-friendly verdict message
   */
  private getVerdictMessage(verdict: string, matchCount: number): string {
    switch (verdict) {
      case 'definite':
        return 'This patient already exists in the system (Ghana Card match).';
      case 'high_probability':
        return `Found ${matchCount} potential duplicate(s). Please verify before creating a new record.`;
      case 'possible':
        return `Found ${matchCount} similar patient(s). Review recommended.`;
      default:
        return 'No duplicates found. Safe to proceed.';
    }
  }

  /**
   * Quick check by Ghana Card only
   */
  async checkByGhanaCard(tenantId: string, ghanaCardNumber: string): Promise<DuplicateMatch | null> {
    const patient = await prisma.patient.findFirst({
      where: {
        tenantId,
        ghanaCardNumber: ghanaCardNumber.toUpperCase(),
        isActive: true,
        isMerged: false,
      },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phonePrimary: true,
        ghanaCardNumber: true,
        photoUrl: true,
      },
    });

    if (!patient) return null;

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phonePrimary,
      ghanaCardNumber: patient.ghanaCardNumber,
      photoUrl: patient.photoUrl,
      score: 100,
      matchingFactors: [{
        field: 'Ghana Card',
        weight: 100,
        matched: true,
        details: 'Exact match',
      }],
    };
  }

  /**
   * Quick check by phone number
   */
  async checkByPhone(tenantId: string, phone: string): Promise<DuplicateMatch[]> {
    const normalizedPhone = normalizeGhanaPhone(phone);
    
    const patients = await prisma.patient.findMany({
      where: {
        tenantId,
        isActive: true,
        isMerged: false,
        OR: [
          { phonePrimary: normalizedPhone },
          { phoneSecondary: normalizedPhone },
        ],
      },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phonePrimary: true,
        ghanaCardNumber: true,
        photoUrl: true,
      },
      take: 10,
    });

    return patients.map((patient: typeof patients[number]) => ({
      patientId: patient.id,
      mrn: patient.mrn,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phonePrimary,
      ghanaCardNumber: patient.ghanaCardNumber,
      photoUrl: patient.photoUrl,
      score: 40,
      matchingFactors: [{
        field: 'Phone Number',
        weight: 40,
        matched: true,
        details: 'Exact match',
      }],
    }));
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();

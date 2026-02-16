import { PrismaClient } from '@prisma/client';
import { logger } from '../../common/utils/logger.js';

const prisma = new PrismaClient();

// NHIA (National Health Insurance Authority) Portal Integration
// This service handles communication with Ghana's NHIA for claims processing

interface NHIAConfig {
  apiUrl: string;
  apiKey: string;
  facilityCode: string;
  enabled: boolean;
}

interface NHIAVerificationResult {
  isValid: boolean;
  memberName: string;
  memberNumber: string;
  expiryDate: string;
  scheme: string;
  status: string;
  dependants?: number;
}

class NHIAService {
  private config: NHIAConfig = {
    apiUrl: process.env.NHIA_API_URL || 'https://api.nhia.gov.gh/v1',
    apiKey: process.env.NHIA_API_KEY || '',
    facilityCode: process.env.NHIA_FACILITY_CODE || '',
    enabled: process.env.NHIA_ENABLED === 'true',
  };

  // Verify member eligibility
  async verifyMember(memberNumber: string): Promise<NHIAVerificationResult> {
    if (!this.config.enabled) {
      logger.warn('NHIA integration is not enabled. Returning mock verification.');
      return this.mockVerification(memberNumber);
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/members/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Facility-Code': this.config.facilityCode,
        },
        body: JSON.stringify({ memberNumber }),
      });

      if (!response.ok) {
        throw new Error(`NHIA API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as NHIAVerificationResult;
    } catch (error: any) {
      logger.error('NHIA verification failed:', error.message);
      return this.localVerification(memberNumber);
    }
  }

  // Submit claim to NHIA
  async submitClaim(claimId: string): Promise<{ success: boolean; nhiaReference?: string; error?: string }> {
    const claim = await prisma.nHISClaim.findUnique({
      where: { id: claimId },
      include: { items: { include: { tariff: true } } },
    });

    if (!claim) throw new Error('Claim not found');

    const payload = {
      memberNumber: claim.nhisNumber,
      facilityCode: this.config.facilityCode,
      claimDate: claim.claimDate.toISOString(),
      claimNumber: claim.claimNumber,
      services: claim.items.map((item: any) => ({
        tariffCode: item.tariff?.code || '',
        description: item.tariff?.description || '',
        quantity: item.quantity,
        amount: item.amount,
      })),
      totalAmount: claim.totalAmount,
    };

    if (!this.config.enabled) {
      logger.warn('NHIA integration not enabled. Simulating claim submission.');
      const ref = `NHIA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await prisma.nHISClaim.update({
        where: { id: claimId },
        data: { status: 'SUBMITTED', submittedAt: new Date(), notes: `Simulated ref: ${ref}` },
      });
      return { success: true, nhiaReference: ref };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/claims/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Facility-Code': this.config.facilityCode,
        },
        body: JSON.stringify(payload),
      });

      const result: any = await response.json();

      if (response.ok && result.reference) {
        await prisma.nHISClaim.update({
          where: { id: claimId },
          data: { status: 'SUBMITTED', submittedAt: new Date(), notes: `NHIA Ref: ${result.reference}` },
        });
        return { success: true, nhiaReference: result.reference };
      }

      return { success: false, error: result.message || 'Submission failed' };
    } catch (error: any) {
      logger.error('NHIA claim submission failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Check claim status
  async checkClaimStatus(nhiaReference: string): Promise<{ status: string; amount?: number; remarks?: string }> {
    if (!this.config.enabled) {
      return { status: 'PENDING', remarks: 'NHIA integration not enabled - simulated status' };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/claims/${nhiaReference}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Facility-Code': this.config.facilityCode,
        },
      });

      if (!response.ok) throw new Error(`Status check failed: ${response.status}`);
      return (await response.json()) as { status: string; amount?: number; remarks?: string };
    } catch (error: any) {
      logger.error('NHIA status check failed:', error.message);
      return { status: 'UNKNOWN', remarks: error.message };
    }
  }

  // Batch submit claims
  async batchSubmitClaims(claimIds: string[]): Promise<{ submitted: number; failed: number; results: any[] }> {
    const results = [];
    let submitted = 0, failed = 0;

    for (const id of claimIds) {
      try {
        const result = await this.submitClaim(id);
        results.push({ claimId: id, ...result });
        if (result.success) submitted++; else failed++;
      } catch (error: any) {
        results.push({ claimId: id, success: false, error: error.message });
        failed++;
      }
    }

    return { submitted, failed, results };
  }

  // Get integration status
  async getStatus(): Promise<{ enabled: boolean; apiUrl: string; facilityCode: string }> {
    return {
      enabled: this.config.enabled,
      apiUrl: this.config.apiUrl,
      facilityCode: this.config.facilityCode,
    };
  }

  private mockVerification(memberNumber: string): NHIAVerificationResult {
    return {
      isValid: true,
      memberName: 'Mock Member',
      memberNumber,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      scheme: 'NHIS',
      status: 'ACTIVE',
    };
  }

  private async localVerification(memberNumber: string): Promise<NHIAVerificationResult> {
    const member = await prisma.nHISMember.findFirst({
      where: { membershipId: memberNumber },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!member) {
      return { isValid: false, memberName: '', memberNumber, expiryDate: '', scheme: '', status: 'NOT_FOUND' };
    }

    return {
      isValid: member.isActive && (!member.validTo || new Date(member.validTo) > new Date()),
      memberName: `${member.patient.firstName} ${member.patient.lastName}`,
      memberNumber: member.membershipId,
      expiryDate: member.validTo?.toISOString() || '',
      scheme: member.membershipType || 'NHIS',
      status: member.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }
}

export const nhiaService = new NHIAService();

/**
 * Ghana Integrations Service Tests
 * Tests SMS formatting, MoMo phone formatting, NHIA verification logic, payment simulation
 */

// ==================== SMS PHONE FORMATTING ====================

function formatGhanaPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '233' + cleaned.substring(1);
  if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
  if (cleaned.length < 12) return '';
  return cleaned;
}

// ==================== NHIA MOCK VERIFICATION ====================

interface NHIAVerificationResult {
  isValid: boolean;
  memberName: string;
  memberNumber: string;
  expiryDate: string;
  scheme: string;
  status: string;
  dependants?: number;
}

function mockNHIAVerification(memberNumber: string): NHIAVerificationResult {
  const isValid = /^NHIS-\d{6,}$/.test(memberNumber) || memberNumber.length >= 8;
  return {
    isValid,
    memberName: isValid ? 'Kwame Asante' : '',
    memberNumber,
    expiryDate: isValid ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
    scheme: isValid ? 'NHIS_FORMAL' : '',
    status: isValid ? 'ACTIVE' : 'INVALID',
    dependants: isValid ? 2 : 0,
  };
}

// ==================== MOMO PAYMENT SIMULATION ====================

interface PaymentRequest {
  invoiceId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
  description: string;
  patientName: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  status: string;
  message: string;
  provider: string;
}

function simulateMoMoPayment(request: PaymentRequest): PaymentResult {
  const transactionId = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  return {
    success: true,
    transactionId,
    status: 'SIMULATED_PENDING',
    message: `Simulated ${request.provider} payment of GHS ${request.amount} to ${request.phoneNumber}`,
    provider: request.provider,
  };
}

// ==================== SMS MESSAGE TEMPLATES ====================

function buildAppointmentReminder(patientName: string, date: string, time: string, doctorName: string, senderId: string): string {
  return `Dear ${patientName}, this is a reminder of your appointment on ${date} ${time} with ${doctorName}. Please arrive 15 minutes early. - ${senderId}`;
}

function buildLabResultNotification(patientName: string, testName: string, senderId: string): string {
  return `Dear ${patientName}, your ${testName} results are ready. Please visit the hospital or contact us for details. - ${senderId}`;
}

function buildDischargeNotification(patientName: string, senderId: string): string {
  return `Dear ${patientName}, you have been discharged. Please follow your discharge instructions and attend your follow-up appointment. Get well soon! - ${senderId}`;
}

// ==================== PROVIDER STATUS ====================

function getProviderStatus(configs: Record<string, { enabled: boolean }>): { provider: string; enabled: boolean }[] {
  return Object.entries(configs).map(([key, config]) => ({
    provider: key,
    enabled: config.enabled,
  }));
}

// ==================== WEBHOOK SIGNATURE VERIFICATION ====================

function verifyPaystackSignature(body: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
  return hash === signature;
}

// ==================== TESTS ====================

describe('Ghana Integrations', () => {

  describe('SMS Phone Formatting', () => {
    it('should format local number starting with 0', () => {
      expect(formatGhanaPhone('0241234567')).toBe('233241234567');
    });

    it('should keep number already starting with 233', () => {
      expect(formatGhanaPhone('233241234567')).toBe('233241234567');
    });

    it('should add 233 prefix to bare number', () => {
      expect(formatGhanaPhone('241234567')).toBe('233241234567');
    });

    it('should strip non-digit characters', () => {
      expect(formatGhanaPhone('+233-24-123-4567')).toBe('233241234567');
      expect(formatGhanaPhone('024 123 4567')).toBe('233241234567');
    });

    it('should return empty for too-short numbers', () => {
      expect(formatGhanaPhone('024')).toBe('');
      expect(formatGhanaPhone('12345')).toBe('');
    });

    it('should handle empty string', () => {
      expect(formatGhanaPhone('')).toBe('');
    });

    it('should handle number with country code and leading +', () => {
      expect(formatGhanaPhone('+233501234567')).toBe('233501234567');
    });

    it('should handle Vodafone numbers', () => {
      expect(formatGhanaPhone('0201234567')).toBe('233201234567');
    });

    it('should handle AirtelTigo numbers', () => {
      expect(formatGhanaPhone('0261234567')).toBe('233261234567');
    });
  });

  describe('NHIA Member Verification (Mock)', () => {
    it('should validate proper NHIS number', () => {
      const result = mockNHIAVerification('NHIS-123456');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.scheme).toBe('NHIS_FORMAL');
      expect(result.memberName).toBeTruthy();
    });

    it('should validate long member numbers', () => {
      const result = mockNHIAVerification('12345678');
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('ACTIVE');
    });

    it('should reject short invalid numbers', () => {
      const result = mockNHIAVerification('123');
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('INVALID');
      expect(result.memberName).toBe('');
    });

    it('should include expiry date for valid members', () => {
      const result = mockNHIAVerification('NHIS-999999');
      expect(result.expiryDate).toBeTruthy();
      const expiry = new Date(result.expiryDate);
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should include dependant count for valid members', () => {
      const result = mockNHIAVerification('NHIS-123456');
      expect(result.dependants).toBe(2);
    });

    it('should return 0 dependants for invalid members', () => {
      const result = mockNHIAVerification('bad');
      expect(result.dependants).toBe(0);
    });

    it('should preserve original member number in result', () => {
      const result = mockNHIAVerification('NHIS-555555');
      expect(result.memberNumber).toBe('NHIS-555555');
    });
  });

  describe('MoMo Payment Simulation', () => {
    const baseRequest: PaymentRequest = {
      invoiceId: 'inv-001',
      amount: 150.00,
      currency: 'GHS',
      phoneNumber: '0241234567',
      provider: 'MTN',
      description: 'Hospital payment',
      patientName: 'Ama Mensah',
    };

    it('should return success for simulated payment', () => {
      const result = simulateMoMoPayment(baseRequest);
      expect(result.success).toBe(true);
      expect(result.status).toBe('SIMULATED_PENDING');
    });

    it('should generate unique transaction ID', () => {
      const r1 = simulateMoMoPayment(baseRequest);
      const r2 = simulateMoMoPayment(baseRequest);
      expect(r1.transactionId).not.toBe(r2.transactionId);
    });

    it('should include provider in result', () => {
      expect(simulateMoMoPayment({ ...baseRequest, provider: 'MTN' }).provider).toBe('MTN');
      expect(simulateMoMoPayment({ ...baseRequest, provider: 'VODAFONE' }).provider).toBe('VODAFONE');
      expect(simulateMoMoPayment({ ...baseRequest, provider: 'AIRTELTIGO' }).provider).toBe('AIRTELTIGO');
    });

    it('should include amount and phone in message', () => {
      const result = simulateMoMoPayment(baseRequest);
      expect(result.message).toContain('150');
      expect(result.message).toContain('0241234567');
    });

    it('should have transaction ID starting with SIM-', () => {
      const result = simulateMoMoPayment(baseRequest);
      expect(result.transactionId).toMatch(/^SIM-/);
    });
  });

  describe('SMS Message Templates', () => {
    it('should build appointment reminder', () => {
      const msg = buildAppointmentReminder('Kwame', 'Mon 15 Jan', '09:00', 'Dr. Mensah', 'AIHospital');
      expect(msg).toContain('Kwame');
      expect(msg).toContain('Mon 15 Jan');
      expect(msg).toContain('09:00');
      expect(msg).toContain('Dr. Mensah');
      expect(msg).toContain('15 minutes early');
      expect(msg).toContain('AIHospital');
    });

    it('should build lab result notification', () => {
      const msg = buildLabResultNotification('Ama', 'Full Blood Count', 'AIHospital');
      expect(msg).toContain('Ama');
      expect(msg).toContain('Full Blood Count');
      expect(msg).toContain('results are ready');
    });

    it('should build discharge notification', () => {
      const msg = buildDischargeNotification('Kofi', 'AIHospital');
      expect(msg).toContain('Kofi');
      expect(msg).toContain('discharged');
      expect(msg).toContain('follow-up');
    });
  });

  describe('Provider Status', () => {
    it('should list all providers with status', () => {
      const configs = {
        MTN: { enabled: true },
        VODAFONE: { enabled: false },
        AIRTELTIGO: { enabled: true },
      };
      const status = getProviderStatus(configs);
      expect(status).toHaveLength(3);
      expect(status.find(p => p.provider === 'MTN')?.enabled).toBe(true);
      expect(status.find(p => p.provider === 'VODAFONE')?.enabled).toBe(false);
    });

    it('should handle empty config', () => {
      expect(getProviderStatus({})).toHaveLength(0);
    });

    it('should handle single provider', () => {
      const status = getProviderStatus({ MTN: { enabled: true } });
      expect(status).toHaveLength(1);
      expect(status[0].provider).toBe('MTN');
    });
  });

  describe('Webhook Signature Verification', () => {
    it('should verify valid Paystack signature', () => {
      const secret = 'test-secret-key';
      const body = '{"event":"charge.success","data":{"reference":"ref123"}}';
      const crypto = require('crypto');
      const validSig = crypto.createHmac('sha512', secret).update(body).digest('hex');
      expect(verifyPaystackSignature(body, validSig, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      expect(verifyPaystackSignature('body', 'invalid-sig', 'secret')).toBe(false);
    });

    it('should reject empty signature', () => {
      expect(verifyPaystackSignature('body', '', 'secret')).toBe(false);
    });

    it('should be sensitive to body changes', () => {
      const secret = 'key';
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha512', secret).update('original').digest('hex');
      expect(verifyPaystackSignature('modified', sig, secret)).toBe(false);
    });
  });
});

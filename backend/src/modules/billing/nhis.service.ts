import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateClaimDto {
  patientId: string;
  encounterId?: string;
  nhisNumber: string;
  invoiceId?: string;
  items: Array<{
    tariffCode: string;
    quantity: number;
    amount: number;
  }>;
  notes?: string;
}

class NHISService {
  private async generateClaimNumber(tenantId: string): Promise<string> {
    const count = await prisma.nHISClaim.count({ where: { tenantId } });
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `NHIS-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }

  async getClaims(
    tenantId: string,
    status?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 50
  ) {
    const where: any = { tenantId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.claimDate = {};
      if (startDate) where.claimDate.gte = startDate;
      if (endDate) where.claimDate.lte = endDate;
    }

    return prisma.nHISClaim.findMany({
      where,
      include: {
        items: {
          include: { tariff: true },
        },
      },
      orderBy: { claimDate: 'desc' },
      take: limit,
    });
  }

  async getClaimById(claimId: string) {
    return prisma.nHISClaim.findUnique({
      where: { id: claimId },
      include: {
        items: {
          include: { tariff: true },
        },
      },
    });
  }

  async createClaim(tenantId: string, userId: string, data: CreateClaimDto) {
    const claimNumber = await this.generateClaimNumber(tenantId);

    // Resolve tariff IDs from codes
    const itemsData = [];
    let totalAmount = 0;

    for (const item of data.items) {
      const tariff = await prisma.nHISTariff.findUnique({
        where: { code: item.tariffCode },
      });

      if (!tariff) {
        throw new Error(`NHIS tariff code not found: ${item.tariffCode}`);
      }

      const amount = item.amount || tariff.price * item.quantity;
      totalAmount += amount;

      itemsData.push({
        tariffId: tariff.id,
        quantity: item.quantity,
        amount,
      });
    }

    const claim = await prisma.nHISClaim.create({
      data: {
        tenantId,
        patientId: data.patientId,
        encounterId: data.encounterId,
        claimNumber,
        nhisNumber: data.nhisNumber,
        totalAmount,
        status: 'DRAFT',
        notes: data.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          include: { tariff: true },
        },
      },
    });

    return claim;
  }

  async createClaimFromInvoice(tenantId: string, userId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          include: { nhisInfo: true },
        },
        items: true,
      },
    });

    if (!invoice) throw new Error('Invoice not found');

    const nhisInfo = invoice.patient?.nhisInfo;
    if (!nhisInfo || !nhisInfo.nhisNumber) {
      throw new Error('Patient does not have NHIS membership');
    }

    // Map invoice items to NHIS claim items
    const claimItems: Array<{ tariffCode: string; quantity: number; amount: number }> = [];

    for (const item of invoice.items) {
      // Try to find matching NHIS tariff by description or service type
      const tariff = await prisma.nHISTariff.findFirst({
        where: {
          OR: [
            { description: { contains: item.description, mode: 'insensitive' } },
            { code: item.serviceId || '' },
          ],
          isActive: true,
        },
      });

      if (tariff) {
        claimItems.push({
          tariffCode: tariff.code,
          quantity: item.quantity,
          amount: tariff.price * item.quantity,
        });
      }
    }

    if (claimItems.length === 0) {
      throw new Error('No NHIS-eligible items found on this invoice');
    }

    return this.createClaim(tenantId, userId, {
      patientId: invoice.patientId,
      nhisNumber: nhisInfo.nhisNumber,
      invoiceId,
      items: claimItems,
    });
  }

  async submitClaim(claimId: string) {
    const claim = await prisma.nHISClaim.findUnique({
      where: { id: claimId },
      include: { items: { include: { tariff: true } } },
    });

    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'DRAFT') {
      throw new Error(`Cannot submit claim in ${claim.status} status`);
    }

    return prisma.nHISClaim.update({
      where: { id: claimId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { items: { include: { tariff: true } } },
    });
  }

  async approveClaim(claimId: string, approvedAmount: number) {
    const claim = await prisma.nHISClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'SUBMITTED') {
      throw new Error(`Cannot approve claim in ${claim.status} status`);
    }

    return prisma.nHISClaim.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        approvedAmount,
        approvedAt: new Date(),
      },
    });
  }

  async rejectClaim(claimId: string, reason: string) {
    const claim = await prisma.nHISClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'SUBMITTED') {
      throw new Error(`Cannot reject claim in ${claim.status} status`);
    }

    return prisma.nHISClaim.update({
      where: { id: claimId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async markClaimPaid(claimId: string, paidAmount: number) {
    const claim = await prisma.nHISClaim.findUnique({ where: { id: claimId } });
    if (!claim) throw new Error('Claim not found');
    if (claim.status !== 'APPROVED') {
      throw new Error(`Cannot mark as paid: claim is ${claim.status}`);
    }

    return prisma.nHISClaim.update({
      where: { id: claimId },
      data: {
        status: 'PAID',
        approvedAmount: paidAmount,
        paidAt: new Date(),
      },
    });
  }

  async getClaimsSummary(tenantId: string) {
    const [draft, submitted, approved, rejected, paid] = await Promise.all([
      prisma.nHISClaim.aggregate({ where: { tenantId, status: 'DRAFT' }, _count: true, _sum: { totalAmount: true } }),
      prisma.nHISClaim.aggregate({ where: { tenantId, status: 'SUBMITTED' }, _count: true, _sum: { totalAmount: true } }),
      prisma.nHISClaim.aggregate({ where: { tenantId, status: 'APPROVED' }, _count: true, _sum: { approvedAmount: true } }),
      prisma.nHISClaim.aggregate({ where: { tenantId, status: 'REJECTED' }, _count: true, _sum: { totalAmount: true } }),
      prisma.nHISClaim.aggregate({ where: { tenantId, status: 'PAID' }, _count: true, _sum: { approvedAmount: true } }),
    ]);

    return {
      draft: { count: draft._count, amount: draft._sum.totalAmount || 0 },
      submitted: { count: submitted._count, amount: submitted._sum.totalAmount || 0 },
      approved: { count: approved._count, amount: approved._sum.approvedAmount || 0 },
      rejected: { count: rejected._count, amount: rejected._sum.totalAmount || 0 },
      paid: { count: paid._count, amount: paid._sum.approvedAmount || 0 },
    };
  }

  // Generate NHIS XML for submission
  async generateClaimXML(claimId: string): Promise<string> {
    const claim = await prisma.nHISClaim.findUnique({
      where: { id: claimId },
      include: {
        items: { include: { tariff: true } },
      },
    });

    if (!claim) throw new Error('Claim not found');

    // Build Ghana NHIS XML format
    const itemsXml = claim.items.map((item, idx) => `
    <ClaimLine>
      <LineNo>${idx + 1}</LineNo>
      <TariffCode>${item.tariff.code}</TariffCode>
      <TariffDescription>${this.escapeXml(item.tariff.description)}</TariffDescription>
      <Quantity>${item.quantity}</Quantity>
      <UnitPrice>${item.tariff.price.toFixed(2)}</UnitPrice>
      <Amount>${item.amount.toFixed(2)}</Amount>
    </ClaimLine>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISClaim>
  <Header>
    <ClaimNumber>${claim.claimNumber}</ClaimNumber>
    <NHISNumber>${claim.nhisNumber}</NHISNumber>
    <ClaimDate>${claim.claimDate.toISOString().split('T')[0]}</ClaimDate>
    <TotalAmount>${claim.totalAmount.toFixed(2)}</TotalAmount>
    <Status>${claim.status}</Status>
  </Header>
  <ClaimLines>${itemsXml}
  </ClaimLines>
</NHISClaim>`;

    return xml;
  }

  // Batch generate XML for multiple claims (monthly submission)
  async generateBatchXML(tenantId: string, claimIds: string[]): Promise<string> {
    const claims = await prisma.nHISClaim.findMany({
      where: { id: { in: claimIds }, tenantId },
      include: { items: { include: { tariff: true } } },
    });

    if (claims.length === 0) throw new Error('No claims found');

    const claimsXml = [];
    let grandTotal = 0;

    for (const claim of claims) {
      grandTotal += claim.totalAmount;

      const itemsXml = claim.items.map((item, idx) => `
      <ClaimLine>
        <LineNo>${idx + 1}</LineNo>
        <TariffCode>${item.tariff.code}</TariffCode>
        <TariffDescription>${this.escapeXml(item.tariff.description)}</TariffDescription>
        <Quantity>${item.quantity}</Quantity>
        <UnitPrice>${item.tariff.price.toFixed(2)}</UnitPrice>
        <Amount>${item.amount.toFixed(2)}</Amount>
      </ClaimLine>`).join('');

      claimsXml.push(`
    <Claim>
      <ClaimNumber>${claim.claimNumber}</ClaimNumber>
      <NHISNumber>${claim.nhisNumber}</NHISNumber>
      <PatientId>${claim.patientId}</PatientId>
      <ClaimDate>${claim.claimDate.toISOString().split('T')[0]}</ClaimDate>
      <TotalAmount>${claim.totalAmount.toFixed(2)}</TotalAmount>
      <ClaimLines>${itemsXml}
      </ClaimLines>
    </Claim>`);
    }

    const now = new Date();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISBatchClaim>
  <BatchHeader>
    <SubmissionDate>${now.toISOString().split('T')[0]}</SubmissionDate>
    <TotalClaims>${claims.length}</TotalClaims>
    <GrandTotal>${grandTotal.toFixed(2)}</GrandTotal>
  </BatchHeader>
  <Claims>${claimsXml.join('')}
  </Claims>
</NHISBatchClaim>`;

    return xml;
  }

  // Tariff management
  async getTariffs(category?: string, activeOnly = true) {
    const where: any = {};
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;

    return prisma.nHISTariff.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async reconcileClaims(tenantId: string, reconciliationData: Array<{
    claimNumber: string;
    status: 'APPROVED' | 'REJECTED' | 'PAID';
    approvedAmount?: number;
    rejectionReason?: string;
  }>) {
    const results = [];

    for (const item of reconciliationData) {
      const claim = await prisma.nHISClaim.findFirst({
        where: { tenantId, claimNumber: item.claimNumber },
      });

      if (!claim) {
        results.push({ claimNumber: item.claimNumber, success: false, error: 'Claim not found' });
        continue;
      }

      try {
        if (item.status === 'APPROVED') {
          await this.approveClaim(claim.id, item.approvedAmount || claim.totalAmount);
        } else if (item.status === 'REJECTED') {
          await this.rejectClaim(claim.id, item.rejectionReason || 'Rejected during reconciliation');
        } else if (item.status === 'PAID') {
          await this.markClaimPaid(claim.id, item.approvedAmount || claim.totalAmount);
        }
        results.push({ claimNumber: item.claimNumber, success: true, status: item.status });
      } catch (error: any) {
        results.push({ claimNumber: item.claimNumber, success: false, error: error.message });
      }
    }

    return results;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const nhisService = new NHISService();

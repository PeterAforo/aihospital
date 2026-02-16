import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class LabReportService {
  async generateReportHTML(orderId: string): Promise<string> {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phonePrimary: true,
          },
        },
        encounter: {
          include: {
            doctor: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
        },
        items: {
          include: {
            test: true,
            subResults: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!order) throw new Error('Lab order not found');

    // Resolve performedBy / approvedBy user names
    const userIds = new Set<string>();
    for (const item of order.items) {
      if (item.performedBy) userIds.add(item.performedBy);
      if (item.approvedBy) userIds.add(item.approvedBy);
    }
    const users = userIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const patient = order.patient;
    const doctor = order.encounter?.doctor;
    const age = patient.dateOfBirth
      ? this.calculateAge(new Date(patient.dateOfBirth))
      : 'N/A';

    const now = new Date();
    const printDate = now.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const printTime = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
    });

    // Build test results rows
    let resultsHTML = '';
    for (const item of order.items) {
      if (item.subResults && item.subResults.length > 0) {
        // Panel test with sub-results
        resultsHTML += `
          <tr class="panel-header">
            <td colspan="5" style="font-weight:bold; background:#f0f4f8; padding:8px 12px;">
              ${this.esc(item.test.name)} ${item.test.code ? `(${this.esc(item.test.code)})` : ''}
            </td>
          </tr>`;
        for (const sr of item.subResults) {
          const flagClass = sr.isCritical ? 'critical' : sr.isAbnormal ? 'abnormal' : '';
          const flag = sr.isCritical ? '!!!' : sr.isAbnormal ? '*' : '';
          resultsHTML += `
          <tr class="${flagClass}">
            <td style="padding-left:24px;">${this.esc(sr.parameterName)}</td>
            <td class="result-value">${sr.resultValue !== null ? sr.resultValue : (sr.result || '-')}</td>
            <td>${this.esc(sr.unit || '')}</td>
            <td>${this.esc(sr.normalRange || '')}</td>
            <td class="flag">${flag}</td>
          </tr>`;
        }
      } else {
        // Single test result
        const flagClass = item.isCritical ? 'critical' : item.isAbnormal ? 'abnormal' : '';
        const flag = item.isCritical ? '!!!' : item.isAbnormal ? '*' : '';
        resultsHTML += `
          <tr class="${flagClass}">
            <td>${this.esc(item.test.name)} ${item.test.code ? `(${this.esc(item.test.code)})` : ''}</td>
            <td class="result-value">${item.resultValue !== null ? item.resultValue : (item.result || '-')}</td>
            <td>${this.esc(item.unit || item.test.unit || '')}</td>
            <td>${this.esc(item.normalRange || item.test.normalRange || '')}</td>
            <td class="flag">${flag}</td>
          </tr>`;
      }
    }

    const performedById = order.items[0]?.performedBy;
    const approvedById = order.items[0]?.approvedBy;
    const performedBy = performedById ? userMap.get(performedById) : null;
    const approvedBy = approvedById ? userMap.get(approvedById) : null;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lab Report - ${patient.firstName} ${patient.lastName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
    .report { max-width: 800px; margin: 0 auto; }
    
    .header { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; color: #1a56db; margin-bottom: 4px; }
    .header .subtitle { font-size: 11px; color: #666; }
    
    .patient-info { display: flex; justify-content: space-between; margin-bottom: 16px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; }
    .patient-info .col { flex: 1; }
    .patient-info .label { font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; }
    .patient-info .value { font-size: 12px; margin-bottom: 4px; }
    
    .results-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .results-table th { background: #1a56db; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
    .results-table td { padding: 6px 12px; border-bottom: 1px solid #e2e8f0; }
    .results-table tr:hover { background: #f8fafc; }
    .result-value { font-weight: 600; }
    .abnormal { background: #fef3c7 !important; }
    .abnormal .result-value { color: #d97706; font-weight: 700; }
    .critical { background: #fee2e2 !important; }
    .critical .result-value { color: #dc2626; font-weight: 700; }
    .flag { font-weight: 700; color: #dc2626; text-align: center; }
    
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; }
    .signature-block { text-align: center; min-width: 200px; }
    .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 11px; }
    
    .legend { margin-top: 12px; font-size: 10px; color: #666; }
    .print-info { text-align: right; font-size: 10px; color: #999; margin-top: 8px; }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="header">
      <h1>LABORATORY REPORT</h1>
      <div class="subtitle">Confidential Medical Document</div>
    </div>
    
    <div class="patient-info">
      <div class="col">
        <div><span class="label">Patient Name:</span></div>
        <div class="value">${this.esc(patient.firstName)} ${this.esc(patient.lastName)}</div>
        <div><span class="label">MRN:</span></div>
        <div class="value">${this.esc(patient.mrn)}</div>
        <div><span class="label">Gender / Age:</span></div>
        <div class="value">${this.esc(patient.gender || 'N/A')} / ${age}</div>
      </div>
      <div class="col">
        <div><span class="label">Order Date:</span></div>
        <div class="value">${new Date(order.orderDate).toLocaleDateString('en-GB')}</div>
        <div><span class="label">Priority:</span></div>
        <div class="value">${this.esc(order.priority || 'ROUTINE')}</div>
        <div><span class="label">Requesting Doctor:</span></div>
        <div class="value">${doctor ? `Dr. ${this.esc(doctor.firstName)} ${this.esc(doctor.lastName)}` : 'N/A'}</div>
      </div>
      <div class="col">
        <div><span class="label">Status:</span></div>
        <div class="value">${this.esc(order.status)}</div>
        <div><span class="label">Phone:</span></div>
        <div class="value">${this.esc(patient.phonePrimary || 'N/A')}</div>
      </div>
    </div>
    
    <table class="results-table">
      <thead>
        <tr>
          <th>Test / Parameter</th>
          <th>Result</th>
          <th>Unit</th>
          <th>Reference Range</th>
          <th>Flag</th>
        </tr>
      </thead>
      <tbody>
        ${resultsHTML}
      </tbody>
    </table>
    
    <div class="legend">
      <strong>Legend:</strong> * = Abnormal &nbsp;&nbsp; !!! = Critical Value &nbsp;&nbsp;
      Highlighted rows indicate values outside reference range.
    </div>
    
    <div class="footer">
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line">
            ${performedBy ? `${this.esc(performedBy.firstName)} ${this.esc(performedBy.lastName)}` : ''}
            <br>Lab Technologist
          </div>
        </div>
        <div class="signature-block">
          <div class="signature-line">
            ${approvedBy ? `${this.esc(approvedBy.firstName)} ${this.esc(approvedBy.lastName)}` : ''}
            <br>Verified By
          </div>
        </div>
      </div>
    </div>
    
    <div class="print-info">
      Printed: ${printDate} ${printTime} | This is a computer-generated report.
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  async getReportData(orderId: string) {
    const order = await prisma.labOrder.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phonePrimary: true,
          },
        },
        encounter: {
          include: {
            doctor: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        items: {
          include: {
            test: true,
            subResults: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    if (!order) throw new Error('Lab order not found');

    // Resolve user names for performedBy/approvedBy
    const userIds = new Set<string>();
    for (const item of order.items) {
      if (item.performedBy) userIds.add(item.performedBy);
      if (item.approvedBy) userIds.add(item.approvedBy);
    }
    const users = userIds.size > 0
      ? await prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    return { ...order, _userMap: userMap };
  }

  private calculateAge(dob: Date): string {
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      years--;
    }
    if (years < 1) {
      const months = (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth();
      return `${months} months`;
    }
    return `${years} years`;
  }

  private esc(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export const labReportService = new LabReportService();

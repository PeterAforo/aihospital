import { prisma } from '../../common/utils/prisma.js';
import { strSim, phoneNorm } from './ai-helpers.js';

export async function checkDuplicatePatient(data: {
  tenantId: string; firstName: string; lastName: string;
  dateOfBirth?: string; phone?: string; ghanaCardNumber?: string;
}) {
  const { tenantId, firstName, lastName, dateOfBirth, phone, ghanaCardNumber } = data;

  if (ghanaCardNumber) {
    const exact = await prisma.patient.findMany({
      where: { tenantId, ghanaCardNumber },
      select: { id: true, mrn: true, firstName: true, lastName: true, dateOfBirth: true, phonePrimary: true, ghanaCardNumber: true },
    });
    if (exact.length > 0) return {
      hasPotentialDuplicates: true,
      duplicates: exact.map(p => ({
        patientId: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName,
        dateOfBirth: p.dateOfBirth?.toISOString() || null, phone: p.phonePrimary,
        ghanaCardNumber: p.ghanaCardNumber, similarityScore: 100,
        matchReasons: ['Exact Ghana Card match'],
      })),
    };
  }

  const candidates = await prisma.patient.findMany({
    where: { tenantId, OR: [
      { firstName: { startsWith: firstName.substring(0, 2), mode: 'insensitive' } },
      { lastName: { startsWith: lastName.substring(0, 2), mode: 'insensitive' } },
      ...(phone ? [{ phonePrimary: { contains: phoneNorm(phone).slice(-7) } }] : []),
    ]},
    select: { id: true, mrn: true, firstName: true, lastName: true, dateOfBirth: true, phonePrimary: true, ghanaCardNumber: true },
    take: 50,
  });

  const dupes: any[] = [];
  for (const p of candidates) {
    const reasons: string[] = [];
    let score = 0;
    const nameSim = (strSim(firstName, p.firstName) + strSim(lastName, p.lastName)) / 2;
    score += nameSim * 0.4;
    if (nameSim >= 80) reasons.push(`Name ${Math.round(nameSim)}% similar`);

    if (dateOfBirth && p.dateOfBirth) {
      const d1 = new Date(dateOfBirth).toISOString().split('T')[0];
      const d2 = p.dateOfBirth.toISOString().split('T')[0];
      if (d1 === d2) { score += 30; reasons.push('Exact DOB match'); }
      else if (Math.abs(new Date(dateOfBirth).getTime() - p.dateOfBirth.getTime()) <= 86400000) {
        score += 20; reasons.push('DOB within 1 day');
      }
    }
    if (phone && p.phonePrimary) {
      const n1 = phoneNorm(phone), n2 = phoneNorm(p.phonePrimary);
      if (n1 === n2) { score += 20; reasons.push('Exact phone match'); }
      else if (n1.slice(-7) === n2.slice(-7)) { score += 15; reasons.push('Phone last 7 digits match'); }
    }
    if (ghanaCardNumber && p.ghanaCardNumber &&
        ghanaCardNumber.replace(/[\s\-]/g, '') === p.ghanaCardNumber.replace(/[\s\-]/g, '')) {
      score += 10; reasons.push('Ghana Card match');
    }

    const fs = Math.round(score);
    if (fs >= 60 && reasons.length > 0) dupes.push({
      patientId: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName,
      dateOfBirth: p.dateOfBirth?.toISOString() || null, phone: p.phonePrimary,
      ghanaCardNumber: p.ghanaCardNumber, similarityScore: fs, matchReasons: reasons,
    });
  }
  dupes.sort((a: any, b: any) => b.similarityScore - a.similarityScore);
  return { hasPotentialDuplicates: dupes.length > 0, duplicates: dupes.slice(0, 10) };
}

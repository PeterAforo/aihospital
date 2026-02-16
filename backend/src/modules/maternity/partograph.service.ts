import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class PartographService {
  async addEntry(deliveryRecordId: string, recordedBy: string, data: {
    hoursFromStart: number;
    cervicalDilation?: number;
    descentOfHead?: number;
    contractionsPerTen?: number;
    contractionDuration?: string;
    membranes?: string;
    liquorColor?: string;
    moulding?: string;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    pulse?: number;
    temperature?: number;
    urineVolume?: string;
    urineProtein?: string;
    urineAcetone?: string;
    oxytocinDose?: number;
    drugsGiven?: string;
    ivFluids?: string;
    fetalHeartRate?: number;
    notes?: string;
  }) {
    return prisma.partographEntry.create({
      data: {
        deliveryRecordId,
        recordedBy,
        ...data,
      },
    });
  }

  async getEntries(deliveryRecordId: string) {
    return prisma.partographEntry.findMany({
      where: { deliveryRecordId },
      orderBy: { hoursFromStart: 'asc' },
    });
  }

  async getPartographData(deliveryRecordId: string) {
    const entries = await this.getEntries(deliveryRecordId);

    const delivery = await prisma.deliveryRecord.findUnique({
      where: { id: deliveryRecordId },
      include: {
        pregnancy: {
          include: {
            patient: { select: { firstName: true, lastName: true, mrn: true, dateOfBirth: true } },
          },
        },
      },
    });

    if (!delivery) throw new Error('Delivery record not found');

    // WHO alert/action line calculation
    // Alert line: starts at 4cm dilation, 1cm/hour expected progress
    // Action line: 4 hours to the right of alert line
    const alertLine = entries
      .filter(e => e.cervicalDilation !== null)
      .map(e => ({
        hours: e.hoursFromStart,
        expectedDilation: 4 + e.hoursFromStart, // 1cm/hr from 4cm
      }));

    const actionLine = alertLine.map(p => ({
      hours: p.hours + 4,
      expectedDilation: p.expectedDilation,
    }));

    // Check for alerts
    const alerts: string[] = [];
    const latestEntry = entries[entries.length - 1];

    if (latestEntry) {
      // Prolonged labour check
      if (latestEntry.cervicalDilation !== null && latestEntry.hoursFromStart > 0) {
        const expectedDilation = 4 + latestEntry.hoursFromStart;
        if (latestEntry.cervicalDilation < expectedDilation - 4) {
          alerts.push('CROSSED_ACTION_LINE: Cervical dilation has crossed the action line. Consider intervention.');
        } else if (latestEntry.cervicalDilation < expectedDilation) {
          alerts.push('CROSSED_ALERT_LINE: Cervical dilation has crossed the alert line. Monitor closely.');
        }
      }

      // Fetal distress
      if (latestEntry.fetalHeartRate !== null) {
        if (latestEntry.fetalHeartRate < 110) {
          alerts.push('FETAL_BRADYCARDIA: Fetal heart rate below 110 bpm.');
        } else if (latestEntry.fetalHeartRate > 160) {
          alerts.push('FETAL_TACHYCARDIA: Fetal heart rate above 160 bpm.');
        }
      }

      // Meconium
      if (latestEntry.liquorColor === 'MECONIUM_THICK') {
        alerts.push('THICK_MECONIUM: Thick meconium-stained liquor detected.');
      }

      // Maternal vitals
      if (latestEntry.bloodPressureSystolic && latestEntry.bloodPressureSystolic >= 140) {
        alerts.push('HYPERTENSION: Maternal systolic BP >= 140 mmHg.');
      }
      if (latestEntry.temperature && latestEntry.temperature >= 38) {
        alerts.push('MATERNAL_FEVER: Maternal temperature >= 38°C.');
      }
    }

    return {
      deliveryRecord: delivery,
      entries,
      alertLine,
      actionLine,
      alerts,
      summary: {
        totalEntries: entries.length,
        latestDilation: latestEntry?.cervicalDilation,
        latestFHR: latestEntry?.fetalHeartRate,
        latestDescent: latestEntry?.descentOfHead,
        hoursInLabour: latestEntry?.hoursFromStart || 0,
      },
    };
  }

  async deleteEntry(entryId: string) {
    return prisma.partographEntry.delete({ where: { id: entryId } });
  }
}

export const partographService = new PartographService();

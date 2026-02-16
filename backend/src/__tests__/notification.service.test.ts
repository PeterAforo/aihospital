jest.mock('@prisma/client', () => {
  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as any;

// We need to import after mocking
const { NotificationService } = require('../modules/notifications/notification.service');

describe('NotificationService', () => {
  let service: any;

  beforeEach(() => {
    service = new NotificationService();
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with correct data', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'LAB_RESULT',
        title: 'Test Title',
        message: 'Test message',
        data: {},
        isRead: false,
      };
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: 'user-1',
        type: 'LAB_RESULT',
        title: 'Test Title',
        message: 'Test message',
        data: {},
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'LAB_RESULT',
          title: 'Test Title',
        }),
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('notifyCriticalLabValue', () => {
    it('should create a critical lab value notification with urgency prefix', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-2' });

      await service.notifyCriticalLabValue({
        doctorId: 'doc-1',
        patientName: 'John Doe',
        testName: 'Potassium',
        resultValue: 6.5,
        criticalType: 'HIGH',
        orderId: 'order-1',
        alertId: 'alert-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'doc-1',
          type: 'LAB_RESULT',
          title: expect.stringContaining('CRITICAL'),
          message: expect.stringContaining('Potassium'),
        }),
      });
    });
  });

  describe('notifyLabResultReady', () => {
    it('should create a lab result ready notification', async () => {
      prisma.notification.create.mockResolvedValue({ id: 'notif-3' });

      await service.notifyLabResultReady('doc-1', 'Jane Doe', 'CBC', 'order-2');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'doc-1',
          type: 'LAB_RESULT',
          title: 'Lab Result Ready',
          message: expect.stringContaining('Jane Doe'),
        }),
      });
    });
  });
});

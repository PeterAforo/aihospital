import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger.js';

interface QueueUpdate {
  type: 'queue_update' | 'patient_called' | 'patient_added' | 'patient_removed';
  doctorId: string;
  data: any;
  timestamp: string;
}

class QueueWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/queue' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const doctorId = url.searchParams.get('doctorId');

      if (!doctorId) {
        ws.close(4000, 'doctorId required');
        return;
      }

      logger.info(`WebSocket client connected for doctor: ${doctorId}`);

      if (!this.clients.has(doctorId)) {
        this.clients.set(doctorId, new Set());
      }
      this.clients.get(doctorId)!.add(ws);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to queue updates',
        doctorId,
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          logger.error('WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        logger.info(`WebSocket client disconnected for doctor: ${doctorId}`);
        this.clients.get(doctorId)?.delete(ws);
        if (this.clients.get(doctorId)?.size === 0) {
          this.clients.delete(doctorId);
        }
      });

      ws.on('error', (error: Error) => {
        logger.error('WebSocket error:', error);
      });
    });

    logger.info('Queue WebSocket server initialized');
  }

  broadcast(doctorId: string, update: Omit<QueueUpdate, 'timestamp'>) {
    const clients = this.clients.get(doctorId);
    if (!clients || clients.size === 0) {
      return;
    }

    const message = JSON.stringify({
      ...update,
      timestamp: new Date().toISOString(),
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    logger.debug(`Broadcast to ${clients.size} clients for doctor ${doctorId}`);
  }

  notifyQueueUpdate(doctorId: string, queueData: any) {
    this.broadcast(doctorId, {
      type: 'queue_update',
      doctorId,
      data: queueData,
    });
  }

  notifyPatientCalled(doctorId: string, patientData: any) {
    this.broadcast(doctorId, {
      type: 'patient_called',
      doctorId,
      data: patientData,
    });
  }

  notifyPatientAdded(doctorId: string, patientData: any) {
    this.broadcast(doctorId, {
      type: 'patient_added',
      doctorId,
      data: patientData,
    });
  }

  notifyPatientRemoved(doctorId: string, queueEntryId: string) {
    this.broadcast(doctorId, {
      type: 'patient_removed',
      doctorId,
      data: { queueEntryId },
    });
  }

  getConnectedClients(doctorId: string): number {
    return this.clients.get(doctorId)?.size || 0;
  }

  getAllConnectedClients(): number {
    let total = 0;
    this.clients.forEach((clients) => {
      total += clients.size;
    });
    return total;
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      logger.info('Queue WebSocket server closed');
    }
  }
}

export const queueWebSocketService = new QueueWebSocketService();

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger.js';

interface ERBoardUpdate {
  type: 'er_board_update' | 'er_patient_added' | 'er_patient_updated' | 'er_patient_discharged' | 'er_triage_update';
  tenantId: string;
  data: any;
  timestamp: string;
}

class ERWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map(); // keyed by tenantId

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/er-board' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenantId');

      if (!tenantId) {
        ws.close(4000, 'tenantId required');
        return;
      }

      logger.info(`ER Board WebSocket client connected for tenant: ${tenantId}`);

      if (!this.clients.has(tenantId)) {
        this.clients.set(tenantId, new Set());
      }
      this.clients.get(tenantId)!.add(ws);

      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to ER Board updates',
        tenantId,
        timestamp: new Date().toISOString(),
      }));

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (error) {
          logger.error('ER WebSocket message parse error:', error);
        }
      });

      ws.on('close', () => {
        this.clients.get(tenantId)?.delete(ws);
        if (this.clients.get(tenantId)?.size === 0) {
          this.clients.delete(tenantId);
        }
      });

      ws.on('error', (error: Error) => {
        logger.error('ER WebSocket error:', error);
      });
    });

    logger.info('ER Board WebSocket server initialized on /ws/er-board');
  }

  private broadcast(tenantId: string, update: Omit<ERBoardUpdate, 'timestamp'>) {
    const clients = this.clients.get(tenantId);
    if (!clients || clients.size === 0) return;

    const message = JSON.stringify({
      ...update,
      timestamp: new Date().toISOString(),
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  notifyPatientAdded(tenantId: string, erVisit: any) {
    this.broadcast(tenantId, {
      type: 'er_patient_added',
      tenantId,
      data: erVisit,
    });
  }

  notifyPatientUpdated(tenantId: string, erVisit: any) {
    this.broadcast(tenantId, {
      type: 'er_patient_updated',
      tenantId,
      data: erVisit,
    });
  }

  notifyPatientDischarged(tenantId: string, erVisitId: string) {
    this.broadcast(tenantId, {
      type: 'er_patient_discharged',
      tenantId,
      data: { erVisitId },
    });
  }

  notifyTriageUpdate(tenantId: string, erVisit: any) {
    this.broadcast(tenantId, {
      type: 'er_triage_update',
      tenantId,
      data: erVisit,
    });
  }

  notifyBoardRefresh(tenantId: string, boardData: any) {
    this.broadcast(tenantId, {
      type: 'er_board_update',
      tenantId,
      data: boardData,
    });
  }

  close() {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      logger.info('ER Board WebSocket server closed');
    }
  }
}

export const erWebSocketService = new ERWebSocketService();

import { logger } from '../../common/utils/logger.js';

/**
 * Daily.co Video Calling Service
 * Manages room creation, tokens, and session lifecycle
 * 
 * Required env vars:
 *   DAILY_API_KEY - Daily.co API key
 *   DAILY_DOMAIN  - Your Daily.co domain (e.g., yourorg.daily.co)
 */
const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DAILY_API_KEY}`,
  };
}

export class DailyVideoService {
  get isConfigured(): boolean {
    return !!DAILY_API_KEY && !!DAILY_DOMAIN;
  }

  /**
   * Create a Daily.co room for a teleconsult session
   */
  async createRoom(sessionId: string, options?: {
    expiryMinutes?: number;
    maxParticipants?: number;
    enableRecording?: boolean;
    enableScreenShare?: boolean;
  }): Promise<{ success: boolean; roomUrl?: string; roomName?: string; error?: string }> {
    if (!this.isConfigured) {
      // Return a local fallback URL when Daily.co is not configured
      const fallbackRoom = `session-${sessionId.slice(0, 8)}`;
      return {
        success: true,
        roomUrl: `/telemedicine/call/${fallbackRoom}`,
        roomName: fallbackRoom,
      };
    }

    try {
      const roomName = `smartmed-${sessionId.slice(0, 12)}-${Date.now().toString(36)}`;
      const expirySeconds = (options?.expiryMinutes || 120) * 60;

      const response = await fetch(`${DAILY_API_URL}/rooms`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            exp: Math.floor(Date.now() / 1000) + expirySeconds,
            max_participants: options?.maxParticipants || 4,
            enable_screenshare: options?.enableScreenShare !== false,
            enable_recording: options?.enableRecording ? 'cloud' : undefined,
            enable_chat: true,
            enable_knocking: true,
            start_video_off: false,
            start_audio_off: false,
            lang: 'en',
          },
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error('[DAILY] Room creation failed:', data);
        return { success: false, error: data.error || 'Failed to create room' };
      }

      return {
        success: true,
        roomUrl: data.url,
        roomName: data.name,
      };
    } catch (error: any) {
      logger.error('[DAILY] Room creation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a meeting token for a participant
   */
  async createMeetingToken(roomName: string, options: {
    userName: string;
    userId: string;
    isOwner?: boolean;
    expiryMinutes?: number;
  }): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.isConfigured) {
      // Return a mock token when not configured
      return { success: true, token: `mock-token-${options.userId.slice(0, 8)}` };
    }

    try {
      const expirySeconds = (options.expiryMinutes || 120) * 60;

      const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: options.userName,
            user_id: options.userId,
            is_owner: options.isOwner || false,
            exp: Math.floor(Date.now() / 1000) + expirySeconds,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        logger.error('[DAILY] Token creation failed:', data);
        return { success: false, error: data.error || 'Failed to create token' };
      }

      return { success: true, token: data.token };
    } catch (error: any) {
      logger.error('[DAILY] Token creation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a Daily.co room
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.isConfigured) return true;

    try {
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: headers(),
      });
      return response.ok;
    } catch (error: any) {
      logger.error('[DAILY] Room deletion error:', error.message);
      return false;
    }
  }

  /**
   * Get room details
   */
  async getRoom(roomName: string): Promise<any> {
    if (!this.isConfigured) return null;

    try {
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'GET',
        headers: headers(),
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Get active participants in a room
   */
  async getParticipants(roomName: string): Promise<any[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}/presence`, {
        method: 'GET',
        headers: headers(),
      });
      if (!response.ok) return [];
      const data = await response.json() as any;
      return data.data || [];
    } catch {
      return [];
    }
  }

  /**
   * Get recording for a room
   */
  async getRecordings(roomName: string): Promise<any[]> {
    if (!this.isConfigured) return [];

    try {
      const response = await fetch(`${DAILY_API_URL}/recordings?room_name=${roomName}`, {
        method: 'GET',
        headers: headers(),
      });
      if (!response.ok) return [];
      const data = await response.json() as any;
      return data.data || [];
    } catch {
      return [];
    }
  }
}

export const dailyVideoService = new DailyVideoService();

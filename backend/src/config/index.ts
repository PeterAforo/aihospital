import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    expire: process.env.JWT_EXPIRE || '2h',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  
  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Hubtel SMS
  hubtel: {
    clientId: process.env.HUBTEL_CLIENT_ID || '',
    clientSecret: process.env.HUBTEL_CLIENT_SECRET || '',
    senderId: process.env.HUBTEL_SENDER_ID || 'MediCare',
  },

  // mNotify SMS
  mnotify: {
    apiKey: process.env.MNOTIFY_API_KEY || '',
    senderId: process.env.MNOTIFY_SENDER_ID || 'MediCare',
  },

  // WhatsApp Business API
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  },

  // AI Duration Prediction Service
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:5001',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '5000', 10),
  },
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};

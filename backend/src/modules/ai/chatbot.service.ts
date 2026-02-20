import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  return openaiClient;
}

const SYSTEM_PROMPT = `You are SmartMed AI Assistant, a helpful healthcare chatbot for a hospital management system in Ghana. You help patients and staff with:
- General health information and wellness tips
- Hospital navigation (departments, services, visiting hours)
- Appointment scheduling guidance
- Medication reminders and general drug information
- Understanding lab results (general guidance only)
- Insurance/NHIS coverage questions

IMPORTANT RULES:
- Never diagnose conditions or prescribe medications
- Always recommend consulting a doctor for medical concerns
- Be empathetic, clear, and culturally appropriate for Ghana
- If asked about emergencies, advise calling emergency services immediately
- Keep responses concise and actionable
- You can respond in English. If the user writes in Twi or another local language, respond in English but acknowledge their language.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Rule-based fallback responses when OpenAI is not available
const FALLBACK_RESPONSES: { keywords: string[]; response: string }[] = [
  { keywords: ['emergency', 'urgent', 'dying', 'accident', 'bleeding heavily'],
    response: '🚨 **EMERGENCY**: Please call the hospital emergency line immediately or go to the nearest Emergency Department. If life-threatening, call Ghana National Ambulance Service: 112 or 193.' },
  { keywords: ['appointment', 'book', 'schedule', 'reschedule'],
    response: '📅 To book or manage appointments:\n1. Log into your SmartMed patient portal\n2. Go to "My Appointments"\n3. Select your preferred department and doctor\n4. Choose an available time slot\n\nOr call the hospital reception for assistance.' },
  { keywords: ['nhis', 'insurance', 'coverage', 'claim'],
    response: '🏥 **NHIS Information**:\n- Bring your valid NHIS card to every visit\n- Most outpatient consultations are covered\n- Some medications and procedures may require co-payment\n- Check with the billing department for specific coverage details.' },
  { keywords: ['visiting', 'visit hours', 'visiting hours'],
    response: '🕐 **General Visiting Hours**:\n- Morning: 10:00 AM - 12:00 PM\n- Evening: 4:00 PM - 6:00 PM\n- ICU: Limited to 2 visitors, 15 minutes each\n\nPlease check with your specific ward for any variations.' },
  { keywords: ['lab', 'test result', 'blood test', 'laboratory'],
    response: '🔬 **Lab Results**: You can view your lab results in the SmartMed patient portal under "My Results". If you have questions about your results, please discuss them with your doctor during your next appointment.' },
  { keywords: ['pharmacy', 'medication', 'drug', 'prescription', 'medicine'],
    response: '💊 **Pharmacy Information**:\n- Prescriptions are sent electronically to our pharmacy\n- Bring your patient ID/MRN when collecting medications\n- Ask the pharmacist about proper dosage and side effects\n- For refills, contact the pharmacy directly or through the portal.' },
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    response: '👋 Hello! I\'m the SmartMed AI Assistant. How can I help you today? I can assist with:\n- Appointment information\n- Hospital services & departments\n- General health questions\n- NHIS/Insurance queries\n- Lab result guidance' },
];

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const fb of FALLBACK_RESPONSES) {
    if (fb.keywords.some(kw => lower.includes(kw))) return fb.response;
  }
  return '🤖 Thank you for your message. I can help with appointment scheduling, hospital services, NHIS queries, and general health information. Could you please be more specific about what you need help with?\n\nFor medical emergencies, please call 112 or go to the nearest Emergency Department.';
}

export async function chat(messages: ChatMessage[], userMessage: string) {
  const ai = getOpenAI();

  if (!ai) {
    // Rule-based fallback
    const response = getFallbackResponse(userMessage);
    return { response, model: 'rule-based', aiPowered: false };
  }

  try {
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const completion = await ai.chat.completions.create({
      model: config.openai.model,
      messages: chatMessages,
      max_tokens: config.openai.maxTokens,
      temperature: 0.7,
    });

    return {
      response: completion.choices[0]?.message?.content || 'I apologize, I could not generate a response. Please try again.',
      model: config.openai.model,
      aiPowered: true,
      usage: completion.usage,
    };
  } catch (error: any) {
    logger.error('OpenAI chat error:', error.message);
    const response = getFallbackResponse(userMessage);
    return { response, model: 'rule-based-fallback', aiPowered: false, error: 'AI service temporarily unavailable' };
  }
}

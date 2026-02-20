import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';
import fs from 'fs';
import path from 'path';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  return openaiClient;
}

export interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  language?: string;
  duration?: number;
  error?: string;
}

export interface SOAPStructure {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  chiefComplaint: string;
  rawTranscript: string;
}

/**
 * Transcribe audio file using OpenAI Whisper API
 * Supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
 * Cost: ~$0.006 per minute of audio
 */
export async function transcribeAudio(
  filePath: string,
  language: string = 'en'
): Promise<TranscriptionResult> {
  const openai = getOpenAI();
  if (!openai) {
    return { success: false, error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.' };
  }

  try {
    const fileStream = fs.createReadStream(filePath);

    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
    });

    const result = transcription as any;

    return {
      success: true,
      transcript: result.text || '',
      language: result.language || language,
      duration: result.duration || 0,
    };
  } catch (error: any) {
    logger.error('Whisper transcription failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Structure a clinical transcript into SOAP format using GPT-4
 */
export async function structureToSOAP(transcript: string): Promise<SOAPStructure | null> {
  const openai = getOpenAI();
  if (!openai) {
    // Fallback: basic keyword-based structuring
    return fallbackSOAPStructure(transcript);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a medical documentation assistant. Structure the following clinical consultation transcript into SOAP format. Extract:
- Chief Complaint: The main reason for the visit (1 sentence)
- Subjective: Patient's reported symptoms, history, concerns
- Objective: Physical examination findings, vital signs, observations
- Assessment: Clinical impression, differential diagnoses
- Plan: Treatment plan, medications, follow-up, referrals

Respond in JSON format only:
{
  "chiefComplaint": "...",
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "..."
}

If a section has no relevant information, use "Not documented in transcript."
Be concise but thorough. Use medical terminology appropriately.`,
        },
        {
          role: 'user',
          content: `Clinical consultation transcript:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return fallbackSOAPStructure(transcript);

    const parsed = JSON.parse(content);
    return {
      chiefComplaint: parsed.chiefComplaint || 'Not documented',
      subjective: parsed.subjective || 'Not documented in transcript.',
      objective: parsed.objective || 'Not documented in transcript.',
      assessment: parsed.assessment || 'Not documented in transcript.',
      plan: parsed.plan || 'Not documented in transcript.',
      rawTranscript: transcript,
    };
  } catch (error: any) {
    logger.error('SOAP structuring failed:', error.message);
    return fallbackSOAPStructure(transcript);
  }
}

/**
 * Fallback SOAP structuring when OpenAI is unavailable
 * Uses keyword matching to categorize transcript sections
 */
function fallbackSOAPStructure(transcript: string): SOAPStructure {
  const lower = transcript.toLowerCase();
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  let subjective = '';
  let objective = '';
  let assessment = '';
  let plan = '';
  let chiefComplaint = '';

  const subjectiveKeywords = ['complain', 'feel', 'pain', 'symptom', 'history', 'report', 'says', 'told', 'describe', 'experience', 'fever', 'cough', 'headache', 'nausea', 'vomit', 'diarrhea', 'tired', 'weak'];
  const objectiveKeywords = ['exam', 'blood pressure', 'temperature', 'pulse', 'respiratory', 'auscultation', 'palpation', 'inspection', 'finding', 'vital', 'weight', 'height', 'spo2', 'bp'];
  const assessmentKeywords = ['diagnos', 'suspect', 'impression', 'differential', 'likely', 'consistent with', 'rule out', 'assess'];
  const planKeywords = ['prescri', 'medic', 'treat', 'refer', 'follow', 'admit', 'discharge', 'order', 'test', 'lab', 'x-ray', 'scan', 'advise', 'counsel', 'return'];

  for (const sentence of sentences) {
    const sl = sentence.toLowerCase();
    if (!chiefComplaint && subjectiveKeywords.some(k => sl.includes(k))) {
      chiefComplaint = sentence;
    }
    if (subjectiveKeywords.some(k => sl.includes(k))) {
      subjective += (subjective ? ' ' : '') + sentence + '.';
    } else if (objectiveKeywords.some(k => sl.includes(k))) {
      objective += (objective ? ' ' : '') + sentence + '.';
    } else if (assessmentKeywords.some(k => sl.includes(k))) {
      assessment += (assessment ? ' ' : '') + sentence + '.';
    } else if (planKeywords.some(k => sl.includes(k))) {
      plan += (plan ? ' ' : '') + sentence + '.';
    } else {
      subjective += (subjective ? ' ' : '') + sentence + '.';
    }
  }

  return {
    chiefComplaint: chiefComplaint || sentences[0] || 'Not documented',
    subjective: subjective || 'Not documented in transcript.',
    objective: objective || 'Not documented in transcript.',
    assessment: assessment || 'Not documented in transcript.',
    plan: plan || 'Not documented in transcript.',
    rawTranscript: transcript,
  };
}

/**
 * Clean up temporary uploaded audio files
 */
export function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    logger.warn(`Failed to cleanup temp file: ${filePath}`);
  }
}

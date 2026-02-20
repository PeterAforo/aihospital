import { Router, Request, Response } from 'express';
import {
  checkDuplicatePatient,
  checkDrugInteractions,
  calculateTriageScore,
  searchICD10,
  aiChat,
  getClinicalDecisionSupport,
  interpretLabResults,
} from './ai.service.js';
import { transcribeAudio, structureToSOAP, cleanupTempFile } from './voice-to-text.service.js';
import { uploadAudio } from '../../common/utils/upload.js';

const router = Router();

// ── Duplicate Patient Detection ──
router.post('/duplicate-check', async (req: Request, res: Response) => {
  try {
    const { tenantId, firstName, lastName, dateOfBirth, phone, ghanaCardNumber } = req.body;
    if (!tenantId || !firstName || !lastName) {
      return res.status(400).json({ error: 'tenantId, firstName, and lastName are required' });
    }
    const result = await checkDuplicatePatient({ tenantId, firstName, lastName, dateOfBirth, phone, ghanaCardNumber });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Drug Interaction Checker ──
router.post('/drug-interactions', async (req: Request, res: Response) => {
  try {
    const { drugs, allergies } = req.body;
    if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
      return res.status(400).json({ error: 'drugs array is required' });
    }
    const result = checkDrugInteractions(drugs, allergies || []);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Triage Scoring ──
router.post('/triage-score', async (req: Request, res: Response) => {
  try {
    const result = calculateTriageScore(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── ICD-10 Search ──
router.get('/icd10/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    if (!query) return res.status(400).json({ error: 'Query parameter q is required' });
    const results = searchICD10(query, limit);
    res.json({ results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── AI Chatbot ──
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, userMessage } = req.body;
    if (!userMessage) return res.status(400).json({ error: 'userMessage is required' });
    const result = await aiChat(messages || [], userMessage);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Clinical Decision Support ──
router.post('/clinical-decision', async (req: Request, res: Response) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'symptoms field is required' });
    const result = await getClinicalDecisionSupport(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Lab Result Interpretation ──
router.post('/lab-interpret', async (req: Request, res: Response) => {
  try {
    const { testName, value, unit } = req.body;
    if (!testName || value === undefined || !unit) {
      return res.status(400).json({ error: 'testName, value, and unit are required' });
    }
    const result = await interpretLabResults(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── Voice-to-Text (Whisper) ──
router.post('/voice-to-text', uploadAudio.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required. Upload as multipart/form-data with field name "audio".' });
    }

    const language = (req.body?.language as string) || 'en';
    const result = await transcribeAudio(req.file.path, language);

    // Cleanup temp file
    cleanupTempFile(req.file.path);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      transcript: result.transcript,
      language: result.language,
      duration: result.duration,
    });
  } catch (error: any) {
    if (req.file) cleanupTempFile(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// ── Voice-to-SOAP (Whisper + GPT-4) ──
router.post('/voice-to-soap', uploadAudio.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required. Upload as multipart/form-data with field name "audio".' });
    }

    const language = (req.body?.language as string) || 'en';

    // Step 1: Transcribe
    const transcription = await transcribeAudio(req.file.path, language);
    cleanupTempFile(req.file.path);

    if (!transcription.success || !transcription.transcript) {
      return res.status(500).json({ error: transcription.error || 'Transcription failed' });
    }

    // Step 2: Structure to SOAP
    const soap = await structureToSOAP(transcription.transcript);

    res.json({
      success: true,
      transcript: transcription.transcript,
      duration: transcription.duration,
      soap,
    });
  } catch (error: any) {
    if (req.file) cleanupTempFile(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

// ── Text-to-SOAP (GPT-4 only, no audio) ──
router.post('/text-to-soap', async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ error: 'transcript field is required' });

    const soap = await structureToSOAP(transcript);
    res.json({ success: true, soap });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── AI Health Check ──
router.get('/health', (_req: Request, res: Response) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  res.json({
    status: 'ok',
    services: {
      duplicateDetection: { status: 'active', type: 'rule-based' },
      drugInteractions: { status: 'active', type: 'rule-based' },
      triageScoring: { status: 'active', type: 'rule-based (NEWS2)' },
      icd10Coding: { status: 'active', type: 'rule-based' },
      chatbot: { status: 'active', type: hasOpenAI ? 'ai-powered' : 'rule-based' },
      clinicalDecision: { status: hasOpenAI ? 'active' : 'requires-api-key', type: 'ai-powered' },
      labInterpretation: { status: 'active', type: hasOpenAI ? 'ai-powered' : 'rule-based' },
      voiceToText: { status: hasOpenAI ? 'active' : 'requires-api-key', type: 'ai-powered (Whisper)' },
      voiceToSOAP: { status: hasOpenAI ? 'active' : 'requires-api-key', type: 'ai-powered (Whisper + GPT-4)' },
    },
  });
});

export default router;

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../common/utils/logger.js';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!config.openai.apiKey) return null;
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  return openaiClient;
}

export async function getClinicalDecisionSupport(data: {
  symptoms: string; vitals?: any; patientAge?: number; patientGender?: string;
  medicalHistory?: string; currentMedications?: string[];
}) {
  const ai = getOpenAI();
  if (!ai) {
    return { available: false, message: 'AI CDS requires OPENAI_API_KEY environment variable.' };
  }

  try {
    const vitalsStr = data.vitals ? JSON.stringify(data.vitals) : 'Not provided';
    const medsStr = data.currentMedications?.join(', ') || 'None reported';

    const prompt = `You are a clinical decision support AI for a hospital in Ghana. Based on the following patient information, provide structured clinical guidance.

Patient: ${data.patientAge || 'Unknown'} year old ${data.patientGender || 'patient'}
Symptoms: ${data.symptoms}
Vitals: ${vitalsStr}
Medical History: ${data.medicalHistory || 'Not provided'}
Current Medications: ${medsStr}

Respond in JSON format:
{
  "differentialDiagnoses": [{"diagnosis": "...", "probability": "high/medium/low", "reasoning": "..."}],
  "recommendedInvestigations": ["..."],
  "redFlags": ["..."],
  "suggestedManagement": ["..."],
  "referralNeeded": true/false,
  "referralSpecialty": "..." or null,
  "disclaimer": "This is AI-assisted guidance only. Clinical judgment must prevail."
}

Consider common conditions in Ghana (malaria, typhoid, TB, sickle cell, etc). Be evidence-based.`;

    const completion = await ai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are a clinical decision support system. Always respond in valid JSON. Include a disclaimer that this is advisory only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return { available: true, aiPowered: true, model: config.openai.model, ...parsed, usage: completion.usage };
  } catch (error: any) {
    logger.error('CDS error:', error.message);
    return { available: false, error: 'AI service temporarily unavailable', message: error.message };
  }
}

export async function interpretLabResults(data: {
  testName: string; value: number; unit: string; referenceRange?: string;
  patientAge?: number; patientGender?: string;
}) {
  const ai = getOpenAI();
  if (!ai) {
    // Rule-based interpretation for common tests
    return ruleBasedLabInterpretation(data);
  }

  try {
    const prompt = `Interpret this lab result for a ${data.patientAge || 'adult'} year old ${data.patientGender || 'patient'} in Ghana:
Test: ${data.testName}
Value: ${data.value} ${data.unit}
Reference Range: ${data.referenceRange || 'standard'}

Respond in JSON:
{
  "status": "normal" | "low" | "high" | "critical",
  "interpretation": "brief clinical interpretation",
  "possibleCauses": ["..."],
  "suggestedFollowUp": ["..."],
  "urgency": "routine" | "soon" | "urgent" | "immediate"
}`;

    const completion = await ai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'You are a lab result interpretation assistant. Respond in valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return { aiPowered: true, ...parsed };
  } catch (error: any) {
    logger.error('Lab interpretation error:', error.message);
    return ruleBasedLabInterpretation(data);
  }
}

function ruleBasedLabInterpretation(data: { testName: string; value: number; unit: string; referenceRange?: string }) {
  const test = data.testName.toLowerCase();
  let status = 'normal', interpretation = '', urgency = 'routine';
  const possibleCauses: string[] = [];
  const suggestedFollowUp: string[] = [];

  if (test.includes('hemoglobin') || test.includes('hb') || test.includes('haemoglobin')) {
    if (data.value < 7) { status = 'critical'; interpretation = 'Severe anaemia'; urgency = 'immediate'; possibleCauses.push('Iron deficiency', 'Chronic disease', 'Blood loss', 'Sickle cell crisis'); suggestedFollowUp.push('Blood transfusion consideration', 'Iron studies', 'Reticulocyte count'); }
    else if (data.value < 10) { status = 'low'; interpretation = 'Moderate anaemia'; urgency = 'soon'; possibleCauses.push('Iron deficiency', 'Chronic disease', 'Malaria'); suggestedFollowUp.push('Iron studies', 'Blood film'); }
    else if (data.value < 12) { status = 'low'; interpretation = 'Mild anaemia'; urgency = 'routine'; }
    else if (data.value > 17) { status = 'high'; interpretation = 'Polycythaemia'; urgency = 'soon'; }
  } else if (test.includes('glucose') || test.includes('sugar') || test.includes('fbs') || test.includes('rbs')) {
    if (data.value < 3.5) { status = 'critical'; interpretation = 'Hypoglycemia'; urgency = 'immediate'; suggestedFollowUp.push('Immediate glucose administration'); }
    else if (data.value < 4) { status = 'low'; interpretation = 'Low blood sugar'; urgency = 'urgent'; }
    else if (data.value > 11.1) { status = 'high'; interpretation = 'Hyperglycemia — possible diabetes'; urgency = 'soon'; suggestedFollowUp.push('HbA1c', 'Fasting glucose confirmation'); }
    else if (data.value > 7) { status = 'high'; interpretation = 'Elevated glucose'; urgency = 'routine'; }
  } else if (test.includes('creatinine')) {
    if (data.value > 300) { status = 'critical'; interpretation = 'Severe renal impairment'; urgency = 'immediate'; }
    else if (data.value > 130) { status = 'high'; interpretation = 'Elevated creatinine — renal impairment'; urgency = 'soon'; suggestedFollowUp.push('eGFR calculation', 'Renal ultrasound'); }
  } else if (test.includes('wbc') || test.includes('white cell') || test.includes('white blood')) {
    if (data.value > 15) { status = 'high'; interpretation = 'Leukocytosis — possible infection'; urgency = 'soon'; possibleCauses.push('Bacterial infection', 'Inflammation'); }
    else if (data.value < 4) { status = 'low'; interpretation = 'Leukopenia'; urgency = 'soon'; possibleCauses.push('Viral infection', 'HIV', 'Bone marrow suppression'); }
  } else {
    interpretation = 'Please consult with a doctor for interpretation of this result.';
  }

  return { aiPowered: false, status, interpretation, possibleCauses, suggestedFollowUp, urgency };
}

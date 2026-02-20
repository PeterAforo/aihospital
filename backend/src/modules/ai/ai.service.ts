// AI Service barrel — re-exports all AI sub-services
export { checkDuplicatePatient } from './duplicate-detection.service.js';
export { checkDrugInteractions } from './drug-interaction.service.js';
export { calculateTriageScore } from './triage-scoring.service.js';
export { searchICD10 } from './icd10-coding.service.js';
export { chat as aiChat } from './chatbot.service.js';
export { getClinicalDecisionSupport, interpretLabResults } from './clinical-decision.service.js';

// NEWS2-based Early Warning Score + AI Triage Priority

export function calculateTriageScore(vitals: {
  temperature?: number; systolicBP?: number; diastolicBP?: number;
  heartRate?: number; respiratoryRate?: number; oxygenSaturation?: number;
  consciousnessLevel?: string; symptoms?: string;
}) {
  let score = 0;
  const flags: string[] = [];
  const recommendations: string[] = [];

  const rr = vitals.respiratoryRate;
  if (rr) {
    if (rr <= 8) { score += 3; flags.push('Very low respiratory rate'); }
    else if (rr <= 11) { score += 1; }
    else if (rr <= 20) { score += 0; }
    else if (rr <= 24) { score += 2; }
    else { score += 3; flags.push('High respiratory rate'); }
  }

  const spo2 = vitals.oxygenSaturation;
  if (spo2) {
    if (spo2 <= 91) { score += 3; flags.push('Critical oxygen saturation'); }
    else if (spo2 <= 93) { score += 2; flags.push('Low oxygen saturation'); }
    else if (spo2 <= 95) { score += 1; }
  }

  const temp = vitals.temperature;
  if (temp) {
    if (temp <= 35) { score += 3; flags.push('Hypothermia'); }
    else if (temp <= 36) { score += 1; }
    else if (temp <= 38) { score += 0; }
    else if (temp <= 39) { score += 1; }
    else { score += 2; flags.push('High fever'); }
  }

  const sbp = vitals.systolicBP;
  if (sbp) {
    if (sbp <= 90) { score += 3; flags.push('Hypotension — possible shock'); }
    else if (sbp <= 100) { score += 2; }
    else if (sbp <= 110) { score += 1; }
    else if (sbp <= 219) { score += 0; }
    else { score += 3; flags.push('Hypertensive crisis'); }
  }

  const hr = vitals.heartRate;
  if (hr) {
    if (hr <= 40) { score += 3; flags.push('Severe bradycardia'); }
    else if (hr <= 50) { score += 1; }
    else if (hr <= 90) { score += 0; }
    else if (hr <= 110) { score += 1; }
    else if (hr <= 130) { score += 2; flags.push('Tachycardia'); }
    else { score += 3; flags.push('Severe tachycardia'); }
  }

  const cons = vitals.consciousnessLevel?.toUpperCase();
  if (cons && cons !== 'ALERT') { score += 3; flags.push('Altered consciousness'); }

  const symp = (vitals.symptoms || '').toLowerCase();
  const urgentKw = ['chest pain', 'difficulty breathing', 'seizure', 'unconscious',
    'severe bleeding', 'stroke', 'anaphylaxis', 'snake bite', 'poisoning'];
  for (const kw of urgentKw) {
    if (symp.includes(kw)) { score += 2; flags.push(`Urgent symptom: ${kw}`); }
  }

  let priority: string, color: string, action: string;
  if (score >= 7) {
    priority = 'EMERGENCY'; color = 'red';
    action = 'Immediate medical attention required';
    recommendations.push('Alert doctor immediately', 'Continuous monitoring', 'Consider ICU/resuscitation');
  } else if (score >= 5) {
    priority = 'URGENT'; color = 'orange';
    action = 'Urgent assessment needed within 10 minutes';
    recommendations.push('Alert doctor within 10 minutes', 'Increase monitoring frequency');
  } else if (score >= 3) {
    priority = 'SEMI_URGENT'; color = 'yellow';
    action = 'Assessment within 30 minutes';
    recommendations.push('Doctor review within 30 minutes', 'Monitor vitals every 30 minutes');
  } else {
    priority = 'NON_URGENT'; color = 'green';
    action = 'Standard assessment';
    recommendations.push('Routine assessment', 'Standard monitoring');
  }

  return { earlyWarningScore: score, maxScore: 20, priority, color, action, flags, recommendations, aiAssisted: true };
}

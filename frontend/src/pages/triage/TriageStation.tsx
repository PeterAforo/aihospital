import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, User, AlertTriangle, Activity, Thermometer, Heart, Wind, Droplets, Scale, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  getTriageQueue,
  createTriage,
  suggestTriageLevel,
  TriageQueuePatient,
  VitalSigns,
  Assessment,
  TRIAGE_LEVELS,
  COMMON_COMPLAINTS,
  calculateBMI,
  getBMICategory,
  getVitalSignStatus,
} from '@/services/triage.service';

// ==================== TYPES ====================

interface TriageFormData {
  vitalSigns: VitalSigns;
  assessment: Assessment;
  triageLevel: number | null;
  overrideReason: string;
}

const initialFormData: TriageFormData = {
  vitalSigns: {},
  assessment: {
    chiefComplaint: '',
    symptomDuration: '',
    symptomSeverity: undefined,
    associatedSymptoms: [],
    clinicalNotes: '',
  },
  triageLevel: null,
  overrideReason: '',
};

// ==================== MAIN COMPONENT ====================

export default function TriageStation() {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<TriageQueuePatient | null>(null);
  const [formData, setFormData] = useState<TriageFormData>(initialFormData);
  const [triageStartTime, setTriageStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Fetch triage queue
  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['triage-queue'],
    queryFn: () => getTriageQueue(),
    refetchInterval: 30000,
  });

  // Triage suggestion query
  const { data: suggestion } = useQuery({
    queryKey: ['triage-suggestion', formData.vitalSigns, formData.assessment.chiefComplaint],
    queryFn: () => suggestTriageLevel(
      formData.vitalSigns,
      formData.assessment.chiefComplaint,
      formData.vitalSigns.painScale,
      selectedPatient?.patient.age
    ),
    enabled: !!(formData.vitalSigns.bpSystolic || formData.vitalSigns.temperature || formData.vitalSigns.pulseRate),
  });

  // Create triage mutation
  const createTriageMutation = useMutation({
    mutationFn: createTriage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-queue'] });
      clearForm();
      refetchQueue();
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (triageStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - triageStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [triageStartTime]);

  // Auto-save to localStorage
  useEffect(() => {
    if (selectedPatient) {
      const saveData = { patientId: selectedPatient.patient.id, formData, timestamp: Date.now() };
      localStorage.setItem('triage-draft', JSON.stringify(saveData));
    }
  }, [formData, selectedPatient]);

  const selectPatient = useCallback((patient: TriageQueuePatient) => {
    setSelectedPatient(patient);
    setTriageStartTime(new Date());
    setFormData({
      ...initialFormData,
      assessment: {
        ...initialFormData.assessment,
        chiefComplaint: patient.chiefComplaint || '',
      },
    });

    // Check for saved draft
    const saved = localStorage.getItem('triage-draft');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.patientId === patient.patient.id && Date.now() - parsed.timestamp < 3600000) {
        setFormData(parsed.formData);
      }
    }
  }, []);

  const clearForm = useCallback(() => {
    setSelectedPatient(null);
    setFormData(initialFormData);
    setTriageStartTime(null);
    setElapsedTime(0);
    localStorage.removeItem('triage-draft');
  }, []);

  const handleSubmit = async () => {
    if (!selectedPatient || !formData.triageLevel) return;

    await createTriageMutation.mutateAsync({
      appointmentId: selectedPatient.appointmentId,
      patientId: selectedPatient.patient.id,
      vitalSigns: formData.vitalSigns,
      assessment: formData.assessment,
      triageLevel: formData.triageLevel,
      overrideReason: formData.overrideReason || undefined,
    });
  };

  const updateVitalSigns = (field: keyof VitalSigns, value: any) => {
    setFormData(prev => ({
      ...prev,
      vitalSigns: { ...prev.vitalSigns, [field]: value },
    }));
  };

  const updateAssessment = (field: keyof Assessment, value: any) => {
    setFormData(prev => ({
      ...prev,
      assessment: { ...prev.assessment, [field]: value },
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const bmi = formData.vitalSigns.weight && formData.vitalSigns.height
    ? calculateBMI(formData.vitalSigns.weight, formData.vitalSigns.height)
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Queue Sidebar */}
      <div className="w-80 flex-shrink-0 overflow-hidden flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-lg">
              <span>Triage Queue</span>
              <Badge variant="secondary">{queueData?.totalWaiting || 0} waiting</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Avg time: {queueData?.averageTriageTime || '—'}
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-2">
            {queueLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : queueData?.queue.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No patients waiting
              </div>
            ) : (
              <div className="space-y-2">
                {queueData?.queue.map((patient) => (
                  <div
                    key={patient.appointmentId}
                    onClick={() => selectPatient(patient)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPatient?.appointmentId === patient.appointmentId
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{patient.queueNumber}</span>
                      <span className="text-xs text-muted-foreground">{patient.waitTime}</span>
                    </div>
                    <div className="font-medium">
                      {patient.patient.firstName} {patient.patient.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {patient.patient.age}y • {patient.patient.gender}
                    </div>
                    {patient.patient.allergies.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Allergies: {patient.patient.allergies.join(', ')}
                      </div>
                    )}
                    {patient.chiefComplaint && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {patient.chiefComplaint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedPatient ? (
          <div className="space-y-4">
            {/* Patient Header */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedPatient.patient.firstName} {selectedPatient.patient.lastName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        MRN: {selectedPatient.patient.mrn} • {selectedPatient.patient.age} years • {selectedPatient.patient.gender}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Triage Time</div>
                      <div className="text-2xl font-mono font-bold text-primary">
                        {formatTime(elapsedTime)}
                      </div>
                    </div>
                    {selectedPatient.patient.allergies.length > 0 && (
                      <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg">
                        <div className="text-xs font-medium">ALLERGIES</div>
                        <div className="font-semibold">{selectedPatient.patient.allergies.join(', ')}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Vital Signs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Blood Pressure */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      Blood Pressure (mmHg)
                    </Label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        placeholder="Sys"
                        value={formData.vitalSigns.bpSystolic || ''}
                        onChange={(e) => updateVitalSigns('bpSystolic', e.target.value ? parseInt(e.target.value) : undefined)}
                        className={`w-20 ${getVitalSignStatus('bp', formData.vitalSigns.bpSystolic || 0, formData.vitalSigns.bpDiastolic) === 'critical' ? 'border-red-500' : ''}`}
                      />
                      <span>/</span>
                      <Input
                        type="number"
                        placeholder="Dia"
                        value={formData.vitalSigns.bpDiastolic || ''}
                        onChange={(e) => updateVitalSigns('bpDiastolic', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-20"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Normal: 90-120 / 60-80</p>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      Temperature (°C)
                    </Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="37.0"
                        value={formData.vitalSigns.temperature || ''}
                        onChange={(e) => updateVitalSigns('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className={`w-20 ${getVitalSignStatus('temp', formData.vitalSigns.temperature || 0) === 'critical' ? 'border-red-500' : ''}`}
                      />
                      <Select
                        value={formData.vitalSigns.temperatureSite}
                        onValueChange={(v) => updateVitalSigns('temperatureSite', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Site" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ORAL">Oral</SelectItem>
                          <SelectItem value="AXILLARY">Axillary</SelectItem>
                          <SelectItem value="TYMPANIC">Tympanic</SelectItem>
                          <SelectItem value="RECTAL">Rectal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Normal: 36.5-37.5°C</p>
                  </div>

                  {/* Pulse Rate */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      Pulse Rate (bpm)
                    </Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="72"
                        value={formData.vitalSigns.pulseRate || ''}
                        onChange={(e) => updateVitalSigns('pulseRate', e.target.value ? parseInt(e.target.value) : undefined)}
                        className={`w-20 ${getVitalSignStatus('pulse', formData.vitalSigns.pulseRate || 0) === 'critical' ? 'border-red-500' : ''}`}
                      />
                      <Select
                        value={formData.vitalSigns.pulseRhythm}
                        onValueChange={(v) => updateVitalSigns('pulseRhythm', v)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Rhythm" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="REGULAR">Regular</SelectItem>
                          <SelectItem value="IRREGULAR">Irregular</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Normal: 60-100 bpm</p>
                  </div>

                  {/* Respiratory Rate */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Wind className="h-4 w-4" />
                      Respiratory Rate (/min)
                    </Label>
                    <Input
                      type="number"
                      placeholder="16"
                      value={formData.vitalSigns.respiratoryRate || ''}
                      onChange={(e) => updateVitalSigns('respiratoryRate', e.target.value ? parseInt(e.target.value) : undefined)}
                      className={`w-20 ${getVitalSignStatus('rr', formData.vitalSigns.respiratoryRate || 0) === 'critical' ? 'border-red-500' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground">Normal: 12-20 /min</p>
                  </div>

                  {/* SpO2 */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Droplets className="h-4 w-4" />
                      SpO2 (%)
                    </Label>
                    <Input
                      type="number"
                      placeholder="98"
                      value={formData.vitalSigns.spo2 || ''}
                      onChange={(e) => updateVitalSigns('spo2', e.target.value ? parseInt(e.target.value) : undefined)}
                      className={`w-20 ${getVitalSignStatus('spo2', formData.vitalSigns.spo2 || 0) === 'critical' ? 'border-red-500' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground">Normal: 95-100%</p>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Scale className="h-4 w-4" />
                      Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={formData.vitalSigns.weight || ''}
                      onChange={(e) => updateVitalSigns('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-20"
                    />
                  </div>

                  {/* Height */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Ruler className="h-4 w-4" />
                      Height (cm)
                    </Label>
                    <Input
                      type="number"
                      placeholder="170"
                      value={formData.vitalSigns.height || ''}
                      onChange={(e) => updateVitalSigns('height', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-20"
                    />
                  </div>

                  {/* BMI (calculated) */}
                  {bmi && (
                    <div className="space-y-2">
                      <Label>BMI</Label>
                      <div className="p-2 bg-muted rounded-md">
                        <span className="font-semibold">{bmi}</span>
                        <span className="text-sm text-muted-foreground ml-2">({getBMICategory(bmi)})</span>
                      </div>
                    </div>
                  )}

                  {/* Pain Scale */}
                  <div className="space-y-2 col-span-2">
                    <Label>Pain Scale (0-10)</Label>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateVitalSigns('painScale', n)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            formData.vitalSigns.painScale === n
                              ? n <= 3 ? 'bg-green-500 text-white'
                                : n <= 6 ? 'bg-yellow-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chief Complaint & Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Chief Complaint & Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chief Complaint *</Label>
                  <Textarea
                    placeholder="Patient's main reason for visit..."
                    value={formData.assessment.chiefComplaint}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateAssessment('chiefComplaint', e.target.value)}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(COMMON_COMPLAINTS).slice(0, 3).map(([_category, complaints]) => (
                      complaints.slice(0, 3).map((complaint) => (
                        <Badge
                          key={complaint}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => updateAssessment('chiefComplaint', complaint)}
                        >
                          {complaint}
                        </Badge>
                      ))
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      placeholder="e.g., 3 days, 2 weeks"
                      value={formData.assessment.symptomDuration || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAssessment('symptomDuration', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={formData.assessment.symptomSeverity}
                      onValueChange={(v) => updateAssessment('symptomSeverity', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Clinical Notes</Label>
                  <Textarea
                    placeholder="Additional observations..."
                    value={formData.assessment.clinicalNotes || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateAssessment('clinicalNotes', e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Triage Level Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Triage Level</span>
                  {suggestion && (
                    <div className="flex items-center gap-2 text-sm font-normal">
                      <span className="text-muted-foreground">Suggested:</span>
                      <Badge
                        style={{ backgroundColor: suggestion.levelColor, color: 'white' }}
                      >
                        {suggestion.levelName}
                      </Badge>
                      <span className="text-muted-foreground">
                        ({Math.round(suggestion.confidence * 100)}% confidence)
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suggestion?.triggers && suggestion.triggers.length > 0 && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Triggers:</p>
                    <ul className="text-sm text-muted-foreground">
                      {suggestion.triggers.map((trigger, i) => (
                        <li key={i}>• {trigger}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {TRIAGE_LEVELS.map((level) => (
                    <button
                      key={level.level}
                      onClick={() => setFormData(prev => ({ ...prev, triageLevel: level.level }))}
                      className={`flex-1 min-w-[120px] p-3 rounded-lg border-2 transition-all ${
                        formData.triageLevel === level.level
                          ? 'border-current shadow-lg scale-105'
                          : 'border-transparent hover:border-muted'
                      }`}
                      style={{
                        backgroundColor: formData.triageLevel === level.level ? level.color : `${level.color}20`,
                        color: formData.triageLevel === level.level ? 'white' : level.color,
                      }}
                    >
                      <div className="font-bold text-lg">{level.level}</div>
                      <div className="text-sm font-medium">{level.name.split(' - ')[0]}</div>
                      <div className="text-xs opacity-80">{level.targetTime}</div>
                    </button>
                  ))}
                </div>

                {formData.triageLevel && suggestion && formData.triageLevel !== suggestion.suggestedLevel && (
                  <div className="mt-4 space-y-2">
                    <Label>Override Reason (required)</Label>
                    <Textarea
                      placeholder="Explain why you're overriding the suggested level..."
                      value={formData.overrideReason}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, overrideReason: e.target.value }))}
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4 pb-4">
              <Button variant="outline" onClick={clearForm}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.triageLevel ||
                  !formData.assessment.chiefComplaint ||
                  createTriageMutation.isPending
                }
              >
                {createTriageMutation.isPending ? 'Saving...' : 'Save Triage'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Select a Patient</h3>
              <p>Choose a patient from the queue to begin triage</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

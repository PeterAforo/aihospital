import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  CheckCircle, 
  FileSignature, 
  AlertCircle,
  User,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  ChevronLeft,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ICD10Search } from '@/components/emr/ICD10Search';
import { LabOrderPanel } from '@/components/emr/LabOrderPanel';
import { PrescriptionPanel } from '@/components/emr/PrescriptionPanel';
import LabResultsPanel from '@/components/emr/LabResultsPanel';
import { emrService, Encounter, ICD10Code, PatientContext } from '@/services/emr.service';
import { useToast } from '@/hooks/use-toast';
import { PermissionGate } from '@/components/auth/PermissionGate';

const EncounterWorkspace: React.FC = () => {
  const { encounterId } = useParams<{ encounterId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [patientContext, setPatientContext] = useState<PatientContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('subjective');
  const [showDiagnosisSearch, setShowDiagnosisSearch] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    pastMedicalHistory: '',
    socialHistory: '',
    familyHistory: '',
    generalAppearance: '',
    clinicalImpression: '',
    treatmentPlan: '',
    patientEducation: '',
    followUpPlan: '',
    disposition: '' as string,
  });

  // Load encounter data
  useEffect(() => {
    if (!encounterId) return;

    const loadEncounter = async () => {
      try {
        setIsLoading(true);
        const data = await emrService.getEncounter(encounterId);
        setEncounter(data.encounter);
        
        // Set form data from encounter
        setFormData({
          chiefComplaint: data.encounter.chiefComplaint || '',
          historyOfPresentIllness: data.encounter.historyOfPresentIllness || '',
          pastMedicalHistory: data.encounter.pastMedicalHistory || '',
          socialHistory: data.encounter.socialHistory || '',
          familyHistory: data.encounter.familyHistory || '',
          generalAppearance: data.encounter.generalAppearance || '',
          clinicalImpression: data.encounter.clinicalImpression || '',
          treatmentPlan: data.encounter.treatmentPlan || '',
          patientEducation: data.encounter.patientEducation || '',
          followUpPlan: data.encounter.followUpPlan || '',
          disposition: data.encounter.disposition || '',
        });

        // Set patient context from encounter patient data
        if (data.encounter.patient) {
          setPatientContext({
            allergies: data.encounter.patient.allergies || [],
            currentMedications: data.encounter.patient.currentMedications?.map(m => ({ ...m, isActive: true })) || [],
            chronicConditions: [],
            problemList: data.problemList || [],
            recentVitals: (data.encounter as any).vitalSigns?.[0] || undefined,
          });
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load encounter',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEncounter();
  }, [encounterId, toast]);

  // Auto-save handler
  const handleSave = async () => {
    if (!encounterId || !encounter) return;

    try {
      setIsSaving(true);
      const updated = await emrService.updateEncounter(encounterId, formData as any);
      setEncounter(updated);
      toast({
        title: 'Saved',
        description: 'Encounter documentation saved',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add diagnosis
  const handleAddDiagnosis = async (code: ICD10Code, type: 'PRIMARY' | 'SECONDARY') => {
    if (!encounterId) return;

    try {
      const diagnosis = await emrService.addDiagnosis(encounterId, {
        icd10Code: code.code,
        icd10Description: code.description,
        diagnosisType: type,
        status: 'ACTIVE',
      });

      setEncounter(prev => prev ? {
        ...prev,
        diagnoses: [...(prev.diagnoses || []), diagnosis],
      } : null);

      setShowDiagnosisSearch(false);
      toast({
        title: 'Diagnosis Added',
        description: `${code.code} - ${code.description}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add diagnosis',
        variant: 'destructive',
      });
    }
  };

  // Remove diagnosis
  const handleRemoveDiagnosis = async (diagnosisId: string) => {
    if (!encounterId) return;

    try {
      await emrService.removeDiagnosis(encounterId, diagnosisId);
      setEncounter(prev => prev ? {
        ...prev,
        diagnoses: prev.diagnoses?.filter(d => d.id !== diagnosisId) || [],
      } : null);
      toast({
        title: 'Diagnosis Removed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove diagnosis',
        variant: 'destructive',
      });
    }
  };

  // Complete encounter
  const handleComplete = async () => {
    if (!encounterId) return;

    try {
      await handleSave();
      const completed = await emrService.completeEncounter(encounterId);
      setEncounter(completed);
      toast({
        title: 'Encounter Completed',
        description: 'The encounter has been marked as complete',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete encounter',
        variant: 'destructive',
      });
    }
  };

  // Sign encounter
  const handleSign = async () => {
    if (!encounterId) return;

    try {
      await emrService.signEncounter(encounterId);
      toast({
        title: 'Encounter Signed',
        description: 'The encounter has been signed and locked',
      });
      // Navigate back to EMR dashboard after signing
      navigate('/emr');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign encounter',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Encounter not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isEditable = encounter.status === 'IN_PROGRESS';
  const primaryDiagnosis = encounter.diagnoses?.find(d => d.diagnosisType === 'PRIMARY');
  const secondaryDiagnoses = encounter.diagnoses?.filter(d => d.diagnosisType === 'SECONDARY') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold">
                  {encounter.patient?.firstName} {encounter.patient?.lastName}
                </h1>
                <p className="text-sm text-gray-500">
                  MRN: {encounter.patient?.mrn} • {encounter.encounterType}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                encounter.status === 'IN_PROGRESS' ? 'default' :
                encounter.status === 'COMPLETED' ? 'secondary' :
                encounter.status === 'SIGNED' ? 'outline' : 'destructive'
              }>
                {encounter.status}
              </Badge>
              {isEditable && (
                <>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" onClick={handleComplete}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                </>
              )}
              {encounter.status === 'COMPLETED' && (
                <Button size="sm" onClick={handleSign}>
                  <FileSignature className="w-4 h-4 mr-1" />
                  Sign
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="subjective">
                  <User className="w-4 h-4 mr-1" />
                  Subjective
                </TabsTrigger>
                <TabsTrigger value="objective">
                  <Stethoscope className="w-4 h-4 mr-1" />
                  Objective
                </TabsTrigger>
                <TabsTrigger value="assessment">
                  <FileText className="w-4 h-4 mr-1" />
                  Assessment
                </TabsTrigger>
                <PermissionGate permission={['PRESCRIBE', 'CREATE_ENCOUNTER']} fallback={null}>
                  <TabsTrigger value="plan">
                    <Pill className="w-4 h-4 mr-1" />
                    Plan
                  </TabsTrigger>
                </PermissionGate>
                <PermissionGate permission={['ORDER_LAB', 'CREATE_ENCOUNTER']} fallback={null}>
                  <TabsTrigger value="orders">
                    <FlaskConical className="w-4 h-4 mr-1" />
                    Orders
                  </TabsTrigger>
                </PermissionGate>
                <TabsTrigger value="results">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Results
                </TabsTrigger>
              </TabsList>

              {/* Subjective */}
              <TabsContent value="subjective">
                <Card>
                  <CardHeader>
                    <CardTitle>Subjective</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Chief Complaint</Label>
                      <Textarea
                        value={formData.chiefComplaint}
                        onChange={(e) => setFormData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                        placeholder="What brings the patient in today?"
                        disabled={!isEditable}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>History of Present Illness (HPI)</Label>
                      <Textarea
                        value={formData.historyOfPresentIllness}
                        onChange={(e) => setFormData(prev => ({ ...prev, historyOfPresentIllness: e.target.value }))}
                        placeholder="Detailed narrative of the presenting illness..."
                        disabled={!isEditable}
                        rows={6}
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Past Medical History</Label>
                        <Textarea
                          value={formData.pastMedicalHistory}
                          onChange={(e) => setFormData(prev => ({ ...prev, pastMedicalHistory: e.target.value }))}
                          placeholder="Relevant past medical history..."
                          disabled={!isEditable}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Social History</Label>
                        <Textarea
                          value={formData.socialHistory}
                          onChange={(e) => setFormData(prev => ({ ...prev, socialHistory: e.target.value }))}
                          placeholder="Smoking, alcohol, occupation..."
                          disabled={!isEditable}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Family History</Label>
                      <Textarea
                        value={formData.familyHistory}
                        onChange={(e) => setFormData(prev => ({ ...prev, familyHistory: e.target.value }))}
                        placeholder="Relevant family medical history..."
                        disabled={!isEditable}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Objective */}
              <TabsContent value="objective">
                <Card>
                  <CardHeader>
                    <CardTitle>Objective</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>General Appearance</Label>
                      <Textarea
                        value={formData.generalAppearance}
                        onChange={(e) => setFormData(prev => ({ ...prev, generalAppearance: e.target.value }))}
                        placeholder="Patient appears..."
                        disabled={!isEditable}
                        rows={2}
                      />
                    </div>
                    {/* Vitals from triage would be displayed here */}
                    {patientContext?.recentVitals && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Vital Signs (from Triage)</h4>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">BP:</span>{' '}
                            {patientContext.recentVitals.bpSystolic}/{patientContext.recentVitals.bpDiastolic}
                          </div>
                          <div>
                            <span className="text-gray-500">Temp:</span>{' '}
                            {patientContext.recentVitals.temperature}°C
                          </div>
                          <div>
                            <span className="text-gray-500">Pulse:</span>{' '}
                            {patientContext.recentVitals.pulseRate}
                          </div>
                          <div>
                            <span className="text-gray-500">SpO2:</span>{' '}
                            {patientContext.recentVitals.spo2}%
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assessment */}
              <TabsContent value="assessment">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Assessment & Diagnoses</CardTitle>
                    {isEditable && (
                      <Button size="sm" onClick={() => setShowDiagnosisSearch(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Diagnosis
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Diagnosis Search Modal */}
                    {showDiagnosisSearch && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Search ICD-10 Diagnosis</h4>
                          <Button variant="ghost" size="sm" onClick={() => setShowDiagnosisSearch(false)}>
                            Cancel
                          </Button>
                        </div>
                        <ICD10Search
                          chiefComplaint={formData.chiefComplaint}
                          onSelect={(code) => handleAddDiagnosis(code, primaryDiagnosis ? 'SECONDARY' : 'PRIMARY')}
                        />
                      </div>
                    )}

                    {/* Primary Diagnosis */}
                    <div>
                      <Label className="text-sm font-medium">Primary Diagnosis</Label>
                      {primaryDiagnosis ? (
                        <div className="flex items-center justify-between p-3 border rounded-lg mt-1 bg-blue-50">
                          <div>
                            <span className="font-mono text-sm font-semibold text-blue-600">
                              {primaryDiagnosis.icd10Code}
                            </span>
                            <span className="ml-2 text-sm">{primaryDiagnosis.icd10Description}</span>
                          </div>
                          {isEditable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDiagnosis(primaryDiagnosis.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">No primary diagnosis selected</p>
                      )}
                    </div>

                    {/* Secondary Diagnoses */}
                    <div>
                      <Label className="text-sm font-medium">Secondary Diagnoses</Label>
                      {secondaryDiagnoses.length > 0 ? (
                        <div className="space-y-2 mt-1">
                          {secondaryDiagnoses.map((diag) => (
                            <div key={diag.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <span className="font-mono text-sm font-semibold text-gray-600">
                                  {diag.icd10Code}
                                </span>
                                <span className="ml-2 text-sm">{diag.icd10Description}</span>
                              </div>
                              {isEditable && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveDiagnosis(diag.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1">No secondary diagnoses</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label>Clinical Impression</Label>
                      <Textarea
                        value={formData.clinicalImpression}
                        onChange={(e) => setFormData(prev => ({ ...prev, clinicalImpression: e.target.value }))}
                        placeholder="Summary of clinical findings and reasoning..."
                        disabled={!isEditable}
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Plan */}
              <TabsContent value="plan">
                <Card>
                  <CardHeader>
                    <CardTitle>Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Treatment Plan</Label>
                      <Textarea
                        value={formData.treatmentPlan}
                        onChange={(e) => setFormData(prev => ({ ...prev, treatmentPlan: e.target.value }))}
                        placeholder="Medications, procedures, referrals..."
                        disabled={!isEditable}
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label>Patient Education</Label>
                      <Textarea
                        value={formData.patientEducation}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientEducation: e.target.value }))}
                        placeholder="Instructions and education provided to patient..."
                        disabled={!isEditable}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Follow-up Plan</Label>
                        <Textarea
                          value={formData.followUpPlan}
                          onChange={(e) => setFormData(prev => ({ ...prev, followUpPlan: e.target.value }))}
                          placeholder="Return in 2 weeks, call if symptoms worsen..."
                          disabled={!isEditable}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Disposition</Label>
                        <Select
                          value={formData.disposition}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, disposition: value }))}
                          disabled={!isEditable}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select disposition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DISCHARGED">Discharged</SelectItem>
                            <SelectItem value="ADMITTED">Admitted</SelectItem>
                            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                            <SelectItem value="FOLLOW_UP">Follow-up Required</SelectItem>
                            <SelectItem value="AMA">Against Medical Advice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Orders (Lab & Prescriptions) */}
              <TabsContent value="orders">
                <div className="space-y-6">
                  <LabOrderPanel
                    encounterId={encounter.id}
                    patientId={encounter.patientId}
                    isEditable={isEditable}
                  />
                  <PrescriptionPanel
                    encounterId={encounter.id}
                    patientId={encounter.patientId}
                    isEditable={isEditable}
                  />
                </div>
              </TabsContent>

              {/* Results */}
              <TabsContent value="results">
                <LabResultsPanel
                  encounterId={encounter.id}
                  patientId={encounter.patientId}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="col-span-4 space-y-4">
            {/* Patient Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Age:</span>
                  <span>{encounter.patient?.dateOfBirth ? 
                    Math.floor((Date.now() - new Date(encounter.patient.dateOfBirth).getTime()) / 31557600000) + ' years' 
                    : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender:</span>
                  <span>{encounter.patient?.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Started:</span>
                  <span>{new Date(encounter.startedAt).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Allergies */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientContext?.allergies && patientContext.allergies.length > 0 ? (
                  <div className="space-y-1">
                    {patientContext.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive" className="mr-1">
                        {allergy.allergen}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No known allergies</p>
                )}
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-500" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientContext?.currentMedications && patientContext.currentMedications.length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {patientContext.currentMedications.map((med, idx) => (
                      <li key={idx} className="text-gray-700">
                        {med.medicationName} {med.dosage && `- ${med.dosage}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No current medications</p>
                )}
              </CardContent>
            </Card>

            {/* Problem List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Problem List
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patientContext?.problemList && patientContext.problemList.length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {patientContext.problemList.map((problem, idx) => (
                      <li key={idx} className="text-gray-700">
                        {problem.problemName}
                        {problem.icd10Code && (
                          <span className="text-xs text-gray-400 ml-1">({problem.icd10Code})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No active problems</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncounterWorkspace;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Search, 
  Clock, 
  CheckCircle, 
  FileSignature,
  User,
  Calendar,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { emrService, Encounter } from '@/services/emr.service';
import { appointmentService, Appointment } from '@/services/appointment.service';
import { useToast } from '@/hooks/use-toast';

const EMRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [consultationQueue, setConsultationQueue] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEncounters();
  }, [statusFilter]);

  const loadEncounters = async () => {
    try {
      setIsLoading(true);
      const [triagedAppointments, inProgressAppointments] = await Promise.all([
        appointmentService.list({ status: 'TRIAGED', limit: 100 }),
        appointmentService.list({ status: 'IN_PROGRESS', limit: 100 }),
      ]);

      setConsultationQueue(triagedAppointments.appointments || []);
      setEncounters((inProgressAppointments.appointments as unknown as Encounter[]) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || error.message || 'Failed to load consultation queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConsultation = async (appointment: Appointment) => {
    try {
      const result = await emrService.createEncounter({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        encounterType: 'OUTPATIENT',
      });

      toast({
        title: 'Consultation started',
        description: `${appointment.patient?.firstName || 'Patient'} moved to consultation workspace`,
      });

      await loadEncounters();
      navigate(`/encounters/${result.encounter.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.response?.data?.message || error.message || 'Failed to start consultation',
        variant: 'destructive',
      });
    }
  };

  const filteredQueue = consultationQueue.filter((apt) => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const patientName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
      const mrn = apt.patient?.mrn?.toLowerCase() || '';
      return patientName.includes(query) || mrn.includes(query);
    }
    return true;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-blue-600" />
            EMR / Clinical Consultation
          </h1>
          <p className="text-gray-500 mt-1">Manage patient encounters and clinical documentation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/emr/lab-results')}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Lab Results
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {consultationQueue.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-2xl font-bold text-blue-600">
                  {encounters.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Signed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  0
                </p>
              </div>
              <FileSignature className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Encounters</p>
                <p className="text-2xl font-bold text-gray-600">{consultationQueue.length + encounters.length}</p>
              </div>
              <ClipboardList className="w-8 h-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by patient name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="TRIAGED">Awaiting Consultation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Encounters List */}
      <Card>
        <CardHeader>
          <CardTitle>Consultation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredQueue.length > 0 ? (
            <div className="space-y-3">
              {filteredQueue.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {appointment.patient?.firstName} {appointment.patient?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        MRN: {appointment.patient?.mrn || 'N/A'} • {appointment.chiefComplaint || 'No chief complaint'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(appointment.appointmentDate).toLocaleDateString()} {appointment.appointmentTime}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">TRIAGED</Badge>
                    <Button onClick={() => handleStartConsultation(appointment)}>
                      Start Consultation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No triaged patients waiting for consultation</p>
              <p className="text-sm text-gray-400 mt-1">
                Complete triage first, then refresh this page to start consultation
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <h3 className="font-medium text-blue-900 mb-2">How to Start a Consultation</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <strong>Triage Station</strong> to see patients waiting for consultation</li>
            <li>Select a patient from the queue and click <strong>"Start Consultation"</strong></li>
            <li>Or go to <strong>Patients</strong>, find a patient, and create a new encounter from their profile</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default EMRDashboard;

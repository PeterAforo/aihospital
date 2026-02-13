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
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Encounter } from '@/services/emr.service';
import { useToast } from '@/hooks/use-toast';

const EMRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEncounters();
  }, [statusFilter]);

  const loadEncounters = async () => {
    try {
      setIsLoading(true);
      // For now, we'll show a placeholder since we need patient context
      // In production, this would fetch the doctor's current encounters
      setEncounters([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load encounters',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'SIGNED':
        return <Badge className="bg-green-100 text-green-800"><FileSignature className="w-3 h-3 mr-1" />Signed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredEncounters = encounters.filter(enc => {
    if (statusFilter !== 'all' && enc.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const patientName = `${enc.patient?.firstName} ${enc.patient?.lastName}`.toLowerCase();
      const mrn = enc.patient?.mrn?.toLowerCase() || '';
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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {encounters.filter(e => e.status === 'IN_PROGRESS').length}
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
                  {encounters.filter(e => e.status === 'COMPLETED').length}
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
                  {encounters.filter(e => e.status === 'SIGNED').length}
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
                <p className="text-2xl font-bold text-gray-600">{encounters.length}</p>
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
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="SIGNED">Signed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Encounters List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEncounters.length > 0 ? (
            <div className="space-y-3">
              {filteredEncounters.map((encounter) => (
                <div
                  key={encounter.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/encounters/${encounter.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {encounter.patient?.firstName} {encounter.patient?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        MRN: {encounter.patient?.mrn} • {encounter.encounterType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(encounter.encounterDate).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(encounter.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No encounters found</p>
              <p className="text-sm text-gray-400 mt-1">
                Start a new encounter from the patient's profile or the triage queue
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

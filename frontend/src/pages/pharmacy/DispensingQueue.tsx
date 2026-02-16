import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Search, AlertTriangle, Clock, CheckCircle, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pharmacyService, PrescriptionQueueItem } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/use-toast';

const DispensingQueue: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [queue, setQueue] = useState<PrescriptionQueueItem[]>([]);
  const [filteredQueue, setFilteredQueue] = useState<PrescriptionQueueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    filterQueue();
  }, [queue, searchTerm, activeTab]);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const data = await pharmacyService.getPrescriptionQueue();
      setQueue(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterQueue = () => {
    let filtered = queue;

    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(rx => rx.status === activeTab.toUpperCase());
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(rx =>
        rx.patient.firstName.toLowerCase().includes(term) ||
        rx.patient.lastName.toLowerCase().includes(term) ||
        rx.patient.mrn.toLowerCase().includes(term)
      );
    }

    setFilteredQueue(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'PARTIAL':
        return <Pill className="w-4 h-4 text-blue-500" />;
      case 'DISPENSED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const pendingCount = queue.filter(rx => rx.status === 'PENDING').length;
  const partialCount = queue.filter(rx => rx.status === 'PARTIAL').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-7 h-7 text-green-600" />
            Dispensing Queue
          </h1>
          <p className="text-gray-500">
            {pendingCount} pending, {partialCount} partial
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/pharmacy')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by patient name or MRN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({queue.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="partial">Partial ({partialCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredQueue.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No prescriptions found
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredQueue.map((rx) => (
                <Card
                  key={rx.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/pharmacy/dispense/${rx.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {rx.patient.firstName} {rx.patient.lastName}
                            </h3>
                            <Badge variant="outline">{rx.patient.mrn}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {rx.patient.gender} • {new Date(rx.patient.dateOfBirth).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Prescribed by Dr. {rx.doctor.firstName} {rx.doctor.lastName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(rx.status)}
                          <Badge
                            variant={rx.status === 'PENDING' ? 'secondary' : 'outline'}
                          >
                            {rx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(rx.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Allergies Warning */}
                    {rx.patient.allergies && rx.patient.allergies.length > 0 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700">
                          Allergies: {rx.patient.allergies.map(a => a.allergen).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Items Preview */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {rx.items.map((item) => (
                        <Badge
                          key={item.id}
                          variant={item.status === 'DISPENSED' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {item.drug.genericName} {item.drug.strength} × {item.quantity}
                          {item.dispensedQty > 0 && ` (${item.dispensedQty} dispensed)`}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DispensingQueue;

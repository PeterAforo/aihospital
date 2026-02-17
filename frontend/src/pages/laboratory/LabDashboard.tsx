import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Clock, CheckCircle, AlertTriangle, Beaker, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { laboratoryService, LabWorklistItem, CriticalAlert } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';

const LabDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [worklist, setWorklist] = useState<LabWorklistItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, sampleCollected: 0, processing: 0, completedToday: 0, awaitingVerification: 0 });
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [worklistResult, statsResult, alertsResult, verificationResult] = await Promise.allSettled([
        laboratoryService.getWorklist(),
        laboratoryService.getWorklistStats(),
        laboratoryService.getCriticalAlerts(),
        laboratoryService.getWorklist({ status: 'RESULTED' }),
      ]);
      
      if (worklistResult.status === 'fulfilled') setWorklist(worklistResult.value);
      if (statsResult.status === 'fulfilled' && verificationResult.status === 'fulfilled') {
        setStats({ ...statsResult.value, awaitingVerification: verificationResult.value.length });
      } else if (statsResult.status === 'fulfilled') {
        setStats({ ...statsResult.value, awaitingVerification: 0 });
      }
      if (alertsResult.status === 'fulfilled') setCriticalAlerts(alertsResult.value);

      // Show error only if the main worklist call failed
      if (worklistResult.status === 'rejected') {
        toast({
          title: 'Error',
          description: worklistResult.reason?.message || 'Failed to load worklist',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return <Badge className="bg-red-500">STAT</Badge>;
      case 'URGENT':
        return <Badge className="bg-orange-500">URGENT</Badge>;
      default:
        return <Badge variant="secondary">ROUTINE</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      case 'SAMPLE_COLLECTED':
        return <Badge className="bg-blue-500">Sample Collected</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-purple-600" />
            Laboratory Dashboard
          </h1>
          <p className="text-gray-500">Manage lab orders, samples, and results</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/lab/worklist')}>
            <Beaker className="w-4 h-4 mr-2" />
            Worklist
          </Button>
          <Button onClick={() => navigate('/lab/results')}>
            <FileText className="w-4 h-4 mr-2" />
            Enter Results
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/lab/worklist?status=PENDING')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/lab/worklist?status=SAMPLE_COLLECTED')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Samples Collected</p>
                <p className="text-3xl font-bold text-blue-600">{stats.sampleCollected}</p>
              </div>
              <Beaker className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/lab/worklist?status=PROCESSING')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Processing</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.processing}</p>
              </div>
              <FlaskConical className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/lab/verification')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Awaiting Verification</p>
                <p className="text-3xl font-bold text-purple-600">{stats.awaitingVerification}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Completed Today</p>
                <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Lab Worklist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Lab Worklist</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/lab/worklist')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : worklist.length === 0 ? (
              <p className="text-gray-500">No pending lab orders</p>
            ) : (
              <div className="space-y-3">
                {worklist.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/lab/order/${order.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(order.priority)}
                          <span className="font-medium">
                            {order.patient.firstName} {order.patient.lastName}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">MRN: {order.patient.mrn}</p>
                        <p className="text-sm text-gray-500">
                          {order.items.length} test(s) • {new Date(order.orderDate).toLocaleTimeString()}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {order.items.slice(0, 3).map((item) => (
                        <Badge key={item.id} variant="outline" className="text-xs">
                          {item.test.code || item.test.name}
                        </Badge>
                      ))}
                      {order.items.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{order.items.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Value Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Critical Value Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/lab/critical-values')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : criticalAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No critical alerts</p>
            ) : (
              <div className="space-y-3">
                {criticalAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-red-800">
                          {alert.patient.firstName} {alert.patient.lastName}
                        </p>
                        <p className="text-sm text-red-600">
                          {alert.testName}: {alert.resultValue} ({alert.criticalType})
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(alert.notifiedAt).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledgedAt && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            laboratoryService.acknowledgeCriticalAlert(alert.id).then(() => {
                              loadDashboardData();
                              toast({ title: 'Alert acknowledged' });
                            });
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/lab/collection')}>
              <Beaker className="w-6 h-6 mb-2" />
              Sample Collection
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/lab/results')}>
              <FileText className="w-6 h-6 mb-2" />
              Enter Results
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/lab/worklist')}>
              <FlaskConical className="w-6 h-6 mb-2" />
              Worklist
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/lab/critical-values')}>
              <AlertTriangle className="w-6 h-6 mb-2" />
              Critical Values
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabDashboard;

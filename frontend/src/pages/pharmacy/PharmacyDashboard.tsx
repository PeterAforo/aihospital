import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Package, AlertTriangle, Clock, TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { pharmacyService, PrescriptionQueueItem, StockItem } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/use-toast';

const PharmacyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prescriptionQueue, setPrescriptionQueue] = useState<PrescriptionQueueItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [expiringStock, setExpiringStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [queue, lowStock, expiring] = await Promise.all([
        pharmacyService.getPrescriptionQueue(),
        pharmacyService.getLowStockAlerts(),
        pharmacyService.getExpiringStock(30),
      ]);
      setPrescriptionQueue(queue);
      setLowStockAlerts(lowStock);
      setExpiringStock(expiring);
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

  const pendingCount = prescriptionQueue.filter(p => p.status === 'PENDING').length;
  const partialCount = prescriptionQueue.filter(p => p.status === 'PARTIAL').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="w-7 h-7 text-green-600" />
            Pharmacy Dashboard
          </h1>
          <p className="text-gray-500">Manage prescriptions, stock, and orders</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pharmacy/stock')}>
            <Package className="w-4 h-4 mr-2" />
            Stock Management
          </Button>
          <Button onClick={() => navigate('/pharmacy/queue')}>
            <Users className="w-4 h-4 mr-2" />
            Dispensing Queue
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/pharmacy/queue')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Pending Prescriptions</p>
                <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/pharmacy/queue?status=PARTIAL')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Partial Dispense</p>
                <p className="text-3xl font-bold text-blue-600">{partialCount}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/pharmacy/stock?lowStock=true')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Low Stock Items</p>
                <p className="text-3xl font-bold text-red-600">{lowStockAlerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/pharmacy/stock?expiring=true')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Expiring (30 days)</p>
                <p className="text-3xl font-bold text-yellow-600">{expiringStock.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Prescription Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Prescription Queue</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pharmacy/queue')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : prescriptionQueue.length === 0 ? (
              <p className="text-gray-500">No pending prescriptions</p>
            ) : (
              <div className="space-y-3">
                {prescriptionQueue.slice(0, 5).map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/pharmacy/dispense/${rx.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {rx.patient.firstName} {rx.patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">MRN: {rx.patient.mrn}</p>
                        <p className="text-sm text-gray-500">
                          {rx.items.length} item(s) • Dr. {rx.doctor.firstName} {rx.doctor.lastName}
                        </p>
                      </div>
                      <Badge variant={rx.status === 'PENDING' ? 'secondary' : 'outline'}>
                        {rx.status}
                      </Badge>
                    </div>
                    {rx.patient.allergies && rx.patient.allergies.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        Allergies: {rx.patient.allergies.map(a => a.allergen).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Low Stock Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pharmacy/purchase-orders/new')}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Create PO
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : lowStockAlerts.length === 0 ? (
              <p className="text-gray-500">No low stock alerts</p>
            ) : (
              <div className="space-y-2">
                {lowStockAlerts.slice(0, 8).map((alert, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{alert.drug.genericName}</p>
                      <p className="text-xs text-gray-500">{alert.drug.strength} {alert.drug.form}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{alert.currentStock} left</p>
                      <p className="text-xs text-gray-500">Reorder: {alert.reorderLevel}</p>
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
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/pharmacy/queue')}>
              <Pill className="w-6 h-6 mb-2" />
              Dispense
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/pharmacy/stock')}>
              <Package className="w-6 h-6 mb-2" />
              View Stock
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/pharmacy/purchase-orders')}>
              <ShoppingCart className="w-6 h-6 mb-2" />
              Purchase Orders
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/pharmacy/stock/receive')}>
              <TrendingUp className="w-6 h-6 mb-2" />
              Receive Stock
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PharmacyDashboard;

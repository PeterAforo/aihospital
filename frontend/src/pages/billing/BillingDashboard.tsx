import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, CreditCard, TrendingUp, AlertCircle, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { billingService, Invoice, DailySummary } from '@/services/billing.service';
import { useToast } from '@/hooks/use-toast';

const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [summary, outstanding, recent] = await Promise.all([
        billingService.getDailySummary(),
        billingService.getOutstandingInvoices(),
        billingService.getInvoices({ limit: 10 }),
      ]);
      setDailySummary(summary);
      setOutstandingInvoices(outstanding);
      setRecentInvoices(recent);
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

  const formatCurrency = (amount: number) => {
    return `GHS ${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-blue-500">Partial</Badge>;
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-7 h-7 text-blue-600" />
            Billing Dashboard
          </h1>
          <p className="text-gray-500">Manage invoices, payments, and reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/billing/invoices')}>
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </Button>
          <Button onClick={() => navigate('/billing/invoices/new')}>
            <Receipt className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Today's Invoices</p>
                <p className="text-3xl font-bold text-blue-600">
                  {dailySummary?.invoiceCount || 0}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Today's Collections</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(dailySummary?.totalCollected || 0)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate('/billing/outstanding')}>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Outstanding</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatCurrency(dailySummary?.totalOutstanding || 0)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Today's Invoiced</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(dailySummary?.totalInvoiced || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      {dailySummary && Object.keys(dailySummary.byPaymentMethod).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Collections by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(dailySummary.byPaymentMethod).map(([method, amount]) => (
                <div key={method} className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-500">{method.replace('_', ' ')}</p>
                  <p className="text-xl font-bold">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Outstanding Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Outstanding Invoices
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing/outstanding')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : outstandingInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No outstanding invoices</p>
            ) : (
              <div className="space-y-3">
                {outstandingInvoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/billing/invoices/${invoice.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">
                          {invoice.patient.firstName} {invoice.patient.lastName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(invoice.invoiceDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatCurrency(invoice.balance)}
                        </p>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/billing/invoices')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : recentInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No invoices</p>
            ) : (
              <div className="space-y-3">
                {recentInvoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/billing/invoices/${invoice.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-500">
                          {invoice.patient.firstName} {invoice.patient.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(invoice.total)}</p>
                        {getStatusBadge(invoice.status)}
                      </div>
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
          <div className="grid grid-cols-5 gap-4">
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/billing/invoices/new')}>
              <Receipt className="w-6 h-6 mb-2" />
              New Invoice
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/billing/payments')}>
              <CreditCard className="w-6 h-6 mb-2" />
              Receive Payment
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/billing/invoices')}>
              <FileText className="w-6 h-6 mb-2" />
              All Invoices
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/billing/outstanding')}>
              <AlertCircle className="w-6 h-6 mb-2" />
              Outstanding
            </Button>
            <Button variant="outline" className="h-20 flex-col" onClick={() => navigate('/billing/reports')}>
              <TrendingUp className="w-6 h-6 mb-2" />
              Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingDashboard;

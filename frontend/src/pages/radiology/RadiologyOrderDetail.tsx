import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { radiologyApiService, RadiologyOrder, RadiologyReport, RadiologyReportTemplate } from '../../services/radiology.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';
import {
  ArrowLeft, FileText, Image, AlertTriangle, CheckCircle, Clock, Save, Send,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function RadiologyOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<RadiologyOrder | null>(null);
  const [report, setReport] = useState<RadiologyReport | null>(null);
  const [templates, setTemplates] = useState<RadiologyReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'report'>('details');

  // Report form state
  const [reportForm, setReportForm] = useState({
    technique: '',
    comparison: '',
    findings: '',
    impression: '',
    recommendation: '',
    criticalFinding: false,
  });

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const [o, t] = await Promise.all([
        radiologyApiService.getOrderById(orderId!),
        radiologyApiService.getReportTemplates(),
      ]);
      setOrder(o);
      setTemplates(t);

      if (o.report) {
        setReport(o.report);
        setReportForm({
          technique: o.report.technique || '',
          comparison: o.report.comparison || '',
          findings: o.report.findings || '',
          impression: o.report.impression || '',
          recommendation: o.report.recommendation || '',
          criticalFinding: o.report.criticalFinding || false,
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await radiologyApiService.updateOrderStatus(orderId!, status);
      toast({ title: 'Status updated' });
      loadOrder();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSaveReport = async (finalStatus?: string) => {
    try {
      const data = {
        ...reportForm,
        reportedBy: 'current-user',
        status: finalStatus || 'DRAFT',
        ...(finalStatus === 'FINAL' ? { verifiedBy: 'current-user' } : {}),
      };

      if (report) {
        await radiologyApiService.updateReport(report.id, data);
      } else {
        await radiologyApiService.createReport(orderId!, data);
      }

      toast({ title: finalStatus === 'FINAL' ? 'Report finalized' : 'Report saved' });
      loadOrder();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setReportForm(prev => ({ ...prev, findings: tmpl.templateText }));
      toast({ title: `Template "${tmpl.name}" applied` });
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  if (!order) return <div className="p-6 text-center text-muted-foreground">Order not found</div>;

  const age = order.patient?.dateOfBirth
    ? Math.floor((Date.now() - new Date(order.patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/radiology')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{order.studyRef?.name || order.studyType}</h1>
          <p className="text-muted-foreground">
            {order.patient?.firstName} {order.patient?.lastName} ({order.patient?.mrn})
            {age !== null && ` · ${age}y · ${order.patient?.gender}`}
          </p>
        </div>
        <Badge className={statusColors[order.status] || ''} >{order.status.replace('_', ' ')}</Badge>
        {order.urgency === 'STAT' && <Badge className="bg-red-600 text-white">STAT</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['details', 'images', 'report'] as const).map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'details' && <><FileText className="h-4 w-4 inline mr-1" />Details</>}
            {tab === 'images' && <><Image className="h-4 w-4 inline mr-1" />Images ({order.images?.length || 0})</>}
            {tab === 'report' && <><FileText className="h-4 w-4 inline mr-1" />Report</>}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Order Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Study Type</span><span className="font-medium">{order.studyRef?.name || order.studyType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Modality</span><span>{order.studyRef?.modality || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Body Part</span><span>{order.bodyPart || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Laterality</span><span>{order.laterality || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Urgency</span><Badge className={`${order.urgency === 'STAT' ? 'bg-red-100 text-red-800' : order.urgency === 'URGENT' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>{order.urgency}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Contrast</span><span>{order.contrastUsed ? `Yes (${order.contrastType || ''})` : 'No'}</span></div>
              {order.radiationDose && <div className="flex justify-between"><span className="text-muted-foreground">Radiation Dose</span><span>{order.radiationDose} mGy</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Clinical Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="text-muted-foreground block mb-1">Clinical Indication</span><p>{order.clinicalIndication || '—'}</p></div>
              <div><span className="text-muted-foreground block mb-1">Clinical History</span><p>{order.clinicalHistory || '—'}</p></div>
              <div><span className="text-muted-foreground block mb-1">Notes</span><p>{order.notes || '—'}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>Ordered: {new Date(order.orderedAt).toLocaleString()}</span></div>
              {order.scheduledAt && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500" /><span>Scheduled: {new Date(order.scheduledAt).toLocaleString()} {order.scheduledRoom && `(${order.scheduledRoom})`}</span></div>}
              {order.performedAt && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-purple-500" /><span>Performed: {new Date(order.performedAt).toLocaleString()}</span></div>}
              {order.reportedAt && <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /><span>Reported: {new Date(order.reportedAt).toLocaleString()}</span></div>}
              {order.completedAt && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /><span>Completed: {new Date(order.completedAt).toLocaleString()}</span></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {order.status === 'PENDING' && (
                <>
                  <Button className="w-full" onClick={() => handleStatusChange('IN_PROGRESS')}>Start Examination</Button>
                  <Button variant="outline" className="w-full" onClick={() => handleStatusChange('SCHEDULED')}>Schedule</Button>
                  <Button variant="destructive" className="w-full" onClick={() => handleStatusChange('CANCELLED')}>Cancel Order</Button>
                </>
              )}
              {order.status === 'SCHEDULED' && (
                <Button className="w-full" onClick={() => handleStatusChange('IN_PROGRESS')}>Start Examination</Button>
              )}
              {order.status === 'IN_PROGRESS' && (
                <Button className="w-full" onClick={() => setActiveTab('report')}>Write Report</Button>
              )}
              {order.status === 'COMPLETED' && (
                <p className="text-center text-green-600 font-medium py-2">Order completed</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Images Tab */}
      {activeTab === 'images' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Images</CardTitle>
              <Button variant="outline" size="sm" disabled>
                <Image className="h-4 w-4 mr-2" /> Upload Image
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!order.images || order.images.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">No images uploaded yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {order.images.map(img => (
                  <div key={img.id} className="border rounded-lg p-2">
                    {img.thumbnailUrl ? (
                      <img src={img.thumbnailUrl} alt={img.fileName} className="w-full h-32 object-cover rounded" />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs mt-1 truncate">{img.fileName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(img.uploadedAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          {report && (
            <div className="flex items-center gap-2">
              <Badge className={report.status === 'FINAL' ? 'bg-green-100 text-green-800' : report.status === 'PRELIMINARY' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}>
                Report: {report.status}
              </Badge>
              {report.criticalFinding && (
                <Badge className="bg-red-600 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Critical Finding</Badge>
              )}
            </div>
          )}

          {templates.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <label className="text-sm font-medium mb-2 block">Apply Template</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map(t => (
                    <Button key={t.id} variant="outline" size="sm" onClick={() => applyTemplate(t.id)}>
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Radiology Report</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Technique</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-y"
                  value={reportForm.technique}
                  onChange={e => setReportForm(p => ({ ...p, technique: e.target.value }))}
                  placeholder="Describe the imaging technique used..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Comparison</label>
                <Input
                  value={reportForm.comparison}
                  onChange={e => setReportForm(p => ({ ...p, comparison: e.target.value }))}
                  placeholder="Prior studies for comparison..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Findings</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[150px] resize-y"
                  value={reportForm.findings}
                  onChange={e => setReportForm(p => ({ ...p, findings: e.target.value }))}
                  placeholder="Describe findings..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Impression</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
                  value={reportForm.impression}
                  onChange={e => setReportForm(p => ({ ...p, impression: e.target.value }))}
                  placeholder="Summary impression..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Recommendation</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-y"
                  value={reportForm.recommendation}
                  onChange={e => setReportForm(p => ({ ...p, recommendation: e.target.value }))}
                  placeholder="Follow-up recommendations..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="criticalFinding"
                  checked={reportForm.criticalFinding}
                  onChange={e => setReportForm(p => ({ ...p, criticalFinding: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="criticalFinding" className="text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />Critical Finding
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleSaveReport('DRAFT')}>
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button variant="outline" onClick={() => handleSaveReport('PRELIMINARY')}>
                  Save as Preliminary
                </Button>
                <Button onClick={() => handleSaveReport('FINAL')}>
                  <Send className="h-4 w-4 mr-2" /> Finalize Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

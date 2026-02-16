import React, { useState, useEffect } from 'react';
import {
  TrendingUp, AlertTriangle, Target, DollarSign,
  BarChart3, ArrowUpRight, ArrowDownRight, Edit2, X, Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  financeService,
  MarginAnalysisResult,
  MarginServiceItem,
  CategoryProfitabilityItem,
  RecommendedPriceResult,
} from '@/services/finance.service';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'CLINICAL_SERVICES', label: 'Clinical Services' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'RADIOLOGY', label: 'Radiology' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'INPATIENT', label: 'Inpatient' },
  { value: 'PACKAGES', label: 'Packages' },
];

const statusColors: Record<string, string> = {
  loss_making: 'bg-red-100 text-red-700 border-red-200',
  low_margin: 'bg-orange-100 text-orange-700 border-orange-200',
  below_target: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  at_target: 'bg-green-100 text-green-700 border-green-200',
  above_target: 'bg-blue-100 text-blue-700 border-blue-200',
};

const statusLabels: Record<string, string> = {
  loss_making: 'Loss',
  low_margin: 'Low',
  below_target: 'Below Target',
  at_target: 'On Target',
  above_target: 'Above Target',
};

const categoryBarColors: Record<string, string> = {
  CLINICAL_SERVICES: 'bg-blue-500',
  LABORATORY: 'bg-purple-500',
  RADIOLOGY: 'bg-amber-500',
  PHARMACY: 'bg-green-500',
  INPATIENT: 'bg-rose-500',
  PACKAGES: 'bg-teal-500',
};

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined) return '—';
  return `₵${n.toFixed(2)}`;
};

const ProfitabilityDashboard: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [marginData, setMarginData] = useState<MarginAnalysisResult | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryProfitabilityItem[]>([]);
  const [alerts, setAlerts] = useState<MarginServiceItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Cost edit modal
  const [editingCost, setEditingCost] = useState<MarginServiceItem | null>(null);
  const [newCostPrice, setNewCostPrice] = useState('');
  const [costReason, setCostReason] = useState('');

  // Price recommender
  const [recCost, setRecCost] = useState('');
  const [recTarget, setRecTarget] = useState('');
  const [recResult, setRecResult] = useState<RecommendedPriceResult | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [margin, cats, lowAlerts] = await Promise.all([
        financeService.getMarginAnalysis({ category: categoryFilter || undefined }),
        financeService.getCategoryProfitability(),
        financeService.getLowMarginAlerts(),
      ]);
      setMarginData(margin);
      setCategoryData(cats);
      setAlerts(lowAlerts);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [categoryFilter]);

  const handleUpdateCost = async () => {
    if (!editingCost || !newCostPrice) return;
    try {
      await financeService.updateServiceCost(editingCost.serviceId, {
        newCostPrice: parseFloat(newCostPrice),
        changeReason: costReason || undefined,
      });
      toast({ title: 'Success', description: `Cost updated for ${editingCost.serviceName}` });
      setEditingCost(null);
      setNewCostPrice('');
      setCostReason('');
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRecommend = async () => {
    if (!recCost) return;
    try {
      const result = await financeService.calculateRecommendedPrice({
        costPrice: parseFloat(recCost),
        targetProfitPercentage: recTarget ? parseFloat(recTarget) : undefined,
      });
      setRecResult(result);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const maxCatMargin = categoryData.length > 0 ? Math.max(...categoryData.map(c => c.averageMargin), 1) : 100;

  // Find most/least profitable
  const sortedByMargin = marginData?.services?.filter(s => s.profitMarginPercentage !== null).sort((a, b) => (b.profitMarginPercentage || 0) - (a.profitMarginPercentage || 0)) || [];
  const mostProfitable = sortedByMargin[0];
  const leastProfitable = sortedByMargin[sortedByMargin.length - 1];

  if (isLoading && !marginData) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-400">Loading profitability data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Profitability Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Cost tracking, profit margins, and pricing intelligence</p>
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      {marginData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Margin</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{marginData.summary.averageMargin}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Most Profitable</p>
                  <p className="text-sm font-semibold mt-1 truncate max-w-[140px]">{mostProfitable?.serviceName || '—'}</p>
                  <p className="text-lg font-bold text-blue-600">{mostProfitable?.profitMarginPercentage?.toFixed(0) || 0}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Least Profitable</p>
                  <p className="text-sm font-semibold mt-1 truncate max-w-[140px]">{leastProfitable?.serviceName || '—'}</p>
                  <p className="text-lg font-bold text-orange-600">{leastProfitable?.profitMarginPercentage?.toFixed(0) || 0}%</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Need Attention</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{marginData.summary.belowTarget + marginData.summary.lowMargin + marginData.summary.lossMaking}</p>
                  <p className="text-xs text-gray-400">services below target</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Margin Distribution + Category Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Margin Distribution */}
        {marginData && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4" /> Margin Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: 'aboveTarget', label: 'Above Target', color: 'bg-blue-500', count: marginData.summary.aboveTarget },
                  { key: 'atTarget', label: 'On Target', color: 'bg-green-500', count: marginData.summary.atTarget },
                  { key: 'belowTarget', label: 'Below Target', color: 'bg-yellow-500', count: marginData.summary.belowTarget },
                  { key: 'lowMargin', label: 'Low Margin', color: 'bg-orange-500', count: marginData.summary.lowMargin },
                  { key: 'lossMaking', label: 'Loss Making', color: 'bg-red-500', count: marginData.summary.lossMaking },
                ].map(item => {
                  const pct = marginData.summary.totalServices > 0 ? (item.count / marginData.summary.totalServices) * 100 : 0;
                  return (
                    <div key={item.key} className="flex items-center gap-3">
                      <span className="text-xs w-24 text-gray-600">{item.label}</span>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                        <div className={`${item.color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${Math.max(pct, 2)}%` }}>
                          {pct > 10 && <span className="text-[10px] text-white font-medium">{item.count}</span>}
                        </div>
                      </div>
                      <span className="text-xs font-semibold w-8 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Profitability */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Profitability by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.map(cat => {
                const barWidth = maxCatMargin > 0 ? (cat.averageMargin / maxCatMargin) * 100 : 0;
                const barColor = categoryBarColors[cat.category] || 'bg-gray-500';
                return (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-xs w-28 text-gray-600 truncate">{cat.category.replace('_', ' ')}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                      <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(barWidth, 2)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right ${cat.averageMargin < 30 ? 'text-red-600' : cat.averageMargin < 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {cat.averageMargin}%
                    </span>
                  </div>
                );
              })}
              {categoryData.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Recommender */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Price Recommender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Cost Price (₵)</label>
              <Input type="number" step="0.01" min="0" placeholder="e.g. 25" value={recCost} onChange={e => setRecCost(e.target.value)} className="w-32" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Target Margin (%)</label>
              <Input type="number" step="1" min="0" placeholder="e.g. 100" value={recTarget} onChange={e => setRecTarget(e.target.value)} className="w-32" />
            </div>
            <Button onClick={handleRecommend} size="sm" className="bg-emerald-600 hover:bg-emerald-700">Calculate</Button>
            {recResult && (
              <div className="flex items-center gap-4 ml-4 text-sm">
                <span>Recommended: <strong className="text-emerald-600">{fmt(recResult.recommendedPrice)}</strong></span>
                <span>Profit: <strong>{fmt(recResult.actualProfitAmount)}</strong> ({recResult.actualProfitPercentage}%)</span>
                {recResult.warnings.length > 0 && (
                  <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{recResult.warnings[0]}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Low Margin Alerts Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Low Margin Alerts
            <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Service</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Cost</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Price</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Profit</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Margin</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Target</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {alerts.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No low-margin alerts</td></tr>
                ) : alerts.map(svc => (
                  <tr key={svc.serviceId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{svc.serviceName}</div>
                      <div className="text-xs text-gray-400 font-mono">{svc.serviceCode}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{fmt(svc.costPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmt(svc.sellingPrice)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={svc.profitAmount < 0 ? 'text-red-600 font-semibold' : svc.profitAmount === 0 ? 'text-gray-400' : ''}>
                        {fmt(svc.profitAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={
                        (svc.profitMarginPercentage || 0) < 0 ? 'text-red-600 font-bold' :
                        (svc.profitMarginPercentage || 0) < 20 ? 'text-orange-600 font-bold' :
                        'text-yellow-600 font-semibold'
                      }>
                        {svc.profitMarginPercentage !== null ? `${svc.profitMarginPercentage}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{svc.targetMargin}%</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[svc.marginStatus] || 'bg-gray-100'}`}>
                        {statusLabels[svc.marginStatus] || svc.marginStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => { setEditingCost(svc); setNewCostPrice(String(svc.costPrice)); }}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Cost
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Full Service Margin Table */}
      {marginData && marginData.services.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> All Services Margin Analysis
              <Badge variant="secondary" className="ml-2">{marginData.services.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Service</th>
                    <th className="text-left px-4 py-2.5 font-medium">Category</th>
                    <th className="text-right px-4 py-2.5 font-medium">Cost</th>
                    <th className="text-right px-4 py-2.5 font-medium">Price</th>
                    <th className="text-right px-4 py-2.5 font-medium">NHIS</th>
                    <th className="text-right px-4 py-2.5 font-medium">Margin</th>
                    <th className="text-right px-4 py-2.5 font-medium">NHIS Margin</th>
                    <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {marginData.services.map(svc => (
                    <tr key={svc.serviceId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-2">
                        <div className="font-medium text-xs">{svc.serviceName}</div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">{svc.category.replace('_', ' ')}</td>
                      <td className="px-4 py-2 text-right text-xs">{fmt(svc.costPrice)}</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold">{fmt(svc.sellingPrice)}</td>
                      <td className="px-4 py-2 text-right text-xs">{svc.nhisPrice ? fmt(svc.nhisPrice) : '—'}</td>
                      <td className="px-4 py-2 text-right text-xs font-bold">
                        <span className={
                          (svc.profitMarginPercentage || 0) < 0 ? 'text-red-600' :
                          (svc.profitMarginPercentage || 0) < 20 ? 'text-orange-600' :
                          (svc.profitMarginPercentage || 0) < 50 ? 'text-yellow-600' :
                          'text-green-600'
                        }>
                          {svc.profitMarginPercentage !== null ? `${svc.profitMarginPercentage}%` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs">
                        {svc.nhisMarginPercentage !== null && svc.nhisMarginPercentage !== undefined
                          ? <span className={svc.nhisMarginPercentage < 0 ? 'text-red-600' : svc.nhisMarginPercentage < 20 ? 'text-orange-600' : 'text-gray-600'}>{svc.nhisMarginPercentage}%</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusColors[svc.marginStatus] || 'bg-gray-100'}`}>
                          {statusLabels[svc.marginStatus] || svc.marginStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Edit Modal */}
      {editingCost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingCost(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Cost Price</h3>
              <button onClick={() => setEditingCost(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm font-medium">{editingCost.serviceName}</p>
            <p className="text-xs text-gray-400 mb-4">{editingCost.serviceCode}</p>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Current Cost:</span><span>{fmt(editingCost.costPrice)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Selling Price:</span><span>{fmt(editingCost.sellingPrice)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Current Margin:</span><span className="font-semibold">{editingCost.profitMarginPercentage}%</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">New Cost Price (₵)</label>
                <Input type="number" step="0.01" min="0" value={newCostPrice} onChange={e => setNewCostPrice(e.target.value)} />
                {newCostPrice && parseFloat(newCostPrice) > 0 && (
                  <p className="text-xs mt-1 text-gray-500">
                    New margin: <strong className={((editingCost.sellingPrice - parseFloat(newCostPrice)) / parseFloat(newCostPrice) * 100) < 20 ? 'text-red-600' : 'text-green-600'}>
                      {(((editingCost.sellingPrice - parseFloat(newCostPrice)) / parseFloat(newCostPrice)) * 100).toFixed(1)}%
                    </strong>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reason</label>
                <Input placeholder="e.g. Supplier price increase" value={costReason} onChange={e => setCostReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditingCost(null)}>Cancel</Button>
                <Button onClick={handleUpdateCost} className="bg-emerald-600 hover:bg-emerald-700">Update Cost</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitabilityDashboard;

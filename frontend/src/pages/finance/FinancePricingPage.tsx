import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Search, Plus, Edit2, History, ToggleLeft, ToggleRight,
  Calculator, Building2, Tag, Filter, X, Check,
  Percent, ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  financeService,
  ServiceCatalogItem,
  BranchPricingItem,
  PriceCalculationResult,
  PriceHistoryItem,
  DiscountScheme,
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

const categoryColors: Record<string, string> = {
  CLINICAL_SERVICES: 'bg-blue-100 text-blue-800',
  LABORATORY: 'bg-purple-100 text-purple-800',
  RADIOLOGY: 'bg-amber-100 text-amber-800',
  PHARMACY: 'bg-green-100 text-green-800',
  INPATIENT: 'bg-rose-100 text-rose-800',
  PACKAGES: 'bg-teal-100 text-teal-800',
};

const CATEGORY_PREFIXES: Record<string, string> = {
  CLINICAL_SERVICES: 'CS',
  LABORATORY: 'LAB',
  RADIOLOGY: 'RAD',
  PHARMACY: 'PH',
  INPATIENT: 'INP',
  PACKAGES: 'PKG',
};

const generateServiceCode = (category: string, name: string): string => {
  const prefix = CATEGORY_PREFIXES[category] || 'SVC';
  const slug = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 12);
  if (!slug) return `${prefix}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  return `${prefix}-${slug}`;
};

type TabType = 'price-list' | 'branch-pricing' | 'calculator' | 'discounts';

const FinancePricingPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('price-list');

  // Price List state
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [totalServices, setTotalServices] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [nhisOnly, setNhisOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Edit price modal
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Add service modal
  const [showAddService, setShowAddService] = useState(false);
  const [addForm, setAddForm] = useState({
    serviceCode: '', serviceName: '', category: 'CLINICAL_SERVICES', description: '',
    basePrice: '', costPrice: '', nhisPrice: '', isNhisCovered: false, isTaxable: false, taxRate: '0', unit: 'per_visit',
    branchId: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Branch add override modal
  const [showBranchAddOverride, setShowBranchAddOverride] = useState(false);
  const [branchAddSearch, setBranchAddSearch] = useState('');
  const [branchAddSuggestions, setBranchAddSuggestions] = useState<ServiceCatalogItem[]>([]);
  const [branchAddSelectedService, setBranchAddSelectedService] = useState<ServiceCatalogItem | null>(null);
  const [branchAddPrice, setBranchAddPrice] = useState('');
  const [branchAddReason, setBranchAddReason] = useState('');

  // Add discount modal
  const [showAddDiscount, setShowAddDiscount] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    schemeName: '', discountType: 'percentage', discountValue: '', appliesTo: 'all_services', eligibilityCriteria: '',
  });
  const [discountSubmitting, setDiscountSubmitting] = useState(false);

  // History modal
  const [historyService, setHistoryService] = useState<ServiceCatalogItem | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);

  // Branch pricing state
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branchPricing, setBranchPricing] = useState<BranchPricingItem[]>([]);
  const [branchOverrideService, setBranchOverrideService] = useState<BranchPricingItem | null>(null);
  const [branchNewPrice, setBranchNewPrice] = useState('');
  const [branchReason, setBranchReason] = useState('');

  // Calculator state
  const [calcServiceCode, setCalcServiceCode] = useState('');
  const [calcResult, setCalcResult] = useState<PriceCalculationResult | null>(null);
  const [calcSearch, setCalcSearch] = useState('');
  const [calcSuggestions, setCalcSuggestions] = useState<ServiceCatalogItem[]>([]);
  const [showCalcDropdown, setShowCalcDropdown] = useState(false);

  // Discounts state
  const [discounts, setDiscounts] = useState<DiscountScheme[]>([]);

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '—';
    return `₵${amount.toFixed(2)}`;
  };

  // ==================== PRICE LIST ====================

  const loadServices = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await financeService.listServices({
        category: categoryFilter || undefined,
        nhisOnly: nhisOnly || undefined,
        search: searchQuery || undefined,
        page,
        limit: 20,
      });
      setServices(result.services);
      setTotalServices(result.total);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, nhisOnly, searchQuery, page]);

  useEffect(() => {
    if (activeTab === 'price-list') loadServices();
  }, [activeTab, loadServices]);

  const handleUpdatePrice = async () => {
    if (!editingService || !newPrice) return;
    try {
      // Update base price
      await financeService.updateServicePrice(editingService.id, {
        newPrice: parseFloat(newPrice),
        changeReason: changeReason || undefined,
      });
      // Update cost price if changed
      if (newCostPrice && parseFloat(newCostPrice) !== (editingService.costPrice || 0)) {
        await financeService.updateServiceCost(editingService.id, {
          newCostPrice: parseFloat(newCostPrice),
          changeReason: changeReason || undefined,
        });
      }
      toast({ title: 'Success', description: `Price updated for ${editingService.serviceName}` });
      setEditingService(null);
      setNewPrice('');
      setNewCostPrice('');
      setChangeReason('');
      loadServices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddService = async () => {
    if (!addForm.serviceName || !addForm.basePrice) return;
    try {
      setAddSubmitting(true);
      const code = addForm.serviceCode || generateServiceCode(addForm.category, addForm.serviceName);
      const created = await financeService.createService({
        serviceCode: code,
        serviceName: addForm.serviceName,
        category: addForm.category as any,
        description: addForm.description || undefined,
        basePrice: parseFloat(addForm.basePrice),
        costPrice: addForm.costPrice ? parseFloat(addForm.costPrice) : undefined,
        nhisPrice: addForm.nhisPrice ? parseFloat(addForm.nhisPrice) : undefined,
        isNhisCovered: addForm.isNhisCovered,
        isTaxable: addForm.isTaxable,
        taxRate: parseFloat(addForm.taxRate) || 0,
        unit: addForm.unit,
      });
      // If a specific branch was selected, create a branch price override
      if (addForm.branchId && created.id) {
        try {
          await financeService.setBranchPrice(addForm.branchId, {
            serviceId: created.id,
            branchPrice: parseFloat(addForm.basePrice),
            reason: 'Initial branch-specific pricing',
          });
        } catch { /* branch override is best-effort */ }
      }
      toast({ title: 'Success', description: `Service "${addForm.serviceName}" created (${code})` });
      setShowAddService(false);
      setAddForm({ serviceCode: '', serviceName: '', category: 'CLINICAL_SERVICES', description: '', basePrice: '', costPrice: '', nhisPrice: '', isNhisCovered: false, isTaxable: false, taxRate: '0', unit: 'per_visit', branchId: '' });
      loadServices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleBranchAddSearch = async (query: string) => {
    setBranchAddSearch(query);
    if (query.length < 2) { setBranchAddSuggestions([]); return; }
    try {
      const result = await financeService.listServices({ search: query, limit: 10 });
      setBranchAddSuggestions(result.services);
    } catch { setBranchAddSuggestions([]); }
  };

  const handleBranchAddOverride = async () => {
    if (!branchAddSelectedService || !branchAddPrice || !selectedBranch) return;
    try {
      await financeService.setBranchPrice(selectedBranch, {
        serviceId: branchAddSelectedService.id,
        branchPrice: parseFloat(branchAddPrice),
        reason: branchAddReason || undefined,
      });
      toast({ title: 'Success', description: `Branch price set for ${branchAddSelectedService.serviceName}` });
      setShowBranchAddOverride(false);
      setBranchAddSearch('');
      setBranchAddSuggestions([]);
      setBranchAddSelectedService(null);
      setBranchAddPrice('');
      setBranchAddReason('');
      loadBranchPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  const handleAddDiscount = async () => {
    if (!discountForm.schemeName || !discountForm.discountValue) return;
    try {
      setDiscountSubmitting(true);
      await financeService.createDiscount({
        schemeName: discountForm.schemeName,
        discountType: discountForm.discountType,
        discountValue: parseFloat(discountForm.discountValue),
        appliesTo: discountForm.appliesTo,
        eligibilityCriteria: discountForm.eligibilityCriteria || undefined,
        isActive: true,
      });
      toast({ title: 'Success', description: `Discount "${discountForm.schemeName}" created` });
      setShowAddDiscount(false);
      setDiscountForm({ schemeName: '', discountType: 'percentage', discountValue: '', appliesTo: 'all_services', eligibilityCriteria: '' });
      loadDiscounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setDiscountSubmitting(false);
    }
  };

  const handleCalcSearch = async (query: string) => {
    setCalcSearch(query);
    if (query.length < 2) { setCalcSuggestions([]); setShowCalcDropdown(false); return; }
    try {
      const result = await financeService.listServices({ search: query, limit: 10 });
      setCalcSuggestions(result.services);
      setShowCalcDropdown(true);
    } catch { setCalcSuggestions([]); }
  };

  const selectCalcService = (svc: ServiceCatalogItem) => {
    setCalcServiceCode(svc.serviceCode);
    setCalcSearch(`${svc.serviceName} (${svc.serviceCode})`);
    setShowCalcDropdown(false);
  };

  const handleToggleActive = async (service: ServiceCatalogItem) => {
    try {
      await financeService.toggleServiceActive(service.id);
      toast({ title: 'Success', description: `${service.serviceName} ${service.isActive ? 'deactivated' : 'activated'}` });
      loadServices();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEditModal = (svc: ServiceCatalogItem) => {
    setEditingService(svc);
    setNewPrice(String(svc.basePrice));
    setNewCostPrice(svc.costPrice ? String(svc.costPrice) : '');
    setChangeReason('');
  };

  const handleViewHistory = async (service: ServiceCatalogItem) => {
    try {
      const history = await financeService.getPriceHistory(service.id);
      setPriceHistory(history);
      setHistoryService(service);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // ==================== BRANCH PRICING ====================

  const loadBranches = async () => {
    try {
      const { default: api } = await import('@/services/api');
      const res = await api.get('/tenants/branches');
      const branchData = res.data.data;
      if (branchData && branchData.length > 0) {
        setBranches(branchData.map((b: any) => ({ id: b.id, name: b.name })));
        if (!selectedBranch) {
          setSelectedBranch(branchData[0].id);
        }
      }
    } catch { /* ignore */ }
  };

  const loadBranchPricing = async () => {
    if (!selectedBranch) return;
    try {
      const pricing = await financeService.getBranchPricing(selectedBranch);
      setBranchPricing(pricing);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (activeTab === 'branch-pricing') {
      loadBranches();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBranch) loadBranchPricing();
  }, [selectedBranch]);

  const handleSetBranchPrice = async () => {
    if (!branchOverrideService || !branchNewPrice || !selectedBranch) return;
    try {
      await financeService.setBranchPrice(selectedBranch, {
        serviceId: branchOverrideService.serviceId,
        branchPrice: parseFloat(branchNewPrice),
        reason: branchReason || undefined,
      });
      toast({ title: 'Success', description: 'Branch price override set' });
      setBranchOverrideService(null);
      setBranchNewPrice('');
      setBranchReason('');
      loadBranchPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveBranchPrice = async (item: BranchPricingItem) => {
    if (!item.overrideId || !selectedBranch) return;
    try {
      await financeService.removeBranchPrice(selectedBranch, item.overrideId);
      toast({ title: 'Success', description: 'Branch override removed' });
      loadBranchPricing();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // ==================== CALCULATOR ====================

  const handleCalculatePrice = async () => {
    if (!calcServiceCode) return;
    try {
      const result = await financeService.calculatePrice({ serviceCode: calcServiceCode.toUpperCase() });
      setCalcResult(result);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setCalcResult(null);
    }
  };

  // ==================== DISCOUNTS ====================

  const loadDiscounts = async () => {
    try {
      const data = await financeService.listDiscounts();
      setDiscounts(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (activeTab === 'discounts') loadDiscounts();
  }, [activeTab]);

  // ==================== RENDER ====================

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'price-list', label: 'Price List', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'branch-pricing', label: 'Branch Pricing', icon: <Building2 className="w-4 h-4" /> },
    { key: 'calculator', label: 'Price Calculator', icon: <Calculator className="w-4 h-4" /> },
    { key: 'discounts', label: 'Discounts', icon: <Tag className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Finance & Pricing Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage service prices, branch overrides, and discount schemes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== PRICE LIST TAB ==================== */}
      {activeTab === 'price-list' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
              className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setNhisOnly(!nhisOnly); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm border ${
                nhisOnly ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white dark:bg-gray-800'
              }`}
            >
              <Filter className="w-4 h-4" />
              NHIS Only
            </button>
            <Button onClick={() => setShowAddService(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Service
            </Button>
          </div>

          {/* Summary */}
          <div className="text-sm text-gray-500 mb-3">
            {totalServices} service{totalServices !== 1 ? 's' : ''} found
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Service Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Margin</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">NHIS</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Scope</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {isLoading ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : services.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">No services found</td></tr>
                ) : services.map(svc => (
                  <tr key={svc.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${!svc.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs">{svc.serviceCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{svc.serviceName}</div>
                      {svc.description && <div className="text-xs text-gray-400 mt-0.5">{svc.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[svc.category] || 'bg-gray-100 text-gray-700'}`}>
                        {svc.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{svc.costPrice ? formatCurrency(svc.costPrice) : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(svc.basePrice)}</td>
                    <td className="px-4 py-3 text-right">
                      {svc.costPrice && svc.costPrice > 0 ? (() => {
                        const margin = ((svc.basePrice - svc.costPrice) / svc.costPrice * 100);
                        return (
                          <span className={`font-semibold ${margin < 20 ? 'text-red-600' : margin < 50 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {margin.toFixed(0)}%
                          </span>
                        );
                      })() : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {svc.isNhisCovered ? (
                        <span className="text-emerald-600 font-medium">{formatCurrency(svc.nhisPrice)}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {svc.pricingScope === 'branch_specific' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title={svc.branchNames?.join(', ')}>
                          <Building2 className="w-3 h-3" />
                          {svc.branchOverrideCount} branch{(svc.branchOverrideCount || 0) !== 1 ? 'es' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          All Branches
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {svc.isActive ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(svc)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600"
                          title="Edit Price"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(svc)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600"
                          title="Price History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(svc)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          title={svc.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {svc.isActive ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalServices > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {Math.ceil(totalServices / 20)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalServices / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== BRANCH PRICING TAB ==================== */}
      {activeTab === 'branch-pricing' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Branch:</label>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 min-w-[200px]"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <Button onClick={() => { setShowBranchAddOverride(true); setBranchAddSelectedService(null); setBranchAddSearch(''); setBranchAddPrice(''); setBranchAddReason(''); }} disabled={!selectedBranch} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Price Override
            </Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Org Price</th>
                  <th className="text-right px-4 py-3 font-medium">Branch Price</th>
                  <th className="text-right px-4 py-3 font-medium">Difference</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {branchPricing.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Select a branch to view pricing</td></tr>
                ) : branchPricing.map(item => (
                  <tr key={item.serviceId} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.serviceName}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.serviceCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[item.category] || 'bg-gray-100'}`}>
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.organizationPrice)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.hasOverride ? (
                        <span className="text-amber-600">{formatCurrency(item.branchPrice)}</span>
                      ) : (
                        formatCurrency(item.branchPrice)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.difference !== 0 ? (
                        <span className={item.difference > 0 ? 'text-red-600' : 'text-green-600'}>
                          {item.difference > 0 ? '+' : ''}{formatCurrency(item.difference)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.hasOverride ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setBranchOverrideService(item); setBranchNewPrice(String(item.branchPrice)); }}
                            className="p-1.5 rounded hover:bg-gray-100 text-blue-600"
                            title="Edit Override"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveBranchPrice(item)}
                            className="p-1.5 rounded hover:bg-gray-100 text-red-600"
                            title="Remove Override"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setBranchOverrideService(item); setBranchNewPrice(''); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Set Override
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== CALCULATOR TAB ==================== */}
      {activeTab === 'calculator' && (
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Price Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Search Service</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Type service name or code..."
                        value={calcSearch}
                        onChange={e => handleCalcSearch(e.target.value)}
                        onFocus={() => calcSuggestions.length > 0 && setShowCalcDropdown(true)}
                        onKeyDown={e => { if (e.key === 'Enter') { setShowCalcDropdown(false); handleCalculatePrice(); } }}
                        className="pl-10"
                      />
                      {showCalcDropdown && calcSuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-auto">
                          {calcSuggestions.map(svc => (
                            <button
                              key={svc.id}
                              onClick={() => selectCalcService(svc)}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-sm">{svc.serviceName}</span>
                                  <span className="text-xs text-gray-400 ml-2 font-mono">{svc.serviceCode}</span>
                                </div>
                                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(svc.basePrice)}</span>
                              </div>
                              <span className={`inline-block mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium ${categoryColors[svc.category] || 'bg-gray-100'}`}>
                                {svc.category.replace('_', ' ')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={() => { setShowCalcDropdown(false); handleCalculatePrice(); }} className="bg-emerald-600 hover:bg-emerald-700">
                      Calculate
                    </Button>
                  </div>
                </div>
                {calcServiceCode && (
                  <p className="text-xs text-gray-400 mt-1">Selected: <span className="font-mono font-medium">{calcServiceCode}</span></p>
                )}
              </div>

              {calcResult && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{calcResult.serviceName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[calcResult.category] || 'bg-gray-100'}`}>
                      {calcResult.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Organization Price</span>
                      <span>{formatCurrency(calcResult.breakdown.organizationPrice)}</span>
                    </div>
                    {calcResult.breakdown.branchOverride !== null && (
                      <div className="flex justify-between text-amber-600">
                        <span>Branch Override</span>
                        <span>{formatCurrency(calcResult.breakdown.branchOverride)}</span>
                      </div>
                    )}
                    {calcResult.breakdown.insuranceAdjustment !== null && (
                      <div className="flex justify-between text-blue-600">
                        <span>Insurance Adjustment</span>
                        <span>{formatCurrency(calcResult.breakdown.insuranceAdjustment)}</span>
                      </div>
                    )}
                    {calcResult.breakdown.discountApplied > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(calcResult.breakdown.discountApplied)}</span>
                      </div>
                    )}
                    {calcResult.breakdown.taxAdded > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tax</span>
                        <span>+{formatCurrency(calcResult.breakdown.taxAdded)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total Price</span>
                      <span className="text-emerald-600">{formatCurrency(calcResult.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Source: {calcResult.priceSource}</span>
                      <span>Unit: {calcResult.unit}</span>
                    </div>
                    {calcResult.isNhisCovered && (
                      <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                        <Check className="w-3 h-3" /> NHIS Covered
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== DISCOUNTS TAB ==================== */}
      {activeTab === 'discounts' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowAddDiscount(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-1" /> Add Discount
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discounts.map(d => (
              <Card key={d.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{d.schemeName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{d.eligibilityCriteria || 'No criteria specified'}</p>
                    </div>
                    <Badge className={d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                      {d.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-lg">{d.discountValue}{d.discountType === 'percentage' ? '%' : ' GHS'}</span>
                    </div>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-500">Applies to: {d.appliesTo.replace('_', ' ')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {discounts.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">No discount schemes configured</div>
            )}
          </div>
        </div>
      )}

      {/* ==================== EDIT PRICE MODAL ==================== */}
      {editingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingService(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Update Pricing</h3>
            <p className="text-sm text-gray-500 mb-4">{editingService.serviceName} <span className="font-mono">({editingService.serviceCode})</span></p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Selling Price (₵)</label>
                  <Input type="number" step="0.01" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
                  <span className="text-xs text-gray-400">Current: {formatCurrency(editingService.basePrice)}</span>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Cost Price (₵)</label>
                  <Input type="number" step="0.01" min="0" value={newCostPrice} onChange={e => setNewCostPrice(e.target.value)} placeholder="0.00" />
                  <span className="text-xs text-gray-400">Current: {editingService.costPrice ? formatCurrency(editingService.costPrice) : '—'}</span>
                </div>
              </div>
              {newPrice && newCostPrice && parseFloat(newCostPrice) > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-sm">
                  <span className="text-gray-500">Margin: </span>
                  <span className={`font-semibold ${((parseFloat(newPrice) - parseFloat(newCostPrice)) / parseFloat(newCostPrice) * 100) < 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {((parseFloat(newPrice) - parseFloat(newCostPrice)) / parseFloat(newCostPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Reason for Change</label>
                <Input placeholder="e.g. Market adjustment, supplier cost increase" value={changeReason} onChange={e => setChangeReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
                <Button onClick={handleUpdatePrice} className="bg-emerald-600 hover:bg-emerald-700">Update</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== HISTORY MODAL ==================== */}
      {historyService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setHistoryService(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Price History</h3>
              <button onClick={() => setHistoryService(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{historyService.serviceName}</p>
            {priceHistory.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No price changes recorded</p>
            ) : (
              <div className="space-y-3">
                {priceHistory.map(h => (
                  <div key={h.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <ArrowUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-500 line-through">{formatCurrency(h.oldPrice)}</span>
                        <span>→</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(h.newPrice)}</span>
                      </div>
                      {h.changeReason && <p className="text-xs text-gray-500 mt-0.5">{h.changeReason}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(h.effectiveDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== BRANCH OVERRIDE MODAL ==================== */}
      {branchOverrideService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setBranchOverrideService(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Set Branch Price Override</h3>
            <p className="text-sm text-gray-500 mb-1">{branchOverrideService.serviceName}</p>
            <p className="text-sm text-gray-400 mb-4">Organization price: {formatCurrency(branchOverrideService.organizationPrice)}</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Branch Price (₵)</label>
                <Input type="number" step="0.01" min="0" value={branchNewPrice} onChange={e => setBranchNewPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reason</label>
                <Input placeholder="e.g. Premium location" value={branchReason} onChange={e => setBranchReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setBranchOverrideService(null)}>Cancel</Button>
                <Button onClick={handleSetBranchPrice} className="bg-emerald-600 hover:bg-emerald-700">Set Override</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD SERVICE MODAL ==================== */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddService(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> Add New Service</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Category *</label>
                <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value, serviceCode: f.serviceName ? generateServiceCode(e.target.value, f.serviceName) : '' }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Service Name *</label>
                <Input
                  placeholder="e.g. General Consultation"
                  value={addForm.serviceName}
                  onChange={e => {
                    const name = e.target.value;
                    setAddForm(f => ({ ...f, serviceName: name, serviceCode: name.trim() ? generateServiceCode(f.category, name) : '' }));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Service Code</label>
                <div className="flex items-center gap-2">
                  <Input value={addForm.serviceCode} onChange={e => setAddForm(f => ({ ...f, serviceCode: e.target.value }))} className="font-mono" placeholder="Auto-generated" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">Auto-generated</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <Input placeholder="Optional description" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Branch</label>
                <select value={addForm.branchId} onChange={e => setAddForm(f => ({ ...f, branchId: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  <option value="">All Branches (Organization-wide)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <span className="text-xs text-gray-400">Leave as "All Branches" for organization-wide pricing</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Selling Price (₵) *</label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.basePrice} onChange={e => setAddForm(f => ({ ...f, basePrice: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Cost Price (₵)</label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.costPrice} onChange={e => setAddForm(f => ({ ...f, costPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">NHIS Price (₵)</label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={addForm.nhisPrice} onChange={e => setAddForm(f => ({ ...f, nhisPrice: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Unit</label>
                  <select value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                    <option value="per_visit">Per Visit</option>
                    <option value="per_test">Per Test</option>
                    <option value="per_unit">Per Unit</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_procedure">Per Procedure</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Tax Rate (%)</label>
                  <Input type="number" step="0.01" min="0" value={addForm.taxRate} onChange={e => setAddForm(f => ({ ...f, taxRate: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addForm.isNhisCovered} onChange={e => setAddForm(f => ({ ...f, isNhisCovered: e.target.checked }))} className="rounded" />
                  NHIS Covered
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addForm.isTaxable} onChange={e => setAddForm(f => ({ ...f, isTaxable: e.target.checked }))} className="rounded" />
                  Taxable
                </label>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddService(false)}>Cancel</Button>
                <Button onClick={handleAddService} disabled={addSubmitting || !addForm.serviceName || !addForm.basePrice} className="bg-emerald-600 hover:bg-emerald-700">
                  {addSubmitting ? 'Creating...' : 'Create Service'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD DISCOUNT MODAL ==================== */}
      {showAddDiscount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddDiscount(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Tag className="w-5 h-5 text-emerald-600" /> Add Discount Scheme</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Scheme Name *</label>
                <Input placeholder="e.g. Senior Citizen Discount" value={discountForm.schemeName} onChange={e => setDiscountForm(f => ({ ...f, schemeName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Type</label>
                  <select value={discountForm.discountType} onChange={e => setDiscountForm(f => ({ ...f, discountType: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₵)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Value *</label>
                  <Input type="number" step="0.01" min="0" placeholder={discountForm.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'} value={discountForm.discountValue} onChange={e => setDiscountForm(f => ({ ...f, discountValue: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Applies To</label>
                <select value={discountForm.appliesTo} onChange={e => setDiscountForm(f => ({ ...f, appliesTo: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  <option value="all_services">All Services</option>
                  <option value="CLINICAL_SERVICES">Clinical Services</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="RADIOLOGY">Radiology</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="INPATIENT">Inpatient</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Eligibility Criteria</label>
                <Input placeholder="e.g. Age 65+, Staff family" value={discountForm.eligibilityCriteria} onChange={e => setDiscountForm(f => ({ ...f, eligibilityCriteria: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddDiscount(false)}>Cancel</Button>
                <Button onClick={handleAddDiscount} disabled={discountSubmitting || !discountForm.schemeName || !discountForm.discountValue} className="bg-emerald-600 hover:bg-emerald-700">
                  {discountSubmitting ? 'Creating...' : 'Create Discount'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== BRANCH ADD OVERRIDE MODAL ==================== */}
      {showBranchAddOverride && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBranchAddOverride(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-600" /> Add Branch Price Override</h3>
            <p className="text-sm text-gray-500 mb-4">Branch: <span className="font-medium text-gray-700 dark:text-gray-300">{branches.find(b => b.id === selectedBranch)?.name}</span></p>
            <div className="space-y-3">
              {!branchAddSelectedService ? (
                <div>
                  <label className="text-sm font-medium block mb-1">Search Service</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Type service name or code..."
                      value={branchAddSearch}
                      onChange={e => handleBranchAddSearch(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                    {branchAddSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {branchAddSuggestions.map(svc => (
                          <button
                            key={svc.id}
                            onClick={() => { setBranchAddSelectedService(svc); setBranchAddSuggestions([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-sm">{svc.serviceName}</span>
                                <span className="text-xs text-gray-400 ml-2 font-mono">{svc.serviceCode}</span>
                              </div>
                              <span className="text-sm font-semibold">{formatCurrency(svc.basePrice)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{branchAddSelectedService.serviceName}</div>
                        <div className="text-xs text-gray-400 font-mono">{branchAddSelectedService.serviceCode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Org: {formatCurrency(branchAddSelectedService.basePrice)}</span>
                        <button onClick={() => { setBranchAddSelectedService(null); setBranchAddSearch(''); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Branch Price (₵) *</label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={branchAddPrice} onChange={e => setBranchAddPrice(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Reason</label>
                    <Input placeholder="e.g. Location premium, local market rate" value={branchAddReason} onChange={e => setBranchAddReason(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowBranchAddOverride(false)}>Cancel</Button>
                <Button onClick={handleBranchAddOverride} disabled={!branchAddSelectedService || !branchAddPrice} className="bg-emerald-600 hover:bg-emerald-700">
                  Set Override
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePricingPage;

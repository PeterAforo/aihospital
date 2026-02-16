import React, { useState, useEffect } from 'react';
import {
  Building2, Bed, Plus, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { inpatientService, Ward, BedItem } from '@/services/inpatient.service';

const WARD_TYPES = [
  'GENERAL', 'PRIVATE', 'SEMI_PRIVATE', 'ICU', 'HDU', 'NICU',
  'PEDIATRIC', 'MATERNITY', 'SURGICAL', 'ISOLATION', 'EMERGENCY',
];

const wardTypeColors: Record<string, string> = {
  GENERAL: 'bg-blue-100 text-blue-800', PRIVATE: 'bg-purple-100 text-purple-800',
  ICU: 'bg-red-100 text-red-800', HDU: 'bg-orange-100 text-orange-800',
  NICU: 'bg-pink-100 text-pink-800', PEDIATRIC: 'bg-teal-100 text-teal-800',
  MATERNITY: 'bg-rose-100 text-rose-800', SURGICAL: 'bg-amber-100 text-amber-800',
  ISOLATION: 'bg-yellow-100 text-yellow-800', EMERGENCY: 'bg-red-100 text-red-700',
  SEMI_PRIVATE: 'bg-indigo-100 text-indigo-800',
};

const bedStatusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500', OCCUPIED: 'bg-red-500', RESERVED: 'bg-blue-500',
  MAINTENANCE: 'bg-yellow-500', CLEANING: 'bg-purple-500', OUT_OF_SERVICE: 'bg-gray-500',
};

const WardBedManagement: React.FC = () => {
  const { toast } = useToast();
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWard, setExpandedWard] = useState<string | null>(null);
  const [wardBeds, setWardBeds] = useState<Record<string, BedItem[]>>({});

  // Add ward modal
  const [showAddWard, setShowAddWard] = useState(false);
  const [wardForm, setWardForm] = useState({ name: '', code: '', wardType: 'GENERAL', floor: '', building: '', description: '' });

  // Add beds modal
  const [showAddBeds, setShowAddBeds] = useState<string | null>(null);
  const [bedForm, setBedForm] = useState({ prefix: '', startNumber: 1, count: 1, bedType: 'standard', dailyRate: '' });

  // Occupancy summary
  const [occupancy, setOccupancy] = useState<any>(null);

  const loadWards = async () => {
    try {
      setLoading(true);
      const [wardsData, occ] = await Promise.all([
        inpatientService.listWards(),
        inpatientService.getOccupancy(),
      ]);
      setWards(wardsData);
      setOccupancy(occ);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWards(); }, []);

  const loadBeds = async (wardId: string) => {
    try {
      const beds = await inpatientService.listBeds(wardId);
      setWardBeds(prev => ({ ...prev, [wardId]: beds }));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const toggleWard = (wardId: string) => {
    if (expandedWard === wardId) {
      setExpandedWard(null);
    } else {
      setExpandedWard(wardId);
      if (!wardBeds[wardId]) loadBeds(wardId);
    }
  };

  const handleCreateWard = async () => {
    if (!wardForm.name || !wardForm.code) return;
    try {
      const branchRes = await (await import('@/services/api')).default.get('/tenants/branches');
      const branchId = branchRes.data.data?.[0]?.id;
      if (!branchId) { toast({ title: 'Error', description: 'No branch found', variant: 'destructive' }); return; }
      await inpatientService.createWard({ branchId, ...wardForm, wardType: wardForm.wardType });
      toast({ title: 'Success', description: `Ward "${wardForm.name}" created` });
      setShowAddWard(false);
      setWardForm({ name: '', code: '', wardType: 'GENERAL', floor: '', building: '', description: '' });
      loadWards();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  const handleCreateBeds = async () => {
    if (!showAddBeds || !bedForm.prefix || bedForm.count < 1) return;
    try {
      await inpatientService.createBedsBulk(showAddBeds, {
        prefix: bedForm.prefix, startNumber: bedForm.startNumber, count: bedForm.count,
        bedType: bedForm.bedType, dailyRate: bedForm.dailyRate ? parseFloat(bedForm.dailyRate) : undefined,
      });
      toast({ title: 'Success', description: `${bedForm.count} bed(s) created` });
      setShowAddBeds(null);
      setBedForm({ prefix: '', startNumber: 1, count: 1, bedType: 'standard', dailyRate: '' });
      loadBeds(showAddBeds);
      loadWards();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    }
  };

  const handleBedStatusChange = async (bedId: string, status: string, wardId: string) => {
    try {
      await inpatientService.updateBedStatus(bedId, status);
      loadBeds(wardId);
      loadWards();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Ward & Bed Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage wards, beds, and occupancy</p>
        </div>
        <Button onClick={() => setShowAddWard(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" /> Add Ward
        </Button>
      </div>

      {/* Occupancy Summary */}
      {occupancy && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{occupancy.totalBeds}</div>
            <div className="text-xs text-gray-500 mt-1">Total Beds</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-green-600">{occupancy.available}</div>
            <div className="text-xs text-gray-500 mt-1">Available</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-red-600">{occupancy.occupied}</div>
            <div className="text-xs text-gray-500 mt-1">Occupied</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{occupancy.maintenance}</div>
            <div className="text-xs text-gray-500 mt-1">Maintenance</div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{occupancy.occupancyRate}%</div>
            <div className="text-xs text-gray-500 mt-1">Occupancy Rate</div>
          </CardContent></Card>
        </div>
      )}

      {/* Wards List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading wards...</div>
      ) : wards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No wards configured. Click "Add Ward" to get started.</div>
      ) : (
        <div className="space-y-3">
          {wards.map(ward => (
            <div key={ward.id} className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
              {/* Ward Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                onClick={() => toggleWard(ward.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{ward.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wardTypeColors[ward.wardType] || 'bg-gray-100'}`}>
                        {ward.wardType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {ward.branch?.name} {ward.floor ? `• Floor ${ward.floor}` : ''} {ward.building ? `• ${ward.building}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">{ward.totalBeds} beds</span>
                    <span className="text-green-600 font-medium">{ward.availableBeds} free</span>
                    <span className="text-red-600 font-medium">{ward.occupiedBeds} occupied</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${ward.occupancyRate > 90 ? 'bg-red-500' : ward.occupancyRate > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${ward.occupancyRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{ward.occupancyRate}%</span>
                  </div>
                  {expandedWard === ward.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded Bed Grid */}
              {expandedWard === ward.id && (
                <div className="border-t px-5 py-4 bg-gray-50 dark:bg-gray-850">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-600">Beds</h4>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowAddBeds(ward.id); setBedForm({ prefix: ward.code + '-', startNumber: ward.totalBeds + 1, count: 4, bedType: 'standard', dailyRate: '' }); }}>
                      <Plus className="w-3 h-3 mr-1" /> Add Beds
                    </Button>
                  </div>
                  {!wardBeds[ward.id] ? (
                    <div className="text-sm text-gray-400">Loading beds...</div>
                  ) : wardBeds[ward.id].length === 0 ? (
                    <div className="text-sm text-gray-400">No beds in this ward yet.</div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {wardBeds[ward.id].map(bed => {
                        const patient = bed.admissions?.[0]?.patient;
                        return (
                          <div
                            key={bed.id}
                            className={`relative group rounded-lg border p-2 text-center text-xs cursor-pointer transition-all hover:shadow-md ${
                              bed.status === 'AVAILABLE' ? 'bg-green-50 border-green-200 hover:border-green-400' :
                              bed.status === 'OCCUPIED' ? 'bg-red-50 border-red-200 hover:border-red-400' :
                              bed.status === 'CLEANING' ? 'bg-purple-50 border-purple-200' :
                              bed.status === 'MAINTENANCE' ? 'bg-yellow-50 border-yellow-200' :
                              'bg-gray-50 border-gray-200'
                            }`}
                            title={patient ? `${patient.firstName} ${patient.lastName} (${patient.mrn})` : bed.status}
                          >
                            <div className={`w-2 h-2 rounded-full absolute top-1 right-1 ${bedStatusColors[bed.status] || 'bg-gray-400'}`} />
                            <Bed className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                            <div className="font-medium">{bed.bedNumber}</div>
                            {patient && <div className="text-[10px] text-gray-500 truncate">{patient.lastName}</div>}
                            {/* Quick status change on hover */}
                            <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                              {bed.status !== 'AVAILABLE' && (
                                <button onClick={(e) => { e.stopPropagation(); handleBedStatusChange(bed.id, 'AVAILABLE', ward.id); }} className="text-[10px] text-green-600 hover:underline">Set Available</button>
                              )}
                              {bed.status !== 'MAINTENANCE' && bed.status !== 'OCCUPIED' && (
                                <button onClick={(e) => { e.stopPropagation(); handleBedStatusChange(bed.id, 'MAINTENANCE', ward.id); }} className="text-[10px] text-yellow-600 hover:underline">Maintenance</button>
                              )}
                              {bed.status !== 'CLEANING' && bed.status !== 'OCCUPIED' && (
                                <button onClick={(e) => { e.stopPropagation(); handleBedStatusChange(bed.id, 'CLEANING', ward.id); }} className="text-[10px] text-purple-600 hover:underline">Cleaning</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {Object.entries(bedStatusColors).map(([status, color]) => (
                      <div key={status} className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${color}`} />
                        {status.replace('_', ' ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Ward Modal */}
      {showAddWard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddWard(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-600" /> Add New Ward</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Ward Name *</label>
                  <Input placeholder="e.g. Male Ward" value={wardForm.name} onChange={e => setWardForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Code *</label>
                  <Input placeholder="e.g. MW" value={wardForm.code} onChange={e => setWardForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="font-mono" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Ward Type</label>
                <select value={wardForm.wardType} onChange={e => setWardForm(f => ({ ...f, wardType: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                  {WARD_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Floor</label>
                  <Input placeholder="e.g. 2nd" value={wardForm.floor} onChange={e => setWardForm(f => ({ ...f, floor: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Building</label>
                  <Input placeholder="e.g. Block A" value={wardForm.building} onChange={e => setWardForm(f => ({ ...f, building: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <Input placeholder="Optional description" value={wardForm.description} onChange={e => setWardForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddWard(false)}>Cancel</Button>
                <Button onClick={handleCreateWard} disabled={!wardForm.name || !wardForm.code} className="bg-blue-600 hover:bg-blue-700">Create Ward</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Beds Modal */}
      {showAddBeds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddBeds(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Bed className="w-5 h-5 text-blue-600" /> Add Beds</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Prefix *</label>
                  <Input value={bedForm.prefix} onChange={e => setBedForm(f => ({ ...f, prefix: e.target.value }))} className="font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Start #</label>
                  <Input type="number" min="1" value={bedForm.startNumber} onChange={e => setBedForm(f => ({ ...f, startNumber: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Count</label>
                  <Input type="number" min="1" max="50" value={bedForm.count} onChange={e => setBedForm(f => ({ ...f, count: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Bed Type</label>
                  <select value={bedForm.bedType} onChange={e => setBedForm(f => ({ ...f, bedType: e.target.value }))} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
                    <option value="standard">Standard</option>
                    <option value="electric">Electric</option>
                    <option value="icu">ICU</option>
                    <option value="pediatric">Pediatric</option>
                    <option value="bariatric">Bariatric</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Daily Rate (₵)</label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={bedForm.dailyRate} onChange={e => setBedForm(f => ({ ...f, dailyRate: e.target.value }))} />
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-xs text-gray-500">
                Preview: {Array.from({ length: Math.min(bedForm.count, 5) }, (_, i) => `${bedForm.prefix}${String(bedForm.startNumber + i).padStart(2, '0')}`).join(', ')}{bedForm.count > 5 ? '...' : ''}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={() => setShowAddBeds(null)}>Cancel</Button>
                <Button onClick={handleCreateBeds} disabled={!bedForm.prefix || bedForm.count < 1} className="bg-blue-600 hover:bg-blue-700">Create {bedForm.count} Bed(s)</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardBedManagement;

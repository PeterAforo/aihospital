import { useState, useEffect } from 'react';
import { inventoryApiService, InventoryItem, InventoryDashboardStats, InventoryCategory } from '../../services/inventory.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, Package, AlertTriangle, XCircle, DollarSign,
} from 'lucide-react';

export default function InventoryDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<InventoryDashboardStats | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadItems(); }, [categoryFilter, stockFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, c, i] = await Promise.all([
        inventoryApiService.getDashboardStats(),
        inventoryApiService.getCategories(),
        inventoryApiService.getItems({ limit: 50 }),
      ]);
      setStats(s);
      setCategories(c);
      setItems(i.items);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadItems = async () => {
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (categoryFilter !== 'all') filters.categoryId = categoryFilter;
      if (stockFilter === 'low') filters.lowStock = 'true';
      const result = await inventoryApiService.getItems(filters);
      setItems(result.items);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = items.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.supplier?.toLowerCase().includes(q)
    );
  }).filter(item => {
    if (stockFilter === 'out') return item.currentStock === 0;
    return true;
  });

  const getStockBadge = (item: InventoryItem) => {
    if (item.currentStock === 0) return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
    if (item.currentStock <= item.reorderLevel) return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Non-drug supplies, equipment consumables & general inventory</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.lowStock}</p>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{stats.outOfStock}</p>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">GHS {stats.totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search item, code, supplier..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader><CardTitle>Inventory Items ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No items found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 font-medium">Code</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Unit</th>
                    <th className="pb-2 font-medium text-right">Stock</th>
                    <th className="pb-2 font-medium text-right">Reorder Level</th>
                    <th className="pb-2 font-medium text-right">Unit Cost</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{item.name}</div>
                        {item.supplier && <div className="text-xs text-muted-foreground">{item.supplier}</div>}
                      </td>
                      <td className="py-3 text-xs">{item.code || '—'}</td>
                      <td className="py-3 text-xs">{item.category?.name || '—'}</td>
                      <td className="py-3 text-xs">{item.unit}</td>
                      <td className="py-3 text-right font-medium">{item.currentStock}</td>
                      <td className="py-3 text-right text-xs">{item.reorderLevel}</td>
                      <td className="py-3 text-right text-xs">{item.unitCost ? `GHS ${item.unitCost.toFixed(2)}` : '—'}</td>
                      <td className="py-3">{getStockBadge(item)}</td>
                      <td className="py-3 text-xs">{item.location || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, Calendar, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { pharmacyService, StockItem } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/use-toast';

const StockManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const categories = ['Antibiotics', 'Analgesics', 'Antimalarials', 'Antihypertensives', 'Antidiabetics', 'Vitamins', 'Other'];

  useEffect(() => {
    loadStock();
  }, []);

  useEffect(() => {
    filterStock();
  }, [stock, searchTerm, categoryFilter, statusFilter]);

  const loadStock = async () => {
    try {
      setIsLoading(true);
      const data = await pharmacyService.getStock();
      setStock(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterStock = () => {
    let filtered = stock;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.drug.genericName.toLowerCase().includes(term) ||
        item.drug.brandName?.toLowerCase().includes(term) ||
        item.batchNumber?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.drug.category === categoryFilter);
    }

    if (statusFilter === 'low') {
      filtered = filtered.filter(item => item.quantity <= item.reorderLevel);
    } else if (statusFilter === 'expiring') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      filtered = filtered.filter(item => item.expiryDate && new Date(item.expiryDate) <= thirtyDays);
    } else if (statusFilter === 'expired') {
      filtered = filtered.filter(item => item.expiryDate && new Date(item.expiryDate) < new Date());
    }

    setFilteredStock(filtered);
  };

  const getStockStatus = (item: StockItem) => {
    if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (item.quantity <= item.reorderLevel) {
      return <Badge className="bg-orange-500">Low Stock</Badge>;
    }
    if (item.expiryDate) {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      if (new Date(item.expiryDate) <= thirtyDays) {
        return <Badge className="bg-yellow-500">Expiring Soon</Badge>;
      }
    }
    return <Badge className="bg-green-500">In Stock</Badge>;
  };

  const lowStockCount = stock.filter(s => s.quantity <= s.reorderLevel).length;
  const expiringCount = stock.filter(s => {
    if (!s.expiryDate) return false;
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return new Date(s.expiryDate) <= thirtyDays && new Date(s.expiryDate) >= new Date();
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Stock Management
          </h1>
          <p className="text-gray-500">
            {stock.length} items • {lowStockCount} low stock • {expiringCount} expiring soon
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pharmacy')}>
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate('/pharmacy/stock/receive')}>
            <Plus className="w-4 h-4 mr-2" />
            Receive Stock
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by drug name or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No stock items found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Cost Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStock.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.drug.genericName}</p>
                        <p className="text-sm text-gray-500">
                          {item.drug.brandName} • {item.drug.strength} {item.drug.form}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{item.batchNumber || '-'}</TableCell>
                    <TableCell>
                      <span className={item.quantity <= item.reorderLevel ? 'text-red-600 font-bold' : ''}>
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell>
                      {item.expiryDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>GHS {item.costPrice?.toFixed(2) || '-'}</TableCell>
                    <TableCell>GHS {item.sellingPrice?.toFixed(2) || '-'}</TableCell>
                    <TableCell>{getStockStatus(item)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockManagement;

import { useState, useEffect } from 'react';
import { pharmacyService, Supplier } from '../../services/pharmacy.service';
import {
  Truck, Plus, Edit, Search, CheckCircle, XCircle,
  Phone, Mail, MapPin
} from 'lucide-react';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await pharmacyService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) return;
    try {
      setSubmitting(true);
      if (editingSupplier) {
        await pharmacyService.updateSupplier(editingSupplier.id, formData);
      } else {
        await pharmacyService.createSupplier(formData);
      }
      setShowForm(false);
      setEditingSupplier(null);
      resetForm();
      loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      isActive: supplier.isActive,
    });
    setShowForm(true);
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await pharmacyService.updateSupplier(supplier.id, { isActive: !supplier.isActive });
      loadSuppliers();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
  };

  const filteredSuppliers = suppliers.filter(s =>
    !searchTerm ||
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-500">Manage drug suppliers and vendors</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingSupplier(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Suppliers</p>
              <p className="text-xl font-bold">{suppliers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-xl font-bold">{suppliers.filter(s => s.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="text-xl font-bold">{suppliers.filter(s => !s.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Suppliers grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">No suppliers found</div>
        ) : (
          filteredSuppliers.map(supplier => (
            <div key={supplier.id} className={`bg-white rounded-lg shadow p-5 border-l-4 ${supplier.isActive ? 'border-green-500' : 'border-gray-300'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{supplier.name}</h3>
                  {supplier.contactPerson && (
                    <p className="text-sm text-gray-500">Contact: {supplier.contactPerson}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600 mb-4">
                {supplier.phone && (
                  <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {supplier.phone}</p>
                )}
                {supplier.email && (
                  <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {supplier.email}</p>
                )}
                {supplier.address && (
                  <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {supplier.address}</p>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button onClick={() => handleEdit(supplier)} className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-gray-50 flex items-center justify-center gap-1">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(supplier)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded flex items-center justify-center gap-1 ${
                    supplier.isActive
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-green-200 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {supplier.isActive ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g. Ghana Medical Supplies Ltd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={e => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border rounded-lg p-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border rounded-lg p-2"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingSupplier(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSave}
                disabled={submitting || !formData.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

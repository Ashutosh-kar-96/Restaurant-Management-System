import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState, ConfirmDialog } from '../../components/ui';
import { STOCK_ALERT_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function ManagerInventory() {
  const qc = useQueryClient();
  const { branchId } = useBranch();
  const [modal, setModal]     = useState(false);
  const [restock, setRestock] = useState(null);
  const [form, setForm] = useState({ name:'', unit:'kg', currentStock:'', minStockLevel:'', maxStockLevel:'', costPerUnit:'' });
  const [restockForm, setRestockForm] = useState({ quantity:'', costPerUnit:'', note:'' });

  const { data, isLoading } = useQuery({ queryKey:['inventory', branchId], queryFn:() => inventoryApi.getAll(branchId), enabled:!!branchId });
  const items = data?.data?.data || [];

  const { data: suppData } = useQuery({ queryKey:['suppliers'], queryFn:() => inventoryApi.getSuppliers() });
  const suppliers = suppData?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d) => inventoryApi.create(branchId, d),
    onSuccess:  () => { qc.invalidateQueries(['inventory']); setModal(false); setForm({ name:'', unit:'kg', currentStock:'', minStockLevel:'', maxStockLevel:'', costPerUnit:'' }); toast.success('Item added!'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const restockMutation = useMutation({
    mutationFn: ({ id, d }) => inventoryApi.restock(id, d),
    onSuccess:  () => { qc.invalidateQueries(['inventory']); setRestock(null); setRestockForm({ quantity:'', costPerUnit:'', note:'' }); toast.success('Restocked!'); },
  });

  const alertCounts = { LOW: items.filter((i) => i.alertLevel === 'LOW').length, CRITICAL: items.filter((i) => i.alertLevel === 'CRITICAL').length, OUT_OF_STOCK: items.filter((i) => i.alertLevel === 'OUT_OF_STOCK').length };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Inventory</h1><p className="page-subtitle">{items.length} items tracked</p></div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Add Item</button>
      </div>

      {/* Alert Summary */}
      {(alertCounts.LOW + alertCounts.CRITICAL + alertCounts.OUT_OF_STOCK) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap gap-4">
          <span className="font-semibold text-red-700">⚠️ Stock Alerts</span>
          {alertCounts.OUT_OF_STOCK > 0 && <span className="badge badge-red">{alertCounts.OUT_OF_STOCK} Out of Stock</span>}
          {alertCounts.CRITICAL > 0    && <span className="badge badge-red">{alertCounts.CRITICAL} Critical</span>}
          {alertCounts.LOW > 0         && <span className="badge badge-yellow">{alertCounts.LOW} Low Stock</span>}
        </div>
      )}

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📦" title="No inventory items" subtitle="Start tracking your ingredients" />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Item</th><th>Unit</th><th>Current Stock</th><th>Min Level</th><th>Cost/Unit</th><th>Alert</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const cfg = STOCK_ALERT_CONFIG[item.alertLevel] || {};
                  const pct = Math.min(100, (parseFloat(item.currentStock) / parseFloat(item.maxStockLevel)) * 100);
                  return (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.supplier && <p className="text-xs text-gray-400">Supplier: {item.supplier.name}</p>}
                      </td>
                      <td className="text-gray-600">{item.unit}</td>
                      <td>
                        <p className="font-medium text-gray-900">{parseFloat(item.currentStock).toFixed(2)}</p>
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1">
                          <div className={`h-1.5 rounded-full ${item.alertLevel === 'NORMAL' ? 'bg-green-400' : item.alertLevel === 'LOW' ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="text-gray-600">{parseFloat(item.minStockLevel).toFixed(2)}</td>
                      <td className="text-gray-600">₹{parseFloat(item.costPerUnit).toFixed(2)}</td>
                      <td><span className={`badge ${cfg.color}`}>{cfg.label}</span></td>
                      <td>
                        <button onClick={() => { setRestock(item); setRestockForm({ quantity:'', costPerUnit: item.costPerUnit, note:'' }); }}
                          className="btn-outline btn-sm text-xs">+ Restock</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="text-lg font-semibold">Add Inventory Item</h3><button onClick={() => setModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button></div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
              <div className="modal-body grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="label">Item Name *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })} required /></div>
                <div><label className="label">Unit *</label>
                  <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit:e.target.value })}>
                    {['kg','g','l','ml','pieces','dozen','box'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div><label className="label">Cost Per Unit (₹) *</label><input type="number" step="0.01" className="input" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit:e.target.value })} required /></div>
                <div><label className="label">Current Stock *</label><input type="number" step="0.001" className="input" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock:e.target.value })} required /></div>
                <div><label className="label">Min Stock Level *</label><input type="number" step="0.001" className="input" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel:e.target.value })} required /></div>
                <div className="col-span-2"><label className="label">Max Stock Level *</label><input type="number" step="0.001" className="input" value={form.maxStockLevel} onChange={(e) => setForm({ ...form, maxStockLevel:e.target.value })} required /></div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? 'Adding...' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restock && (
        <div className="modal-overlay" onClick={() => setRestock(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3 className="text-lg font-semibold">Restock — {restock.name}</h3><button onClick={() => setRestock(null)} className="btn-ghost btn-icon text-gray-400">✕</button></div>
            <form onSubmit={(e) => { e.preventDefault(); restockMutation.mutate({ id: restock.id, d: restockForm }); }}>
              <div className="modal-body space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 text-sm"><span className="text-blue-700">Current: </span><span className="font-bold">{parseFloat(restock.currentStock).toFixed(2)} {restock.unit}</span></div>
                <div><label className="label">Quantity to Add *</label><input type="number" step="0.001" className="input" value={restockForm.quantity} onChange={(e) => setRestockForm({ ...restockForm, quantity:e.target.value })} required /></div>
                <div><label className="label">Cost Per Unit (₹)</label><input type="number" step="0.01" className="input" value={restockForm.costPerUnit} onChange={(e) => setRestockForm({ ...restockForm, costPerUnit:e.target.value })} /></div>
                <div><label className="label">Note</label><input className="input" value={restockForm.note} onChange={(e) => setRestockForm({ ...restockForm, note:e.target.value })} placeholder="Optional note" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setRestock(null)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={restockMutation.isPending} className="btn-primary">{restockMutation.isPending ? 'Restocking...' : 'Confirm Restock'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

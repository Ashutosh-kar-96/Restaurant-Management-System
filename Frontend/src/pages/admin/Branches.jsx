import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { Spinner, EmptyState } from '../../components/ui';
import toast from 'react-hot-toast';

const emptyForm = { name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '', openTime: '09:00', closeTime: '23:00' };

export default function AdminBranches() {
  const qc           = useQueryClient();
  const restaurantId = localStorage.getItem('restaurantId');
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['branches', restaurantId],
    queryFn:  () => restaurantApi.getBranches(restaurantId),
    enabled:  !!restaurantId,
  });
  const branches = data?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d) => restaurantApi.createBranch(restaurantId, d),
    onSuccess:  () => {
      qc.invalidateQueries(['branches']);
      setModal(false);
      setForm(emptyForm);
      toast.success('Branch created!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create branch'),
  });

  if (!restaurantId) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500">Restaurant not found. Please log out and log back in.</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Branches</h1><p className="page-subtitle">Manage your restaurant locations</p></div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Add Branch</button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>
      ) : branches.length === 0 ? (
        <div className="card"><EmptyState icon="🏪" title="No branches" subtitle="Add your first branch location" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-xl">🏪</div>
                <span className={`badge ${b.isActive ? 'badge-green' : 'badge-red'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{b.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{b.address}, {b.city} {b.pincode}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>📞 {b.phone}</span>
                <span>⏰ {b.openTime}–{b.closeTime}</span>
              </div>
              {b._count && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span>🪑 {b._count.tables} tables</span>
                  <span>🧾 {b._count.orders} orders</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Add Branch</h3>
              <button onClick={() => setModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
              <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Branch Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Main Branch" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Address *</label>
                  <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder="Full street address" />
                </div>
                <div>
                  <label className="label">City *</label>
                  <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="e.g. Mumbai" />
                </div>
                <div>
                  <label className="label">State *</label>
                  <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required placeholder="e.g. Maharashtra" />
                </div>
                <div>
                  <label className="label">Pincode *</label>
                  <input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} required placeholder="400001" />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="branch@restaurant.com" />
                </div>
                <div />
                <div>
                  <label className="label">Opening Time</label>
                  <input type="time" className="input" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} />
                </div>
                <div>
                  <label className="label">Closing Time</label>
                  <input type="time" className="input" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

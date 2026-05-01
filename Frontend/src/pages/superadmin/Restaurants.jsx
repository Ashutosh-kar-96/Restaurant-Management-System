import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { authApi } from '../../api/auth.api';
import { Spinner, EmptyState, ConfirmDialog, SearchInput } from '../../components/ui';
import { ROLE_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';

const STAFF_ROLES = ['RESTAURANT_ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'CASHIER'];

export default function SARestaurants() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(false);
  const [deleteId,  setDeleteId]  = useState(null);
  const [form,      setForm]      = useState({ name: '', email: '', phone: '', city: '', gstin: '' });
  const [manageRest, setManageRest] = useState(null);
  const [manageTab,  setManageTab]  = useState('branches');
  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', city: '', state: '', pincode: '', phone: '', openTime: '09:00', closeTime: '23:00' });
  const [staffTab,   setStaffTab]   = useState('create');
  const [staffForm,  setStaffForm]  = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'MANAGER', branchId: '' });
  const [searchQ,    setSearchQ]    = useState('');
  const [selUser,    setSelUser]    = useState(null);
  const [assignForm, setAssignForm] = useState({ role: 'MANAGER', branchId: '' });

  const { data, isLoading } = useQuery({ queryKey: ['restaurants', search], queryFn: () => restaurantApi.getAll({ search, limit: 50 }) });
  const restaurants = data?.data?.data?.restaurants || [];

  const { data: brData } = useQuery({ queryKey: ['branches', manageRest?.id], queryFn: () => restaurantApi.getBranches(manageRest.id), enabled: !!manageRest });
  const { data: stData } = useQuery({ queryKey: ['staff', manageRest?.id], queryFn: () => restaurantApi.getStaff(manageRest.id), enabled: !!manageRest });
  const { data: userSearch, isFetching: searching } = useQuery({ queryKey: ['user-search', searchQ], queryFn: () => authApi.searchUsers(searchQ), enabled: searchQ.length >= 2, staleTime: 1000 });

  const branches   = brData?.data?.data  || [];
  const staff      = stData?.data?.data  || [];
  const foundUsers = userSearch?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (d) => restaurantApi.create(d),
    onSuccess: () => { qc.invalidateQueries(['restaurants']); setModal(false); setForm({ name:'', email:'', phone:'', city:'', gstin:'' }); toast.success('Restaurant created!'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => restaurantApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['restaurants']); setDeleteId(null); toast.success('Restaurant deleted'); },
  });
  const branchMutation = useMutation({
    mutationFn: (d) => restaurantApi.createBranch(manageRest.id, d),
    onSuccess: () => { qc.invalidateQueries(['branches', manageRest.id]); setBranchModal(false); setBranchForm({ name:'', address:'', city:'', state:'', pincode:'', phone:'' }); toast.success('Branch created!'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const createStaffMutation = useMutation({
    mutationFn: async (d) => {
      const regRes = await authApi.register({ firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone || undefined, password: d.password, role: d.role });
      const newUserId = regRes.data?.data?.user?.id;
      if (!newUserId) throw new Error('User creation failed');
      await restaurantApi.addStaff(manageRest.id, { userId: newUserId, role: d.role, branchId: d.branchId || undefined });
    },
    onSuccess: () => { qc.invalidateQueries(['staff', manageRest.id]); setStaffForm({ firstName:'', lastName:'', email:'', phone:'', password:'', role:'MANAGER', branchId:'' }); toast.success('Staff created!'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const assignStaffMutation = useMutation({
    mutationFn: (d) => restaurantApi.addStaff(manageRest.id, d),
    onSuccess: () => { qc.invalidateQueries(['staff', manageRest.id]); setSelUser(null); setSearchQ(''); setAssignForm({ role:'MANAGER', branchId:'' }); toast.success('Staff assigned!'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const removeStaffMutation = useMutation({
    mutationFn: (uid) => restaurantApi.removeStaff(manageRest.id, uid),
    onSuccess: () => { qc.invalidateQueries(['staff', manageRest.id]); toast.success('Staff removed'); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Restaurants</h1><p className="page-subtitle">Manage all restaurants on the platform</p></div>
        <button onClick={() => setModal(true)} className="btn-primary">+ Add Restaurant</button>
      </div>

      {/* Manage Panel */}
      {manageRest && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Managing: {manageRest.name}</h2>
              <p className="text-xs text-gray-400">{manageRest.city} · GSTIN: {manageRest.gstin || '—'}</p>
            </div>
            <button onClick={() => setManageRest(null)} className="btn-outline btn-sm">✕ Close</button>
          </div>
          <div className="flex gap-2 px-5 pt-3 border-b border-gray-100">
            <button onClick={() => setManageTab('branches')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${manageTab==='branches' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>Branches ({branches.length})</button>
            <button onClick={() => setManageTab('staff')}   className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${manageTab==='staff'    ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>Staff ({staff.length})</button>
          </div>

          {manageTab === 'branches' && (
            <div className="card-body">
              <div className="flex justify-end mb-3">
                <button onClick={() => setBranchModal(true)} className="btn-primary btn-sm">+ Add Branch</button>
              </div>
              {branches.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">🏪</p><p className="text-sm">No branches — add one first, then add staff</p></div>
              ) : (
                <div className="space-y-2">
                  {branches.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div><p className="font-medium text-gray-900">{b.name}</p><p className="text-xs text-gray-400">{b.city} · {b.address}</p></div>
                      <span className={`badge ${b.isActive ? 'badge-green' : 'badge-red'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {manageTab === 'staff' && (
            <div className="card-body">
              <div className="flex gap-2 mb-4">
                <button onClick={() => setStaffTab('create')} className={`btn btn-sm ${staffTab==='create' ? 'btn-primary' : 'btn-outline'}`}>+ Create New</button>
                <button onClick={() => setStaffTab('assign')} className={`btn btn-sm ${staffTab==='assign' ? 'btn-primary' : 'btn-outline'}`}>+ Assign Existing</button>
                <button onClick={() => setStaffTab('list')}   className={`btn btn-sm ${staffTab==='list'   ? 'btn-primary' : 'btn-outline'}`}>Staff List</button>
              </div>

              {staffTab === 'create' && (
                <div className="max-w-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="label">First Name *</label><input className="input" value={staffForm.firstName} onChange={(e) => setStaffForm({...staffForm, firstName: e.target.value})} placeholder="John" /></div>
                    <div><label className="label">Last Name</label><input className="input" value={staffForm.lastName} onChange={(e) => setStaffForm({...staffForm, lastName: e.target.value})} placeholder="Doe" /></div>
                  </div>
                  <div><label className="label">Email *</label><input type="email" className="input" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} placeholder="staff@restaurant.com" /></div>
                  <div><label className="label">Phone</label><input className="input" value={staffForm.phone} onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})} placeholder="+91 9876543210" /></div>
                  <div><label className="label">Password *</label><input type="password" className="input" value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} placeholder="Min. 6 characters" /></div>
                  <div><label className="label">Role *</label>
                    <select className="input" value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})}>
                      {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Assign to Branch</label>
                    <select className="input" value={staffForm.branchId} onChange={(e) => setStaffForm({...staffForm, branchId: e.target.value})}>
                      <option value="">All branches</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => {
                    if (!staffForm.firstName || !staffForm.email || !staffForm.password) return toast.error('Fill required fields');
                    if (staffForm.password.length < 6) return toast.error('Password min 6 characters');
                    createStaffMutation.mutate(staffForm);
                  }} disabled={createStaffMutation.isPending} className="btn-primary w-full">
                    {createStaffMutation.isPending ? 'Creating…' : 'Create Staff Member'}
                  </button>
                </div>
              )}

              {staffTab === 'assign' && (
                <div className="max-w-lg space-y-3">
                  <div>
                    <label className="label">Search User *</label>
                    <input className="input" value={searchQ} onChange={(e) => { setSearchQ(e.target.value); setSelUser(null); }} placeholder="Type email or name…" />
                    {searchQ.length >= 2 && (
                      <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {searching ? <div className="p-3 text-sm text-gray-400 text-center">Searching…</div>
                          : foundUsers.length === 0 ? <div className="p-3 text-sm text-gray-400 text-center">No users found</div>
                          : foundUsers.map((u) => (
                            <button key={u.id} type="button" onClick={() => { setSelUser(u); setSearchQ(`${u.firstName} ${u.lastName} (${u.email})`); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary-50 text-sm border-b border-gray-100 last:border-0">
                              <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                              <span className="ml-2 text-gray-400 text-xs">{u.email}</span>
                            </button>
                          ))}
                      </div>
                    )}
                    {selUser && (
                      <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="font-medium text-green-800">{selUser.firstName} {selUser.lastName}</span>
                        <span className="text-xs text-green-600">{selUser.email}</span>
                      </div>
                    )}
                  </div>
                  <div><label className="label">Role *</label>
                    <select className="input" value={assignForm.role} onChange={(e) => setAssignForm({...assignForm, role: e.target.value})}>
                      {STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label || r}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Branch</label>
                    <select className="input" value={assignForm.branchId} onChange={(e) => setAssignForm({...assignForm, branchId: e.target.value})}>
                      <option value="">All branches</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => {
                    if (!selUser) return toast.error('Select a user first');
                    assignStaffMutation.mutate({ userId: selUser.id, role: assignForm.role, branchId: assignForm.branchId || undefined });
                  }} disabled={assignStaffMutation.isPending || !selUser} className="btn-primary w-full">
                    {assignStaffMutation.isPending ? 'Assigning…' : 'Assign Staff'}
                  </button>
                </div>
              )}

              {staffTab === 'list' && (
                staff.length === 0 ? (
                  <div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">👥</p><p className="text-sm">No staff yet</p></div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead><tr><th>Staff</th><th>Role</th><th>Branch</th><th></th></tr></thead>
                      <tbody>
                        {staff.map((s) => (
                          <tr key={s.id}>
                            <td><p className="font-medium text-gray-900">{s.user?.firstName} {s.user?.lastName}</p><p className="text-xs text-gray-400">{s.user?.email}</p></td>
                            <td><span className={`badge ${ROLE_CONFIG[s.role]?.color || 'badge-gray'}`}>{ROLE_CONFIG[s.role]?.label || s.role}</span></td>
                            <td className="text-sm text-gray-600">{s.branch?.name || <span className="text-gray-400 italic">All branches</span>}</td>
                            <td><button onClick={() => { if (window.confirm(`Remove ${s.user?.firstName}?`)) removeStaffMutation.mutate(s.user?.id); }} className="text-xs text-red-500 hover:text-red-700">Remove</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Restaurants Table */}
      <div className="card">
        <div className="card-header">
          <SearchInput value={search} onChange={setSearch} placeholder="Search restaurants..." className="flex-1" />
        </div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div> : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Name</th><th>Contact</th><th>City</th><th>GSTIN</th><th>Branches</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {restaurants.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon="🏢" title="No restaurants" subtitle="Create your first restaurant" /></td></tr>
                ) : restaurants.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-sm">🏢</div>
                        <div><p className="font-medium text-gray-900">{r.name}</p><p className="text-xs text-gray-400">{r.slug}</p></div>
                      </div>
                    </td>
                    <td><p className="text-sm text-gray-700">{r.email}</p><p className="text-xs text-gray-400">{r.phone}</p></td>
                    <td className="text-gray-600">{r.city || '—'}</td>
                    <td className="text-xs text-gray-500 font-mono">{r.gstin || '—'}</td>
                    <td><span className="badge badge-blue">{r._count?.branches || 0}</span></td>
                    <td><span className={r.isActive ? 'badge badge-green' : 'badge badge-red'}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex items-center gap-3">
                        <button onClick={() => { setManageRest(r); setManageTab('branches'); setStaffTab('create'); }} className="text-xs text-primary-500 hover:text-primary-700 font-medium">Manage</button>
                        <button onClick={() => setDeleteId(r.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Branch Modal */}
      {branchModal && (
        <div className="modal-overlay" onClick={() => setBranchModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Add Branch — {manageRest?.name}</h3>
              <button onClick={() => setBranchModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="label">Branch Name *</label><input className="input" value={branchForm.name} onChange={(e) => setBranchForm({...branchForm, name: e.target.value})} placeholder="Main Branch" /></div>
              <div className="sm:col-span-2"><label className="label">Address *</label><input className="input" value={branchForm.address} onChange={(e) => setBranchForm({...branchForm, address: e.target.value})} placeholder="123 MG Road" /></div>
              <div><label className="label">City *</label><input className="input" value={branchForm.city} onChange={(e) => setBranchForm({...branchForm, city: e.target.value})} placeholder="Cuttack" /></div>
              <div><label className="label">State</label><input className="input" value={branchForm.state} onChange={(e) => setBranchForm({...branchForm, state: e.target.value})} placeholder="Odisha" /></div>
              <div><label className="label">Pincode</label><input className="input" value={branchForm.pincode} onChange={(e) => setBranchForm({...branchForm, pincode: e.target.value})} placeholder="753001" /></div>
              <div><label className="label">Phone</label><input className="input" value={branchForm.phone} onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})} placeholder="9876543210" /></div>
              <div><label className="label">Opening Time</label><input type="time" className="input" value={branchForm.openTime} onChange={(e) => setBranchForm({...branchForm, openTime: e.target.value})} /></div>
              <div><label className="label">Closing Time</label><input type="time" className="input" value={branchForm.closeTime} onChange={(e) => setBranchForm({...branchForm, closeTime: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBranchModal(false)} className="btn-outline">Cancel</button>
              <button onClick={() => {
                if (!branchForm.name || !branchForm.address || !branchForm.city || !branchForm.state || !branchForm.pincode || !branchForm.phone) return toast.error('Fill all required fields');
                branchMutation.mutate(branchForm);
              }} disabled={branchMutation.isPending} className="btn-primary">
                {branchMutation.isPending ? 'Creating…' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Restaurant Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Add Restaurant</h3>
              <button onClick={() => setModal(false)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}>
              <div className="modal-body grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="label">Restaurant Name *</label><input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
                <div><label className="label">Phone *</label><input className="input" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} required /></div>
                <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} /></div>
                <div><label className="label">GSTIN</label><input className="input" value={form.gstin} onChange={(e) => setForm({...form, gstin: e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">{createMutation.isPending ? <Spinner size="sm" /> : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} title="Delete Restaurant" message="Are you sure? This will deactivate the restaurant and all its data."
        onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} confirmText="Delete" danger />
    </div>
  );
}

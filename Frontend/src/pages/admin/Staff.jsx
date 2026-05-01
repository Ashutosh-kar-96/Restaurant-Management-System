import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { authApi } from '../../api/auth.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState } from '../../components/ui';
import { ROLE_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ASSIGNABLE_ROLES = ['MANAGER', 'WAITER', 'CHEF', 'CASHIER'];

export default function AdminStaff() {
  const qc                       = useQueryClient();
  const { restaurantId }         = useBranch();

  const [tab,          setTab]          = useState('list');
  const [searchQ,      setSearchQ]      = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [assignForm,   setAssignForm]   = useState({ role: 'WAITER', branchId: '' });
  const [createForm,   setCreateForm]   = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'WAITER', branchId: '' });
  const [editModal,    setEditModal]    = useState(null);
  const [editRole,     setEditRole]     = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['staff', restaurantId],
    queryFn:  () => restaurantApi.getStaff(restaurantId),
    enabled:  !!restaurantId,
  });
  const { data: brData } = useQuery({
    queryKey: ['branches', restaurantId],
    queryFn:  () => restaurantApi.getBranches(restaurantId),
    enabled:  !!restaurantId,
  });
  const { data: userSearch, isFetching: searching } = useQuery({
    queryKey: ['user-search', searchQ],
    queryFn:  () => authApi.searchUsers(searchQ),
    enabled:  searchQ.length >= 2,
    staleTime: 1000,
  });

  const staff      = data?.data?.data    || [];
  const branches   = brData?.data?.data  || [];
  const foundUsers = userSearch?.data?.data || [];

  const addMutation = useMutation({
    mutationFn: (d) => restaurantApi.addStaff(restaurantId, d),
    onSuccess: () => {
      qc.invalidateQueries(['staff']);
      setTab('list');
      setSelectedUser(null);
      setSearchQ('');
      setAssignForm({ role: 'WAITER', branchId: '' });
      toast.success('Staff member added!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to add staff'),
  });

  const createMutation = useMutation({
    mutationFn: async (d) => {
      const regRes = await authApi.register({
        firstName: d.firstName, lastName: d.lastName,
        email: d.email, phone: d.phone || undefined,
        password: d.password, role: d.role,
      });
      const newUserId = regRes.data?.data?.user?.id;
      if (!newUserId) throw new Error('User creation failed');
      await restaurantApi.addStaff(restaurantId, {
        userId: newUserId, role: d.role, branchId: d.branchId || undefined,
      });
      return regRes;
    },
    onSuccess: () => {
      qc.invalidateQueries(['staff']);
      setTab('list');
      setCreateForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'WAITER', branchId: '' });
      toast.success('Staff member created and added!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create staff'),
  });

  const removeMutation = useMutation({
    mutationFn: (uid) => restaurantApi.removeStaff(restaurantId, uid),
    onSuccess:  () => { qc.invalidateQueries(['staff']); toast.success('Staff removed'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role, branchId }) =>
      restaurantApi.updateStaffRole(restaurantId, userId, { role, branchId }),
    onSuccess: () => {
      qc.invalidateQueries(['staff']);
      setEditModal(null);
      toast.success('Role updated!');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update role'),
  });

  // Guard — restaurantId missing
  if (!restaurantId) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="font-semibold text-gray-700">Restaurant not linked to your account</p>
        <p className="text-gray-400 text-sm mt-1">Please log out and log back in, or contact Super Admin to fix your account.</p>
      </div>
    );
  }

  const handleAssign = (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('Select a user first');
    addMutation.mutate({ userId: selectedUser.id, role: assignForm.role, branchId: assignForm.branchId || undefined });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.firstName || !createForm.email || !createForm.password)
      return toast.error('Fill all required fields');
    if (createForm.password.length < 6)
      return toast.error('Password must be at least 6 characters');
    createMutation.mutate(createForm);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{staff.length} member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('list')}   className={`btn btn-sm ${tab === 'list'   ? 'btn-primary' : 'btn-outline'}`}>Staff List</button>
          <button onClick={() => setTab('assign')} className={`btn btn-sm ${tab === 'assign' ? 'btn-primary' : 'btn-outline'}`}>+ Assign Existing</button>
          <button onClick={() => setTab('create')} className={`btn btn-sm ${tab === 'create' ? 'btn-primary' : 'btn-outline'}`}>+ Create New</button>
        </div>
      </div>

      {/* STAFF LIST */}
      {tab === 'list' && (
        <div className="card">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>
          ) : staff.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-5xl mb-3">👥</div>
              <p className="font-semibold text-gray-700 mb-1">No staff members yet</p>
              <p className="text-gray-400 text-sm mb-4">Use the buttons above to add or create staff</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setTab('assign')} className="btn-outline btn-sm">Assign Existing User</button>
                <button onClick={() => setTab('create')} className="btn-primary btn-sm">Create New Account</button>
              </div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Staff Member</th><th>Role</th><th>Branch</th><th>Actions</th></tr></thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {s.user?.firstName?.[0]}{s.user?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{s.user?.firstName} {s.user?.lastName}</p>
                            <p className="text-xs text-gray-400">{s.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_CONFIG[s.role]?.color || 'badge-gray'}`}>{ROLE_CONFIG[s.role]?.label || s.role}</span></td>
                      <td className="text-sm text-gray-600">{s.branch?.name || <span className="text-gray-400 italic">All branches</span>}</td>
                      <td>
                        <div className="flex gap-3">
                          <button onClick={() => { setEditModal(s); setEditRole(s.role); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Edit Role</button>
                          <button
                            onClick={() => { if (window.confirm(`Remove ${s.user?.firstName} from staff?`)) removeMutation.mutate(s.user?.id); }}
                            disabled={removeMutation.isPending}
                            className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSIGN EXISTING USER */}
      {tab === 'assign' && (
        <div className="card max-w-xl">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Assign Existing User as Staff</h2></div>
          <form onSubmit={handleAssign}>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Search User by Email or Name *</label>
                <input className="input" value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); setSelectedUser(null); }}
                  placeholder="Type at least 2 characters…" />
                {searchQ.length >= 2 && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {searching ? (
                      <div className="p-3 text-center text-sm text-gray-400">Searching…</div>
                    ) : foundUsers.length === 0 ? (
                      <div className="p-3 text-center text-sm text-gray-400">No users found</div>
                    ) : foundUsers.map((u) => (
                      <button key={u.id} type="button"
                        onClick={() => { setSelectedUser(u); setSearchQ(`${u.firstName} ${u.lastName} (${u.email})`); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary-50 transition-colors text-sm border-b border-gray-100 last:border-0">
                        <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                        <span className="ml-2 text-gray-400 text-xs">{u.email}</span>
                        <span className={`ml-2 badge text-xs ${ROLE_CONFIG[u.role]?.color || 'badge-gray'}`}>{ROLE_CONFIG[u.role]?.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm font-medium text-green-800">{selectedUser.firstName} {selectedUser.lastName}</span>
                    <span className="text-xs text-green-600">{selectedUser.email}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Assign Role *</label>
                <select className="input" value={assignForm.role} onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}>
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Assign to Branch</label>
                <select className="input" value={assignForm.branchId} onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}>
                  <option value="">All branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Leave blank to allow access to all branches</p>
              </div>
            </div>
            <div className="card-footer flex justify-end gap-2">
              <button type="button" onClick={() => setTab('list')} className="btn-outline">Cancel</button>
              <button type="submit" disabled={addMutation.isPending || !selectedUser} className="btn-primary">
                {addMutation.isPending ? 'Adding…' : 'Assign Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE NEW STAFF */}
      {tab === 'create' && (
        <div className="card max-w-xl">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Create New Staff Account</h2>
            <p className="text-xs text-gray-400 mt-0.5">Creates a login account and adds them as staff immediately</p>
          </div>
          <form onSubmit={handleCreate}>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name *</label>
                  <input className="input" value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="John" required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input className="input" value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input className="input" type="email" value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="john@yourrestaurant.com" required />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" type="tel" value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="label">Password *</label>
                <input className="input" type="password" value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Min. 6 characters" required minLength={6} />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Assign to Branch</label>
                <select className="input" value={createForm.branchId}
                  onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })}>
                  <option value="">All branches</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="card-footer flex justify-end gap-2">
              <button type="button" onClick={() => setTab('list')} className="btn-outline">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                {createMutation.isPending ? 'Creating…' : 'Create Staff Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Role Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Edit Role</h3>
              <button onClick={() => setEditModal(null)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {editModal.user?.firstName?.[0]}{editModal.user?.lastName?.[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{editModal.user?.firstName} {editModal.user?.lastName}</p>
                  <p className="text-xs text-gray-400">{editModal.user?.email}</p>
                </div>
              </div>
              <div>
                <label className="label">New Role</label>
                <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_CONFIG[r]?.label}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditModal(null)} className="btn-outline">Cancel</button>
              <button
                onClick={() => updateRoleMutation.mutate({ userId: editModal.user?.id, role: editRole, branchId: editModal.branchId })}
                disabled={updateRoleMutation.isPending} className="btn-primary">
                {updateRoleMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

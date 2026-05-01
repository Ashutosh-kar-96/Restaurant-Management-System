import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth.api';
import { Spinner, EmptyState, SearchInput, Pagination } from '../../components/ui';
import { ROLE_CONFIG } from '../../utils/formatters';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function SAUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [role,   setRole]   = useState('');
  const [page,   setPage]   = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, role, page],
    queryFn:  () => authApi.getAllUsers({ search, role, page, limit: 20 }),
  });
  const users = data?.data?.data?.users || [];
  const total = data?.data?.data?.total || 0;
  const pages = Math.ceil(total / 20);

  const toggleMutation = useMutation({
    mutationFn: (id) => authApi.toggleUser(id),
    onSuccess:  () => { qc.invalidateQueries(['users']); toast.success('User status updated'); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Users</h1><p className="page-subtitle">All platform users — {total} total</p></div>
      </div>

      <div className="card">
        <div className="card-header flex flex-col sm:flex-row gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name or email..." className="flex-1" />
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="input w-full sm:w-48">
            <option value="">All Roles</option>
            {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-500" /></div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState icon="👥" title="No users found" /></td></tr>
                ) : users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">{u.firstName[0]}{u.lastName[0]}</div>
                        <div><p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_CONFIG[u.role]?.color || 'badge-gray'}`}>{ROLE_CONFIG[u.role]?.label || u.role}</span></td>
                    <td className="text-sm text-gray-500">{formatDate(u.createdAt)}</td>
                    <td><span className={u.isActive ? 'badge badge-green' : 'badge badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button onClick={() => toggleMutation.mutate(u.id)} disabled={toggleMutation.isPending}
                        className={`text-xs font-medium ${u.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4"><Pagination page={page} pages={pages} onPageChange={setPage} /></div>
      </div>
    </div>
  );
}

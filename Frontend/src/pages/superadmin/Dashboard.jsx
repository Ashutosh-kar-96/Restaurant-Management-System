// pages/superadmin/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { authApi } from '../../api/auth.api';
import { StatCard, Spinner, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/formatters';

export default function SADashboard() {
  const { data: restData, isLoading: rLoading } = useQuery({ queryKey: ['restaurants'], queryFn: () => restaurantApi.getAll({ limit: 100 }) });
  const { data: userData, isLoading: uLoading } = useQuery({ queryKey: ['users-all'], queryFn: () => authApi.getAllUsers({ limit: 100 }) });

  const restaurants = restData?.data?.data?.restaurants || [];
  const users       = userData?.data?.data?.users || [];

  if (rLoading || uLoading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;

  const roleCount = (role) => users.filter((u) => u.role === role).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Platform-wide overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="🏢" label="Total Restaurants" value={restaurants.length} color="bg-blue-50 text-blue-500" />
        <StatCard icon="✅" label="Active Restaurants" value={restaurants.filter((r) => r.isActive).length} color="bg-green-50 text-green-500" />
        <StatCard icon="👥" label="Total Users" value={users.length} color="bg-purple-50 text-purple-500" />
        <StatCard icon="👨‍💼" label="Staff Members" value={users.filter((u) => u.role !== 'CUSTOMER').length} color="bg-orange-50 text-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Restaurants Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">All Restaurants</h2>
            <span className="badge badge-blue">{restaurants.length}</span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Name</th><th>City</th><th>Status</th><th>Branches</th></tr></thead>
              <tbody>
                {restaurants.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No restaurants yet</td></tr>
                ) : restaurants.map((r) => (
                  <tr key={r.id}>
                    <td><p className="font-medium text-gray-900">{r.name}</p><p className="text-xs text-gray-400">{r.email}</p></td>
                    <td className="text-gray-600">{r.city || '—'}</td>
                    <td><span className={r.isActive ? 'badge-green' : 'badge-red'}>{r.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-gray-600">{r._count?.branches || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">User Roles</h2></div>
          <div className="card-body space-y-3">
            {['RESTAURANT_ADMIN','MANAGER','WAITER','CHEF','CASHIER','CUSTOMER'].map((role) => {
              const count = roleCount(role);
              const pct   = users.length ? Math.round((count / users.length) * 100) : 0;
              const labels = { RESTAURANT_ADMIN:'Restaurant Admin', MANAGER:'Manager', WAITER:'Waiter', CHEF:'Chef', CASHIER:'Cashier', CUSTOMER:'Customer' };
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{labels[role]}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

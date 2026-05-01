import { useQuery } from '@tanstack/react-query';
import { restaurantApi } from '../../api/restaurant.api';
import { analyticsApi } from '../../api/analytics.api';
import { useBranch } from '../../hooks/useAuth';
import { StatCard, Spinner } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboard() {
  const { restaurantId, branchId } = useBranch();
  const today = new Date().toISOString().split('T')[0];

  const { data: branchData } = useQuery({
    queryKey: ['branches', restaurantId],
    queryFn:  () => restaurantApi.getBranches(restaurantId),
    enabled:  !!restaurantId,
  });

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', branchId, today],
    queryFn:  () => analyticsApi.getDashboard(branchId, today),
    enabled:  !!branchId,
    refetchInterval: 30000,
  });

  const branches = branchData?.data?.data || [];
  const dash     = dashData?.data?.data;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Your restaurant overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="🏪" label="Total Branches"  value={branches.length}                      color="bg-blue-50 text-blue-500" />
        <StatCard icon="🧾" label="Today's Orders"  value={dash?.totalOrders || 0}               color="bg-orange-50 text-orange-500" />
        <StatCard icon="💰" label="Today's Revenue" value={formatCurrency(dash?.totalRevenue)}   color="bg-green-50 text-green-500" />
        <StatCard icon="🔄" label="Active Orders"   value={dash?.activeOrders || 0}              color="bg-purple-50 text-purple-500" />
      </div>

      <div className="card">
        <div className="card-header"><h2 className="font-semibold text-gray-900">Branches</h2></div>
        <div className="divide-y divide-gray-50">
          {branches.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No branches yet</p>
          ) : branches.map((b) => (
            <div key={b.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-400">{b.city} · {b.openTime}–{b.closeTime}</p>
              </div>
              <span className={`badge ${b.isActive ? 'badge-green' : 'badge-red'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

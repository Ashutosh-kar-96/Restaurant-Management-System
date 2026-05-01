// pages/waiter/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../../api/order.api';
import { tableApi } from '../../api/table.api';
import { useBranch } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import { StatCard, Spinner } from '../../components/ui';
import { ORDER_STATUS_CONFIG, TABLE_STATUS_CONFIG, timeAgo, formatCurrency } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function WaiterDashboard() {
  const { branchId } = useBranch();
  const { user }     = useSelector((s) => s.auth);

  const { data: ordersData } = useQuery({
    queryKey:        ['my-orders', branchId, user?.userId],
    queryFn:         () => orderApi.getAll(branchId, { limit: 10 }),
    enabled:         !!branchId,
    refetchInterval: 15000,
  });

  const { data: tablesData } = useQuery({
    queryKey:        ['tables', branchId],
    queryFn:         () => tableApi.getAll(branchId),
    enabled:         !!branchId,
    refetchInterval: 20000,
  });

  const orders = ordersData?.data?.data?.orders || [];
  const tables = tablesData?.data?.data || [];

  const activeOrders   = orders.filter((o) => !['SERVED','CANCELLED','REFUNDED'].includes(o.status));
  const readyOrders    = orders.filter((o) => o.status === 'READY');
  const availableTables = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedTables  = tables.filter((t) => t.status === 'OCCUPIED').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Hello, {user?.firstName}! 👋</h1>
        <p className="page-subtitle">Here's your station overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon="🔄" label="Active Orders" value={activeOrders.length} color="bg-orange-50 text-orange-500" />
        <StatCard icon="🔔" label="Ready to Serve" value={readyOrders.length} color="bg-green-50 text-green-500" />
        <StatCard icon="✅" label="Available Tables" value={availableTables} color="bg-blue-50 text-blue-500" />
        <StatCard icon="🪑" label="Occupied Tables" value={occupiedTables} color="bg-red-50 text-red-500" />
      </div>

      {readyOrders.length > 0 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-4">
          <h2 className="font-bold text-green-800 mb-3">🔔 Ready to Serve ({readyOrders.length})</h2>
          <div className="space-y-2">
            {readyOrders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">#{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">Table {o.table?.number || '—'}</p>
                </div>
                <span className="badge badge-green animate-pulse-soft">READY</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/waiter/orders" className="text-xs text-primary-500 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeOrders.slice(0, 6).map((o) => {
              const cfg = ORDER_STATUS_CONFIG[o.status] || {};
              return (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-gray-900">#{o.orderNumber}</p><p className="text-xs text-gray-400">Table {o.table?.number || '—'} · {timeAgo(o.createdAt)}</p></div>
                  <span className={`badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                </div>
              );
            })}
            {activeOrders.length === 0 && <p className="text-center text-gray-400 text-sm py-8">No active orders</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Table Status</h2>
            <Link to="/waiter/tables" className="text-xs text-primary-500 hover:underline">View all</Link>
          </div>
          <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tables.slice(0, 12).map((t) => {
              const cfg = TABLE_STATUS_CONFIG[t.status] || {};
              return (
                <div key={t.id} className={`border rounded-xl p-2 text-center text-sm ${cfg.color} ${cfg.border}`}>
                  <p className="font-bold">T{t.number}</p>
                  <p className="text-xs opacity-70">{t.capacity}p</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

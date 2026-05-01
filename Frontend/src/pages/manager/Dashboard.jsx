import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analytics.api';
import { orderApi } from '../../api/order.api';
import { useBranch } from '../../hooks/useAuth';
import { StatCard, Spinner } from '../../components/ui';
import { formatCurrency, ORDER_STATUS_CONFIG, timeAgo } from '../../utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const today      = new Date().toISOString().split('T')[0];
const weekAgo    = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
const PIE_COLORS = ['#FF6B35', '#1A1A2E', '#22C55E', '#F59E0B', '#3B82F6'];

export default function ManagerDashboard() {
  const { branchId } = useBranch();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ['dashboard', branchId, today],
    queryFn:  () => analyticsApi.getDashboard(branchId, today),
    enabled:  !!branchId,
    refetchInterval: 30000,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['recent-orders', branchId],
    queryFn:  () => orderApi.getAll(branchId, { limit: 8 }),
    enabled:  !!branchId,
    refetchInterval: 15000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['revenue-week', branchId],
    queryFn:  () => analyticsApi.getRevenue(branchId, { startDate: weekAgo, endDate: today }),
    enabled:  !!branchId,
    refetchInterval: 60000,
  });

  const dash    = dashData?.data?.data;
  const orders  = ordersData?.data?.data?.orders || [];
  const revenue = revenueData?.data?.data;

  // weeklyRevenue is now [{ date, revenue }] from fixed backend
  const weeklyChartData = (revenue?.weeklyRevenue || []).map((d) => ({
    day:     new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
    revenue: d.revenue,
  }));

  // byPaymentMode is [{ paymentMode, _sum: { totalAmount } }]
  const paymentPieData = (revenue?.byPaymentMode || []).map((p) => ({
    name:  p.paymentMode,
    value: parseFloat(p._sum?.totalAmount || 0),
  })).filter((p) => p.value > 0);

  if (isLoading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>
  );

  if (!branchId) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500">No branch assigned. Contact your administrator.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Live
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="🧾" label="Today's Orders"  value={dash?.totalOrders  || 0}                  color="bg-blue-50 text-blue-500" />
        <StatCard icon="💰" label="Today's Revenue" value={formatCurrency(dash?.totalRevenue)}        color="bg-green-50 text-green-500" />
        <StatCard icon="🔄" label="Active Orders"   value={dash?.activeOrders || 0}                  color="bg-orange-50 text-orange-500" />
        <StatCard icon="📊" label="Avg Order Value" value={formatCurrency(dash?.avgOrderValue)}       color="bg-purple-50 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Revenue Bar Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Weekly Revenue</h2></div>
          <div className="card-body">
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-3xl">📊</span>
                <p className="text-sm">No revenue data this week yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Mode Pie */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Payment Modes</h2></div>
          <div className="card-body flex flex-col items-center">
            {paymentPieData.length > 0 ? (
              <>
                <PieChart width={180} height={180}>
                  <Pie data={paymentPieData} cx={90} cy={90} innerRadius={50} outerRadius={80} dataKey="value">
                    {paymentPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-2 w-full mt-2">
                  {paymentPieData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i] }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(p.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-3xl">💳</span>
                <p className="text-sm">No payments this week</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Top Items Today</h2></div>
          <div className="card-body space-y-3">
            {(dash?.topItems || []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No orders today</p>
              </div>
            ) : dash.topItems.map((item, i) => (
              <div key={item.id || i} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{item.name}</p></div>
                <span className="badge badge-orange">{item.quantitySold} sold</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Recent Orders</h2></div>
          <div className="divide-y divide-gray-50">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No orders yet</p>
              </div>
            ) : orders.map((o) => {
              const cfg = ORDER_STATUS_CONFIG[o.status] || {};
              return (
                <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{o.orderNumber}</p>
                    <p className="text-xs text-gray-400">
                      {o.table ? `Table ${o.table.number}` : o.orderType} · {timeAgo(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${cfg.color}`}>{cfg.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(o.totalAmount)}</p>
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

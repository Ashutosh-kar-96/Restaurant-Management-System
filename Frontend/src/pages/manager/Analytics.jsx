import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analytics.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#FF6B35', '#1A1A2E', '#22C55E', '#F59E0B', '#3B82F6'];

const getRange = (days) => {
  const endDate   = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  return { startDate, endDate };
};

export default function ManagerAnalytics() {
  const { branchId } = useBranch();
  const [range, setRange] = useState(7);

  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ['revenue', branchId, range],
    queryFn:  () => analyticsApi.getRevenue(branchId, getRange(range)),
    enabled:  !!branchId,
  });

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['staff-perf', branchId, range],
    queryFn:  () => analyticsApi.getStaffPerformance(branchId, getRange(range)),
    enabled:  !!branchId,
  });

  const { data: invData } = useQuery({
    queryKey: ['inv-report', branchId],
    queryFn:  () => analyticsApi.getInventoryReport(branchId),
    enabled:  !!branchId,
  });

  const revenue   = revData?.data?.data;
  const staff     = staffData?.data?.data || [];
  const invReport = invData?.data?.data;

  // weeklyRevenue is now [{ date, revenue }]
  const weeklyData = (revenue?.weeklyRevenue || []).map((d) => ({
    date:    new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    revenue: d.revenue,
  }));

  // byPaymentMode is [{ paymentMode, _sum: { totalAmount } }]
  const payPieData = (revenue?.byPaymentMode || []).map((p) => ({
    name:  p.paymentMode,
    value: parseFloat(p._sum?.totalAmount || 0),
  })).filter((p) => p.value > 0);

  if (!branchId) return (
    <div className="card p-8 text-center">
      <p className="text-gray-500">No branch assigned. Contact your administrator.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Analytics</h1><p className="page-subtitle">Business insights and performance metrics</p></div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setRange(d)} className={`btn btn-sm ${range === d ? 'btn-primary' : 'btn-outline'}`}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Revenue Trend — Last {range} Days</h2>
          {revenue?.totalRevenue > 0 && (
            <span className="text-sm font-semibold text-green-600">{formatCurrency(revenue.totalRevenue)} total</span>
          )}
        </div>
        <div className="card-body">
          {revLoading ? (
            <div className="h-56 flex items-center justify-center"><Spinner className="text-primary-500" /></div>
          ) : weeklyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5}
                  dot={{ fill: '#FF6B35', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
              <span className="text-3xl">📈</span>
              <p className="text-sm">No revenue data for the selected period</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Breakdown */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Payment Breakdown</h2></div>
          <div className="card-body flex flex-col items-center">
            {payPieData.length > 0 ? (
              <>
                <PieChart width={200} height={200}>
                  <Pie data={payPieData} cx={100} cy={100} outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {payPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
                <div className="w-full mt-2 space-y-2">
                  {payPieData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(p.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                <span className="text-3xl">💳</span>
                <p className="text-sm">No payment data for this period</p>
              </div>
            )}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Staff Performance</h2></div>
          <div className="card-body space-y-3">
            {staffLoading ? (
              <div className="flex justify-center py-6"><Spinner className="text-primary-500" /></div>
            ) : staff.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No staff performance data for this period</p>
              </div>
            ) : (
              <>
                {staff.filter(s => s.waiter?.id).map((s, i) => (
                  <div key={s.waiter?.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{s.waiter?.firstName} {s.waiter?.lastName}</p>
                      <p className="text-xs text-gray-400">{s.orders} order{s.orders !== 1 ? 's' : ''} served</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(s.revenue)}</p>
                    </div>
                  </div>
                ))}
                {/* Bar chart summary */}
                {staff.filter(s => s.waiter?.id).length > 1 && (
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={staff.filter(s => s.waiter?.id).slice(0, 5).map(s => ({
                      name: s.waiter?.firstName,
                      revenue: s.revenue,
                    }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="revenue" fill="#FF6B35" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Health */}
      {invReport && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-gray-900">Inventory Health</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Items',  value: invReport.summary?.total,      color: 'text-gray-900'   },
                { label: 'Low Stock',    value: invReport.summary?.lowStock,    color: 'text-yellow-600' },
                { label: 'Critical',     value: invReport.summary?.critical,    color: 'text-red-600'    },
                { label: 'Out of Stock', value: invReport.summary?.outOfStock,  color: 'text-red-700'    },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value || 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {invReport.items?.filter(i => i.alertLevel !== 'NORMAL').length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Items Needing Attention</h3>
                <div className="space-y-2">
                  {invReport.items.filter(i => i.alertLevel !== 'NORMAL').slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-400">{parseFloat(item.currentStock).toFixed(2)} {item.unit} remaining</p>
                      </div>
                      <span className={`badge text-xs ${
                        item.alertLevel === 'OUT_OF_STOCK' ? 'badge-red' :
                        item.alertLevel === 'CRITICAL'     ? 'badge-red' : 'badge-yellow'
                      }`}>{item.alertLevel.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

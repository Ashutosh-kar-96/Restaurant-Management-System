import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/analytics.api';
import { restaurantApi } from '../../api/restaurant.api';
import { Spinner } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#FF6B35','#1A1A2E','#22C55E','#F59E0B','#3B82F6','#8B5CF6'];

const getRange = (days) => {
  const endDate   = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().split('T')[0];
  return { startDate, endDate };
};

export default function SARevenue() {
  const [range,    setRange]    = useState(30);
  const [restFilter, setRestFilter] = useState('');

  const { data: restData } = useQuery({
    queryKey: ['restaurants'],
    queryFn:  () => restaurantApi.getAll({ limit: 100 }),
  });

  const params = { ...getRange(range), ...(restFilter ? { restaurantId: restFilter } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['platform-revenue', range, restFilter],
    queryFn:  () => analyticsApi.getPlatformRevenue(params),
    refetchInterval: 60000,
  });

  const restaurants = restData?.data?.data?.restaurants || [];
  const rev         = data?.data?.data;

  const dailyData   = (rev?.dailyRevenue   || []).map((d) => ({
    date:    new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    revenue: d.revenue,
  }));
  const branchData   = (rev?.byBranch      || []).slice(0, 10);
  const payModeData  = (rev?.byPaymentMode || []).map((p) => ({ name: p.mode, value: p.amount }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Revenue</h1>
          <p className="page-subtitle">Revenue across all restaurants and branches</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="input w-auto text-sm"
            value={restFilter}
            onChange={(e) => setRestFilter(e.target.value)}
          >
            <option value="">All Restaurants</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div className="flex gap-1">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`btn btn-sm ${range === d ? 'btn-primary' : 'btn-outline'}`}
              >{d}D</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: '💰', label: 'Total Revenue',    value: formatCurrency(rev?.totalRevenue),  color: 'bg-green-50 text-green-600'  },
          { icon: '🧾', label: 'Transactions',      value: rev?.transactions ?? '—',           color: 'bg-blue-50 text-blue-600'    },
          { icon: '🏪', label: 'Active Branches',   value: rev?.byBranch?.length ?? '—',      color: 'bg-orange-50 text-orange-600'},
          { icon: '📊', label: 'Avg per Branch',    value: rev?.byBranch?.length
              ? formatCurrency((rev.totalRevenue || 0) / rev.byBranch.length)
              : '—',                                                                            color: 'bg-purple-50 text-purple-600'},
        ].map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? <span className="text-gray-300">—</span> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Daily Revenue Trend</h2>
          {rev?.totalRevenue > 0 && (
            <span className="text-sm font-semibold text-green-600">{formatCurrency(rev.totalRevenue)} total</span>
          )}
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="h-56 flex items-center justify-center"><Spinner className="text-primary-500" /></div>
          ) : dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                <Line
                  type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2.5}
                  dot={{ fill: '#FF6B35', r: 4 }} activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
              <span className="text-4xl">📈</span>
              <p className="text-sm">No revenue data for the selected period</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Revenue Breakdown */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Revenue by Branch</h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner className="text-primary-500" /></div>
            ) : branchData.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No branch data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={branchData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="branchName" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />
                    <Bar dataKey="revenue" fill="#FF6B35" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 divide-y divide-gray-50">
                  {branchData.map((b, i) => (
                    <div key={b.branchId} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary-100 text-primary-600 rounded-full text-xs flex items-center justify-center font-bold">{i+1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{b.branchName}</p>
                          <p className="text-xs text-gray-400">{b.restaurantName} · {b.transactions} txns</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(b.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Mode Breakdown */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Payment Mode Split</h2>
          </div>
          <div className="card-body flex flex-col items-center">
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner className="text-primary-500" /></div>
            ) : payModeData.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No payment data</div>
            ) : (
              <>
                <PieChart width={220} height={220}>
                  <Pie
                    data={payModeData} cx={110} cy={110} outerRadius={85} innerRadius={40}
                    dataKey="value" paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {payModeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
                <div className="w-full mt-2 space-y-2">
                  {payModeData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-700">{p.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatCurrency(p.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Restaurant Summary Table */}
      {(rev?.byRestaurant || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">Restaurant Summary</h2>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Restaurant</th>
                  <th>Branches</th>
                  <th>Transactions</th>
                  <th className="text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rev.byRestaurant.map((r, i) => (
                  <tr key={r.restaurantName}>
                    <td className="text-gray-400 text-sm">{i + 1}</td>
                    <td className="font-medium text-gray-900">{r.restaurantName}</td>
                    <td className="text-gray-600">{r.branches}</td>
                    <td className="text-gray-600">{r.transactions}</td>
                    <td className="text-right font-bold text-gray-900">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

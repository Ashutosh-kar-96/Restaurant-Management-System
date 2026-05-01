// pages/cashier/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../../api/order.api';
import { billingApi } from '../../api/billing.api';
import { useBranch } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui';
import { formatCurrency, ORDER_STATUS_CONFIG, timeAgo } from '../../utils/formatters';
import { Link } from 'react-router-dom';

export default function CashierDashboard() {
  const { branchId } = useBranch();
  const today = new Date().toISOString().split('T')[0];

  const { data: readyData } = useQuery({ queryKey:['ready-orders',branchId], queryFn:()=>orderApi.getAll(branchId,{status:'READY',limit:20}), enabled:!!branchId, refetchInterval:12000 });
  const { data: payData }   = useQuery({ queryKey:['payments-today',branchId], queryFn:()=>billingApi.getPayments(branchId,{date:today}), enabled:!!branchId });

  const readyOrders = readyData?.data?.data?.orders || [];
  const summary     = payData?.data?.data?.summary  || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="page-title">Cashier Station</h1><p className="page-subtitle">Today — {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="🔔" label="Awaiting Payment" value={readyOrders.length} color="bg-orange-50 text-orange-500" />
        <StatCard icon="💰" label="Today's Revenue"  value={formatCurrency(summary.totalRevenue)} color="bg-green-50 text-green-500" />
        <StatCard icon="🧾" label="Transactions"     value={summary.transactions || 0} color="bg-blue-50 text-blue-500" />
      </div>

      {readyOrders.length > 0 ? (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">🔔 Pending Collections</h2>
            <Link to="/cashier/billing" className="btn-primary btn-sm">Open Billing</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {readyOrders.map((o) => (
              <div key={o.id} className="px-5 py-4 flex items-center justify-between hover:bg-green-50 transition-colors">
                <div><p className="font-semibold text-gray-900">#{o.orderNumber}</p><p className="text-xs text-gray-400">Table {o.table?.number||'—'} · {timeAgo(o.createdAt)}</p></div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-900">{formatCurrency(o.totalAmount)}</p>
                  <Link to="/cashier/billing" className="btn-success btn-sm">Collect</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center"><div className="text-5xl mb-3">✅</div><p className="text-lg font-semibold text-gray-700">All clear!</p><p className="text-gray-400 text-sm">No pending payments</p></div>
      )}
    </div>
  );
}

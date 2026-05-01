import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/order.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState } from '../../components/ui';
import { ORDER_STATUS_CONFIG, formatCurrency, timeAgo, getNextStatuses } from '../../utils/formatters';
import toast from 'react-hot-toast';

// Helper: get today's date as YYYY-MM-DD string
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Helper: get date N days ago as YYYY-MM-DD string
const getDaysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

// Helper: check if a date string (ISO) is today
const isToday = (isoStr) => {
  const d = new Date(isoStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};

export default function WaiterOrders() {
  const qc = useQueryClient();
  const { branchId } = useBranch();
  const [show7Days, setShow7Days] = useState(false);

  // Today's orders — pass today's date so backend filters correctly
  const { data, isLoading, error } = useQuery({
    queryKey: ['waiter-orders', branchId],
    queryFn:  () => orderApi.getAll(branchId, { limit: 100, date: getTodayStr() }),
    enabled:  !!branchId,
    refetchInterval: 10000,
  });

  // Last 7 days orders (only fetched when toggle clicked) — pass from/to date range
  const { data: data7, isLoading: isLoading7 } = useQuery({
    queryKey: ['waiter-orders-7d', branchId],
    queryFn:  () =>
      orderApi.getAll(branchId, {
        limit: 300,
        from: getDaysAgoStr(7),
        to:   getTodayStr(),
      }),
    enabled:  !!branchId && show7Days,
    staleTime: 60_000, // 1 min cache — historical data rarely changes
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, { status }),
    onSuccess:  () => { qc.invalidateQueries(['waiter-orders']); toast.success('Order updated'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed to update order'),
  });

  if (!branchId) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-700 font-medium">No branch assigned to your account.</p>
        <p className="text-gray-400 text-sm mt-1">Please contact your manager to assign you to a branch.</p>
      </div>
    );
  }

  const orders  = data?.data?.data?.orders || [];
  const active  = orders.filter((o) => !['SERVED', 'CANCELLED', 'REFUNDED'].includes(o.status));
  // "Completed Today" = today's served/cancelled — client-side guard in case backend returns extras
  const done    = orders.filter(
    (o) => ['SERVED', 'CANCELLED'].includes(o.status) && isToday(o.createdAt)
  );

  // Last 7 days: all orders from the 7d query, separated into today vs previous days
  const allOrders7d = data7?.data?.data?.orders || [];
  const todayOrders7d   = allOrders7d.filter((o) => isToday(o.createdAt));
  const prevOrders7d    = allOrders7d.filter((o) => !isToday(o.createdAt));

  // Today's completed from 7d query (may include active ones too)
  const todayDone7d = todayOrders7d.filter((o) =>
    ['SERVED', 'CANCELLED', 'REFUNDED'].includes(o.status)
  );

  // Merge today's done: prefer the real-time `done` list, supplement with any extras from 7d fetch
  const todayDoneIds = new Set(done.map((o) => o.id));
  const mergedTodayDone = [
    ...done,
    ...todayDone7d.filter((o) => !todayDoneIds.has(o.id)),
  ];

  // Group previous-days orders by date label
  const grouped7d = prevOrders7d.reduce((acc, o) => {
    const dateKey = new Date(o.createdAt).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(o);
    return acc;
  }, {});

  const OrderCard = ({ o, muted = false }) => {
    const cfg   = ORDER_STATUS_CONFIG[o.status] || {};
    const nexts = getNextStatuses(o.status).filter((s) => s !== 'CANCELLED');
    return (
      <div className={`order-card ${muted ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">#{o.orderNumber}</span>
              <span className={`badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
              {o.table && <span>Table {o.table.number}</span>}
              <span>·</span>
              <span>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{timeAgo(o.createdAt)}</span>
            </div>
          </div>
          <p className="font-bold text-gray-900">{formatCurrency(o.totalAmount)}</p>
        </div>

        {/* Item list */}
        <div className="space-y-0.5 mb-3">
          {o.items?.slice(0, 3).map((item) => (
            <p key={item.id} className="text-xs text-gray-500">
              {item.quantity}× {item.menuItem?.name}
              {item.variant ? ` (${item.variant.variant})` : ''}
            </p>
          ))}
          {(o.items?.length || 0) > 3 && (
            <p className="text-xs text-gray-400">+{o.items.length - 3} more items</p>
          )}
        </div>

        {nexts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {nexts.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate({ id: o.id, status: s })}
                disabled={statusMutation.isPending}
                className="btn btn-sm bg-secondary-500 text-white hover:bg-secondary-600 text-xs"
              >
                → {ORDER_STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Spinner size="lg" className="text-primary-500" />
    </div>
  );

  if (error) return (
    <div className="card p-8 text-center">
      <p className="text-red-500">Failed to load orders. Please refresh.</p>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">
            {active.length} active · {mergedTodayDone.length} completed today
          </p>
        </div>

        {/* 7D toggle button */}
        <button
          onClick={() => setShow7Days((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
            show7Days
              ? 'bg-primary-500 text-white border-primary-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
          }`}
        >
          📅 {show7Days ? 'Hide 7 Days' : 'Last 7 Days'}
        </button>
      </div>

      {/* Active orders */}
      {active.length === 0 ? (
        <div className="card">
          <EmptyState icon="🧾" title="No active orders" subtitle="Place a new order to get started" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {active.map((o) => <OrderCard key={o.id} o={o} />)}
        </div>
      )}

      {/* Completed Today */}
      {/* When 7-day is OFF: show today's done from real-time query */}
      {!show7Days && mergedTodayDone.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 mt-6">Completed Today</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mergedTodayDone.map((o) => <OrderCard key={o.id} o={o} muted />)}
          </div>
        </>
      )}

      {/* Last 7 Days Section */}
      {show7Days && (
        <div className="mt-6">
          {isLoading7 ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" className="text-primary-500" />
            </div>
          ) : (
            <div className="space-y-6">

              {/* Today's orders first */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-semibold text-gray-600">Today</span>
                  <span className="text-xs text-gray-400">
                    {mergedTodayDone.length} completed
                    {mergedTodayDone.length > 0 && ` · ${formatCurrency(
                      mergedTodayDone.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0)
                    )}`}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                {mergedTodayDone.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No completed orders today yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mergedTodayDone.map((o) => <OrderCard key={o.id} o={o} muted />)}
                  </div>
                )}
              </div>

              {/* Previous days grouped by date */}
              {Object.keys(grouped7d).length === 0 ? (
                <div className="card">
                  <EmptyState
                    icon="📅"
                    title="No previous orders in the last 7 days"
                    subtitle="Orders from earlier days will appear here"
                  />
                </div>
              ) : (
                Object.entries(grouped7d)
                  .sort(([a], [b]) => new Date(b) - new Date(a))
                  .map(([dateLabel, dayOrders]) => (
                    <div key={dateLabel}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm font-semibold text-gray-600">{dateLabel}</span>
                        <span className="text-xs text-gray-400">
                          {dayOrders.length} order{dayOrders.length !== 1 ? 's' : ''}
                          {' · '}
                          {formatCurrency(
                            dayOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0)
                          )}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {dayOrders.map((o) => <OrderCard key={o.id} o={o} muted />)}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
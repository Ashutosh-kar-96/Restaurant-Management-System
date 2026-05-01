import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/order.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState } from '../../components/ui';
import { ORDER_STATUS_CONFIG, timeAgo } from '../../utils/formatters';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  PENDING:   'border-yellow-400 bg-yellow-50',
  CONFIRMED: 'border-blue-400 bg-blue-50',
  PREPARING: 'border-orange-400 bg-orange-50',
};

export default function ChefDashboard() {
  const qc = useQueryClient();
  const { branchId } = useBranch();

  const { data, isLoading } = useQuery({
    queryKey:       ['kitchen-orders', branchId],
    queryFn:        () => orderApi.getKitchen(branchId),
    enabled:        !!branchId,
    refetchInterval: 10000,
  });

  const orders = data?.data?.data || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, { status }),
    onSuccess:  () => { qc.invalidateQueries(['kitchen-orders']); toast.success('Order updated'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const itemMutation = useMutation({
    mutationFn: ({ orderId, itemId }) => orderApi.markItemPrepared(orderId, itemId),
    onSuccess:  () => { qc.invalidateQueries(['kitchen-orders']); },
  });

  const pending   = orders.filter((o) => o.status === 'PENDING');
  const confirmed = orders.filter((o) => o.status === 'CONFIRMED');
  const preparing = orders.filter((o) => o.status === 'PREPARING');

  const KDSColumn = ({ title, orders: colOrders, color }) => (
    <div className={`flex-1 min-w-0 rounded-2xl border-2 ${color} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-current/20">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800">{title}</h2>
          <span className="w-7 h-7 bg-white/60 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">{colOrders.length}</span>
        </div>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {colOrders.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No orders</div>
        ) : colOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">#{order.orderNumber}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {order.table && <span className="badge badge-blue text-xs">T{order.table.number}</span>}
                  <span className="text-xs text-gray-400">{timeAgo(order.createdAt)}</span>
                  {order.estimatedTime && <span className="text-xs text-orange-500">⏱ {order.estimatedTime}m</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {order.status === 'PENDING' && (
                  <button onClick={() => statusMutation.mutate({ id: order.id, status: 'CONFIRMED' })}
                    className="btn-primary btn-sm text-xs whitespace-nowrap">Accept</button>
                )}
                {order.status === 'CONFIRMED' && (
                  <button onClick={() => statusMutation.mutate({ id: order.id, status: 'PREPARING' })}
                    className="btn btn-sm bg-orange-500 text-white hover:bg-orange-600 text-xs whitespace-nowrap">Start Prep</button>
                )}
                {order.status === 'PREPARING' && (
                  <button onClick={() => statusMutation.mutate({ id: order.id, status: 'READY' })}
                    className="btn-success btn-sm text-xs whitespace-nowrap">Mark Ready</button>
                )}
              </div>
            </div>

            {order.specialInstructions && (
              <div className="mb-3 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <p className="text-xs text-orange-600 font-medium">📝 {order.specialInstructions}</p>
              </div>
            )}

            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${item.isPrepared ? 'bg-green-50 opacity-60' : 'bg-gray-50'}`}>
                  <button
                    onClick={() => !item.isPrepared && itemMutation.mutate({ orderId: order.id, itemId: item.id })}
                    disabled={item.isPrepared}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${item.isPrepared ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400 bg-white'}`}>
                    {item.isPrepared && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.menuItem?.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className={`text-sm font-medium truncate ${item.isPrepared ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.menuItem?.name}</p>
                    </div>
                    {item.variant && <p className="text-xs text-gray-400 ml-4">{item.variant.variant}</p>}
                    {item.notes && <p className="text-xs text-orange-500 italic ml-4">"{item.notes}"</p>}
                  </div>
                  <span className="font-bold text-gray-700 text-sm flex-shrink-0">×{item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {order.status === 'PREPARING' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{order.items?.filter((i) => i.isPrepared).length}/{order.items?.length} items</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${order.items?.length ? (order.items.filter((i) => i.isPrepared).length / order.items.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-500" /></div>;

  return (
    <div className="h-full animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
          <p className="text-sm text-gray-500">{orders.length} active orders · Auto-refreshes every 10s</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Live
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card"><EmptyState icon="👨‍🍳" title="Kitchen is clear!" subtitle="No pending orders. Great work!" /></div>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          <KDSColumn title="🟡 Incoming"  orders={pending}   color="border-yellow-400 bg-yellow-50/50"  />
          <KDSColumn title="🔵 Confirmed" orders={confirmed} color="border-blue-400 bg-blue-50/50"     />
          <KDSColumn title="🔴 Preparing" orders={preparing} color="border-orange-400 bg-orange-50/50" />
        </div>
      )}
    </div>
  );
}

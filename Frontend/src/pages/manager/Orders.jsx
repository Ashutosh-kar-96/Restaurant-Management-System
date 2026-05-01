import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../api/order.api';
import { useBranch } from '../../hooks/useAuth';
import { Spinner, EmptyState, Tabs, Pagination, SearchInput, ConfirmDialog } from '../../components/ui';
import { ORDER_STATUS_CONFIG, formatCurrency, formatDateTime, getNextStatuses } from '../../utils/formatters';
import toast from 'react-hot-toast';

const STATUS_TABS = [
  { value: '',          label: 'All'       },
  { value: 'PENDING',   label: 'Pending'   },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY',     label: 'Ready'     },
  { value: 'SERVED',    label: 'Served'    },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ManagerOrders() {
  const qc = useQueryClient();
  const { branchId } = useBranch();
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [detail,  setDetail]  = useState(null);
  const [cancel,  setCancel]  = useState(null);
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', branchId, status, page, date],
    queryFn:  () => orderApi.getAll(branchId, { status, page, limit: 15, date }),
    enabled:  !!branchId,
    refetchInterval: 15000,
  });

  const { data: detailData } = useQuery({
    queryKey: ['order-detail', detail],
    queryFn:  () => orderApi.getById(detail),
    enabled:  !!detail,
  });

  const orders = data?.data?.data?.orders || [];
  const total  = data?.data?.data?.total  || 0;
  const pages  = data?.data?.data?.pages  || 1;

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }) => orderApi.updateStatus(id, { status: s }),
    onSuccess:  () => { qc.invalidateQueries(['orders']); toast.success('Order status updated'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => orderApi.cancel(id, reason),
    onSuccess:  () => { qc.invalidateQueries(['orders']); setCancel(null); toast.success('Order cancelled'); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const orderDetail = detailData?.data?.data;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">{total} orders found</p></div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="overflow-x-auto scrollbar-hide">
            <Tabs tabs={STATUS_TABS} active={status} onChange={(v) => { setStatus(v); setPage(1); }} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon="🧾" title="No orders" subtitle="Orders will appear here" />
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((o) => {
              const cfg   = ORDER_STATUS_CONFIG[o.status] || {};
              const nexts = getNextStatuses(o.status);
              return (
                <div key={o.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">#{o.orderNumber}</span>
                        <span className={`badge ${cfg.color}`}>{cfg.icon} {cfg.label}</span>
                        <span className="badge badge-gray">{o.orderType}</span>
                        {o.table && <span className="badge badge-blue">Table {o.table.number}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        <span>{formatDateTime(o.createdAt)}</span>
                        <span>·</span>
                        <span>{o.items?.length || 0} items</span>
                        {o.waiter && <><span>·</span><span>Waiter: {o.waiter.firstName}</span></>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</span>

                      {nexts.filter((s) => s !== 'CANCELLED').map((s) => (
                        <button key={s} onClick={() => statusMutation.mutate({ id: o.id, status: s })}
                          disabled={statusMutation.isPending}
                          className="btn btn-sm bg-secondary-500 text-white hover:bg-secondary-600 text-xs">
                          → {ORDER_STATUS_CONFIG[s]?.label}
                        </button>
                      ))}

                      <button onClick={() => setDetail(o.id)} className="btn-outline btn-sm text-xs">View</button>

                      {!['SERVED','CANCELLED','REFUNDED'].includes(o.status) && (
                        <button onClick={() => setCancel(o.id)} className="btn-danger btn-sm text-xs">Cancel</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="px-5 pb-4"><Pagination page={page} pages={pages} onPageChange={setPage} /></div>
      </div>

      {/* Order Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Order #{orderDetail?.orderNumber}</h3>
              <button onClick={() => setDetail(null)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            {!orderDetail ? (
              <div className="p-8 flex justify-center"><Spinner size="lg" className="text-primary-500" /></div>
            ) : (
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Status',    value: <span className={`badge ${ORDER_STATUS_CONFIG[orderDetail.status]?.color}`}>{orderDetail.status}</span> },
                    { label: 'Type',      value: orderDetail.orderType },
                    { label: 'Table',     value: orderDetail.table?.number || '—' },
                    { label: 'Est. Time', value: orderDetail.estimatedTime ? `${orderDetail.estimatedTime} min` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="font-medium text-gray-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Items</h4>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    {orderDetail.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.menuItem?.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.menuItem?.name}</p>
                            {item.variant && <p className="text-xs text-gray-400">{item.variant.variant}</p>}
                            {item.notes && <p className="text-xs text-orange-500 italic">"{item.notes}"</p>}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-gray-500">×{item.quantity}</p>
                          <p className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                          {item.isPrepared && <span className="text-xs text-green-500">✓ Prepared</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(orderDetail.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Tax (GST)</span><span>{formatCurrency(orderDetail.taxAmount)}</span></div>
                  {parseFloat(orderDetail.discountAmount) > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(orderDetail.discountAmount)}</span></div>}
                  <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200"><span>Total</span><span>{formatCurrency(orderDetail.totalAmount)}</span></div>
                </div>

                {orderDetail.specialInstructions && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-orange-700">Special Instructions</p>
                    <p className="text-sm text-orange-600 mt-1">{orderDetail.specialInstructions}</p>
                  </div>
                )}

                {/* Status History */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Status History</h4>
                  <div className="space-y-2">
                    {orderDetail.statusHistory?.map((h) => (
                      <div key={h.id} className="flex items-center gap-3 text-sm">
                        <span className={`badge ${ORDER_STATUS_CONFIG[h.status]?.color}`}>{h.status}</span>
                        <span className="text-gray-400 text-xs">{formatDateTime(h.changedAt)}</span>
                        {h.note && <span className="text-gray-500 text-xs">— {h.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog open={!!cancel} title="Cancel Order" message="Are you sure you want to cancel this order?"
        onConfirm={() => cancelMutation.mutate({ id: cancel, reason: 'Cancelled by manager' })}
        onCancel={() => setCancel(null)} confirmText="Cancel Order" danger />
    </div>
  );
}

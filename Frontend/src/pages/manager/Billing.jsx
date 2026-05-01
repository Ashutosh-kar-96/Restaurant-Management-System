import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../../api/billing.api';
import { orderApi }   from '../../api/order.api';
import { useBranch }  from '../../hooks/useAuth';
import { Spinner, EmptyState, Pagination } from '../../components/ui';
import { formatCurrency, formatDateTime, ORDER_STATUS_CONFIG } from '../../utils/formatters';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'ONLINE'];

export default function ManagerBilling() {
  const qc           = useQueryClient();
  const { branchId } = useBranch();

  const [date,         setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [page,         setPage]         = useState(1);
  const [payModal,     setPayModal]     = useState(null);
  const [payForm,      setPayForm]      = useState({ paymentMode: 'CASH', amountPaid: '', discount: '0' });
  const [invoiceModal, setInvoiceModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mgr-payments', branchId, date, page],
    queryFn:  () => billingApi.getPayments(branchId, { date, page, limit: 15 }),
    enabled:  !!branchId,
  });

  const { data: readyData } = useQuery({
    queryKey: ['mgr-pending', branchId],
    queryFn:  () => orderApi.getAll(branchId, { status: 'READY,SERVED', limit: 100 }),
    enabled:  !!branchId,
    refetchInterval: 15000,
  });

  const { data: billData, isLoading: billLoading } = useQuery({
    queryKey: ['bill-preview', payModal],
    queryFn:  () => billingApi.generateBill(payModal),
    enabled:  !!payModal,
    retry:    false,
  });

  const payments    = data?.data?.data?.payments || [];
  const summary     = data?.data?.data?.summary  || {};
  const totalPages  = Math.ceil((data?.data?.data?.total || 0) / 15);
  const readyOrders = (readyData?.data?.data?.orders || []).filter((o) => !o.payment);
  const bill        = billData?.data?.data;

  const discountAmt = parseFloat(payForm.discount || 0) || 0;
  const billTotal   = bill ? Math.max(0, parseFloat(bill.totalAmount) - discountAmt) : 0;
  const changeAmt   = parseFloat(payForm.amountPaid || 0) - billTotal;

  const payMutation = useMutation({
    mutationFn: (d) => billingApi.processPayment(d),
    onSuccess: (res) => {
      qc.invalidateQueries(['mgr-payments']);
      qc.invalidateQueries(['mgr-pending']);
      const payment = res.data?.data;
      setPayModal(null);
      setPayForm({ paymentMode: 'CASH', amountPaid: '', discount: '0' });
      toast.success('Payment processed!');
      if (payment) setInvoiceModal(payment);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  const openPayModal = (orderId) => {
    setPayModal(orderId);
    setPayForm({ paymentMode: 'CASH', amountPaid: '', discount: '0' });
  };

  const handlePay = () => {
    if (!payForm.amountPaid) return toast.error('Enter amount paid');
    if (parseFloat(payForm.amountPaid) < billTotal) return toast.error(`Minimum: ${formatCurrency(billTotal)}`);
    payMutation.mutate({ orderId: payModal, paymentMode: payForm.paymentMode, amountPaid: parseFloat(payForm.amountPaid), discount: discountAmt });
  };

  if (!branchId) return (
    <div className="card p-8 text-center"><p className="text-gray-500">No branch assigned.</p></div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div><h1 className="page-title">Billing</h1><p className="page-subtitle">Process payments and view transactions</p></div>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="input w-auto" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{summary.transactions || 0}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgOrderValue)}</p>
        </div>
      </div>

      {/* Pending Orders */}
      {readyOrders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900">🔔 Awaiting Payment</h2>
            <span className="badge badge-orange">{readyOrders.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {readyOrders.map((o) => {
  const createdAt    = new Date(o.createdAt);
  const now          = new Date();
  const diffMs       = now - createdAt;
  const diffMins     = Math.floor(diffMs / 60000);
  const diffHrs      = Math.floor(diffMins / 60);
  const diffDays     = Math.floor(diffHrs / 24);
  const pendingLabel =
    diffDays >= 1
      ? `${diffDays} day${diffDays > 1 ? 's' : ''} still unpaid`
      : diffHrs >= 1
      ? `${diffHrs}h ${diffMins % 60}m bill pending`
      : 'Food served';
  const isRed    = diffDays >= 1;
  const isOrange = !isRed && diffHrs >= 1;
  const isGreen  = !isRed && !isOrange;

  const waiterName = o.waiter
    ? `${o.waiter.firstName} ${o.waiter.lastName}`
    : 'No waiter assigned';

  return (
    <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">#{o.orderNumber}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isRed ? 'bg-red-100 text-red-600' : isOrange ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
            ⏱ {pendingLabel}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Table {o.table?.number || '—'} · {o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''} · 
          <span className={ORDER_STATUS_CONFIG[o.status]?.color}> {ORDER_STATUS_CONFIG[o.status]?.label}</span>
        </p>
        <p className="text-xs mt-0.5">
          <span className="text-gray-400">Waiter: </span>
          <span className="font-medium text-gray-600">{waiterName}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-gray-900">{formatCurrency(o.totalAmount)}</p>
        <button onClick={() => openPayModal(o.id)} className="btn-success btn-sm">Collect</button>
      </div>
    </div>
  );
})}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Transactions</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner className="text-primary-500" /></div>
        ) : payments.length === 0 ? (
          <EmptyState icon="🧾" title="No transactions" subtitle="Processed payments will appear here" />
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>Invoice</th><th>Order</th><th>Mode</th><th>Amount</th><th>Time</th><th></th></tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.invoiceNumber}</td>
                      <td><p className="font-medium">#{p.order?.orderNumber}</p><p className="text-xs text-gray-400">Table {p.order?.table?.number || '—'}</p></td>
                      <td><span className="badge badge-blue text-xs">{p.paymentMode}</span></td>
                      <td className="font-bold">{formatCurrency(p.totalAmount)}</td>
                      <td className="text-sm text-gray-500">{formatDateTime(p.paidAt || p.createdAt)}</td>
                      <td><button onClick={() => setInvoiceModal(p)} className="text-xs text-primary-500 hover:text-primary-700 font-medium">View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && <div className="px-5 pb-4"><Pagination page={page} pages={totalPages} onPageChange={setPage} /></div>}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={() => setPayModal(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Process Payment</h3>
              <button onClick={() => setPayModal(null)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <div className="modal-body space-y-4">
              {billLoading ? (
                <div className="flex justify-center py-10"><Spinner className="text-primary-500" /></div>
              ) : !bill ? (
                <p className="text-center py-8 text-gray-500">Failed to load bill</p>
              ) : (
                <>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 mb-1">#{bill.order?.orderNumber} — Table {bill.order?.table?.number || '—'}</p>
                    <div className="divide-y divide-gray-200 mb-3">
                      {bill.order?.items?.map((item) => (
                        <div key={item.id} className="flex justify-between py-2 text-sm">
                          <span className="text-gray-700">{item.menuItem?.name} × {item.quantity}</span>
                          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 border-t border-gray-200 pt-2 text-sm">
                      <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(bill.order?.subtotal)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>GST ({bill.gst?.cgstRate}% + {bill.gst?.sgstRate}%)</span><span>{formatCurrency((bill.gst?.cgst || 0) + (bill.gst?.sgst || 0))}</span></div>
                      {discountAmt > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{formatCurrency(discountAmt)}</span></div>}
                      <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-1.5 mt-1"><span>Total</span><span>{formatCurrency(billTotal)}</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Payment Mode</label>
                      <select className="input" value={payForm.paymentMode} onChange={(e) => setPayForm({ ...payForm, paymentMode: e.target.value })}>
                        {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Discount (₹)</label>
                      <input type="number" className="input" min="0" value={payForm.discount} onChange={(e) => setPayForm({ ...payForm, discount: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <label className="label">Amount Received (₹)</label>
                      <input type="number" className="input" value={payForm.amountPaid} onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })} placeholder={billTotal.toFixed(2)} autoFocus />
                    </div>
                  </div>
                  {parseFloat(payForm.amountPaid) > 0 && (
                    <div className={`rounded-xl p-3 text-sm font-medium flex justify-between ${changeAmt >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      <span>{changeAmt >= 0 ? 'Change:' : 'Still needed:'}</span>
                      <span className="font-bold">{formatCurrency(Math.abs(changeAmt))}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setPayModal(null)} className="btn-outline">Cancel</button>
              <button onClick={handlePay} disabled={payMutation.isPending || !bill || !payForm.amountPaid || changeAmt < 0} className="btn-success">
                {payMutation.isPending ? 'Processing…' : `Confirm — ${formatCurrency(billTotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      {invoiceModal && (
        <style>{`
          @media print {
            body > * { display: none !important; }
            #mgr-print-receipt { display: block !important; }
            @page { size: 80mm auto; margin: 0; }
          }
          #mgr-print-receipt {
            display: none;
            width: 80mm;
            padding: 6mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
        `}</style>
      )}

      {/* Hidden thermal receipt for printing */}
      {invoiceModal && (
        <div id="mgr-print-receipt">
          <div style={{ textAlign:'center', borderBottom:'1px dashed #000', paddingBottom:'6px', marginBottom:'6px' }}>
            <div style={{ fontWeight:'bold', fontSize:'15px' }}>{invoiceModal.order?.branch?.restaurant?.name}</div>
            <div style={{ fontSize:'11px' }}>{invoiceModal.order?.branch?.name}</div>
            <div style={{ fontSize:'10px' }}>GSTIN: {invoiceModal.order?.branch?.restaurant?.gstin || '—'}</div>
            <div style={{ fontSize:'10px' }}>Invoice: #{invoiceModal.invoiceNumber}</div>
            <div style={{ fontSize:'10px' }}>{formatDateTime(invoiceModal.paidAt || invoiceModal.createdAt)}</div>
            {invoiceModal.order?.table?.number && <div style={{ fontWeight:'bold', fontSize:'12px' }}>Table: {invoiceModal.order.table.number}</div>}
          </div>
          {invoiceModal.order?.items?.length > 0 && (
            <div style={{ borderBottom:'1px dashed #000', paddingBottom:'6px', marginBottom:'6px' }}>
              <div style={{ fontWeight:'bold', fontSize:'10px', marginBottom:'4px' }}>ITEMS</div>
              {invoiceModal.order.items.map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'2px' }}>
                  <span>{item.menuItem?.name}{item.variant ? ` (${item.variant.variant})` : ''} x{item.quantity}</span>
                  <span>{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderBottom:'1px dashed #000', paddingBottom:'6px', marginBottom:'6px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'2px' }}><span>Subtotal</span><span>{formatCurrency(invoiceModal.subtotal)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'2px' }}><span>CGST</span><span>{formatCurrency(invoiceModal.cgst)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'2px' }}><span>SGST</span><span>{formatCurrency(invoiceModal.sgst)}</span></div>
            {parseFloat(invoiceModal.discountAmount) > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}><span>Discount</span><span>-{formatCurrency(invoiceModal.discountAmount)}</span></div>}
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'14px', marginTop:'4px' }}><span>TOTAL</span><span>{formatCurrency(invoiceModal.totalAmount)}</span></div>
          </div>
          <div style={{ marginBottom:'6px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}><span>Paid ({invoiceModal.paymentMode})</span><span>{formatCurrency(invoiceModal.amountPaid)}</span></div>
            {parseFloat(invoiceModal.changeGiven) > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px' }}><span>Change</span><span>{formatCurrency(invoiceModal.changeGiven)}</span></div>}
          </div>
          <div style={{ textAlign:'center', borderTop:'1px dashed #000', paddingTop:'6px', fontSize:'11px' }}>
            <div>Thank you for dining with us!</div>
            <div>Visit Again!</div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModal && (
        <div className="modal-overlay" onClick={() => setInvoiceModal(null)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="font-semibold">Invoice #{invoiceModal.invoiceNumber}</h3>
                <p className="text-xs text-gray-400 mt-0.5">GSTIN: {invoiceModal.order?.branch?.restaurant?.gstin || '—'}</p>
              </div>
              <button onClick={() => setInvoiceModal(null)} className="btn-ghost btn-icon text-gray-400">✕</button>
            </div>
            <div className="modal-body space-y-3">
              <div className="text-center pb-2 border-b border-gray-100">
                <p className="text-lg font-bold text-gray-900">{invoiceModal.order?.branch?.restaurant?.name || '—'}</p>
                <p className="text-sm text-gray-500">{invoiceModal.order?.branch?.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">GSTIN: {invoiceModal.order?.branch?.restaurant?.gstin || '—'}</p>
                <p className="text-xs text-gray-400">{formatDateTime(invoiceModal.paidAt || invoiceModal.createdAt)}</p>
                {invoiceModal.order?.table?.number && <p className="text-sm font-semibold text-gray-700 mt-1">Table: {invoiceModal.order.table.number}</p>}
              </div>
              {invoiceModal.order?.items?.length > 0 && (
                <div className="border-b border-dashed border-gray-200 pb-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                  {invoiceModal.order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-700">{item.menuItem?.name}{item.variant && <span className="text-xs text-gray-400"> ({item.variant.variant})</span>}<span className="text-gray-400"> × {item.quantity}</span></span>
                      <span className="font-medium text-gray-900">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(invoiceModal.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>CGST</span><span>{formatCurrency(invoiceModal.cgst)}</span></div>
                <div className="flex justify-between text-gray-500"><span>SGST</span><span>{formatCurrency(invoiceModal.sgst)}</span></div>
                {parseFloat(invoiceModal.discountAmount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−{formatCurrency(invoiceModal.discountAmount)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2"><span>Total</span><span>{formatCurrency(invoiceModal.totalAmount)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Paid ({invoiceModal.paymentMode})</span><span>{formatCurrency(invoiceModal.amountPaid)}</span></div>
                {parseFloat(invoiceModal.changeGiven) > 0 && <div className="flex justify-between text-gray-500"><span>Change</span><span>{formatCurrency(invoiceModal.changeGiven)}</span></div>}
              </div>
              <div className="text-center py-3 bg-green-50 rounded-xl">
                <p className="text-green-700 font-semibold text-sm">✅ Payment Confirmed</p>
                <p className="text-green-500 text-xs mt-0.5">Thank you for dining with us!</p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setInvoiceModal(null)} className="btn-outline">Close</button>
              <button onClick={() => window.print()} className="btn-primary">🖨️ Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

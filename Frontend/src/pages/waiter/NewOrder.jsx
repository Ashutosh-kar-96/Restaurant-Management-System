import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '../../api/menu.api';
import { tableApi } from '../../api/table.api';
import { orderApi } from '../../api/order.api';
import { useBranch } from '../../hooks/useAuth';
import { useSelector } from 'react-redux';
import { Spinner, Tabs } from '../../components/ui';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:9001';

export default function WaiterNewOrder() {
  const qc = useQueryClient();
  const { branchId, restaurantId } = useBranch();
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  const [cart,      setCart]      = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [tableId,   setTableId]   = useState('');
  const [orderType, setOrderType] = useState('DINE_IN');
  const [note,      setNote]      = useState('');

  const { data: catData } = useQuery({
    queryKey: ['cats', restaurantId],
    queryFn:  () => menuApi.getCategories(restaurantId),
    enabled:  !!restaurantId,
  });
  const categories = catData?.data?.data || [];
  const catTabs    = [{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c.id, label: c.name }))];

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['menu', restaurantId, activeCat],
    queryFn:  () => menuApi.getItems(restaurantId, { categoryId: activeCat || undefined, isAvailable: 'true' }),
    enabled:  !!restaurantId,
  });
  const items = (itemsData?.data?.data?.items || []).filter((i) => i.isAvailable);

  const { data: tablesData } = useQuery({
    queryKey: ['tables', branchId],
    queryFn:  () => tableApi.getAll(branchId),
    enabled:  !!branchId,
  });
  const availableTables = (tablesData?.data?.data || []).filter((t) => t.status === 'AVAILABLE');

  const orderMutation = useMutation({
    mutationFn: (d) => orderApi.create(d),
    onSuccess: (res) => {
      toast.success(`Order #${res.data?.data?.orderNumber} placed!`);
      setCart([]);
      qc.invalidateQueries(['waiter-orders']);
      qc.invalidateQueries(['tables']);
      navigate('/waiter/orders');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to place order'),
  });

  const addToCart = (item, variantId = null) => {
    const variant      = variantId ? item.variants?.find((v) => v.id === variantId) : null;
    const price        = variant ? parseFloat(variant.price) : parseFloat(item.basePrice);
    const key          = `${item.id}-${variantId || 'base'}`;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx !== -1) return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        key, menuItemId: item.id, variantId: variantId || null,
        name: item.name, variantLabel: variant?.variant || null,
        price, isVeg: item.isVeg, quantity: 1, notes: '',
      }];
    });
  };

  const updateQty  = (key, delta) =>
    setCart((prev) => prev.map((c) => c.key === key ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  const updateNote = (key, notes) =>
    setCart((prev) => prev.map((c) => c.key === key ? { ...c, notes } : c));

  const cartSubtotal   = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartTax        = cartSubtotal * 0.05;
  const cartGrandTotal = cartSubtotal + cartTax;
  const cartCount      = cart.reduce((s, c) => s + c.quantity, 0);

  const placeOrder = () => {
    if (cart.length === 0)               return toast.error('Add at least one item');
    if (orderType === 'DINE_IN' && !tableId) return toast.error('Select a table for dine-in orders');
    if (!branchId) return toast.error('No branch assigned. Contact your manager.');

    orderMutation.mutate({
      branchId,
      tableId:             tableId || undefined,
      orderType,
      waiterId:            user?.id || undefined,
      specialInstructions: note || undefined,
      items: cart.map(({ menuItemId, variantId, quantity, notes }) => ({
        menuItemId, variantId: variantId || undefined, quantity, notes: notes || undefined,
      })),
    });
  };

  if (!branchId) return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-3">⚠️</div>
      <p className="text-gray-700 font-medium">No branch assigned to your account.</p>
      <p className="text-gray-400 text-sm mt-1">Please contact your manager to assign you to a branch.</p>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header mb-4">
        <div><h1 className="page-title">New Order</h1><p className="page-subtitle">Select items and place order</p></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-180px)]">
        {/* Menu Panel */}
        <div className="flex-1 flex flex-col min-w-0 card overflow-hidden">
          <div className="px-4 pt-4 border-b border-gray-100 overflow-x-auto scrollbar-hide">
            <Tabs tabs={catTabs} active={activeCat} onChange={setActiveCat} />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-500" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🍽️</div>
                <p>No items available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((item) => (
                  <div key={item.id}
                    className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => (!item.variants?.length) && addToCart(item)}>
                    <div className="h-24 bg-gray-50 relative">
                      {item.image
                        ? <img src={`${API_URL}${item.image}`} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                      <div className={`absolute top-2 left-2 w-3 h-3 border-2 rounded-sm ${item.isVeg ? 'border-green-500' : 'border-red-500'} bg-white flex items-center justify-center`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-primary-500 font-bold mt-0.5">{formatCurrency(item.basePrice)}</p>
                      {item.variants?.length > 0 ? (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {item.variants.map((v) => (
                            <button key={v.id} onClick={(e) => { e.stopPropagation(); addToCart(item, v.id); }}
                              className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 font-medium">
                              {v.variant} ₹{parseFloat(v.price).toFixed(0)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                          className="mt-2 w-full text-xs py-1.5 bg-primary-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Panel */}
        <div className="w-full lg:w-80 flex flex-col card overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div>
              <label className="label">Order Type</label>
              <div className="flex gap-2">
                {['DINE_IN', 'TAKEAWAY'].map((t) => (
                  <button key={t} onClick={() => { setOrderType(t); setTableId(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${orderType === t ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'DINE_IN' ? '🪑 Dine In' : '📦 Takeaway'}
                  </button>
                ))}
              </div>
            </div>
            {orderType === 'DINE_IN' && (
              <div>
                <label className="label">Table *</label>
                <select className="input" value={tableId} onChange={(e) => setTableId(e.target.value)}>
                  <option value="">Select table</option>
                  {availableTables.map((t) => (
                    <option key={t.id} value={t.id}>Table {t.number} ({t.capacity} seats)</option>
                  ))}
                </select>
                {availableTables.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">No available tables right now</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">
              Order Items {cartCount > 0 && <span className="badge badge-orange ml-1">{cartCount}</span>}
            </h3>
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                <div className="text-4xl mb-2">🛒</div>
                <p>Tap items to add them</p>
              </div>
            ) : cart.map((item) => (
              <div key={item.key} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    </div>
                    {item.variantLabel && <p className="text-xs text-gray-400 ml-3.5">{item.variantLabel}</p>}
                    <p className="text-sm text-primary-500 font-bold ml-3.5">{formatCurrency(item.price * item.quantity)}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => updateQty(item.key, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center">−</button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.key, +1)} className="w-6 h-6 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm flex items-center justify-center">+</button>
                  </div>
                </div>
                <input type="text" value={item.notes} onChange={(e) => updateNote(item.key, e.target.value)}
                  placeholder="Special notes..." className="input text-xs mt-2 py-1.5" />
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-100 space-y-3">
              <input className="input text-sm" placeholder="Special instructions for kitchen..."
                value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>GST (est.)</span><span>{formatCurrency(cartTax)}</span></div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2">
                  <span>Total</span><span>{formatCurrency(cartGrandTotal)}</span>
                </div>
              </div>
              <button onClick={placeOrder} disabled={orderMutation.isPending} className="btn-primary w-full py-3 text-base">
                {orderMutation.isPending ? 'Placing Order...' : '✓ Place Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

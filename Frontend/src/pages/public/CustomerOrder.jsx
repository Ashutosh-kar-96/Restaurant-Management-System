import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9001/api';
const IMG_URL  = (import.meta.env.VITE_API_URL || 'http://localhost:9001/api').replace('/api', '');

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

const fmt = (n) => `₹${parseFloat(n || 0).toFixed(2)}`;

/* ─── tiny status pill ─────────────────────────────────────── */
const STATUS = {
  PENDING:   { label: 'Pending',   bg: '#FEF3C7', color: '#92400E' },
  CONFIRMED: { label: 'Confirmed', bg: '#DCFCE7', color: '#14532D' },
  PREPARING: { label: 'Preparing', bg: '#DBEAFE', color: '#1E3A8A' },
  READY:     { label: 'Ready!',    bg: '#D1FAE5', color: '#065F46' },
  SERVED:    { label: 'Served',    bg: '#F0FDF4', color: '#166534' },
  CANCELLED: { label: 'Cancelled', bg: '#FEE2E2', color: '#991B1B' },
};

export default function CustomerOrder() {
  const { tableId }         = useParams();
  const [searchParams]      = useSearchParams();
  const branchId            = searchParams.get('branchId');
  const restaurantId        = searchParams.get('restaurantId');

  const [step, setStep]     = useState('menu'); // menu | confirm | tracking
  const [table, setTable]   = useState(null);
  const [categories, setCats] = useState([]);
  const [items, setItems]   = useState([]);
  const [activeCat, setActiveCat] = useState('');
  const [cart, setCart]     = useState([]);
  const [note, setNote]     = useState('');
  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const trackRef            = useRef(null);
  const pollRef             = useRef(null);

  /* ── load table + menu on mount ──────────────────────────── */
  useEffect(() => {
    if (!tableId || !branchId || !restaurantId) {
      setError('Invalid QR code. Please ask staff for help.');
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/tables/${tableId}`),
      api.get(`/menus/${restaurantId}/categories`),
      api.get(`/menus/${restaurantId}/items`, { params: { isAvailable: 'true' } }),
    ])
      .then(([tRes, cRes, iRes]) => {
        setTable(tRes.data.data);
        setCats(cRes.data.data || []);
        setItems((iRes.data.data?.items || []).filter(i => i.isAvailable));
      })
      .catch(() => setError('Could not load menu. Please try again.'))
      .finally(() => setLoading(false));
  }, [tableId, branchId, restaurantId]);

  /* ── poll order status after placing ──────────────────────── */
  useEffect(() => {
    if (order?.id && !['SERVED', 'CANCELLED'].includes(order.status)) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get(`/orders/${order.id}`);
          const updated = r.data.data;
          setOrder(updated);
          if (['SERVED', 'CANCELLED'].includes(updated.status)) {
            clearInterval(pollRef.current);
          }
        } catch { /* silent */ }
      }, 8000);
    }
    return () => clearInterval(pollRef.current);
  }, [order?.id, order?.status]);

  /* ── cart helpers ─────────────────────────────────────────── */
  const addToCart = (item, variantId = null) => {
    const variant = variantId ? item.variants?.find(v => v.id === variantId) : null;
    const price   = variant ? parseFloat(variant.price) : parseFloat(item.basePrice);
    const key     = `${item.id}-${variantId || 'base'}`;
    setCart(prev => {
      const idx = prev.findIndex(c => c.key === key);
      if (idx !== -1) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { key, menuItemId: item.id, variantId: variantId || null,
        name: item.name, variantLabel: variant?.variant || null,
        price, isVeg: item.isVeg, qty: 1 }];
    });
  };

  const changeQty = (key, delta) =>
    setCart(prev => prev.map(c => c.key === key ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));

  const subtotal   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax        = subtotal * 0.05;
  const total      = subtotal + tax;
  const cartCount  = cart.reduce((s, c) => s + c.qty, 0);

  /* ── place order ──────────────────────────────────────────── */
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const res = await api.post('/orders', {
        branchId,
        tableId,
        orderType: 'DINE_IN',
        specialInstructions: note || undefined,
        isCustomerOrder: true,
        items: cart.map(({ menuItemId, variantId, qty }) => ({
          menuItemId, variantId: variantId || undefined, quantity: qty,
        })),
      });
      setOrder(res.data.data);
      setStep('tracking');
      setTimeout(() => trackRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  /* ── filtered items ───────────────────────────────────────── */
  const filtered = items.filter(i =>
    (!activeCat || i.categoryId === activeCat) &&
    (!search || i.name.toLowerCase().includes(search.toLowerCase()))
  );

  /* ── loading / error screens ──────────────────────────────── */
  if (loading) return (
    <div style={styles.fullCenter}>
      <div style={styles.spinner} />
      <p style={{ color: '#888', marginTop: 16, fontFamily: 'system-ui' }}>Loading menu…</p>
    </div>
  );

  if (error && !table) return (
    <div style={styles.fullCenter}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <p style={{ color: '#ef4444', marginTop: 12, textAlign: 'center', fontFamily: 'system-ui', maxWidth: 280 }}>{error}</p>
    </div>
  );

  /* ── TRACKING SCREEN ──────────────────────────────────────── */
  if (step === 'tracking' && order) {
    const cfg   = STATUS[order.status] || STATUS.PENDING;
    const steps = ['PENDING','CONFIRMED','PREPARING','READY','SERVED'];
    const si    = steps.indexOf(order.status);

    return (
      <div style={styles.page} ref={trackRef}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>🍽️</div>
          <div>
            <div style={styles.headerTitle}>Order Placed!</div>
            <div style={styles.headerSub}>Table {table?.number}</div>
          </div>
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          {/* Order number card */}
          <div style={styles.orderCard}>
            <div style={styles.orderNum}>#{order.orderNumber}</div>
            <div style={{ ...styles.statusPill, background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </div>
            <p style={styles.orderHint}>
              {order.status === 'READY'     ? '🔔 Your order is ready! Staff will serve you shortly.' :
               order.status === 'SERVED'    ? '✅ Enjoy your meal!' :
               order.status === 'CANCELLED' ? '❌ This order was cancelled. Please contact staff.' :
               'Your order has been sent to the kitchen. Relax, we\'ll take care of it!'}
            </p>
          </div>

          {/* Progress bar */}
          {order.status !== 'CANCELLED' && (
            <div style={styles.progressWrap}>
              {steps.slice(0, 5).map((s, i) => (
                <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    ...styles.progressDot,
                    background: i <= si ? '#f97316' : '#e5e7eb',
                    transform: i === si ? 'scale(1.25)' : 'scale(1)',
                  }} />
                  <div style={{ fontSize: 10, color: i <= si ? '#f97316' : '#9ca3af', fontWeight: i === si ? 600 : 400 }}>
                    {STATUS[s]?.label}
                  </div>
                  {i < 4 && (
                    <div style={{
                      position: 'absolute',
                      top: 7, left: `${(i + 0.5) * (100 / 4)}%`,
                      width: `${100 / 4}%`, height: 2,
                      background: i < si ? '#f97316' : '#e5e7eb',
                      zIndex: 0,
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Order summary */}
          <div style={styles.summaryCard}>
            <div style={styles.summaryTitle}>Your Items</div>
            {order.items?.map(item => (
              <div key={item.id} style={styles.summaryRow}>
                <span style={{ color: '#374151' }}>{item.quantity}× {item.menuItem?.name}
                  {item.variant ? <span style={{ color: '#9ca3af' }}> ({item.variant.variant})</span> : ''}
                </span>
                <span style={{ color: '#f97316', fontWeight: 600 }}>{fmt(item.price * item.quantity)}</span>
              </div>
            ))}
            <div style={styles.summaryDivider} />
            <div style={{ ...styles.summaryRow, fontWeight: 700, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: '#f97316' }}>{fmt(order.totalAmount)}</span>
            </div>
          </div>

          {/* Order another button */}
          {['SERVED'].includes(order.status) && (
            <button style={styles.btnPrimary} onClick={() => { setCart([]); setOrder(null); setStep('menu'); setNote(''); }}>
              Order Again
            </button>
          )}

          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 }}>
            Need help? Call your waiter or ask at the counter.
          </p>
        </div>
      </div>
    );
  }

  /* ── CONFIRM SCREEN ───────────────────────────────────────── */
  if (step === 'confirm') return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => setStep('menu')} style={styles.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={styles.headerTitle}>Review Order</div>
          <div style={styles.headerSub}>Table {table?.number}</div>
        </div>
      </div>

      <div style={{ padding: '0 16px 120px' }}>
        {cart.map(item => (
          <div key={item.key} style={styles.cartItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.isVeg ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</div>
                {item.variantLabel && <div style={{ fontSize: 12, color: '#9ca3af' }}>{item.variantLabel}</div>}
                <div style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{fmt(item.price)} × {item.qty}</div>
              </div>
            </div>
            <div style={styles.qtyRow}>
              <button style={styles.qtyBtn} onClick={() => changeQty(item.key, -1)}>−</button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{item.qty}</span>
              <button style={{ ...styles.qtyBtn, background: '#f97316', color: '#fff' }} onClick={() => changeQty(item.key, +1)}>+</button>
            </div>
          </div>
        ))}

        <textarea
          placeholder="Any special requests? (optional)"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={styles.textarea}
          rows={3}
        />

        <div style={styles.totalBox}>
          <div style={styles.totalRow}><span style={{ color: '#6b7280' }}>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div style={styles.totalRow}><span style={{ color: '#6b7280' }}>GST (5%)</span><span>{fmt(tax)}</span></div>
          <div style={{ ...styles.totalRow, fontWeight: 700, fontSize: 17, paddingTop: 10, borderTop: '1px solid #e5e7eb', marginTop: 6 }}>
            <span>Total</span><span style={{ color: '#f97316' }}>{fmt(total)}</span>
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
      </div>

      <div style={styles.stickyBottom}>
        <button style={{ ...styles.btnPrimary, opacity: placing ? 0.7 : 1 }} onClick={placeOrder} disabled={placing}>
          {placing ? 'Placing…' : `✓ Confirm & Place Order · ${fmt(total)}`}
        </button>
      </div>
    </div>
  );

  /* ── MENU SCREEN ──────────────────────────────────────────── */
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>🍽️</div>
        <div style={{ flex: 1 }}>
          <div style={styles.headerTitle}>Order from Table {table?.number}</div>
          <div style={styles.headerSub}>{table?.name || `${table?.capacity} seats`}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={styles.searchWrap}>
          <span style={{ color: '#9ca3af', fontSize: 16 }}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Search dishes…"
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveCat(''); }}
          />
          {search && <button style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }} onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Category tabs */}
      {!search && (
        <div style={styles.catScroll}>
          {[{ id: '', name: 'All' }, ...categories].map(cat => (
            <button
              key={cat.id}
              style={{ ...styles.catTab, ...(activeCat === cat.id ? styles.catTabActive : {}) }}
              onClick={() => setActiveCat(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Items grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 120px' }}>
        {filtered.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 40 }}>🍽️</div>
            <p style={{ color: '#9ca3af', marginTop: 8 }}>No items found</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map(item => {
              const cartItem = cart.find(c => c.key === `${item.id}-base`);
              return (
                <div key={item.id} style={styles.itemCard}>
                  {/* Image */}
                  <div style={styles.itemImg}>
                    {item.image
                      ? <img src={`${IMG_URL}${item.image}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                      : <span style={{ fontSize: 32 }}>🍽️</span>}
                    {/* Veg/Non-veg dot */}
                    <div style={{ position: 'absolute', top: 6, left: 6, width: 14, height: 14, border: `2px solid ${item.isVeg ? '#22c55e' : '#ef4444'}`, borderRadius: 2, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.isVeg ? '#22c55e' : '#ef4444' }} />
                    </div>
                  </div>

                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={styles.itemName}>{item.name}</div>
                    {item.description && <div style={styles.itemDesc}>{item.description}</div>}
                    <div style={styles.itemPrice}>{fmt(item.basePrice)}</div>

                    {/* Variants or simple add */}
                    {item.variants?.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                        {item.variants.map(v => (
                          <button key={v.id} style={styles.variantBtn} onClick={() => addToCart(item, v.id)}>
                            {v.variant} · ₹{parseFloat(v.price).toFixed(0)}
                          </button>
                        ))}
                      </div>
                    ) : cartItem ? (
                      <div style={{ ...styles.qtyRow, marginTop: 8 }}>
                        <button style={styles.qtyBtn} onClick={() => changeQty(cartItem.key, -1)}>−</button>
                        <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{cartItem.qty}</span>
                        <button style={{ ...styles.qtyBtn, background: '#f97316', color: '#fff' }} onClick={() => changeQty(cartItem.key, +1)}>+</button>
                      </div>
                    ) : (
                      <button style={styles.addBtn} onClick={() => addToCart(item)}>+ Add</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <div style={styles.stickyBottom}>
          <button style={styles.cartBtn} onClick={() => setStep('confirm')}>
            <span style={styles.cartBadge}>{cartCount}</span>
            <span>View Cart</span>
            <span style={{ fontWeight: 700 }}>{fmt(total)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── styles ──────────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    maxWidth: 480,
    margin: '0 auto',
    position: 'relative',
  },
  fullCenter: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f9fafb',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #f97316',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  logo: { fontSize: 28 },
  headerTitle: { fontWeight: 700, fontSize: 16, color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  backBtn: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#374151', padding: '0 8px 0 0' },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: 12, padding: '10px 14px',
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', fontSize: 14,
    background: 'transparent', color: '#111827',
  },
  catScroll: {
    display: 'flex', gap: 8, overflowX: 'auto',
    padding: '10px 16px', scrollbarWidth: 'none',
  },
  catTab: {
    flexShrink: 0, padding: '7px 16px', borderRadius: 20,
    border: '1px solid #e5e7eb', background: '#fff',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    color: '#6b7280', whiteSpace: 'nowrap',
  },
  catTabActive: {
    background: '#f97316', color: '#fff', border: '1px solid #f97316',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  itemCard: {
    background: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid #f3f4f6',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  itemImg: {
    height: 110, background: '#f9fafb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  itemName: { fontWeight: 600, fontSize: 13, color: '#111827', lineHeight: 1.3 },
  itemDesc: { fontSize: 11, color: '#9ca3af', marginTop: 3, lineHeight: 1.4,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  itemPrice: { fontSize: 14, color: '#f97316', fontWeight: 700, marginTop: 4 },
  addBtn: {
    marginTop: 8, width: '100%', padding: '7px 0',
    background: '#fff7ed', color: '#f97316', border: '1px solid #fed7aa',
    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  variantBtn: {
    padding: '5px 10px', background: '#fff7ed', color: '#f97316',
    border: '1px solid #fed7aa', borderRadius: 8,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e7eb',
    background: '#f9fafb', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
  },
  stickyBottom: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480, padding: '12px 16px 20px',
    background: 'linear-gradient(to top, #f9fafb 80%, transparent)',
    zIndex: 40,
  },
  btnPrimary: {
    width: '100%', padding: '15px 24px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
  },
  cartBtn: {
    width: '100%', padding: '15px 20px',
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#fff', border: 'none', borderRadius: 14,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
  },
  cartBadge: {
    background: '#fff', color: '#f97316', borderRadius: '50%',
    width: 24, height: 24, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 12, fontWeight: 800,
  },
  cartItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, background: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, border: '1px solid #f3f4f6',
  },
  textarea: {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, resize: 'none', outline: 'none',
    fontFamily: 'inherit', color: '#374151', background: '#fff',
    marginTop: 12, boxSizing: 'border-box',
  },
  totalBox: {
    background: '#fff', borderRadius: 14, padding: 16,
    marginTop: 16, border: '1px solid #f3f4f6',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 14, marginBottom: 6, color: '#111827',
  },
  empty: { textAlign: 'center', padding: '48px 0' },
  // Tracking styles
  orderCard: {
    background: '#fff', borderRadius: 16, padding: 24,
    textAlign: 'center', marginBottom: 20,
    border: '1px solid #f3f4f6',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  orderNum: { fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 10 },
  statusPill: {
    display: 'inline-block', padding: '6px 18px', borderRadius: 20,
    fontSize: 14, fontWeight: 700, marginBottom: 12,
  },
  orderHint: { fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 },
  progressWrap: {
    display: 'flex', position: 'relative',
    padding: '0 8px', marginBottom: 24,
    background: '#fff', borderRadius: 14, padding: 16,
    border: '1px solid #f3f4f6',
  },
  progressDot: {
    width: 16, height: 16, borderRadius: '50%',
    zIndex: 1, transition: 'all 0.4s ease',
  },
  summaryCard: {
    background: '#fff', borderRadius: 14, padding: 16,
    border: '1px solid #f3f4f6', marginBottom: 16,
  },
  summaryTitle: { fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 13, marginBottom: 8, color: '#374151',
  },
  summaryDivider: { height: 1, background: '#e5e7eb', margin: '10px 0' },
};

// Inject spinner keyframe
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}
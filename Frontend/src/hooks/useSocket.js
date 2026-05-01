import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { addOrder, updateOrderInList } from '../store/slices/orderSlice';
import {
  addNotification,
  addPinnedMessage,
} from '../store/slices/notificationSlice';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9001';

let socketInstance = null;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now    = () => new Date().toISOString();

const isChef       = (r) => r === 'CHEF';
const isWaiter     = (r) => r === 'WAITER';
const isCashier    = (r) => r === 'CASHIER';
const isManager    = (r) => r === 'MANAGER';
const isAdmin      = (r) => r === 'RESTAURANT_ADMIN';
const isSuperAdmin = (r) => r === 'SUPER_ADMIN';

export const useSocket = () => {
  const dispatch  = useDispatch();
  const { accessToken, user } = useSelector((s) => s.auth);
  const socketRef = useRef(null);

  const role     = user?.role;
  const userId   = user?.id;
  const branchId = localStorage.getItem('branchId') || null;

  useEffect(() => {
    if (!accessToken || !user) return;

    socketInstance = io(SOCKET_URL, {
      auth:              { token: accessToken },
      transports:        ['websocket', 'polling'],
      reconnection:      true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => console.log('✅ Socket connected:', socketInstance.id));
    socketInstance.on('connect_error', (err) => console.warn('Socket error:', err.message));

    // Only process events for THIS branch
    const forMyBranch = (evtBranch) => {
      if (!branchId || !evtBranch) return true;
      return evtBranch === branchId;
    };

    // ── new_order (chef + manager only) ──────────────────────────────────
    socketInstance.on('new_order', (order) => {
      if (!forMyBranch(order.branchId)) return;
      dispatch(addOrder(order));

      if (isChef(role) || isManager(role)) {
        const waiterName = order.waiterName
          || (order.waiter ? `${order.waiter.firstName} ${order.waiter.lastName}` : null);
        const tableNum = order.table?.number || null;
        const parts = [
          tableNum   ? `Table ${tableNum}`     : null,
          waiterName ? `Waiter: ${waiterName}` : null,
        ].filter(Boolean).join(' · ');
        toast.success(`🍽️ New order #${order.orderNumber}`, { duration: 4000 });
        dispatch(addNotification({
          id: makeId(), type: 'ORDER_PLACED',
          title:   `🍽️ New Order${isChef(role) ? '' : ' Received'}`,
          message: `Order #${order.orderNumber}${parts ? ` — ${parts}` : ''}`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── order_created (cashier + manager) ────────────────────────────────
    socketInstance.on('order_created', ({ orderId, orderNumber, tableNumber, waiterName, branchId: evtBranch }) => {
      if (!forMyBranch(evtBranch)) return;
      if (isCashier(role) || isManager(role)) {
        const parts = [
          tableNumber ? `Table ${tableNumber}` : null,
          waiterName  ? `Waiter: ${waiterName}` : null,
        ].filter(Boolean).join(' · ');
        dispatch(addNotification({
          id: makeId(), type: 'ORDER_PLACED',
          title:   '🍽️ New Order',
          message: `Order #${orderNumber}${parts ? ` — ${parts}` : ''}`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── order_status_updated ──────────────────────────────────────────────
    socketInstance.on('order_status_updated', ({ orderId, orderNumber, status, waiterId: evtWaiterId, branchId: evtBranch }) => {
      if (!forMyBranch(evtBranch)) return;
      dispatch(updateOrderInList({ orderId, status }));

      const cfg = {
        CONFIRMED: { icon: '✅', label: 'Order Confirmed',  msg: `Order #${orderNumber} confirmed.`                         },
        PREPARING: { icon: '👨‍🍳', label: 'Kitchen Started',  msg: `Kitchen is preparing order #${orderNumber}.`              },
        READY:     { icon: '🔔', label: 'Order Ready!',     msg: `Order #${orderNumber} is ready — collect & serve.`        },
        SERVED:    { icon: '🎉', label: 'Order Served',     msg: `Order #${orderNumber} served. Collect payment.`           },
        CANCELLED: { icon: '❌', label: 'Order Cancelled',  msg: `Order #${orderNumber} was cancelled.`                     },
        REFUNDED:  { icon: '↩️', label: 'Order Refunded',   msg: `Order #${orderNumber} has been refunded.`                 },
      }[status];
      if (!cfg) return;

      const notify = (extra) => {
        toast(`${cfg.icon} ${cfg.label} — #${orderNumber}`, { duration: 3500 });
        dispatch(addNotification({
          id: makeId(), type: `ORDER_${status}`,
          title: `${cfg.icon} ${cfg.label}`, message: cfg.msg,
          isRead: false, createdAt: now(), ...extra,
        }));
      };

      if (isWaiter(role) && ['PREPARING', 'CANCELLED'].includes(status) && evtWaiterId === userId) return notify();
      if (isChef(role)   && ['CONFIRMED', 'CANCELLED'].includes(status))  return notify();
      if (isCashier(role)&& ['SERVED', 'CANCELLED', 'REFUNDED'].includes(status)) return notify();
      if (isManager(role)) return notify();
    });

    // ── order_ready (targeted waiter event) ──────────────────────────────
    socketInstance.on('order_ready', ({ orderId, orderNumber }) => {
      if (isWaiter(role) || isManager(role)) {
        toast.success(`🔔 Order #${orderNumber} is ready!`, { duration: 6000 });
        dispatch(addNotification({
          id: makeId(), type: 'ORDER_READY',
          title: '🔔 Order Ready for Pickup',
          message: `Order #${orderNumber} is ready. Please collect from the kitchen.`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── payment_received ──────────────────────────────────────────────────
    socketInstance.on('payment_received', ({ invoiceNumber, amount, branchId: evtBranch }) => {
      if (!forMyBranch(evtBranch)) return;
      if (isCashier(role) || isManager(role)) {
        toast.success(`💳 Payment ₹${parseFloat(amount).toFixed(2)} — ${invoiceNumber}`, { duration: 4000 });
        dispatch(addNotification({
          id: makeId(), type: 'PAYMENT_RECEIVED',
          title: '💳 Payment Received',
          message: `Invoice #${invoiceNumber} — ₹${parseFloat(amount).toFixed(2)} collected.`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── low_stock_alert ───────────────────────────────────────────────────
    socketInstance.on('low_stock_alert', ({ name, alertLevel, currentStock, branchId: evtBranch }) => {
      if (!forMyBranch(evtBranch)) return;
      if (isManager(role)) {
        toast.error(`⚠️ Low stock: ${name}`, { duration: 6000 });
        dispatch(addNotification({
          id: makeId(), type: 'LOW_STOCK',
          title: '⚠️ Low Stock Alert',
          message: `${name} is running ${alertLevel?.toLowerCase()}. Stock: ${currentStock ?? '—'}.`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── table_status_updated ──────────────────────────────────────────────
    socketInstance.on('table_status_updated', ({ tableNumber, status, branchId: evtBranch }) => {
      if (!forMyBranch(evtBranch)) return;
      if (isWaiter(role) || isManager(role)) {
        const labels = { AVAILABLE: '🟢 Available', OCCUPIED: '🔴 Occupied', RESERVED: '🟡 Reserved', CLEANING: '🧹 Cleaning' };
        dispatch(addNotification({
          id: makeId(), type: 'TABLE_STATUS',
          title: '🪑 Table Status Updated',
          message: `Table ${tableNumber} is now ${labels[status] || status}.`,
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── item_prepared ─────────────────────────────────────────────────────
    socketInstance.on('item_prepared', () => {
      if (isWaiter(role) || isManager(role)) {
        dispatch(addNotification({
          id: makeId(), type: 'ITEM_PREPARED',
          title: '👨‍🍳 Item Prepared',
          message: 'An item has been marked as prepared by the kitchen.',
          isRead: false, createdAt: now(),
        }));
      }
    });

    // ── admin_notification → RESTAURANT_ADMIN ─────────────────────────────
    socketInstance.on('admin_notification', (payload) => {
      if (!isAdmin(role)) return;
      dispatch(addPinnedMessage({ ...payload, isRead: false }));
      const label = payload.type === 'SUPERADMIN_REPLY'
        ? `📩 Super Admin: ${payload.message?.slice(0, 55)}`
        : `📩 Manager (${payload.fromName}): ${payload.message?.slice(0, 50)}`;
      toast(label, { duration: 6000 });
    });

    // ── manager_notification → MANAGER ───────────────────────────────────
    socketInstance.on('manager_notification', (payload) => {
      if (!isManager(role)) return;
      dispatch(addPinnedMessage({ ...payload, isRead: false }));
      toast(`📩 Admin reply: ${payload.message?.slice(0, 60)}`, { duration: 6000 });
    });

    // ── superadmin_notification → SUPER_ADMIN ────────────────────────────
    socketInstance.on('superadmin_notification', (payload) => {
      if (!isSuperAdmin(role)) return;
      dispatch(addPinnedMessage({ ...payload, isRead: false }));
      toast(`📩 Restaurant Admin (${payload.fromName}): ${payload.message?.slice(0, 55)}`, { duration: 6000 });
    });

    return () => {
      socketInstance?.disconnect();
      socketInstance = null;
    };
  }, [accessToken, userId]);

  return { socket: socketRef.current };
};

export const getSocket = () => socketInstance;

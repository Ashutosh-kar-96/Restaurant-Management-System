// utils/formatters.js
export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount || 0);

export const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));

export const formatDateTime = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const formatTime = (date) =>
  new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return formatDate(date);
};

// utils/orderHelpers.js
export const ORDER_STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   color: 'badge-yellow', dot: 'bg-yellow-400', icon: '⏳' },
  CONFIRMED: { label: 'Confirmed', color: 'badge-blue',   dot: 'bg-blue-400',   icon: '✅' },
  PREPARING: { label: 'Preparing', color: 'badge-orange', dot: 'bg-orange-400', icon: '👨‍🍳' },
  READY:     { label: 'Ready',     color: 'badge-green',  dot: 'bg-green-400',  icon: '🔔' },
  SERVED:    { label: 'Served',    color: 'badge-gray',   dot: 'bg-gray-400',   icon: '🎉' },
  CANCELLED: { label: 'Cancelled', color: 'badge-red',    dot: 'bg-red-400',    icon: '❌' },
  REFUNDED:  { label: 'Refunded',  color: 'badge-purple', dot: 'bg-purple-400', icon: '↩️' },
};

export const TABLE_STATUS_CONFIG = {
  AVAILABLE:   { label: 'Available',   color: 'text-green-600 bg-green-50',  border: 'border-green-200' },
  OCCUPIED:    { label: 'Occupied',    color: 'text-red-600 bg-red-50',      border: 'border-red-200'   },
  RESERVED:    { label: 'Reserved',    color: 'text-yellow-600 bg-yellow-50',border: 'border-yellow-200'},
  MAINTENANCE: { label: 'Maintenance', color: 'text-gray-600 bg-gray-50',    border: 'border-gray-200'  },
};

export const STOCK_ALERT_CONFIG = {
  NORMAL:      { label: 'Normal',      color: 'badge-green'  },
  LOW:         { label: 'Low Stock',   color: 'badge-yellow' },
  CRITICAL:    { label: 'Critical',    color: 'badge-red'    },
  OUT_OF_STOCK:{ label: 'Out of Stock',color: 'badge-red'    },
};

export const ROLE_CONFIG = {
  SUPER_ADMIN:      { label: 'Super Admin',       color: 'badge-purple' },
  RESTAURANT_ADMIN: { label: 'Restaurant Admin',  color: 'badge-blue'   },
  MANAGER:          { label: 'Manager',           color: 'badge-green'  },
  WAITER:           { label: 'Waiter',            color: 'badge-orange' },
  CHEF:             { label: 'Chef',              color: 'badge-yellow' },
  CASHIER:          { label: 'Cashier',           color: 'badge-gray'   },
  CUSTOMER:         { label: 'Customer',          color: 'badge-gray'   },
};

export const getNextStatuses = (current) => {
  const map = {
    PENDING:   ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY',     'CANCELLED'],
    READY:     ['SERVED'],
    SERVED:    [],
    CANCELLED: [],
    REFUNDED:  [],
  };
  return map[current] || [];
};

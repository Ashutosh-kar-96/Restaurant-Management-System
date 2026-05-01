import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { collapseSidebar } from '../../store/slices/uiSlice';

const NAV_CONFIG = {
  SUPER_ADMIN: [
    { to: '/superadmin',             icon: '📊', label: 'Dashboard'   },
    { to: '/superadmin/revenue',     icon: '💰', label: 'Revenue'     },
    { to: '/superadmin/restaurants', icon: '🏢', label: 'Restaurants' },
    { to: '/superadmin/users',       icon: '👥', label: 'Users'       },
    { to: '/superadmin/chat',        icon: '💬', label: 'Messages'    },
  ],
  RESTAURANT_ADMIN: [
    { to: '/admin',          icon: '📊', label: 'Dashboard' },
    { to: '/admin/branches', icon: '🏪', label: 'Branches'  },
    { to: '/admin/staff',    icon: '👥', label: 'Staff'     },
    { to: '/admin/menu',     icon: '🍽️', label: 'Menu'      },
    { to: '/admin/chat',     icon: '💬', label: 'Messages'  },
  ],
  MANAGER: [
    { to: '/manager',             icon: '📊', label: 'Dashboard'  },
    { to: '/manager/orders',      icon: '🧾', label: 'Orders'     },
    { to: '/manager/tables',      icon: '🪑', label: 'Tables'     },
    { to: '/manager/menu',        icon: '🍽️', label: 'Menu'       },
    { to: '/manager/billing',     icon: '💳', label: 'Billing'    },
    { to: '/manager/inventory',   icon: '📦', label: 'Inventory'  },
    { to: '/manager/analytics',   icon: '📈', label: 'Analytics'  },
    { to: '/manager/chat',        icon: '💬', label: 'Chat Admin' },
  ],
  WAITER: [
    { to: '/waiter',           icon: '📊', label: 'Dashboard' },
    { to: '/waiter/tables',    icon: '🪑', label: 'Tables'    },
    { to: '/waiter/orders',    icon: '🧾', label: 'Orders'    },
    { to: '/waiter/new-order', icon: '➕', label: 'New Order' },
  ],
  CHEF: [
    { to: '/chef', icon: '👨‍🍳', label: 'Kitchen Display' },
  ],
  CASHIER: [
    { to: '/cashier',         icon: '📊', label: 'Dashboard' },
    { to: '/cashier/billing', icon: '💳', label: 'Billing'   },
  ],
};

const ROLE_LABELS = {
  SUPER_ADMIN:      'Super Admin',
  RESTAURANT_ADMIN: 'Restaurant Admin',
  MANAGER:          'Manager',
  WAITER:           'Waiter',
  CHEF:             'Chef',
  CASHIER:          'Cashier',
};

export default function Sidebar() {
  const { user }             = useSelector((s) => s.auth);
  const { sidebarCollapsed } = useSelector((s) => s.ui);
  const { pinnedUnreadCount } = useSelector((s) => s.notification);
  const dispatch             = useDispatch();
  const navItems = NAV_CONFIG[user?.role] || [];

  const CHAT_PATHS = ['/manager/chat', '/admin/chat', '/superadmin/chat'];

  return (
    <aside className={`flex flex-col bg-secondary-500 text-white transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'} min-h-screen flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
        {!sidebarCollapsed && (
          <div>
            <p className="font-bold text-sm leading-tight">RMS</p>
            <p className="text-xs text-white/50 leading-tight">Restaurant System</p>
          </div>
        )}
      </div>

      {/* Role Badge */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/50">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isChatLink = CHAT_PATHS.includes(item.to);
          return (
            <NavLink key={item.to} to={item.to} end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-primary-500 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }>
              <span className="text-base flex-shrink-0 relative">
                {item.icon}
                {isChatLink && pinnedUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none">
                    {pinnedUnreadCount > 9 ? '9+' : pinnedUnreadCount}
                  </span>
                )}
              </span>
              {!sidebarCollapsed && (
                <span className="flex-1 flex items-center justify-between">
                  {item.label}
                  {isChatLink && pinnedUnreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                      {pinnedUnreadCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => dispatch(collapseSidebar())}
        className="mx-2 mb-4 py-2 px-3 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-all text-sm flex items-center gap-2">
        <span>{sidebarCollapsed ? '→' : '←'}</span>
        {!sidebarCollapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}

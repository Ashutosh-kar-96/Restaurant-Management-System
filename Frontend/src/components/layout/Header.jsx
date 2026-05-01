import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/slices/authSlice";
import { toggleSidebar } from "../../store/slices/uiSlice";
import {
  markAllRead,
  markPinnedRead,
  markAllPinnedRead,
} from "../../store/slices/notificationSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { formatDateTime } from "../../utils/formatters";
import BranchSwitcher from "./BranchSwitcher";

// ── Notification type → dot colour ───────────────────────────────────────
const TYPE_COLOR = {
  ORDER_PLACED: "bg-blue-400",
  ORDER_CONFIRMED: "bg-green-400",
  ORDER_PREPARING: "bg-orange-400",
  ORDER_READY: "bg-green-500",
  ORDER_SERVED: "bg-gray-400",
  ORDER_CANCELLED: "bg-red-400",
  ORDER_REFUNDED: "bg-purple-400",
  PAYMENT_RECEIVED: "bg-emerald-400",
  LOW_STOCK: "bg-red-500",
  TABLE_STATUS: "bg-yellow-400",
  ITEM_PREPARED: "bg-teal-400",
};

const PINNED_COLOR = {
  MANAGER_MESSAGE: "bg-violet-500",
  ADMIN_REPLY: "bg-violet-500",
  ADMIN_MESSAGE: "bg-indigo-500",
  SUPERADMIN_REPLY: "bg-indigo-600",
};

// ── Chat route per role ───────────────────────────────────────────────────
const CHAT_ROUTE = {
  MANAGER: "/manager/chat",
  RESTAURANT_ADMIN: "/admin/chat",
  SUPER_ADMIN: "/superadmin/chat",
};

export default function Header({ title }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const {
    items: notifications,
    unreadCount,
    pinnedMessages,
    pinnedUnreadCount,
  } = useSelector((s) => s.notification);

  const role = user?.role;
  const hasChatRole = ["MANAGER", "RESTAURANT_ADMIN", "SUPER_ADMIN"].includes(
    role,
  );
  const hasOpsNotif = ["MANAGER", "WAITER", "CHEF", "CASHIER"].includes(role);

  // Tabs for Manager / Admin / SuperAdmin
  const [tab, setTab] = useState("ops"); // 'ops' | 'messages'
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const onChatPage = location.pathname === (CHAT_ROUTE[role] || "");
  const effectivePinnedUnread = onChatPage ? 0 : pinnedUnreadCount;
  const totalUnread = unreadCount + effectivePinnedUnread;

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  const openNotif = () => {
    setShowNotif(!showNotif);
    setShowUser(false);
  };
  const openUser = () => {
    setShowUser(!showUser);
    setShowNotif(false);
  };

  // ── Single notification item ──────────────────────────────────────────
  const NotifItem = ({ n, pinned }) => {
    const dotColor = pinned
      ? PINNED_COLOR[n.type] || "bg-violet-400"
      : TYPE_COLOR[n.type] || "bg-primary-400";

    return (
      <div
        className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.isRead ? "bg-primary-50/40" : ""}`}
        onClick={() =>
          pinned
            ? dispatch(markPinnedRead(n.id))
            : dispatch({ type: "notification/markRead", payload: n.id })
        }
      >
        <div className="flex items-start gap-2.5">
          <div
            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? dotColor : "bg-gray-200"}`}
          />
          <div className="flex-1 min-w-0">
            {pinned && (
              <span
                className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mb-1 text-white ${dotColor}`}
              >
                {n.fromRole === "SUPER_ADMIN"
                  ? "Super Admin"
                  : n.fromRole === "RESTAURANT_ADMIN"
                    ? "Admin"
                    : n.fromRole === "MANAGER"
                      ? `Manager${n.branchName ? ` · ${n.branchName}` : ""}`
                      : n.fromRole}
              </span>
            )}
            <p
              className={`text-sm font-medium ${!n.isRead ? "text-gray-900" : "text-gray-500"}`}
            >
              {pinned ? n.fromName || n.title : n.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {n.message}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {formatDateTime(n.createdAt)}
            </p>
            {pinned && !n.isRead && (
              <p className="text-[10px] text-violet-400 mt-0.5">
                Click to mark as read
              </p>
            )}
          </div>
          {pinned && !n.isRead && (
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
          )}
        </div>
      </div>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────
  const Empty = ({ label }) => (
    <div className="text-center py-10">
      <p className="text-3xl mb-2">🔔</p>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-gray-300 text-xs mt-1">Nothing here yet</p>
    </div>
  );

  // ── Ops notifications panel ───────────────────────────────────────────
  const OpsPanel = () => (
    <>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <Empty label="No operational alerts" />
        ) : (
          notifications
            .slice(0, 20)
            .map((n) => <NotifItem key={n.id} n={n} pinned={false} />)
        )}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-300">
            {notifications.length} total · last 20 shown
          </p>
        </div>
      )}
    </>
  );

  // ── Messages panel (pinned, for MANAGER / ADMIN / SUPERADMIN) ────────
  const MessagesPanel = () => {
    const msgs = pinnedMessages;
    const unread = msgs.filter((m) => !m.isRead);
    return (
      <>
        {unread.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 bg-violet-50 flex items-center justify-between">
            <p className="text-xs text-violet-600 font-medium">
              {unread.length} unread — must mark as read manually
            </p>
            <button
              onClick={() => dispatch(markAllPinnedRead())}
              className="text-xs text-violet-500 hover:underline"
            >
              Mark all read
            </button>
          </div>
        )}
        <div className="max-h-96 overflow-y-auto">
          {msgs.length === 0 ? (
            <Empty label="No messages" />
          ) : (
            msgs
              .slice(0, 30)
              .map((m) => <NotifItem key={m.id} n={m} pinned={true} />)
          )}
        </div>
        {hasChatRole && (
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => {
                setShowNotif(false);
                navigate(CHAT_ROUTE[role]);
              }}
              className="w-full py-2 px-3 bg-violet-500 hover:bg-violet-600 text-white text-sm rounded-lg transition-colors font-medium"
            >
              💬 Open Chat
            </button>
          </div>
        )}
      </>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="btn-ghost btn-icon lg:hidden"
        >
          ☰
        </button>
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
            {title}
          </h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <BranchSwitcher />

        {/* Notification bell */}
        <div className="relative">
          <button onClick={openNotif} className="btn-ghost btn-icon relative">
            🔔
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>

          {showNotif && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotif(false)}
              />
              <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-modal border border-gray-100 z-50 animate-slide-down">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-900">Notifications</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && tab === "ops" && (
                      <button
                        onClick={() => dispatch(markAllRead())}
                        className="text-xs text-primary-500 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs — only for roles that have both panels */}
                {hasChatRole && hasOpsNotif && (
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setTab("ops")}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === "ops" ? "text-primary-600 border-b-2 border-primary-500" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      Operations
                      {unreadCount > 0 && (
                        <span className="ml-1 bg-primary-500 text-white text-[10px] rounded-full px-1.5">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setTab("messages")}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === "messages" ? "text-violet-600 border-b-2 border-violet-500" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      Messages
                      {effectivePinnedUnread > 0 && (
                        <span className="ml-1 bg-violet-500 text-white text-[10px] rounded-full px-1.5">
                          {effectivePinnedUnread}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Panel content */}
                {hasChatRole && !hasOpsNotif ? (
                  <MessagesPanel />
                ) : !hasChatRole ? (
                  <OpsPanel />
                ) : tab === "ops" ? (
                  <OpsPanel />
                ) : (
                  <MessagesPanel />
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={openUser}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 leading-tight">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <span className="text-gray-400 text-xs hidden sm:block">
              {showUser ? "▲" : "▼"}
            </span>
          </button>

          {showUser && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUser(false)}
              />
              <div className="absolute right-0 top-11 w-52 bg-white rounded-xl shadow-modal border border-gray-100 z-50 overflow-hidden animate-slide-down">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="font-semibold text-gray-900 text-sm">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                >
                  <span>↩</span> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../../hooks/useSocket";
import {
  addPinnedMessage,
  markPinnedRead,
  markAllPinnedRead,
  setPinnedMessages,
} from "../../store/slices/notificationSlice";
import { formatDateTime } from "../../utils/formatters";
import axios from "../../api/axios";

const THREAD_SUPERADMIN = "superadmin";

export default function AdminChat() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { pinnedMessages } = useSelector((s) => s.notification);

  const [activeThread, setActiveThread] = useState(null); // null = list, 'superadmin', or fromUserId
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsgs, setSentMsgs] = useState([]);
  const bottomRef = useRef(null);

  const restaurantId = localStorage.getItem("restaurantId");

  useEffect(() => {
    dispatch(markAllPinnedRead());
    axios
      .get("/notifications/inbox")
      .then((r) => dispatch(setPinnedMessages(r.data.messages || [])))
      .catch(() => {});
    axios
      .get("/notifications/outbox")
      .then((r) => setSentMsgs(r.data.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pinnedMessages, sentMsgs, activeThread]);

  // Group manager messages by fromUserId — each manager gets their own thread
  const managerThreads = pinnedMessages
    .filter((m) => m.fromRole === "MANAGER")
    .reduce((acc, m) => {
      const key = m.fromUserId;
      if (!acc[key])
        acc[key] = {
          id: key,                                          // fromUserId
          name: m.fromName || "Manager",
          branchName: m.branchName || null,
          branchId: m.branchId || null,
          messages: [],
        };
      acc[key].messages.push(m);
      return acc;
    }, {});

  const superAdminReplies = pinnedMessages.filter(
    (m) => m.fromRole === "SUPER_ADMIN"
  );

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      const socket = getSocket();

      if (activeThread === THREAD_SUPERADMIN) {
        // Admin → Super Admin
        await axios.post("/notifications", {
          toRole: "SUPER_ADMIN",
          restaurantId,
          message: msg,
          type: "ADMIN_MESSAGE",
          title: "Message from Restaurant Admin",
        });
        socket?.emit("admin_to_superadmin", {
          message: msg,
          fromName: `${user.firstName} ${user.lastName}`,
          restaurantId,
          restaurantName: null,
        });
        setSentMsgs((prev) => [
          {
            id: `local-${Date.now()}`,
            fromRole: "RESTAURANT_ADMIN",
            toRole: "SUPER_ADMIN",
            toUserId: null,
            message: msg,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        // Admin → specific Manager (reply)
        const thread = managerThreads[activeThread];
        await axios.post("/notifications", {
          toRole: "MANAGER",
          toUserId: activeThread,                         // reply to specific manager
          branchId: thread?.branchId,
          restaurantId,
          message: msg,
          type: "ADMIN_REPLY",
          title: "Reply from Restaurant Admin",
        });
        socket?.emit("admin_to_manager", {
          message: msg,
          fromName: `${user.firstName} ${user.lastName}`,
          toManagerId: activeThread,                      // specific manager
          branchId: thread?.branchId,
        });
        setSentMsgs((prev) => [
          {
            id: `local-${Date.now()}`,
            fromRole: "RESTAURANT_ADMIN",
            toRole: "MANAGER",
            toUserId: activeThread,
            message: msg,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
      setText("");
    } catch (e) {
      console.error("Send failed", e);
    } finally {
      setSending(false);
    }
  };

  // ── Thread view ───────────────────────────────────────────────────────
  const ThreadView = ({ threadId }) => {
    const isSA = threadId === THREAD_SUPERADMIN;
    const thread = isSA ? null : managerThreads[threadId];

    const inbound = isSA
      ? superAdminReplies
      : thread?.messages || [];

    const outbound = sentMsgs.filter((m) =>
      isSA
        ? m.toRole === "SUPER_ADMIN"
        : m.toUserId === threadId
    );

    const all = [
      ...inbound.map((m) => ({ ...m, _dir: "in" })),
      ...outbound.map((m) => ({ ...m, _dir: "out" })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const threadName = isSA ? "Super Admin" : thread?.name || "Manager";
    const unread = inbound.filter((m) => !m.isRead).length;

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveThread(null)}
            className="btn-ghost btn-icon text-lg"
          >
            ←
          </button>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              isSA
                ? "bg-indigo-100 text-indigo-600"
                : "bg-violet-100 text-violet-600"
            }`}
          >
            {threadName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">
              {isSA ? "🔒 Super Admin" : threadName}
            </h2>
            {!isSA && thread?.branchName && (
              <p className="text-xs text-gray-400">{thread.branchName}</p>
            )}
            {isSA && (
              <p className="text-xs text-gray-400">Platform Administrator</p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() =>
                inbound.forEach(
                  (m) => !m.isRead && dispatch(markPinnedRead(m.id))
                )
              }
              className="ml-auto text-xs bg-violet-100 text-violet-600 px-3 py-1 rounded-lg"
            >
              Mark {unread} read
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 mb-4">
          {all.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-400 text-sm">No messages yet</p>
              <p className="text-gray-300 text-xs mt-1">
                {isSA
                  ? "Send a message to Super Admin below"
                  : `Conversation with ${threadName}`}
              </p>
            </div>
          )}
          {all.map((m) => {
            const isOut = m._dir === "out";
            return (
              <div
                key={m.id}
                className={`flex ${isOut ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isOut
                      ? "bg-primary-500 text-white rounded-br-sm"
                      : !m.isRead
                        ? "bg-violet-50 border-2 border-violet-200 text-gray-800 rounded-bl-sm"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                  }`}
                  onClick={() =>
                    !isOut && !m.isRead && dispatch(markPinnedRead(m.id))
                  }
                >
                  {!isOut && (
                    <p className="text-[10px] font-semibold text-violet-500 mb-1 uppercase tracking-wide">
                      {threadName}
                      {!m.isRead && (
                        <span className="ml-2 bg-violet-500 text-white rounded px-1">
                          NEW
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{m.message}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isOut ? "text-white/60 text-right" : "text-gray-300"
                    }`}
                  >
                    {formatDateTime(m.createdAt)}
                    {isOut && (
                      <span className="ml-1">
                        {m.isRead ? " ✓✓" : " ✓"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={`Reply to ${threadName}...`}
            className="flex-1 input"
            disabled={sending}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className="btn-primary px-5 disabled:opacity-50"
          >
            {sending ? "..." : "➤"}
          </button>
        </div>
      </div>
    );
  };

  // ── Thread list ───────────────────────────────────────────────────────
  if (activeThread)
    return (
      <div className="h-full max-h-[calc(100vh-8rem)]">
        <ThreadView threadId={activeThread} />
      </div>
    );

  const managerList = Object.values(managerThreads);
  const saUnread = superAdminReplies.filter((m) => !m.isRead).length;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Messages</h1>
      <p className="text-sm text-gray-400 mb-6">
        Communicate with managers and Super Admin
      </p>

      <div className="space-y-3 max-w-2xl">
        {/* Super Admin thread */}
        <button
          onClick={() => setActiveThread(THREAD_SUPERADMIN)}
          className="w-full text-left bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all px-5 py-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Super Admin</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {sentMsgs.filter((m) => m.toRole === "SUPER_ADMIN").length > 0
                ? "Send updates to Super Admin"
                : "No messages yet — start a conversation"}
            </p>
          </div>
          {saUnread > 0 && (
            <span className="bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
              {saUnread}
            </span>
          )}
          <span className="text-gray-300">›</span>
        </button>

        {/* Manager threads — each manager separately */}
        {managerList.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-8 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-gray-400">No manager messages yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Managers from your branches will appear here
            </p>
          </div>
        ) : (
          managerList.map((t) => {
            const unread = t.messages.filter((m) => !m.isRead).length;
            const latest = [...t.messages].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )[0];
            return (
              <button
                key={t.id}
                onClick={() => setActiveThread(t.id)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all px-5 py-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-sm font-bold text-violet-600 flex-shrink-0">
                  {t.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    {t.branchName && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {t.branchName}
                      </span>
                    )}
                  </div>
                  {latest && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {latest.message}
                    </p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="bg-violet-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
                <span className="text-gray-300">›</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
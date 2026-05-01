import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../../hooks/useSocket";
import {
  markPinnedRead,
  markAllPinnedRead,
  setPinnedMessages,
} from "../../store/slices/notificationSlice";
import { formatDateTime } from "../../utils/formatters";
import axios from "../../api/axios";

export default function SuperAdminChat() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { pinnedMessages } = useSelector((s) => s.notification);

  const [activeThread, setActiveThread] = useState(null); // fromUserId as key
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsgs, setSentMsgs] = useState([]);
  const bottomRef = useRef(null);

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

  // Group by fromUserId so each admin gets their own thread
  const threads = pinnedMessages
    .filter((m) => m.fromRole === "RESTAURANT_ADMIN")
    .reduce((acc, m) => {
      const key = m.fromUserId;
      if (!acc[key])
        acc[key] = {
          id: key,                                              // fromUserId
          restaurantId: m.restaurantId,
          name: m.fromName || m.restaurantName || "Restaurant Admin",
          restaurantName: m.restaurantName || null,
          messages: [],
        };
      acc[key].messages.push(m);
      return acc;
    }, {});

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending || !activeThread) return;
    setSending(true);
    try {
      const thread = threads[activeThread];
      await axios.post("/notifications", {
        toRole: "RESTAURANT_ADMIN",
        toUserId: activeThread,                               // reply to specific admin
        restaurantId: thread?.restaurantId,
        message: msg,
        type: "SUPERADMIN_REPLY",
        title: "Reply from Super Admin",
      });
      const socket = getSocket();
      socket?.emit("superadmin_to_admin", {
        message: msg,
        fromName: `${user.firstName} ${user.lastName}`,
        toRestaurantId: thread?.restaurantId,
        toAdminId: activeThread,                              // specific admin
      });
      setSentMsgs((prev) => [
        {
          id: `local-${Date.now()}`,
          fromRole: "SUPER_ADMIN",
          toRole: "RESTAURANT_ADMIN",
          toUserId: activeThread,
          restaurantId: thread?.restaurantId,
          message: msg,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setText("");
    } catch (e) {
      console.error("Send failed", e);
    } finally {
      setSending(false);
    }
  };

  // ── Thread view ───────────────────────────────────────────────────────
  if (activeThread) {
    const thread = threads[activeThread];
    const inbound = thread?.messages || [];
    const outbound = sentMsgs.filter((m) => m.toUserId === activeThread);
    const all = [
      ...inbound.map((m) => ({ ...m, _dir: "in" })),
      ...outbound.map((m) => ({ ...m, _dir: "out" })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

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
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">
            {(thread?.name || "R").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{thread?.name}</h2>
            {thread?.restaurantName && (
              <p className="text-xs text-gray-400">{thread.restaurantName}</p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() =>
                inbound.forEach(
                  (m) => !m.isRead && dispatch(markPinnedRead(m.id))
                )
              }
              className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg"
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
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm cursor-pointer ${
                    isOut
                      ? "bg-primary-500 text-white rounded-br-sm"
                      : !m.isRead
                        ? "bg-indigo-50 border-2 border-indigo-200 text-gray-800 rounded-bl-sm"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                  }`}
                  onClick={() =>
                    !isOut && !m.isRead && dispatch(markPinnedRead(m.id))
                  }
                >
                  {!isOut && (
                    <p className="text-[10px] font-semibold text-indigo-500 mb-1 uppercase tracking-wide">
                      {thread?.name}
                      {!m.isRead && (
                        <span className="ml-2 bg-indigo-500 text-white rounded px-1">
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
            placeholder={`Reply to ${thread?.name}...`}
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
  }

  // ── Thread list ───────────────────────────────────────────────────────
  const threadList = Object.values(threads);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        Messages from Restaurant Admins
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        View and reply to messages from your restaurant admins
      </p>

      {threadList.length === 0 ? (
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-16 text-center max-w-lg">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm text-gray-400 font-medium">No messages yet</p>
          <p className="text-xs text-gray-300 mt-1">
            Restaurant admins will appear here when they send you a message
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {threadList.map((t) => {
            const unread = t.messages.filter((m) => !m.isRead).length;
            const latest = [...t.messages].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )[0];
            return (
              <button
                key={t.id}
                onClick={() => setActiveThread(t.id)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all px-5 py-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                  {t.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  {t.restaurantName && (
                    <p className="text-xs text-indigo-400 mt-0.5">
                      {t.restaurantName}
                    </p>
                  )}
                  {latest && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {latest.message}
                    </p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="bg-indigo-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
                <span className="text-gray-300">›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
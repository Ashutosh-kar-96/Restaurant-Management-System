import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getSocket } from "../../hooks/useSocket";
import {
  addPinnedMessage,
  markAllPinnedRead,
  setPinnedMessages,
} from "../../store/slices/notificationSlice";
import { formatDateTime } from "../../utils/formatters";
import axios from "../../api/axios";

export default function ManagerChat() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { pinnedMessages } = useSelector((s) => s.notification);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsgs, setSentMsgs] = useState([]);
  const bottomRef = useRef(null);

  const restaurantId = localStorage.getItem("restaurantId");
  const branchId = localStorage.getItem("branchId");

  // Load inbox from API on mount
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
  }, [pinnedMessages, sentMsgs]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setSending(true);
    try {
      // Via HTTP (persisted)
      await axios.post("/notifications", {
        toRole: "RESTAURANT_ADMIN",
        restaurantId,
        branchId,
        message: msg,
        type: "MANAGER_MESSAGE",
        title: `Message from Manager`,
      });
      // Also via socket for real-time
      const socket = getSocket();
      socket?.emit("manager_to_admin", {
        message: msg,
        fromName: `${user.firstName} ${user.lastName}`,
        branchName: user.restaurantStaff?.[0]?.branch?.name || null,
        restaurantId,
        branchId,
      });
      setSentMsgs((prev) => [
        {
          id: `local-${Date.now()}`,
          fromRole: "MANAGER",
          toRole: "RESTAURANT_ADMIN",
          message: msg,
          createdAt: new Date().toISOString(),
          isRead: false,
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

  // Merge inbox (admin replies) + outbox (sent), sorted by time
  const allMessages = [
    ...pinnedMessages.map((m) => ({ ...m, _dir: "in" })),
    ...sentMsgs.map((m) => ({ ...m, _dir: "out" })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Chat with Restaurant Admin
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Messages are delivered in real-time and persisted
          </p>
        </div>
        {pinnedMessages.filter((m) => !m.isRead).length > 0 && (
          <button
            onClick={() => dispatch(markAllPinnedRead())}
            className="text-xs bg-violet-100 text-violet-600 px-3 py-1.5 rounded-lg hover:bg-violet-200 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3 mb-4">
        {allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-gray-400 text-sm font-medium">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">
              Send a message to the Restaurant Admin below
            </p>
          </div>
        )}
        {allMessages.map((m) => {
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
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                }`}
              >
                {!isOut && (
                  <p className="text-[10px] font-semibold text-violet-500 mb-1 uppercase tracking-wide">
                    {m.fromName || "Restaurant Admin"}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{m.message}</p>
                <p
                  className={`text-[10px] mt-1 ${isOut ? "text-white/60 text-right" : "text-gray-300"}`}
                >
                  {formatDateTime(m.createdAt)}
                  {isOut && (
                    <span className="ml-1">{m.isRead ? " ✓✓" : " ✓"}</span>
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
          placeholder="Type a message to Restaurant Admin..."
          className="flex-1 input"
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="btn-primary px-5 flex items-center gap-2 disabled:opacity-50"
        >
          {sending ? "..." : "➤"}
        </button>
      </div>
    </div>
  );
}

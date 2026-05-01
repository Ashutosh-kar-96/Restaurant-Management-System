import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Regular operational notifications (orders, payments, stock, etc.)
  items:        [],
  unreadCount:  0,

  // Pinned messages from higher roles — stay until manually marked read
  // Manager   ← admin replies
  // Admin     ← manager messages + superadmin replies
  // SuperAdmin← admin messages
  pinnedMessages:      [],
  pinnedUnreadCount:   0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    // ── Regular op notifications ──────────────────────────────────────────
    addNotification(state, { payload }) {
      // Avoid duplicates
      if (state.items.some((n) => n.id === payload.id)) return;
      state.items.unshift(payload);
      if (!payload.isRead) state.unreadCount += 1;
      // Keep max 50
      if (state.items.length > 50) state.items = state.items.slice(0, 50);
    },

    markRead(state, { payload: id }) {
      const n = state.items.find((n) => n.id === id);
      if (n && !n.isRead) {
        n.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllRead(state) {
      state.items.forEach((n) => { n.isRead = true; });
      state.unreadCount = 0;
    },

    clearNotifications(state) {
      state.items       = [];
      state.unreadCount = 0;
    },

    // ── Pinned chat messages ──────────────────────────────────────────────
    addPinnedMessage(state, { payload }) {
      // Avoid duplicates by id
      if (state.pinnedMessages.some((m) => m.id === payload.id)) return;
      state.pinnedMessages.unshift(payload);
      if (!payload.isRead) state.pinnedUnreadCount += 1;
      // Keep max 100
      if (state.pinnedMessages.length > 100) {
        state.pinnedMessages = state.pinnedMessages.slice(0, 100);
      }
    },

    markPinnedRead(state, { payload: id }) {
      const m = state.pinnedMessages.find((m) => m.id === id);
      if (m && !m.isRead) {
        m.isRead  = true;
        m.isPinned = false;
        state.pinnedUnreadCount = Math.max(0, state.pinnedUnreadCount - 1);
      }
    },

    markAllPinnedRead(state) {
      state.pinnedMessages.forEach((m) => { m.isRead = true; m.isPinned = false; });
      state.pinnedUnreadCount = 0;
    },

    // Load messages from API (inbox fetch)
    setPinnedMessages(state, { payload: messages }) {
      state.pinnedMessages    = messages;
      state.pinnedUnreadCount = messages.filter((m) => !m.isRead).length;
    },
  },
});

export const {
  addNotification,
  markRead,
  markAllRead,
  clearNotifications,
  addPinnedMessage,
  markPinnedRead,
  markAllPinnedRead,
  setPinnedMessages,
} = notificationSlice.actions;

export default notificationSlice.reducer;

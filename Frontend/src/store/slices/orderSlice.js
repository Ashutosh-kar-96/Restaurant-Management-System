// orderSlice.js
import { createSlice } from '@reduxjs/toolkit';
const orderSlice = createSlice({
  name: 'orders',
  initialState: { activeOrders: [], kitchenOrders: [], selected: null, filters: {} },
  reducers: {
    setActiveOrders:  (s, { payload }) => { s.activeOrders  = payload; },
    setKitchenOrders: (s, { payload }) => { s.kitchenOrders = payload; },
    addOrder:         (s, { payload }) => { s.activeOrders.unshift(payload); },
    updateOrderInList:(s, { payload }) => {
      const idx = s.activeOrders.findIndex((o) => o.id === payload.orderId);
      if (idx !== -1) s.activeOrders[idx].status = payload.status;
      const kidx = s.kitchenOrders.findIndex((o) => o.id === payload.orderId);
      if (kidx !== -1 && ['SERVED','CANCELLED'].includes(payload.status)) s.kitchenOrders.splice(kidx, 1);
    },
    setSelected:  (s, { payload }) => { s.selected = payload; },
    setFilters:   (s, { payload }) => { s.filters  = { ...s.filters, ...payload }; },
  },
});
export const { setActiveOrders, setKitchenOrders, addOrder, updateOrderInList, setSelected, setFilters } = orderSlice.actions;
export default orderSlice.reducer;

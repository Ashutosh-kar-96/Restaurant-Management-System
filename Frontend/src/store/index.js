// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import orderReducer        from './slices/orderSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer           from './slices/uiSlice';

export const store = configureStore({
  reducer: { auth: authReducer, orders: orderReducer, notification: notificationReducer, ui: uiReducer },
  middleware: (gDM) => gDM({ serializableCheck: false }),
});

import { createSlice } from '@reduxjs/toolkit';
const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, sidebarCollapsed: false },
  reducers: {
    toggleSidebar:   (s) => { s.sidebarOpen      = !s.sidebarOpen; },
    collapseSidebar: (s) => { s.sidebarCollapsed  = !s.sidebarCollapsed; },
    setSidebar:      (s, { payload }) => { s.sidebarOpen = payload; },
  },
});
export const { toggleSidebar, collapseSidebar, setSidebar } = uiSlice.actions;
export default uiSlice.reducer;

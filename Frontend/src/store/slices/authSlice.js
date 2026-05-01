import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.api';

const storeSession = (payload) => {
  const { user, tokens } = payload;
  localStorage.setItem('accessToken',  tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);

  const staff = user.restaurantStaff?.[0];

  // restaurantId — try nested object first, then raw field
  const rId = staff?.restaurant?.id || staff?.restaurantId || null;
  if (rId) {
    localStorage.setItem('restaurantId', rId);
  } else {
    localStorage.removeItem('restaurantId');
  }

  // branchId — try nested object first, then raw field
  const bId = staff?.branch?.id || staff?.branchId || null;
  if (bId) {
    localStorage.setItem('branchId', bId);
  } else {
    localStorage.removeItem('branchId');
  }
};

export const loginUser = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await authApi.login(creds);
    return data.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message || 'Login failed');
  }
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, { rejectWithValue }) => {
  try {
    const { data } = await authApi.profile();
    return data.data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.message);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('restaurantId');
  localStorage.removeItem('branchId');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:        null,
    accessToken: localStorage.getItem('accessToken'),
    isLoading:   false,
    error:       null,
  },
  reducers: {
    setCredentials(state, { payload }) {
      state.user        = payload.user;
      state.accessToken = payload.tokens.accessToken;
      storeSession(payload);
    },
    clearAuth(state) {
      state.user        = null;
      state.accessToken = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(loginUser.pending,   (s) => { s.isLoading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, { payload }) => {
        s.isLoading   = false;
        s.user        = payload.user;
        s.accessToken = payload.tokens.accessToken;
        storeSession(payload);
      })
      .addCase(loginUser.rejected,  (s, { payload }) => { s.isLoading = false; s.error = payload; })
      .addCase(fetchProfile.fulfilled, (s, { payload }) => {
        s.user = payload;
        // Re-sync from profile
        const staff = payload.restaurantStaff?.[0];
        const rId   = staff?.restaurant?.id || staff?.restaurantId || null;
        const bId   = staff?.branch?.id     || staff?.branchId     || null;
        if (rId) localStorage.setItem('restaurantId', rId);
        if (bId) localStorage.setItem('branchId',     bId);
      })
      .addCase(logoutUser.fulfilled, (s) => { s.user = null; s.accessToken = null; });
  },
});

export const { setCredentials, clearAuth } = authSlice.actions;
export default authSlice.reducer;

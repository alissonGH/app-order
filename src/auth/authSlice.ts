import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  authKind: 'user' | 'device' | null;
}

const initialState: AuthState = {
  token: null,
  authKind: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload; // Atualiza o token no estado
    },
    setAuthKind: (state, action: PayloadAction<'user' | 'device'>) => {
      state.authKind = action.payload;
    },
    clearToken: (state) => {
      state.token = null; // Limpa o token no logout
      state.authKind = null;
    },
  },
});

export const { setToken, setAuthKind, clearToken } = authSlice.actions;

export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectAuthKind = (state: { auth: AuthState }) => state.auth.authKind;

export default authSlice.reducer;

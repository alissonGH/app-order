import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload; // Atualiza o token no estado
    },
    clearToken: (state) => {
      state.token = null; // Limpa o token no logout
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;

export default authSlice.reducer;

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const AUTH_KIND_KEY = 'auth_kind';

export type AuthKind = 'user' | 'device';

export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving the auth token', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting the auth token', error);
    return null;
  }
};

export const deleteToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting the auth token', error);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing the auth token', error);
  }
};

export const saveAuthKind = async (kind: AuthKind): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_KIND_KEY, kind);
  } catch (error) {
    console.error('Error saving the auth kind', error);
  }
};

export const getAuthKind = async (): Promise<AuthKind | null> => {
  try {
    const v = await SecureStore.getItemAsync(AUTH_KIND_KEY);
    if (v === 'user' || v === 'device') return v;
    return null;
  } catch (error) {
    console.error('Error getting the auth kind', error);
    return null;
  }
};

export const removeAuthKind = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_KIND_KEY);
  } catch (error) {
    console.error('Error removing the auth kind', error);
  }
};

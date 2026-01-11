import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import THEME from '../styles/theme';
import { API_URL } from '../config/api';
import { getToken } from '../auth/tokenStorage';
import { handleAuthErrorResponse } from '../utils/authErrorHandler';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';

type UserDto = Record<string, any> & {
  id?: number | string;
  email?: string;
};

function toIdNumber(id: unknown): number | null {
  if (typeof id === 'number' && Number.isFinite(id)) return id;
  if (typeof id === 'string') {
    const n = Number(id);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch();

  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const userId = useMemo(() => toIdNumber(user?.id), [user]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();

      // 1) tenta obter o "me" para descobrir id
      const meRes = await fetchWithTimeout(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeoutMs: 8000,
      });

      if (!meRes.ok) {
        const backendMsg = await extractBackendErrorMessage(meRes.clone());
        const handled = await handleAuthErrorResponse(meRes, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao validar sessão.'));
        return;
      }

      let meJson: any = null;
      try {
        const contentType = meRes.headers.get('content-type') || '';
        if (contentType.toLowerCase().includes('application/json')) {
          meJson = await meRes.json();
        }
      } catch {
        meJson = null;
      }

      const meId = toIdNumber(meJson?.id);

      // 2) se tiver id, usa a rota oficial /users/{id}
      if (meId != null) {
        const res = await fetchWithTimeout(`${API_URL}/users/${meId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeoutMs: 10000,
        });

        if (!res.ok) {
          const backendMsg = await extractBackendErrorMessage(res.clone());
          const handled = await handleAuthErrorResponse(res, dispatch);
          Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao buscar dados do usuário.'));
          return;
        }

        const dto = (await res.json()) as UserDto;
        setUser(dto);
        return;
      }

      // fallback: se /auth/me já retornar dados, exibe eles
      if (meJson && typeof meJson === 'object') {
        setUser(meJson as UserDto);
        return;
      }

      setUser(null);
      Alert.alert('Perfil', 'Não foi possível carregar os dados do usuário.');
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao carregar o perfil.');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const openEdit = () => {
    setEditEmail((user?.email || '').toString());
    setEditPassword('');
    setEditVisible(true);
  };

  const closeEdit = () => {
    Keyboard.dismiss();
    setEditVisible(false);
  };

  const saveEdit = async () => {
    const id = userId;
    if (id == null) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário para atualizar.');
      return;
    }

    const email = (editEmail || '').toString().trim();
    const password = (editPassword || '').toString();

    if (!email) {
      Alert.alert('Erro', 'Email é obrigatório.');
      return;
    }

    if (!password) {
      Alert.alert('Erro', 'Senha é obrigatória.');
      return;
    }

    setIsMutating(true);
    try {
      const token = await getToken();

      // Preserva o objeto original para não quebrar validações do backend
      const payload: any = {
        id,
        email,
        password,
      };

      const res = await fetchWithTimeout(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        timeoutMs: 15000,
      });

      if (!res.ok) {
        const backendMsg = await extractBackendErrorMessage(res.clone());
        const handled = await handleAuthErrorResponse(res, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao atualizar usuário.'));
        return;
      }

      const updated = (await res.json()) as UserDto;
      setUser(updated);
      closeEdit();
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao atualizar o usuário.');
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadProfile} colors={[THEME.primary]} tintColor={THEME.primary} />}
      >
        {isLoading && !user ? (
          <ActivityIndicator size="large" color={THEME.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>ID</Text>
            <Text style={styles.value}>{userId != null ? String(userId) : '-'}</Text>

            <View style={styles.divider} />

            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{(user?.email || '-').toString()}</Text>

            {user && (
              <TouchableOpacity style={[styles.button, isMutating && styles.buttonDisabled]} onPress={openEdit} disabled={isMutating}>
                <Text style={styles.buttonText}>Alterar usuário</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={editVisible} onRequestClose={closeEdit}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: THEME.card }]}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={closeEdit}
              accessibilityLabel="Fechar modal"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={THEME.muted} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Alterar usuário</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />

              <TextInput
                style={styles.input}
                placeholder="Senha"
                value={editPassword}
                onChangeText={setEditPassword}
                secureTextEntry
                textContentType="password"
              />

              <TouchableOpacity style={[styles.saveButton, isMutating && styles.buttonDisabled]} onPress={saveEdit} disabled={isMutating}>
                {isMutating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: THEME.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: THEME.primary,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  label: {
    fontSize: 13,
    color: THEME.muted,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  button: {
    marginTop: 16,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 12,
    padding: 16,
  },
  modalScroll: {
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: THEME.text,
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  input: {
    height: 45,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: THEME.card,
    color: THEME.text,
  },
  saveButton: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.success,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ProfileScreen;

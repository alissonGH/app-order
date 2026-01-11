import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { THEME } from '../styles/theme';
import { API_URL } from '../config/api';
import { Device } from '../types/models';
import { getToken } from '../auth/tokenStorage';
import { handleAuthErrorResponse } from '../utils/authErrorHandler';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';

type ModalMode = 'create' | 'password' | 'description' | null;

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
};

const DeviceScreen: React.FC = () => {
  const dispatch = useDispatch();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [filter, setFilter] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const [createDescription, setCreateDescription] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const getDeviceKey = (device: Device) => String(device.id ?? device.deviceUid ?? '');

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? 'Falha ao buscar dispositivos.');
        return;
      }

      const data: Device[] = await response.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao buscar dispositivos.');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [fetchDevices])
  );

  const filteredDevices = useMemo(() => {
    const q = (filter || '').toString().trim().toLowerCase();
    if (!q) return devices;
    return (devices || []).filter((d) => {
      const uid = (d.deviceUid || '').toString().toLowerCase();
      const desc = (d.description || '').toString().toLowerCase();
      return uid.includes(q) || desc.includes(q);
    });
  }, [devices, filter]);

  const openCreateModal = () => {
    setCreateDescription('');
    setCreatePassword('');
    setSelectedDevice(null);
    setNewPassword('');
    setModalMode('create');
    setModalVisible(true);
  };

  const openPasswordModal = (device: Device) => {
    setSelectedDevice(device);
    setNewPassword('');
    setModalMode('password');
    setModalVisible(true);
  };

  const openDescriptionModal = (device: Device) => {
    setSelectedDevice(device);
    setNewDescription((device.description || '').toString());
    setModalMode('description');
    setModalVisible(true);
  };

  const toggleDeviceMenu = (device: Device) => {
    const key = getDeviceKey(device);
    if (!key) return;
    setOpenMenuKey((prev) => (prev === key ? null : key));
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setModalMode(null);
    setSelectedDevice(null);
    setNewPassword('');
    setNewDescription('');
    setOpenMenuKey(null);
    setCreateDescription('');
    setCreatePassword('');
  };

  const createDevice = async () => {
    const description = (createDescription || '').toString().trim();
    const password = (createPassword || '').toString();
    if (!description || !password) {
      Alert.alert('Erro', 'Descrição e senha são obrigatórias.');
      return;
    }

    setIsMutating(true);
    try {
      const token = await getToken();

      const response = await fetchWithTimeout(`${API_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description,
          password,
        }),
        timeoutMs: 15000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? 'Falha ao criar o dispositivo.');
        return;
      }

      closeModal();
      await fetchDevices();
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao criar o dispositivo.');
    } finally {
      setIsMutating(false);
    }
  };

  const revokeDevice = async (device: Device) => {
    if (device.id == null) return;

    setOpenMenuKey(null);

    Alert.alert('Revogar Dispositivo', 'Tem certeza de que deseja revogar este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revogar',
        style: 'destructive',
        onPress: async () => {
          setIsMutating(true);
          try {
            const token = await getToken();
            const response = await fetchWithTimeout(`${API_URL}/devices/${device.id}/revoke`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              timeoutMs: 15000,
            });

            if (!response.ok) {
              const backendMsg = await extractBackendErrorMessage(response.clone());
              await handleAuthErrorResponse(response, dispatch);
              Alert.alert('Erro', backendMsg ?? 'Falha ao revogar o dispositivo.');
              return;
            }

            await fetchDevices();
          } catch (e: any) {
            Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao revogar o dispositivo.');
          } finally {
            setIsMutating(false);
          }
        },
      },
    ]);
  };

  const patchPassword = async () => {
    if (!selectedDevice || selectedDevice.id == null) return;

    const password = (newPassword || '').toString();
    if (!password) {
      Alert.alert('Erro', 'Senha é obrigatória.');
      return;
    }

    setIsMutating(true);
    try {
      setOpenMenuKey(null);
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/devices/${selectedDevice.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
        timeoutMs: 15000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? 'Falha ao alterar a senha do dispositivo.');
        return;
      }

      closeModal();
      await fetchDevices();
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao alterar a senha do dispositivo.');
    } finally {
      setIsMutating(false);
    }
  };

  const patchDescription = async () => {
    if (!selectedDevice || selectedDevice.id == null) return;

    const description = (newDescription || '').toString().trim();
    if (!description) {
      Alert.alert('Erro', 'Descrição é obrigatória.');
      return;
    }

    setIsMutating(true);
    try {
      setOpenMenuKey(null);
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/devices/${selectedDevice.id}/description`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description }),
        timeoutMs: 15000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? 'Falha ao alterar a descrição do dispositivo.');
        return;
      }

      closeModal();
      await fetchDevices();
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao alterar a descrição do dispositivo.');
    } finally {
      setIsMutating(false);
    }
  };

  const renderItem = ({ item }: { item: Device }) => {
    const isRevoked = !!item.revokedAt;
    const optionsDisabled = isMutating || isRevoked;
    const key = getDeviceKey(item);
    const isMenuOpen = !!key && openMenuKey === key;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{item.description || 'Dispositivo'}</Text>
            <Text style={styles.meta}>UID: {item.deviceUid || '-'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.iconButton, optionsDisabled && styles.iconButtonDisabled]}
            disabled={optionsDisabled}
            onPress={() => toggleDeviceMenu(item)}
            accessibilityLabel="Abrir opções do dispositivo"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={THEME.text} />
          </TouchableOpacity>
        </View>

        {isMenuOpen && !isRevoked && (
          <View style={styles.menuWrap}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOpenMenuKey(null);
                openDescriptionModal(item);
              }}
            >
              <Ionicons name="pencil" size={16} color={THEME.muted} />
              <Text style={styles.menuItemText}>Alterar descrição</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setOpenMenuKey(null);
                openPasswordModal(item);
              }}
            >
              <Ionicons name="key" size={16} color={THEME.muted} />
              <Text style={styles.menuItemText}>Alterar senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemLast]}
              onPress={() => revokeDevice(item)}
            >
              <Ionicons name="ban" size={16} color={THEME.danger} />
              <Text style={[styles.menuItemText, { color: THEME.danger }]}>Revogar dispositivo</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.meta}>Criado: {formatDateTime(item.createdAt)}</Text>
          <Text style={styles.meta}>Último acesso: {formatDateTime(item.lastSeenAt)}</Text>
          {isRevoked ? <Text style={styles.revokedText}>Revogado: {formatDateTime(item.revokedAt)}</Text> : <Text style={styles.meta}>Revogado: -</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dispositivos</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Filtrar por UID ou descrição"
        value={filter}
        onChangeText={setFilter}
      />

      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Nenhum dispositivo encontrado</Text> : null}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDevices} colors={[THEME.primary]} tintColor={THEME.primary} />}
      />

      {isLoading && !devices.length && (
        <ActivityIndicator size="large" color={THEME.primary} style={StyleSheet.absoluteFill} />
      )}

      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: THEME.primary }]} onPress={openCreateModal}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContainer]}>
          <View style={[styles.modalContent, { backgroundColor: THEME.card }]}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={closeModal}
              accessibilityLabel="Fechar modal"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={THEME.muted} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>
                {modalMode === 'create' ? 'Novo Dispositivo' : modalMode === 'password' ? 'Alterar Senha' : 'Alterar Descrição'}
              </Text>

              {modalMode === 'create' ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Descrição"
                    value={createDescription}
                    onChangeText={setCreateDescription}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Senha"
                    value={createPassword}
                    onChangeText={setCreatePassword}
                    secureTextEntry
                  />
                </>
              ) : modalMode === 'password' ? (
                <>
                  <Text style={styles.meta}>
                    {selectedDevice?.description || 'Dispositivo'} ({selectedDevice?.deviceUid || '-'})
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nova senha"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </>
              ) : (
                <>
                  <Text style={styles.meta}>
                    {selectedDevice?.description || 'Dispositivo'} ({selectedDevice?.deviceUid || '-'})
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nova descrição"
                    value={newDescription}
                    onChangeText={setNewDescription}
                  />
                </>
              )}

              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: THEME.success }, isMutating && styles.saveButtonDisabled]}
                  onPress={
                    modalMode === 'create' ? createDevice : modalMode === 'password' ? patchPassword : patchDescription
                  }
                  disabled={isMutating}
                >
                  <Text style={styles.buttonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
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
  searchInput: {
    height: 45,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: THEME.card,
  },
  listContainer: {
    paddingBottom: 80,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: THEME.muted,
  },
  card: {
    backgroundColor: THEME.card,
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardHeaderText: {
    flex: 1,
    paddingRight: 6,
  },
  cardBody: {
    marginTop: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: THEME.muted,
    marginBottom: 2,
  },
  revokedText: {
    fontSize: 13,
    color: THEME.danger,
    marginBottom: 2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
  menuWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: THEME.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: THEME.text,
    fontSize: 14,
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
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
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DeviceScreen;

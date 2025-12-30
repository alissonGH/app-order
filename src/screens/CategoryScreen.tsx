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
import { Category } from '../types/models';
import { API_URL } from '../config/api';
import { getToken } from '../auth/tokenStorage';
import { handleAuthErrorResponse } from '../utils/authErrorHandler';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

interface FormState {
  name: string;
}

const CategoryScreen: React.FC = () => {
  const dispatch = useDispatch();

  const getAlertMessage = (e: any, fallback: string) => {
    const msg = typeof e?.message === 'string' ? e.message.trim() : '';
    if (!msg) return fallback;
    if (msg.length > 120) return fallback;
    if (msg.includes('\n') || msg.includes('\r')) return fallback;
    if (/^\d{3}\s*-/.test(msg)) return fallback;
    return msg;
  };

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const [filter, setFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>({ name: '' });

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const handled = await handleAuthErrorResponse(response, dispatch);
        if (handled) return;
        throw new Error('A resposta da rede não foi boa');
      }

      const data: Category[] = await response.json();
      setCategories(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao buscar categorias. Verifique sua conexão e o servidor.', [
        { text: 'OK' },
        { text: 'Tentar novamente', onPress: fetchCategories },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [fetchCategories])
  );

  const deactivateCategory = useCallback(
    async (categoryId: number) => {
      setIsMutating(true);

      try {
        const token = await getToken();
        const response = await fetchWithTimeout(`${API_URL}/categories/${categoryId}/deactivate`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
          const handled = await handleAuthErrorResponse(response, dispatch);
          if (handled) return;

          if (response.status === 409) {
            // não exibir resposta crua do backend
            throw new Error('Categoria já está desativada.');
          }

          const errorText = await response.text();
          console.error('deactivateCategory failed', { categoryId, status: response.status, errorText });
          throw new Error('Falha ao desativar a categoria.');
        }

        await fetchCategories();
      } catch (e: any) {
        console.error(e);
        Alert.alert('Erro', getAlertMessage(e, 'Ocorreu um erro ao desativar a categoria.'));
      } finally {
        setIsMutating(false);
      }
    },
    [dispatch, fetchCategories]
  );

  const handleSave = async () => {
    const name = (form.name || '').toString().trim();

    if (!name) {
      Alert.alert('Erro', 'Nome é obrigatório.');
      return;
    }

    setIsMutating(true);

    try {
      const token = await getToken();

      const payload: any = {
        name,
      };

      const isEdit = editingCategory != null;
      if (isEdit && editingCategory.id == null) {
        throw new Error('Não foi possível editar: categoria sem id.');
      }

      const url = isEdit ? `${API_URL}/categories/${editingCategory!.id}` : `${API_URL}/categories`;

      const response = await fetchWithTimeout(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        timeoutMs: 15000,
      });

      if (!response.ok) {
        const handled = await handleAuthErrorResponse(response, dispatch);
        if (handled) return;
        const errorText = await response.text();
        console.error('saveCategory failed', { method: isEdit ? 'PUT' : 'POST', status: response.status, errorText });
        throw new Error(isEdit ? 'Falha ao atualizar a categoria.' : 'Falha ao criar a categoria.');
      }

      setModalVisible(false);
      setForm({ name: '' });
      setEditingCategory(null);
      await fetchCategories();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', getAlertMessage(e, 'Ocorreu um erro ao salvar a categoria.'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({ name: category.name || '' });
    setModalVisible(true);
  };

  const handleDelete = (categoryId: number) => {
    Alert.alert(
      'Excluir Categoria',
      'Tem certeza de que deseja excluir esta categoria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deactivateCategory(categoryId),
        },
      ]
    );
  };

  const filteredCategories = useMemo(() => {
    const q = (filter || '').toString().trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [categories, filter]);

  const renderItem = ({ item }: { item: Category }) => {
    const isDeleteDisabled = isMutating;

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, isDeleteDisabled && styles.deleteButtonDisabled]}
            disabled={isDeleteDisabled}
            onPress={() => {
              if (isDeleteDisabled) return;
              if (item.id != null) handleDelete(item.id);
            }}
          >
            <Text style={styles.deleteButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categorias</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Filtrar categorias por nome"
        value={filter}
        onChangeText={setFilter}
      />

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>Nenhuma categoria encontrada</Text> : null}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchCategories} colors={[THEME.primary]} tintColor={THEME.primary} />
        }
      />

      {isLoading && !categories.length && (
        <ActivityIndicator size="large" color={THEME.primary} style={StyleSheet.absoluteFill} />
      )}

      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: THEME.primary }]}
        onPress={() => {
          setForm({ name: '' });
          setEditingCategory(null);
          setModalVisible(true);
        }}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.modalContainer]}>
          <View style={[styles.modalContent, { backgroundColor: THEME.card }]}>
            <TouchableOpacity
              style={styles.closeIcon}
              onPress={() => {
                Keyboard.dismiss();
                setModalVisible(false);
              }}
              accessibilityLabel="Fechar modal"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={THEME.muted} />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome"
                value={form.name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              />

              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: THEME.success }, isMutating && styles.saveButtonDisabled]}
                  onPress={handleSave}
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
    backgroundColor: '#f8f8f8',
    padding: 16,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', margin: 20, color: '#111827' },
  searchInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
    backgroundColor: THEME.card,
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.muted,
    fontSize: 16,
    marginTop: 20,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: THEME.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    color: THEME.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardContent: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1,
    paddingRight: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: THEME.primary,
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: THEME.danger,
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  floatingButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 16,
  },
  input: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  modalScroll: { flexGrow: 1, paddingTop: 6 },
});

export default CategoryScreen;

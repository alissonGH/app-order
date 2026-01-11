import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import DropDownPicker from 'react-native-dropdown-picker';
import { THEME } from '../styles/theme';
import { Category, Product } from '../types/models';
import { API_URL } from '../config/api';
import { getToken } from '../auth/tokenStorage';
import { handleAuthErrorResponse } from '../utils/authErrorHandler';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';

interface FormState {
  name: string;
  price: string;
  description: string;
  categoryId: string;
}

const MAX_DESCRIPTION = 500;

const ProductScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const [filter, setFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', price: '', description: '', categoryId: '1' });

  const isLoadingAny = isLoadingProducts || isLoadingCategories;

  const [categoryOpen, setCategoryOpen] = useState<boolean>(false);
  const [categoryValue, setCategoryValue] = useState<number | null>(Number(form.categoryId || 1));
  const [categoryItems, setCategoryItems] = useState<any[]>([]);

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        const handled = await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao buscar produtos.'));
        return;
      }

      const data: Product[] = await response.json();
      setProducts(data);
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao buscar produtos.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [dispatch]);

  const fetchCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        const handled = await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao buscar categorias.'));
        return;
      }

      const data: Category[] = await response.json();
      setCategories(data);
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao buscar categorias.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [dispatch]);

  const deactivateProduct = useCallback(
    async (productId: number) => {
      setIsMutating(true);

      try {
        const token = await getToken();
        const response = await fetchWithTimeout(`${API_URL}/products/${productId}/deactivate`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
          const backendMsg = await extractBackendErrorMessage(response.clone());
          const handled = await handleAuthErrorResponse(response, dispatch);
          Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao desativar o produto.'));
          return;
        }

        await fetchProducts();
      } catch (e: any) {
        Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao desativar o produto.');
      } finally {
        setIsMutating(false);
      }
    },
    [dispatch, fetchProducts]
  );

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCategories();
    }, [fetchProducts, fetchCategories])
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchCategories()]);
  }, [fetchProducts, fetchCategories]);

  useEffect(() => {
    setCategoryItems(
      (categories || [])
        .filter((c) => c.id != null)
        .map((c) => ({ label: c.name, value: c.id, data: c }))
    );
  }, [categories]);

  useEffect(() => {
    const n = Number((form.categoryId || '').toString().trim());
    setCategoryValue(Number.isFinite(n) ? n : null);
  }, [form.categoryId]);

  const handleSave = async () => {
    const name = (form.name || '').toString().trim();
    const priceRaw = (form.price || '').toString().replace(',', '.');
    const priceNumber = parseFloat(priceRaw);
    const description = (form.description || '').toString();
    const categoryIdNumber = Number((form.categoryId || '').toString().trim());

    if (!name || isNaN(priceNumber)) {
      Alert.alert('Erro', 'Nome e preço são obrigatórios e o preço deve ser um número válido.');
      return;
    }

    if (!Number.isFinite(categoryIdNumber) || categoryIdNumber <= 0) {
      Alert.alert('Erro', 'Categoria é obrigatória e deve ser um número válido.');
      return;
    }

    setIsMutating(true);

    try {
      const token = await getToken();

      // Payload conforme backend (ex.: { name, price, categoryId })
      const payload: any = {
        name,
        price: priceNumber,
        categoryId: categoryIdNumber,
        ...(description ? { description } : {}),
      };

      const isEdit = editingProduct != null;
      if (isEdit && editingProduct.id == null) {
        throw new Error('Não foi possível editar: produto sem id.');
      }

      const url = isEdit ? `${API_URL}/products/${editingProduct!.id}` : `${API_URL}/products`;

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
        const backendMsg = await extractBackendErrorMessage(response.clone());
        const handled = await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : isEdit ? 'Falha ao atualizar o produto.' : 'Falha ao criar o produto.'));
        return;
      }

      setModalVisible(false);
      setForm({ name: '', price: '', description: '', categoryId: '1' });
      setEditingProduct(null);
      await fetchProducts();
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao salvar o produto.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toFixed(2).replace('.', ','),
      description: product.description ?? '',
      categoryId: String(product.category?.id ?? 1),
    });
    setModalVisible(true);
  };

  const handleDelete = (productId: number) => {
    Alert.alert(
      'Excluir Produto',
      'Tem certeza de que deseja excluir este produto? Esta ação irá desativá-lo (active = false).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deactivateProduct(productId),
        },
      ]
    );
  };

  const handlePriceChange = (text: string) => {
    const numericValue = text.replace(/\D/g, ''); // Remove caracteres não numéricos
    const formattedValue = (parseFloat(numericValue) / 100).toFixed(2).replace('.', ','); // Converte para formato monetário
    setForm((prev) => ({ ...prev, price: formattedValue }));
  };

  const filteredProducts = useMemo(() => {
    const q = (filter || '').toString().trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => (product.name || '').toLowerCase().includes(q));
  }, [products, filter]);

  const renderItem = ({ item }: { item: Product }) => {
    const isDeleteDisabled = isMutating;
    const categoryLabel = item.category?.name || (item.category?.id != null ? `Categoria #${item.category.id}` : 'Categoria -');

    return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text style={[styles.price, { color: THEME.primary }]}>R$ {item.price.toFixed(2)}</Text>
        {item.description && <Text style={styles.description}>{item.description}</Text>}
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
      <Text style={styles.title}>Produtos</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Filtrar produtos por nome"
        value={filter}
        onChangeText={setFilter}
      />

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto encontrado</Text>}
        refreshControl={
          <RefreshControl refreshing={isLoadingAny} onRefresh={refreshAll} colors={[THEME.primary]} tintColor={THEME.primary} />
        }
      />

      {isLoadingProducts && !products.length && (
        <ActivityIndicator size="large" color={THEME.primary} style={StyleSheet.absoluteFill} />
      )}

      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: THEME.primary }]}
        onPress={() => {
          setForm({ name: '', price: '', description: '', categoryId: '1' });
          setCategoryOpen(false);
          setEditingProduct(null);
          setModalVisible(true);
        }}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalContainer]}
        >
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
              <Text style={styles.title}>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome"
                value={form.name}
                onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Preço"
                value={form.price}
                keyboardType="numeric"
                onChangeText={handlePriceChange}
              />

              <View style={styles.dropdownWrap}>
                <DropDownPicker
                  open={categoryOpen}
                  value={categoryValue}
                  items={categoryItems}
                  setOpen={setCategoryOpen}
                  setValue={(cb) => {
                    const next = cb(categoryValue);
                    setCategoryValue(next);
                    setForm((prev) => ({ ...prev, categoryId: next != null ? String(next) : '' }));
                  }}
                  setItems={setCategoryItems}
                  listMode="SCROLLVIEW"
                  placeholder="Selecione a categoria..."
                  searchable={true}
                  searchPlaceholder="Buscar categoria..."
                  disabled={isLoadingCategories || categoryItems.length === 0}
                  zIndex={2000}
                  style={{
                    borderColor: THEME.border,
                    backgroundColor: THEME.card,
                    marginBottom: categoryOpen ? 200 : 10,
                  }}
                  dropDownContainerStyle={{
                    borderColor: THEME.border,
                    backgroundColor: THEME.card,
                  }}
                  textStyle={{ color: '#111827' }}
                  searchTextInputStyle={{ borderColor: THEME.border }}
                />
              </View>

              <TextInput
                style={[styles.observationsInput, { borderColor: THEME.border, backgroundColor: THEME.card }]}
                placeholder="Descrição"
                placeholderTextColor="#9ca3af"
                value={form.description}
                onChangeText={(text) => {
                  if (text.length <= MAX_DESCRIPTION) setForm((prev) => ({ ...prev, description: text }));
                }}
                multiline
                textAlignVertical="top"
                numberOfLines={4}
                maxLength={MAX_DESCRIPTION}
              />

              <View style={styles.obsCounterRow}>
                <Text style={styles.obsCounterText}>{(form.description || '').length}/{MAX_DESCRIPTION}</Text>
              </View>

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
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", margin: 20, color: "#111827" },
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
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  category: {
    marginTop: 4,
    fontSize: 13,
    color: THEME.muted,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.primary,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: THEME.muted,
    marginTop: 8,
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
    /* background is set inline to THEME.primary */
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    /* color set inline to THEME.primary */
    marginBottom: 16,
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
  dropdownWrap: {
    width: '100%',
    zIndex: 2000,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  observationsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 96,
    marginBottom: 6,
  },
  obsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  obsCounterText: {
    fontSize: 12,
    color: THEME.muted,
  },
  modalScroll: { flexGrow: 1, paddingTop: 6 },
  cancelButton: {
    backgroundColor: THEME.border,
    padding: 10,
    borderRadius: 4,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: THEME.muted,
  },
});

export default ProductScreen;

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../styles/theme';

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
}

interface FormState {
  name: string;
  price: string; // formatted string (e.g. "12,34")
  description: string;
}

const MAX_DESCRIPTION = 500;

const ProductScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([
    { id: 1, name: 'Produto A', price: 199.99, description: 'Descrição do Produto A' },
    { id: 2, name: 'Produto B', price: 49.99, description: 'Descrição do Produto B' },
    { id: 3, name: 'Produto C', price: 99.99, description: 'Descrição do Produto C' },
  ]);

  const [filter, setFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', price: '', description: '' });

  const handleSave = () => {
    // validação: nome e preço são obrigatórios
    const name = (form.name || '').toString().trim();
    const priceRaw = (form.price || '').toString().replace(',', '.');
    const priceNumber = parseFloat(priceRaw);

    if (!name || isNaN(priceNumber)) {
      Alert.alert('Erro', 'Nome e preço são obrigatórios e o preço deve ser um número válido.');
      return;
    }

    if (editingProduct) {
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === editingProduct.id
            ? { ...product, ...form, price: priceNumber }
            : product
        )
      );
    } else {
      const newProduct = {
        id: products.length + 1,
        ...form,
        price: priceNumber,
      };
      setProducts((prevProducts) => [...prevProducts, newProduct]);
    }

    setModalVisible(false);
    setForm({ name: '', price: '', description: '' });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: product.price.toFixed(2).replace('.', ','),
      description: product.description ?? '',
    });
    setModalVisible(true);
  };

  const handleDelete = (productId: number) => {
    Alert.alert(
      'Excluir Produto',
      'Tem certeza de que deseja excluir este produto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setProducts((prevProducts) => prevProducts.filter((product) => product.id !== productId)),
        },
      ]
    );
  };

  const handlePriceChange = (text: string) => {
    const numericValue = text.replace(/\D/g, ''); // Remove caracteres não numéricos
    const formattedValue = (parseFloat(numericValue) / 100).toFixed(2).replace('.', ','); // Converte para formato monetário
    setForm((prev) => ({ ...prev, price: formattedValue }));
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(filter.toLowerCase())
  );

  const renderItem = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={[styles.price, { color: THEME.primary }]}>R$ {item.price.toFixed(2)}</Text>
        {item.description && <Text style={styles.description}>{item.description}</Text>}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
          <Text style={styles.editButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteButtonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum produto encontrado</Text>}
      />

      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: THEME.primary }]}
        onPress={() => {
          setForm({ name: '', price: '', description: '' });
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
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: THEME.success }]} onPress={handleSave}>
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

import React, { useState } from 'react';
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
  Switch
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const OrdersScreen = () => {
  const [orders, setOrders] = useState([
    {
      id: 1,
      customer: 'João Silva',
      tableNumber: 5,
      creationDate: new Date().toISOString(),
      orderStatus: 'PENDING',
      totalValue: 120.5,
      items: [
        { product: { name: 'Pizza Margherita' }, quantity: 1, subTotal: 35.0 },
        { product: { name: 'Refrigerante Lata' }, quantity: 2, subTotal: 15.0 },
        { product: { name: 'Brownie' }, quantity: 2, subTotal: 70.5 },
      ],
    },
    {
      id: 2,
      customer: 'Maria Oliveira',
      tableNumber: 3,
      creationDate: new Date().toISOString(),
      orderStatus: 'CONCLUDED',
      totalValue: 85.0,
      items: [
        { product: { name: 'Pasta Alfredo' }, quantity: 1, subTotal: 50.0 },
        { product: { name: 'Água com Gás' }, quantity: 2, subTotal: 10.0 },
        { product: { name: 'Tiramisu' }, quantity: 1, subTotal: 25.0 },
      ],
    },
    {
      id: 3,
      customer: 'Carlos Pereira',
      tableNumber: 8,
      creationDate: new Date().toISOString(),
      orderStatus: 'PENDING',
      totalValue: 60.0,
      items: [
        { product: { name: 'Hambúrguer' }, quantity: 1, subTotal: 25.0 },
        { product: { name: 'Batata Frita' }, quantity: 1, subTotal: 15.0 },
        { product: { name: 'Cerveja' }, quantity: 2, subTotal: 20.0 },
      ],
    },
    {
      id: 4,
      customer: 'Ana Costa',
      tableNumber: 10,
      creationDate: new Date().toISOString(),
      orderStatus: 'CONCLUDED',
      totalValue: 200.0,
      items: [
        { product: { name: 'Sushi Combo' }, quantity: 2, subTotal: 180.0 },
        { product: { name: 'Chá Verde' }, quantity: 2, subTotal: 20.0 },
      ],
    },
  ]);
  const [filter, setFilter] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer: '',
    tableNumber: '',
    items: [],
  });
  const [products] = useState([
    { id: 1, name: 'Produto A', price: 40.0 },
    { id: 2, name: 'Produto B', price: 25.0 },
    { id: 3, name: 'Produto C', price: 15.5 },
  ]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownItems, setDropdownItems] = useState(
    products.map((product) => ({ label: product.name, value: product.id }))
  );
  const [isConcludedFilter, setIsConcludedFilter] = useState(false); // Estado para alternar entre PENDING e CONCLUDED

  // Filtrar pedidos com base no status selecionado
  const filteredOrders = orders.filter(
    (order) =>
      order.orderStatus === (isConcludedFilter ? 'CONCLUDED' : 'PENDING') &&
      (order.customer.toLowerCase().includes(filter.toLowerCase()) ||
        order.tableNumber.toString().includes(filter))
  );

  const handleAddOrder = () => {
    if (!newOrder.customer || !newOrder.tableNumber || newOrder.items.length === 0) {
      Alert.alert('Erro', 'Preencha todos os campos e adicione ao menos um item.');
      return;
    }

    const id = orders.length + 1;
    const totalValue = newOrder.items.reduce((acc, item) => acc + item.subTotal, 0);

    const orderToAdd = {
      ...newOrder,
      id,
      creationDate: new Date().toISOString(),
      orderStatus: 'PENDING',
      totalValue,
    };

    setOrders([...orders, orderToAdd]);
    setIsModalVisible(false);
    setNewOrder({ customer: '', tableNumber: '', items: [] });
  };
  
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.customer}>Cliente: {item.customer}</Text>
      <Text style={styles.tableNumber}>Mesa: {item.tableNumber}</Text>
      <Text style={styles.date}>
        Data: {new Date(item.creationDate).toLocaleString()}
      </Text>
      <Text style={styles.status}>Status: {item.orderStatus}</Text>
      <Text style={styles.totalValue}>
        Total: R$ {item.totalValue.toFixed(2)}
      </Text>
      <Text style={styles.itemsTitle}>Itens:</Text>
      {item.items.map((orderItem, idx) => (
        <Text style={styles.item} key={idx}>
          - {orderItem.product.name} (x{orderItem.quantity}) - R${' '}
          {orderItem.subTotal.toFixed(2)}
        </Text>
      ))}
      {!isConcludedFilter && 
      <View style={styles.cardButtons}>
        <TouchableOpacity style={styles.concludeButton} onPress={() => handleConcludeOrder(item.id)}>
          <Text style={styles.buttonText}>Concluir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditOrder(item)}>
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteOrder(item.id)}>
          <Text style={styles.buttonText}>Excluir</Text>
        </TouchableOpacity>
      </View>}
    </View>
  );

  const handleConcludeOrder = (orderId) => {
    Alert.alert(
      'Confirmar finalizaçao',
      'Tem certeza que deseja concluir este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          style: 'destructive',
          onPress: () => {
          },
        },
      ]
    );
  }

  const handleEditOrder = (order) => {
    setNewOrder(order); // Preenche os dados do pedido no formulário.
    setIsModalVisible(true); // Abre o modal para edição.
  };

  const handleDeleteOrder = (orderId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setOrders((prevOrders) =>
              prevOrders.filter((order) => order.id !== orderId)
            );
          },
        },
      ]
    );
  };
  
  const handleAddProductToOrder = () => {
    if (!selectedProductId || !quantity) {
      Alert.alert('Erro', 'Selecione um produto e insira a quantidade.');
      return;
    }
  
    const product = products.find((p) => p.id === selectedProductId);
    const subTotal = product.price * parseInt(quantity);
  
    setNewOrder((prev) => {
      const updatedItems = [...prev.items, { product, quantity: parseInt(quantity), subTotal }];
      const totalValue = updatedItems.reduce((acc, item) => acc + item.subTotal, 0);
  
      return {
        ...prev,
        items: updatedItems,
        totalValue,
      };
    });
    setSelectedProductId(null);
    setQuantity('');
  };
  
  const handleRemoveItem = (index) => {
    setNewOrder((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const totalValue = updatedItems.reduce((acc, item) => acc + item.subTotal, 0);
  
      return {
        ...prev,
        items: updatedItems,
        totalValue,
      };
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pedidos</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Filtrar por cliente ou mesa"
        value={filter}
        onChangeText={setFilter}
      />

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          Exibindo: {isConcludedFilter ? 'Concluídos' : 'Pendentes'}
        </Text>
        <Switch
          value={isConcludedFilter}
          onValueChange={setIsConcludedFilter}
          thumbColor={isConcludedFilter ? '#FFA500' : '#008CBA'}
          trackColor={{ false: '#ccc', true: '#ddd' }}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pedido encontrado</Text>}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalTitle}>Novo Pedido</Text>

              <TextInput
                style={styles.input}
                placeholder="Nome do Cliente"
                value={newOrder.customer}
                onChangeText={(text) =>
                  setNewOrder((prev) => ({ ...prev, customer: text }))
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Número da Mesa"
                keyboardType="numeric"
                value={newOrder.tableNumber}
                onChangeText={(text) =>
                  setNewOrder((prev) => ({ ...prev, tableNumber: text }))
                }
              />

              <Text style={styles.itemsTitle}>Adicionar Produto</Text>
              <DropDownPicker
                open={dropdownOpen}
                value={selectedProductId}
                items={dropdownItems}
                setOpen={setDropdownOpen}
                setValue={setSelectedProductId}
                setItems={setDropdownItems}
                placeholder="Selecione um produto"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
              />

              <TextInput
                style={styles.input}
                placeholder="Quantidade"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />

              <TouchableOpacity style={styles.addProductButton} onPress={handleAddProductToOrder}>
                <Text style={styles.addProductButtonText}>Adicionar Produto</Text>
              </TouchableOpacity>

              <Text style={styles.itemsTitle}>Itens do Pedido</Text>
              {newOrder.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.item}>
                    {item.product.name} (x{item.quantity}) - R$ {item.subTotal.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.totalLabel}>
                Valor Total: R$ {newOrder.items.reduce((acc, item) => acc + item.subTotal, 0).toFixed(2)}
              </Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.button} onPress={handleAddOrder}>
                <Text style={styles.buttonText}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Botão Flutuante */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customer: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tableNumber: {
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  item: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  addProductButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  addProductButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  removeButton: {
    backgroundColor: '#dc3545',
    padding: 5,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
    color: '#333',
  },
  cardButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  concludeButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  editButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusButton: {
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusButtonPending: {
    backgroundColor: '#28a745', // Verde para "Iniciar"
  },
  statusButtonDoing: {
    backgroundColor: '#FFA500', // Laranja para "FAZENDO"
  },
  statusButtonCompleted: {
    backgroundColor: '#6c757d', // Cinza para "CONCLUÍDO"
  },
  statusButtonText: {
    color: '#fff', // Branco para contraste
    fontWeight: 'bold', // Texto em negrito para destaque
    textAlign: 'center', // Centraliza o texto dentro do botão
    fontSize: 14, // Tamanho de texto padrão
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrdersScreen;
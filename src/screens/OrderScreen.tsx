import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OrderModal from "../components/OrderModal";
import printOrder from "../utils/printer";
import { THEME } from "../styles/theme";

const productsList = [
  { id: 1, name: "Produto A", price: 40.0 },
  { id: 2, name: "Produto B", price: 25.0 },
  { id: 3, name: "Produto C", price: 15.5 },
  { id: 4, name: "Produto D", price: 30.0 },
  { id: 5, name: "Produto E", price: 20.0 },
  { id: 6, name: "Produto F", price: 50.0 },
  { id: 7, name: "Produto G", price: 10.0 },
  { id: 8, name: "Produto H", price: 22.5 },
  { id: 9, name: "Produto I", price: 35.0 },
  { id: 10, name: "Produto J", price: 18.0 },
];

import { Order } from "../types/models";

const truncate = (str: string | undefined, n: number) => {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trimEnd() + "…" : str;
};

const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isConcludedFilter, setIsConcludedFilter] = useState<boolean>(false);

  // novo estado para filtro por cliente/mesa
  const [filterText, setFilterText] = useState<string>("");

  // Filtra por status (PENDING/CONCLUDED) e por texto (cliente ou mesa)
  const filteredOrders = useMemo(() => {
    const status = isConcludedFilter ? "CONCLUDED" : "PENDING";
    const q = (filterText || "").toString().trim().toLowerCase();

    return orders
      .filter((order) => order.orderStatus === status)
      .filter((order) => {
        if (!q) return true;
        const customer = (order.customer || "").toString().toLowerCase();
        const table = (order.tableNumber || "").toString().toLowerCase();
        return customer.includes(q) || table.includes(q);
      });
  }, [orders, isConcludedFilter, filterText]);

  const handleOpenNew = () => {
    setEditingOrder(null);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setIsModalVisible(true);
  };

  const handleSaveOrder = (order: Order) => {
    if (order.id) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    } else {
      const id = orders.length > 0 ? Math.max(...orders.map((o) => o.id ?? 0)) + 1 : 1;
      const newOrder: Order = {
        ...order,
        id,
        creationDate: new Date().toISOString(),
        orderStatus: "PENDING",
      };
      setOrders((prev) => [...prev, newOrder]);
    }
    setIsModalVisible(false);
    setEditingOrder(null);
  };

  const handleConcludeOrder = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    Alert.alert(
      "Confirmar conclusão",
      `Deseja marcar o pedido #${orderId} como concluído?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId ? { ...o, orderStatus: "CONCLUDED", concludedDate: new Date().toISOString() } : o
              )
            );
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCancelOrder = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    Alert.alert(
      "Confirmar cancelamento",
      `Deseja cancelar o pedido #${orderId}? Esta ação marcará o pedido como "CANCELED".`,
      [
        { text: "Manter", style: "cancel" },
        {
          text: "Cancelar pedido",
          onPress: () => {
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, orderStatus: "CANCELED", canceledDate: new Date().toISOString() } : o)));
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  const handlePrintFromList = async (order: Order) => {
    const res = await printOrder(order);
    console.log("Resultado da impressão:", res);
    if (res.success) {
      Alert.alert("Impressão", "Pedido enviado para a impressora com sucesso.");
    } else {
      Alert.alert("Erro de Impressão", res.message || "Ocorreu um erro ao tentar imprimir o pedido.");
    }
  };

  const computeOrderTotal = (order?: Order | null) => {
    if (!order) return 0;
    if (typeof order.totalValue === "number") return order.totalValue;
    if (Array.isArray(order.items)) {
      return order.items.reduce((acc, it) => acc + Number(it.subTotal ?? (it.product?.price ?? 0) * (it.quantity ?? 0)), 0);
    }
    return 0;
  };

  const renderItem = ({ item }: { item: Order }) => {
    const displayTotal = computeOrderTotal(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.customer}>Cliente: {item.customer}</Text>
            <Text style={styles.tableNumber}>Mesa: {item.tableNumber}</Text>
            <Text style={styles.date}>{item.creationDate ? new Date(item.creationDate).toLocaleString() : ''}</Text>
            {item.observations ? <Text style={styles.obsPreview}>{truncate(item.observations, 80)}</Text> : null}
          </View>

          <View style={styles.statusWrap}>
            <Text style={[styles.status, item.orderStatus === "CONCLUDED" && { color: THEME.success }]}>{translateStatus(item.orderStatus)}</Text>
            <Text style={styles.totalValue}>R$ {Number(displayTotal ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => handlePrintFromList(item)}>
              <Ionicons name="print" size={18} color={THEME.muted} />
              <Text style={styles.iconLabel}>Imprimir</Text>
            </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => handleOpenEdit(item)}>
            <Ionicons name="create-outline" size={18} color={THEME.primary} />
            <Text style={[styles.iconLabel, { color: THEME.primary }]}>Editar</Text>
          </TouchableOpacity>

          {item.orderStatus !== "CONCLUDED" && item.orderStatus !== "CANCELED" && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={() => item.id != null && handleConcludeOrder(item.id)}>
                <Ionicons name="checkmark-done-outline" size={18} color={THEME.success} />
                <Text style={[styles.iconLabel, { color: THEME.success }]}>Concluir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={() => item.id != null && handleCancelOrder(item.id)}>
                <Ionicons name="close-circle-outline" size={18} color={THEME.danger} />
                <Text style={[styles.iconLabel, { color: THEME.danger }]}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: THEME.background }]}>
      <Text style={styles.title}>Pedidos</Text>

      {/* Campo de busca por cliente ou mesa */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={THEME.muted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Buscar por cliente ou mesa..."
            placeholderTextColor="#9ca3af"
            value={filterText}
            onChangeText={setFilterText}
            style={styles.searchInput}
          />
          {filterText.length > 0 && (
            <TouchableOpacity onPress={() => setFilterText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={THEME.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Exibindo: {isConcludedFilter ? "Concluídos" : "Pendentes"}</Text>
        <Switch
          value={isConcludedFilter}
          onValueChange={setIsConcludedFilter}
          thumbColor={isConcludedFilter ? THEME.primary : THEME.primary}
          trackColor={{ false: THEME.border, true: "#ddd" }}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => (item.id ?? 0).toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum pedido encontrado</Text>}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <OrderModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        initialOrder={editingOrder}
        products={productsList}
      />

      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: THEME.primary }]} onPress={handleOpenNew}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
  {/* Bluetooth picker removed */}
    </View>
  );
};

const translateStatus = (s?: string | null) => {
  if (!s) return "";
  switch (s) {
    case "CONCLUDED":
      return "Concluído";
    case "PENDING":
      return "Pendente";
    case "CANCELED":
      return "Cancelado";
    default:
      return s;
  }
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", margin: 20, color: "#111827" },
  /* busca */
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.card,
    borderColor: THEME.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  card: {
    backgroundColor: THEME.card,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  cardLeft: { flex: 1 },
  customer: { fontSize: 16, fontWeight: "700", color: "#111827" },
  tableNumber: { fontSize: 14, color: THEME.muted },
  date: { fontSize: 12, color: "#9ca3af" },
  obsPreview: { marginTop: 6, color: THEME.muted, fontSize: 13 },
  statusWrap: { alignItems: "flex-end" },
  status: { fontSize: 14, fontWeight: "700", marginVertical: 5, color: THEME.muted },
  totalValue: { fontSize: 16, fontWeight: "700", color: THEME.success },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 20 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: "center",
  },
  switchLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  floatingButtonText: { color: "#fff", fontSize: 28, fontWeight: "700" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 10,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  iconLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
  },

  viewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 16,
  },
  viewModal: {
    borderRadius: 10,
    padding: 16,
    maxHeight: "80%",
  },
  viewModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  viewModalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  viewModalHeaderRight: { flexDirection: "row", alignItems: "center" },
  viewModalFooter: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end" },
  footerButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  footerButtonLabel: { marginLeft: 8, fontWeight: "700", color: "#fff" },
});
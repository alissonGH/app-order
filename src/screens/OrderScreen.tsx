import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OrderModal from "../components/OrderModal";
import { THEME } from "../styles/theme";

/**
 * OrdersScreen atualizado para:
 * - exibir preview das observações (resumo) no card (limitado a 80 chars)
 * - manter demais funcionalidades e confirmações
 */

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

const truncate = (str, n) => {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trimEnd() + "…" : str;
};

const OrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isConcludedFilter, setIsConcludedFilter] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  const filteredOrders = orders.filter(
    (order) => order.orderStatus === (isConcludedFilter ? "CONCLUDED" : "PENDING")
  );

  const handleOpenNew = () => {
    setEditingOrder(null);
    setIsModalVisible(true);
  };

  const handleOpenEdit = (order) => {
    setEditingOrder(order);
    setIsModalVisible(true);
  };

  const handleSaveOrder = (order) => {
    if (order.id) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o)));
    } else {
      const id = orders.length > 0 ? Math.max(...orders.map((o) => o.id)) + 1 : 1;
      const newOrder = {
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

  const handleConcludeOrder = (orderId) => {
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

  const handleCancelOrder = (orderId) => {
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

  const handleViewOrder = (order) => {
    setViewingOrder(order);
  };

  const closeViewModal = () => setViewingOrder(null);

  const computeOrderTotal = (order) => {
    if (!order) return 0;
    if (typeof order.totalValue === "number") return order.totalValue;
    if (Array.isArray(order.items)) {
      return order.items.reduce((acc, it) => acc + Number(it.subTotal ?? (it.product?.price ?? 0) * (it.quantity ?? 0)), 0);
    }
    return 0;
  };

  const renderItem = ({ item }) => {
    const displayTotal = computeOrderTotal(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.customer}>Cliente: {item.customer}</Text>
            <Text style={styles.tableNumber}>Mesa: {item.tableNumber}</Text>
            <Text style={styles.date}>{new Date(item.creationDate).toLocaleString()}</Text>
            {item.observations ? (
              <Text style={styles.obsPreview}>{truncate(item.observations, 80)}</Text>
            ) : null}
          </View>

          <View style={styles.statusWrap}>
            <Text style={[styles.status, item.orderStatus === "CONCLUDED" && { color: THEME.success }]}>
              {item.orderStatus}
            </Text>
            <Text style={styles.totalValue}>R$ {Number(displayTotal ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => handleViewOrder(item)}>
            <Ionicons name="eye" size={18} color={THEME.muted} />
            <Text style={styles.iconLabel}>Visualizar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={() => handleOpenEdit(item)}>
            <Ionicons name="create-outline" size={18} color={THEME.primary} />
            <Text style={[styles.iconLabel, { color: THEME.primary }]}>Editar</Text>
          </TouchableOpacity>

          {item.orderStatus !== "CONCLUDED" && item.orderStatus !== "CANCELED" && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={() => handleConcludeOrder(item.id)}>
                <Ionicons name="checkmark-done-outline" size={18} color={THEME.success} />
                <Text style={[styles.iconLabel, { color: THEME.success }]}>Concluir</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.iconButton} onPress={() => handleCancelOrder(item.id)}>
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
        keyExtractor={(item) => item.id.toString()}
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

      <Modal visible={!!viewingOrder} animationType="slide" transparent>
        <View style={styles.viewModalOverlay}>
          <View style={[styles.viewModal, { backgroundColor: THEME.card }]}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Pedido #{viewingOrder?.id}</Text>
              <TouchableOpacity onPress={closeViewModal}>
                <Ionicons name="close" size={22} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Cliente: {viewingOrder?.customer}</Text>
              <Text style={{ marginBottom: 6 }}>Mesa: {viewingOrder?.tableNumber}</Text>
              <Text style={{ marginBottom: 12 }}>Status: {viewingOrder?.orderStatus}</Text>

              <Text style={{ fontWeight: "600", marginBottom: 6 }}>Itens:</Text>
              {viewingOrder?.items?.map((it, idx) => {
                const itSub = Number(it.subTotal ?? (it.product?.price ?? 0) * (it.quantity ?? 0));
                return (
                  <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text>{it.product?.name ?? "Produto"} x{it.quantity ?? 0}</Text>
                    <Text>R$ {itSub.toFixed(2)}</Text>
                  </View>
                );
              })}

              <Text style={{ fontWeight: "700", marginTop: 12 }}>
                Total: R$ {Number(computeOrderTotal(viewingOrder) ?? 0).toFixed(2)}
              </Text>

              {/* Exibição das observações */}
              {viewingOrder?.observations ? (
                <>
                  <Text style={{ fontWeight: "600", marginTop: 12 }}>Observações:</Text>
                  <Text style={{ color: THEME.muted, marginTop: 6 }}>{viewingOrder.observations}</Text>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", margin: 20, color: "#111827" },
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
});
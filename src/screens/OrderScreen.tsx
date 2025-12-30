import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import OrderModal from "../components/OrderModal";
import printOrder from "../utils/printer";
import { THEME } from "../styles/theme";
import { API_URL } from "../config/api";
import { Order, Product } from "../types/models";
import { CreateOrderDTO, UpdateOrderDTO } from "../types/orderDtos";
import { getToken } from "../auth/tokenStorage";
import { handleAuthErrorResponse } from "../utils/authErrorHandler";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

const truncate = (str: string | undefined, n: number) => {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trimEnd() + "…" : str;
};

const OrdersScreen: React.FC = () => {
  const dispatch = useDispatch();

  const getAlertMessage = (e: any, fallback: string) => {
    const msg = typeof e?.message === 'string' ? e.message.trim() : '';
    if (!msg) return fallback;
    if (msg.length > 120) return fallback;
    if (msg.includes('\n') || msg.includes('\r')) return fallback;
    if (/^\d{3}\s*-/.test(msg)) return fallback;
    return msg;
  };
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isConcludedFilter, setIsConcludedFilter] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>("");

  const isLoadingAny = isLoading || isLoadingProducts;

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const response = await fetchWithTimeout(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });
      if (!response.ok) {
        const handled = await handleAuthErrorResponse(response, dispatch);
        if (handled) return;
        throw new Error("A resposta da rede não foi boa");
      }
      const data: Order[] = await response.json();
      setOrders(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao buscar pedidos. Verifique sua conexão e o servidor.', [
        { text: 'OK' },
        { text: 'Tentar novamente', onPress: fetchOrders },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

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
        const handled = await handleAuthErrorResponse(response, dispatch);
        if (handled) return;
        throw new Error("A resposta da rede não foi boa");
      }

      const data: Product[] = await response.json();
      setProducts(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Erro', 'Falha ao buscar produtos. Verifique sua conexão e o servidor.', [
        { text: 'OK' },
        { text: 'Tentar novamente', onPress: fetchProducts },
      ]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      fetchProducts();
    }, [fetchOrders, fetchProducts])
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchProducts()]);
  }, [fetchOrders, fetchProducts]);

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

  const handleSaveOrder = async (order: Order) => {
    const customer = (order.customer ?? "").trim();
    const tableNumber = Number(order.tableNumber ?? 0);
    const observation = (order.observation ?? "").trim();

    const itemsPayload = (order.items || [])
      .map((item: any) => {
        const productId = item.product?.id;
        const quantity = Number(item.quantity ?? 0);
        if (productId == null || !Number.isFinite(quantity) || quantity <= 0) return null;
        return { productId: Number(productId), quantity: Math.trunc(quantity) };
      })
      .filter((x): x is { productId: number; quantity: number } => x != null);

    if (!customer) {
      Alert.alert('Erro', 'Informe o nome do cliente.');
      return;
    }
    if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
      Alert.alert('Erro', 'Número da mesa precisa ser maior que zero.');
      return;
    }
    if (!itemsPayload.length) {
      Alert.alert('Erro', 'Pedido precisa de pelo menos um item válido.');
      return;
    }

    if (!order.id) {
      setIsLoading(true);
      try {
        const token = await getToken();
        const payload: CreateOrderDTO = {
          customer,
          tableNumber,
          items: itemsPayload,
          ...(observation ? { observation } : {}),
        };

        const response = await fetchWithTimeout(`${API_URL}/orders`, {
          method: 'POST',
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
          const errorData = await response.text();
          console.error('createOrder failed', { status: response.status, errorData });
          throw new Error('Falha ao criar o pedido.');
        }

        setIsModalVisible(false);
        setEditingOrder(null);
        fetchOrders();
        return;

      } catch (e: any) {
        console.error('createOrder error', e);
        Alert.alert('Erro', getAlertMessage(e, 'Ocorreu um erro ao salvar o pedido.'));
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const token = await getToken();
        const payload: UpdateOrderDTO = {
          customer,
          tableNumber,
          items: itemsPayload,
          ...(observation ? { observation } : {}),
        };

        const response = await fetchWithTimeout(`${API_URL}/orders/${order.id}`, {
          method: 'PUT',
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
          const errorData = await response.text();
          console.error('updateOrder failed', { status: response.status, errorData });
          throw new Error('Falha ao atualizar o pedido.');
        }

        setIsModalVisible(false);
        setEditingOrder(null);
        fetchOrders();
      } catch (e: any) {
        console.error('updateOrder error', e);
        Alert.alert('Erro', getAlertMessage(e, 'Ocorreu um erro ao atualizar o pedido.'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const patchOrderStatus = useCallback(
    async (orderId: number, status: "CANCELED" | "CONCLUDED") => {
      setIsLoading(true);

      try {
        const token = await getToken();
        const statusParam = encodeURIComponent(status);
        const response = await fetchWithTimeout(`${API_URL}/orders/${orderId}/status?status=${statusParam}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeoutMs: 15000,
        });

        if (!response.ok) {
          const handled = await handleAuthErrorResponse(response, dispatch);
          if (handled) return;
          const errorData = await response.text();
          console.error('patchOrderStatus failed', { orderId, status, httpStatus: response.status, errorData });
          throw new Error('Falha ao atualizar o status do pedido.');
        }

        await fetchOrders();
      } catch (e: any) {
        console.error('patchOrderStatus error', e);
        Alert.alert('Erro', getAlertMessage(e, 'Ocorreu um erro ao atualizar o status do pedido.'));
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, fetchOrders]
  );

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
          onPress: () => patchOrderStatus(orderId, "CONCLUDED"),
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
      `Deseja cancelar o pedido #${orderId}?`,
      [
        { text: "Manter", style: "cancel" },
        {
          text: "Cancelar pedido",
          onPress: () => patchOrderStatus(orderId, "CANCELED"),
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
    const isActionDisabled = isLoading;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.customer}>Cliente: {item.customer}</Text>
            <Text style={styles.tableNumber}>Mesa: {item.tableNumber}</Text>
            <Text style={styles.date}>{item.creationDate ? new Date(item.creationDate).toLocaleString() : ''}</Text>
            {item.observation ? <Text style={styles.obsPreview}>{truncate(item.observation, 80)}</Text> : null}
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
              <TouchableOpacity
                style={[styles.iconButton, isActionDisabled && styles.iconButtonDisabled]}
                onPress={() => !isActionDisabled && item.id != null && handleConcludeOrder(item.id)}
                disabled={isActionDisabled}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={THEME.success} />
                <Text style={[styles.iconLabel, { color: THEME.success }]}>Concluir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, isActionDisabled && styles.iconButtonDisabled]}
                onPress={() => !isActionDisabled && item.id != null && handleCancelOrder(item.id)}
                disabled={isActionDisabled}
              >
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
            placeholderTextColor={THEME.muted}
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
        ListEmptyComponent={!isLoadingAny ? <Text style={styles.emptyText}>Nenhum pedido encontrado</Text> : null}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isLoadingAny} onRefresh={refreshAll} colors={[THEME.primary]} tintColor={THEME.primary} />
        }
      />

      {isLoadingAny && !orders.length && (
         <ActivityIndicator size="large" color={THEME.primary} style={StyleSheet.absoluteFill} />
      )}

      <OrderModal
        isVisible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        initialOrder={editingOrder}
        products={products}
      />

      <TouchableOpacity style={[styles.floatingButton, { backgroundColor: THEME.primary }]} onPress={handleOpenNew}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
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
  iconButtonDisabled: {
    opacity: 0.5,
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
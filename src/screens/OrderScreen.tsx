import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import colors from "../styles/colors";
import { API_URL } from "../config/api";
import { Order, Product } from "../types/models";
import { CreateOrderDTO, UpdateOrderDTO } from "../types/orderDtos";
import { getToken } from "../auth/tokenStorage";
import { handleAuthErrorResponse } from "../utils/authErrorHandler";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";
import { extractBackendErrorMessage, normalizeMessage } from "../utils/backendErrorMessage";

type EOrderStatus = 'PENDING' | 'IN_PREPARING' | 'PREPARED' | 'CANCELED' | 'CONCLUDED';

const STATUS_LABELS_PT: Record<EOrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PREPARING: 'Em preparação',
  PREPARED: 'Pronto',
  CANCELED: 'Cancelado',
  CONCLUDED: 'Concluído',
};

const STATUS_COLORS: Record<EOrderStatus, string> = {
  PENDING: colors.primary,
  IN_PREPARING: colors.warning,
  PREPARED: THEME.primary,
  CANCELED: THEME.danger,
  CONCLUDED: THEME.success,
};

const truncate = (str: string | undefined, n: number) => {
  if (!str) return "";
  return str.length > n ? str.slice(0, n).trimEnd() + "…" : str;
};

const OrdersScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<EOrderStatus>('PENDING');
  const [filterText, setFilterText] = useState<string>("");

  const [openStatusMenuId, setOpenStatusMenuId] = useState<number | null>(null);

  const isLoadingAny = isLoading || isLoadingProducts;

  const fetchOrders = useCallback(async (orderStatus?: EOrderStatus) => {
    setIsLoading(true);
    try {
      const token = await getToken();

      const url = orderStatus
        ? `${API_URL}/orders?orderStatus=${encodeURIComponent(orderStatus)}`
        : `${API_URL}/orders`;

      const response = await fetchWithTimeout(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeoutMs: 10000,
      });
      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        const handled = await handleAuthErrorResponse(response, dispatch);
        Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao buscar pedidos.'));
        return;
      }
      const data: Order[] = await response.json();
      setOrders(data);
    } catch (e: any) {
      Alert.alert('Erro', normalizeMessage(e) ?? 'Falha ao buscar pedidos.');
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

  useFocusEffect(
    useCallback(() => {
      fetchOrders(selectedStatus);
      fetchProducts();
    }, [fetchOrders, fetchProducts, selectedStatus])
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOrders(selectedStatus), fetchProducts()]);
  }, [fetchOrders, fetchProducts, selectedStatus]);

  const filteredOrders = useMemo(() => {
    const q = (filterText || "").toString().trim().toLowerCase();

    return orders
      .filter((order) => {
        if (!q) return true;
        const customer = (order.customer || "").toString().toLowerCase();
        const table = (order.tableNumber || "").toString().toLowerCase();
        return customer.includes(q) || table.includes(q);
      });
  }, [orders, filterText]);

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
          const backendMsg = await extractBackendErrorMessage(response.clone());
          const handled = await handleAuthErrorResponse(response, dispatch);
          Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao criar o pedido.'));
          return;
        }

        setIsModalVisible(false);
        setEditingOrder(null);
        fetchOrders(selectedStatus);
        return;

      } catch (e: any) {
        Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao salvar o pedido.');
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
          const backendMsg = await extractBackendErrorMessage(response.clone());
          const handled = await handleAuthErrorResponse(response, dispatch);
          Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao atualizar o pedido.'));
          return;
        }

        setIsModalVisible(false);
        setEditingOrder(null);
        fetchOrders(selectedStatus);
      } catch (e: any) {
        Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao atualizar o pedido.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const patchOrderStatus = useCallback(
    async (orderId: number, status: EOrderStatus) => {
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
          const backendMsg = await extractBackendErrorMessage(response.clone());
          const handled = await handleAuthErrorResponse(response, dispatch);
          Alert.alert('Erro', backendMsg ?? (handled ? 'Sessão expirada.' : 'Falha ao atualizar o status do pedido.'));
          return;
        }

        let updated: Order | null = null;
        try {
          updated = (await response.json()) as Order;
        } catch {
          updated = null;
        }

        if (updated && updated.id != null) {
          setOrders((prev) => prev.map((o) => (o.id === updated!.id ? { ...o, ...updated! } : o)));
        } else {
          await fetchOrders(selectedStatus);
        }
      } catch (e: any) {
        Alert.alert('Erro', normalizeMessage(e) ?? 'Ocorreu um erro ao atualizar o status do pedido.');
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, fetchOrders, selectedStatus]
  );

  const confirmChangeStatus = (orderId: number, nextStatus: EOrderStatus) => {
    Alert.alert(
      'Confirmar alteração',
      'Deseja realmente alterar o status do pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => patchOrderStatus(orderId, nextStatus),
        },
      ],
      { cancelable: true }
    );
  };

  const handlePrintFromList = async (order: Order) => {
    const res = await printOrder(order);
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
    const status = (item.orderStatus || 'PENDING') as EOrderStatus;
    const isFinalStatus = status === 'CONCLUDED' || status === 'CANCELED';
    const menuOpen = item.id != null && openStatusMenuId === item.id;

    const statusOptions = (Object.keys(STATUS_LABELS_PT) as EOrderStatus[]).filter((s) => s !== status);

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

          {!isFinalStatus && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={() => handleOpenEdit(item)}>
                <Ionicons name="create-outline" size={18} color={THEME.primary} />
                <Text style={[styles.iconLabel, { color: THEME.primary }]}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, isActionDisabled && styles.iconButtonDisabled]}
                onPress={() => {
                  if (isActionDisabled || item.id == null) return;
                  setOpenStatusMenuId((prev) => (prev === item.id ? null : item.id!));
                }}
                disabled={isActionDisabled}
              >
                <Ionicons name="swap-vertical" size={18} color={THEME.muted} />
                <Text style={styles.iconLabel}>Status</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {menuOpen && !isFinalStatus && (
          <View style={styles.statusMenuWrap}>
            {statusOptions.map((s, idx) => {
              const isLast = idx === statusOptions.length - 1;
              const label = STATUS_LABELS_PT[s];
              const statusColor = STATUS_COLORS[s];

              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusMenuItem, isLast && styles.statusMenuItemLast]}
                  onPress={() => {
                    if (item.id == null) return;
                    setOpenStatusMenuId(null);
                    confirmChangeStatus(item.id, s);
                  }}
                >
                  <View style={styles.statusMenuItemContent}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusMenuItemText, { color: statusColor }]}>{label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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

      <View style={styles.statusFilterWrap}>
        <Text style={styles.statusFilterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilterList}>
          {(Object.keys(STATUS_LABELS_PT) as EOrderStatus[]).map((s) => {
            const isSelected = s === selectedStatus;
            return (
              <TouchableOpacity
                key={s}
                style={[styles.statusPill, isSelected ? styles.statusPillSelected : styles.statusPillUnselected]}
                onPress={() => {
                  if (isLoading) return;
                  setOpenStatusMenuId(null);
                  setSelectedStatus(s);
                  fetchOrders(s);
                }}
                disabled={isLoading}
              >
                <Text style={[styles.statusPillText, isSelected ? styles.statusPillTextSelected : styles.statusPillTextUnselected]}>
                  {STATUS_LABELS_PT[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
    case "IN_PREPARING":
      return "Em preparação";
    case "PREPARED":
      return "Pronto";
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
  statusFilterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  statusFilterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: "#111827",
    marginRight: 10,
  },
  statusFilterList: {
    paddingRight: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  statusPillSelected: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  statusPillUnselected: {
    backgroundColor: THEME.card,
    borderColor: THEME.border,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPillTextSelected: {
    color: '#fff',
  },
  statusPillTextUnselected: {
    color: THEME.muted,
  },
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
    justifyContent: "flex-end",
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

  statusMenuWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: THEME.card,
  },
  statusMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statusMenuItemLast: {
    borderBottomWidth: 0,
  },
  statusMenuItemText: {
    color: THEME.text,
    fontSize: 14,
    fontWeight: '600',
  },

  statusMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
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
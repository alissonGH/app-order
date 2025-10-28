import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProductDropdown from "./ProductDropdown";
import { THEME } from "../styles/theme";

/**
 * OrderModal atualizado:
 * - campo `observations` (multiline) com contador de caracteres
 * - observations carregado de initialOrder, incluído no snapshot e enviado em onSave
 */

const MAX_OBSERVATIONS = 1000;

const OrderModal = ({ isVisible, onClose, onSave, initialOrder = null, products = [] }) => {
  const [customer, setCustomer] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [items, setItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [observations, setObservations] = useState(""); // novo campo

  const originalSnapshot = useRef(null);

  useEffect(() => {
    if (isVisible) {
      if (initialOrder) {
        setCustomer(initialOrder.customer || "");
        setTableNumber(String(initialOrder.tableNumber || ""));
        setObservations(initialOrder.observations ?? ""); // carregar observations
        // normalize items: garantir quantity e subTotal
        const normalized = (initialOrder.items || []).map((it) => {
          const qty = Number(it.quantity ?? it.qty ?? 0);
          const price = Number(it.product?.price ?? 0);
          const subTotal = Number(it.subTotal ?? price * qty);
          return {
            ...it,
            quantity: qty,
            subTotal,
            product: it.product ?? { id: it.product?.id ?? null, name: it.product?.name ?? "Produto", price },
          };
        });
        setItems(normalized);
      } else {
        setCustomer("");
        setTableNumber("");
        setItems([]);
        setObservations("");
      }
      setSelectedProduct(null);
      setQuantity("");

      setTimeout(() => {
        originalSnapshot.current = takeSnapshot();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrder, isVisible]);

  const takeSnapshot = () => ({
    customer: customer || "",
    tableNumber: String(tableNumber || ""),
    items: (items || []).map((it) => ({ id: it.product?.id, qty: it.quantity })),
    observations: observations ?? "",
  });

  const hasUnsavedChanges = () => {
    const orig = originalSnapshot.current;
    if (!orig) return false;
    const cur = takeSnapshot();
    if (orig.customer !== cur.customer) return true;
    if (orig.tableNumber !== cur.tableNumber) return true;
    if ((orig.items || []).length !== (cur.items || []).length) return true;
    for (let i = 0; i < (orig.items || []).length; i++) {
      const a = orig.items[i];
      const b = cur.items[i];
      if (!a || !b) return true;
      if (a.id !== b.id || a.qty !== b.qty) return true;
    }
    if ((orig.observations || "") !== (cur.observations || "")) return true;
    return false;
  };

  const resetAndClose = () => {
    setCustomer("");
    setTableNumber("");
    setItems([]);
    setSelectedProduct(null);
    setQuantity("");
    setObservations("");
    originalSnapshot.current = null;
    onClose();
  };

  const handleCloseRequest = () => {
    Keyboard.dismiss();
    if (!hasUnsavedChanges()) {
      resetAndClose();
      return;
    }

    Alert.alert(
      "Alterações não salvas",
      "Você tem alterações não salvas. Deseja salvar antes de sair?",
      [
        { text: "Continuar editando", style: "cancel" },
        { text: "Descartar", onPress: () => resetAndClose(), style: "destructive" },
        { text: "Salvar", onPress: () => handleSave(true) },
      ],
      { cancelable: true }
    );
  };

  const handleAddProduct = () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) {
      Alert.alert("Erro", "Selecione um produto e informe uma quantidade válida.");
      return;
    }

    const qty = Number(quantity);
    const price = Number(selectedProduct?.price ?? 0);
    const subTotal = price * qty;

    const existingIndex = items.findIndex((it) => it.product?.id === selectedProduct.id);
    if (existingIndex !== -1) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === existingIndex
            ? {
                ...it,
                quantity: it.quantity + qty,
                subTotal: (it.quantity + qty) * (it.product?.price ?? price),
              }
            : it
        )
      );
    } else {
      const newItem = {
        product: selectedProduct,
        quantity: qty,
        subTotal,
      };
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedProduct(null);
    setQuantity("");
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const incrementQuantity = (index) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              quantity: it.quantity + 1,
              subTotal: (it.quantity + 1) * (it.product?.price ?? 0),
            }
          : it
      )
    );
  };

  const decrementQuantity = (index) => {
    setItems((prev) =>
      prev
        .map((it, i) => {
          if (i !== index) return it;
          const newQty = it.quantity - 1;
          if (newQty <= 0) return null;
          return {
            ...it,
            quantity: newQty,
            subTotal: newQty * (it.product?.price ?? 0),
          };
        })
        .filter(Boolean)
    );
  };

  const handleSave = (fromClose = false) => {
    if (!customer || !tableNumber || items.length === 0) {
      Alert.alert("Erro", "Preencha todos os campos e adicione ao menos um item.");
      return;
    }

    const normalizedItems = items.map((it) => ({
      ...it,
      quantity: Number(it.quantity ?? 0),
      subTotal: Number(it.subTotal ?? (it.product?.price ?? 0) * (it.quantity ?? 0)),
    }));

    const order = {
      id: initialOrder?.id,
      customer,
      tableNumber,
      items: normalizedItems,
      observations: observations ?? "", // incluir observations
      creationDate: initialOrder?.creationDate || new Date().toISOString(),
      orderStatus: initialOrder?.orderStatus || "PENDING",
      totalValue: normalizedItems.reduce((acc, i) => acc + Number(i.subTotal ?? 0), 0),
    };

    onSave(order);
    originalSnapshot.current = null;

    if (fromClose) {
      onClose();
    } else {
      resetAndClose();
    }
  };

  const total = items.reduce((acc, i) => acc + Number(i.subTotal ?? (i.product?.price ?? 0) * (i.quantity ?? 0)), 0);

  const obsLength = observations ? observations.length : 0;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.modalContainer, { backgroundColor: "rgba(0,0,0,0.25)" }]}
      >
        <View style={[styles.innerContainer, { backgroundColor: THEME.background }]}>
          <TouchableOpacity
            style={styles.closeIcon}
            onPress={handleCloseRequest}
            accessibilityLabel="Fechar modal"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={22} color={THEME.muted} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={[styles.title, { color: THEME.muted }]}>{initialOrder ? "Editar Pedido" : "Novo Pedido"}</Text>

            <TextInput
              style={[styles.input, { borderColor: THEME.border, backgroundColor: THEME.card }]}
              placeholder="Nome do Cliente"
              placeholderTextColor="#9ca3af"
              value={customer}
              onChangeText={setCustomer}
            />

            <TextInput
              style={[styles.input, { borderColor: THEME.border, backgroundColor: THEME.card }]}
              placeholder="Número da Mesa"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={tableNumber}
              onChangeText={setTableNumber}
            />

            <ProductDropdown products={products} selectedProduct={selectedProduct} onSelect={setSelectedProduct} />

            <TextInput
              style={[styles.input, { borderColor: THEME.border, backgroundColor: THEME.card }]}
              placeholder="Quantidade"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />

            <TouchableOpacity style={[styles.addButton, { backgroundColor: THEME.primary }]} onPress={handleAddProduct}>
              <Text style={styles.addButtonText}>Adicionar Produto</Text>
            </TouchableOpacity>

            {items.length > 0 && <Text style={styles.sectionTitle}>Itens adicionados</Text>}

            {items.map((item, index) => {
              const displaySubTotal = Number(item.subTotal ?? (item.product?.price ?? 0) * (item.quantity ?? 0));
              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product?.name ?? "Produto"}</Text>
                    <Text style={styles.itemPrice}>R$ {displaySubTotal.toFixed(2)}</Text>
                  </View>

                  <View style={styles.itemControls}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={[styles.qtyButton, item.quantity <= 1 && styles.qtyButtonDisabled]}
                        onPress={() => decrementQuantity(index)}
                        disabled={item.quantity <= 1}
                      >
                        <Text style={styles.qtyButtonText}>-</Text>
                      </TouchableOpacity>

                      <Text style={styles.qtyText}>{item.quantity}</Text>

                      <TouchableOpacity style={styles.qtyButton} onPress={() => incrementQuantity(index)}>
                        <Text style={styles.qtyButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeIconButton} accessibilityLabel={`Remover ${item.product?.name}`}>
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Campo de observações com contador */}
            <Text style={styles.sectionTitle}>Observações</Text>
            <TextInput
              style={[styles.observationsInput, { borderColor: THEME.border, backgroundColor: THEME.card }]}
              placeholder="Adicionar observações do pedido..."
              placeholderTextColor="#9ca3af"
              value={observations}
              onChangeText={(text) => {
                if (text.length <= MAX_OBSERVATIONS) setObservations(text);
              }}
              multiline
              textAlignVertical="top"
              numberOfLines={4}
              maxLength={MAX_OBSERVATIONS}
            />
            <View style={styles.obsCounterRow}>
              <Text style={styles.obsCounterText}>{obsLength}/{MAX_OBSERVATIONS}</Text>
            </View>

            <Text style={styles.totalText}>Total: R$ {Number(total ?? 0).toFixed(2)}</Text>

            <TouchableOpacity style={[styles.saveButton, { backgroundColor: THEME.success }]} onPress={() => handleSave(false)}>
              <Text style={styles.buttonText}>Salvar Pedido</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default OrderModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  innerContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 18,
    elevation: 5,
    position: "relative",
    maxHeight: "92%",
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    zIndex: 20,
  },
  scroll: { flexGrow: 1, paddingTop: 6 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  observationsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 96,
    marginBottom: 6,
  },
  obsCounterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  obsCounterText: {
    fontSize: 12,
    color: THEME.muted,
  },
  addButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  addButtonText: { color: "#fff", fontWeight: "700" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
    color: "#374151",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  itemControls: {
    alignItems: "center",
    justifyContent: "flex-end",
    flexDirection: "row",
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginRight: 8,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonDisabled: {
    opacity: 0.5,
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  qtyText: {
    marginHorizontal: 8,
    minWidth: 22,
    textAlign: "center",
    fontWeight: "700",
  },
  removeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: THEME.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  totalText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    marginVertical: 10,
    color: "#111827",
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
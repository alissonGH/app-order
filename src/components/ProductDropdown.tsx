import React, { useState, useEffect } from "react";
import DropDownPicker from "react-native-dropdown-picker";
import { THEME } from "../styles/theme";

const ProductDropdown = ({ products, selectedProduct, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(selectedProduct ? selectedProduct.id : null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(
      products.map((p) => ({
        label: `${p.name} - R$ ${Number(p.price ?? 0).toFixed(2)}`,
        value: p.id,
        data: p,
      }))
    );
  }, [products]);

  useEffect(() => {
    setValue(selectedProduct ? selectedProduct.id : null);
  }, [selectedProduct]);

  return (
    <DropDownPicker
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      onChangeValue={(val) => {
        const selected = products.find((p) => p.id === val);
        if (selected) onSelect(selected);
      }}
      setItems={setItems}
      searchable={true}
      placeholder="Selecione um produto..."
      searchPlaceholder="Buscar produto..."
      zIndex={1000}
      listMode="SCROLLVIEW"
      disabled={products.length === 0}
      style={{
        marginBottom: open ? 200 : 10,
        borderColor: THEME.border,
        backgroundColor: THEME.card,
      }}
      dropDownContainerStyle={{
        borderColor: THEME.border,
        backgroundColor: THEME.card,
      }}
      textStyle={{ color: "#111827" }}
      searchTextInputStyle={{ borderColor: THEME.border }}
    />
  );
};

export default ProductDropdown;
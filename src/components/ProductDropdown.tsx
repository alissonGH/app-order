import React, { useState, useEffect } from "react";
import DropDownPicker from "react-native-dropdown-picker";
import { THEME } from "../styles/theme";
import { Product } from "../types/models";

interface Props {
  products: Product[];
  selectedProduct?: Product | null;
  onSelect: (p: Product | null) => void;
}

const ProductDropdown: React.FC<Props> = ({ products, selectedProduct, onSelect }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [value, setValue] = useState<number | null>(selectedProduct ? (selectedProduct.id ?? null) : null);
  const [items, setItems] = useState<any[]>([]);

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
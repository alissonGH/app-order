export interface Product {
  id: number | null;
  name: string;
  price?: number;
}

export interface OrderItem {
  product?: Product | null;
  quantity: number;
  subTotal?: number;
}

export interface Order {
  id?: number;
  customer?: string;
  tableNumber?: string | number;
  items?: OrderItem[];
  observations?: string;
  creationDate?: string;
  orderStatus?: string;
  totalValue?: number;
}

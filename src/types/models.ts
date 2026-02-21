export interface Category {
  id?: number;
  name: string;
  active?: boolean;
}

export interface Product {
  id?: number;
  name: string;
  category: Category;
  price: number;
  description?: string;
  active?: boolean;
}

export interface OrderItem {
  id?: number;
  product?: Product | null;
  order?: Order | null;
  quantity: number;
  subTotal?: number;
}

export interface Order {
  id?: number;
  customer?: string;
  tableNumber?: number;
  items?: OrderItem[];
  observation?: string;
  creationDate?: string;
  totalValue?: number;
  orderStatus?: string;
}

export interface Device {
  id?: string;
  tenantId?: string;
  user?: unknown;
  deviceUid?: string;
  password?: string;
  description?: string;
  createdAt?: string;
  lastSeenAt?: string;
  revokedAt?: string;
}

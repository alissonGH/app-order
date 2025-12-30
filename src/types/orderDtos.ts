export type OrderItemDTO = {
  productId: number;
  quantity: number;
};

// Body esperado pelo backend (POST e PUT)
export type OrderDTO = {
  customer: string;
  tableNumber: number;
  items: OrderItemDTO[];
  observation?: string;
};

// Alias semântico (mesma estrutura)
export type CreateOrderDTO = OrderDTO;
export type UpdateOrderDTO = OrderDTO;

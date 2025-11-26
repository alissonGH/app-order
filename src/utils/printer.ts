import { Order } from "../types/models";
import { Share } from "react-native";

type PrintResult = { ok: boolean; success?: boolean; message?: string; receipt?: string };

export async function printOrder(order?: Order | null): Promise<PrintResult> {
  if (!order) return { ok: false, success: false, message: "Pedido inválido" };

  const lines: string[] = [];
  lines.push("**** PEDIDO ****");
  lines.push(`Pedido #: ${order.id}`);
  lines.push(`Cliente: ${order.customer || "-"}`);
  lines.push(`Mesa: ${order.tableNumber || "-"}`);
  lines.push(`Data: ${order.creationDate ? new Date(order.creationDate).toLocaleString() : "-"}`);
  lines.push("------------------------------");

  if (Array.isArray(order.items)) {
    order.items.forEach((it) => {
      const name = it.product?.name ?? "Produto";
      const qty = it.quantity ?? 0;
      const price = Number(it.product?.price ?? 0);
      const sub = Number(it.subTotal ?? qty * price);
      lines.push(`${name} x${qty}  R$ ${sub.toFixed(2)}`);
    });
  }

  lines.push("------------------------------");
  const total = (order && typeof order.totalValue === "number")
    ? order.totalValue
    : (Array.isArray(order.items) ? order.items.reduce((acc, it) => acc + Number(it.subTotal ?? (it.product?.price ?? 0) * (it.quantity ?? 0)), 0) : 0);
  lines.push(`TOTAL: R$ ${Number(total ?? 0).toFixed(2)}`);
  lines.push("");
  lines.push("Obrigado pela preferência!");
  lines.push("");

  const receipt = lines.join("\n");

  try {
    // Simple share fallback — share plain text so user can pick RawBT or any printer app
    await Share.share({ message: receipt, title: "Recibo" });
    return { ok: true, success: true, receipt };
  } catch (err: any) {
    return { ok: false, success: false, message: (err && err.message) || String(err), receipt };
  }
}

export default printOrder;


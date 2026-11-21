import type { OrderLineItem } from "@/types/database";

/** Merge same color+size rows and clamp quantities. */
export function normalizeOrderItems(
  raw: Array<{ color?: string; size?: string; quantity?: number }>
): OrderLineItem[] {
  const map = new Map<string, OrderLineItem>();
  for (const row of raw) {
    const color = String(row.color ?? "").trim().slice(0, 30);
    const size = String(row.size ?? "").trim().slice(0, 30);
    const quantity = Math.min(
      999,
      Math.max(0, Math.floor(Number(row.quantity) || 0))
    );
    if (quantity < 1) continue;
    const key = `${color.toLowerCase()}::${size.toLowerCase()}`;
    const prev = map.get(key);
    if (prev) {
      prev.quantity = Math.min(999, prev.quantity + quantity);
    } else {
      map.set(key, { color, size, quantity });
    }
  }
  return Array.from(map.values());
}

export function sumOrderItemQuantity(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Human-readable summary for seller UI / LINE / legacy columns. */
export function formatOrderItemsSummary(items: OrderLineItem[]): string {
  if (!items.length) return "";
  return items
    .map((item) => {
      const label = [item.color, item.size].filter(Boolean).join(" / ");
      if (label) return `${label} ×${item.quantity}`;
      return `共 ${item.quantity} 件`;
    })
    .join("、");
}

/** Parse items from DB (jsonb or legacy single variant). */
export function coerceOrderItems(order: {
  items?: unknown;
  selected_color?: string | null;
  selected_size?: string | null;
  quantity?: number;
}): OrderLineItem[] {
  if (Array.isArray(order.items) && order.items.length) {
    return normalizeOrderItems(
      order.items as Array<{ color?: string; size?: string; quantity?: number }>
    );
  }
  if (order.quantity && order.quantity > 0) {
    return normalizeOrderItems([
      {
        color: order.selected_color || "",
        size: order.selected_size || "",
        quantity: order.quantity,
      },
    ]);
  }
  return [];
}

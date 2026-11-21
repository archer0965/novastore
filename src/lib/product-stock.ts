/** Stock helpers: null stock = unlimited inventory. */

export function getRemainingStock(input: {
  stock?: number | null;
  ordered_quantity: number;
}): number | null {
  if (input.stock == null || Number.isNaN(Number(input.stock))) return null;
  const stock = Math.max(0, Math.floor(Number(input.stock)));
  const ordered = Math.max(0, Math.floor(Number(input.ordered_quantity) || 0));
  return Math.max(0, stock - ordered);
}

export function isSoldOut(input: {
  stock?: number | null;
  ordered_quantity: number;
}): boolean {
  const remaining = getRemainingStock(input);
  return remaining !== null && remaining <= 0;
}

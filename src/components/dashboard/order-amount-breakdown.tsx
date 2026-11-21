import { formatTWD } from "@/lib/utils-format";
import { cn } from "@/lib/utils";

export function OrderAmountBreakdown({
  subtotalAmount,
  discountAmount,
  shippingFee,
  totalAmount,
  className,
  compact = false,
}: {
  subtotalAmount?: number | null;
  discountAmount?: number | null;
  shippingFee?: number | null;
  totalAmount: number;
  className?: string;
  compact?: boolean;
}) {
  const subtotal =
    subtotalAmount == null
      ? Math.max(
          0,
          Number(totalAmount) -
            (Number(shippingFee) || 0) +
            (Number(discountAmount) || 0)
        )
      : Number(subtotalAmount) || 0;
  const discount = Number(discountAmount) || 0;
  const shipping = Number(shippingFee) || 0;

  if (compact) {
    return (
      <div className={cn("tabular-nums", className)}>
        <p className="font-semibold">{formatTWD(totalAmount)}</p>
        <p className="text-[10px] leading-snug text-muted-foreground">
          商品 {formatTWD(subtotal)}
          {discount > 0 ? ` · 折抵 -${formatTWD(discount)}` : ""}
          {" · "}
          運費 {shipping > 0 ? formatTWD(shipping) : "免運"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0.5 text-[11px] tabular-nums", className)}>
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">商品</span>
        <span>{formatTWD(subtotal)}</span>
      </div>
      {discount > 0 ? (
        <div className="flex justify-between gap-3 text-emerald-700">
          <span>折抵</span>
          <span>-{formatTWD(discount)}</span>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <span className="text-muted-foreground">運費</span>
        <span>{shipping > 0 ? formatTWD(shipping) : "免運 $0"}</span>
      </div>
      <div className="flex justify-between gap-3 border-t border-border/60 pt-0.5 font-semibold text-foreground">
        <span>總計</span>
        <span>{formatTWD(totalAmount)}</span>
      </div>
    </div>
  );
}

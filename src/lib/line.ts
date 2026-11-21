import { getSiteUrl } from "@/lib/site";

export type LineReportPayload = {
  buyer_name: string;
  buyer_contact?: string | null;
  contact_platform?: string | null;
  transfer_bank?: string | null;
  amount: number;
  bank_last_five: string;
  note?: string | null;
};

/** Optional per-seller Messaging API credentials. */
export type LinePushOptions = {
  /**
   * Seller Channel Access Token from profiles.line_channel_access_token.
   * When missing/empty, falls back to process.env.LINE_CHANNEL_ACCESS_TOKEN.
   */
  accessToken?: string | null;
};

/**
 * Resolve which Channel Access Token to use for a push.
 * Prefer the seller's own token; otherwise use the platform default.
 */
export function resolveLineAccessToken(
  sellerToken?: string | null
): string | null {
  const custom = sellerToken?.trim();
  if (custom) return custom;
  const fallback = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  return fallback || null;
}

function contactLabel(platform?: string | null): string {
  if (platform === "ig") return "IG";
  if (platform === "threads") return "Threads";
  if (platform === "line") return "LINE";
  return "聯絡方式";
}

/** LINE Flex text nodes reject empty strings — always provide a visible fallback. */
function flexText(value: string | null | undefined, max = 120): string {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "—";
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function flexRow(label: string, value: string, valueColor?: string) {
  return {
    type: "box" as const,
    layout: "baseline" as const,
    contents: [
      {
        type: "text" as const,
        text: flexText(label, 20),
        color: "#6B7280",
        size: "sm",
        flex: 2,
      },
      {
        type: "text" as const,
        text: flexText(value, 160),
        wrap: true,
        size: "sm",
        flex: 5,
        weight: "bold" as const,
        ...(valueColor ? { color: valueColor } : {}),
      },
    ],
  };
}

/**
 * Push a LINE notification to the seller via Messaging API.
 * Failures are logged but do not throw — report submission should still succeed.
 */
export async function sendLineNotification(
  lineUserId: string,
  reportData: LineReportPayload,
  options?: LinePushOptions
): Promise<{ ok: boolean; error?: string }> {
  const token = resolveLineAccessToken(options?.accessToken);
  const baseUrl = getSiteUrl();

  if (!token) {
    console.warn("[LINE] Missing seller or platform Channel Access Token");
    return { ok: false, error: "LINE token not configured" };
  }

  if (!lineUserId) {
    return { ok: false, error: "No LINE user id" };
  }

  const amountText = Number(reportData.amount).toLocaleString("zh-TW");
  const platform = contactLabel(reportData.contact_platform);
  const contact = reportData.buyer_contact?.trim() || "—";
  const bank = reportData.transfer_bank?.trim() || "—";
  const text = [
    "⚡ 新對帳通知！",
    `買家：${reportData.buyer_name}`,
    `${platform}：${contact}`,
    `轉帳銀行：${bank}`,
    `金額：$${amountText}`,
    `帳號末五碼：${reportData.bank_last_five}`,
    reportData.note ? `備註：${reportData.note}` : null,
    `請至後台核對：${baseUrl}/dashboard`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "flex",
            altText: `新對帳通知：${reportData.buyer_name} $${amountText}`,
            contents: {
              type: "bubble",
              size: "kilo",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "NovaStore",
                    weight: "bold",
                    color: "#1D4ED8",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: "⚡ 新對帳通知",
                    weight: "bold",
                    size: "xl",
                    margin: "md",
                  },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                  flexRow("買家", reportData.buyer_name),
                  flexRow(platform, contact),
                  flexRow("銀行", bank),
                  flexRow("金額", `$${amountText}`, "#1D4ED8"),
                  flexRow("末五碼", reportData.bank_last_five),
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#1D4ED8",
                    action: {
                      type: "uri",
                      label: "前往控制台核對",
                      uri: `${baseUrl}/dashboard`,
                    },
                  },
                ],
              },
            },
          },
          {
            type: "text",
            text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Push failed:", res.status, body);
      return { ok: false, error: body };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LINE] Push error:", message);
    return { ok: false, error: message };
  }
}

export type LineOrderPayload = {
  product_title: string;
  mode_label: string;
  buyer_name: string;
  quantity: number;
  /** Multi-variant summary, e.g. "黑 / M ×1、白 / L ×2" */
  items_summary?: string | null;
  selected_color?: string | null;
  selected_size?: string | null;
  total_amount: number;
  atm_last5: string;
  store_type_label: string;
  store_info: string;
  receiver_phone: string;
};

/**
 * Push a LINE notification when a buyer places a store / group-buy order.
 * Mirrors reconciliation push: Flex card + plain-text copy for reliability.
 */
export async function sendLineOrderNotification(
  lineUserId: string,
  order: LineOrderPayload,
  options?: LinePushOptions
): Promise<{ ok: boolean; error?: string }> {
  const token = resolveLineAccessToken(options?.accessToken);
  const baseUrl = getSiteUrl();

  if (!token) {
    console.warn("[LINE] Missing seller or platform Channel Access Token");
    return { ok: false, error: "LINE token not configured" };
  }
  if (!lineUserId) {
    return { ok: false, error: "No LINE user id" };
  }

  const amountText = Number(order.total_amount).toLocaleString("zh-TW");
  const summary =
    order.items_summary?.trim() ||
    [order.selected_color, order.selected_size].filter(Boolean).join(" / ");
  const text = [
    "🛒 新訂單通知！",
    `商品：${order.product_title}`,
    `類型：${order.mode_label}`,
    `買家：${order.buyer_name}`,
    summary ? `明細：${summary}` : null,
    `數量：${order.quantity}`,
    `金額：$${amountText}`,
    `帳號末五碼：${order.atm_last5}`,
    `取貨：${order.store_type_label}`,
    `門市：${order.store_info}`,
    `手機：${order.receiver_phone}`,
    `請至後台核對出貨：${baseUrl}/dashboard/store/stats`,
  ]
    .filter(Boolean)
    .join("\n");

  const bodyRows = [
    flexRow("商品", order.product_title),
    flexRow("類型", order.mode_label),
    flexRow("買家", order.buyer_name),
    ...(summary ? [flexRow("明細", summary)] : []),
    flexRow("數量", String(order.quantity)),
    flexRow("金額", `$${amountText}`, "#1D4ED8"),
    flexRow("末五碼", order.atm_last5),
    flexRow("取貨", order.store_type_label),
    flexRow("門市", order.store_info),
    flexRow("手機", order.receiver_phone),
  ];

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "flex",
            altText: `新訂單：${order.product_title} ×${order.quantity}`,
            contents: {
              type: "bubble",
              size: "kilo",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "NovaStore",
                    weight: "bold",
                    color: "#1D4ED8",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: "🛒 新訂單通知",
                    weight: "bold",
                    size: "xl",
                    margin: "md",
                  },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: bodyRows,
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#1D4ED8",
                    action: {
                      type: "uri",
                      label: "前往開店統計",
                      uri: `${baseUrl}/dashboard/store/stats`,
                    },
                  },
                ],
              },
            },
          },
          {
            type: "text",
            text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Order push failed:", res.status, body);
      return { ok: false, error: body };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LINE] Order push error:", message);
    return { ok: false, error: message };
  }
}

export type LineGroupBuyReachedPayload = {
  product_title: string;
  target_quantity: number;
  current_quantity: number;
};

/**
 * Push when a group-buy product first reaches its target quantity.
 * Flex card + plain text so the seller always gets a readable copy.
 */
export async function sendLineGroupBuyReachedNotification(
  lineUserId: string,
  payload: LineGroupBuyReachedPayload,
  options?: LinePushOptions
): Promise<{ ok: boolean; error?: string }> {
  const token = resolveLineAccessToken(options?.accessToken);
  const baseUrl = getSiteUrl();

  if (!token) {
    console.warn("[LINE] Missing seller or platform Channel Access Token");
    return { ok: false, error: "LINE token not configured" };
  }
  if (!lineUserId) {
    return { ok: false, error: "No LINE user id" };
  }

  const target = Math.max(0, Number(payload.target_quantity) || 0);
  const current = Math.max(0, Number(payload.current_quantity) || 0);
  const pct =
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;

  const text = [
    "🎉 【NovaStore 團購達標捷報！】",
    "您的團購商品已成功達到出貨門檻！",
    "",
    `📦 商品名稱：${payload.product_title}`,
    `🎯 設定目標：${target} 件`,
    `📊 目前已累積：${current} 件 (已達標 ${pct}%)`,
    "",
    "請盡快前往後台查看訂單並安排與廠商叫貨與出貨！",
    `${baseUrl}/dashboard/store/stats`,
  ].join("\n");

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "flex",
            altText: `團購達標：${payload.product_title} ${current}/${target}`,
            contents: {
              type: "bubble",
              size: "kilo",
              header: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "NovaStore",
                    weight: "bold",
                    color: "#1D4ED8",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: "🎉 團購達標捷報",
                    weight: "bold",
                    size: "xl",
                    margin: "md",
                  },
                ],
              },
              body: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                  flexRow("商品", payload.product_title),
                  flexRow("設定目標", `${target} 件`),
                  flexRow("目前累積", `${current} 件`, "#059669"),
                  flexRow("達成率", `${pct}%`, "#059669"),
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    color: "#059669",
                    action: {
                      type: "uri",
                      label: "前往開店統計出貨",
                      uri: `${baseUrl}/dashboard/store/stats`,
                    },
                  },
                ],
              },
            },
          },
          {
            type: "text",
            text,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Group-buy reached push failed:", res.status, body);
      return { ok: false, error: body };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LINE] Group-buy reached push error:", message);
    return { ok: false, error: message };
  }
}

/** Plain-text push for system alerts (e.g. free quota exhausted). */
export async function sendLineTextMessage(
  lineUserId: string,
  text: string,
  options?: LinePushOptions
): Promise<{ ok: boolean; error?: string }> {
  const token = resolveLineAccessToken(options?.accessToken);
  if (!token) {
    return { ok: false, error: "LINE token not configured" };
  }
  if (!lineUserId || !text) {
    return { ok: false, error: "Missing lineUserId or text" };
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE] Text push failed:", res.status, body);
      return { ok: false, error: body };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[LINE] Text push error:", message);
    return { ok: false, error: message };
  }
}

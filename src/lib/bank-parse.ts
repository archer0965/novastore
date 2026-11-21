export type ParsedBankTxn = {
  amount: number;
  bankLastFive: string;
  raw: string;
};

function normalizeAmountToken(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "").replace(/元/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function extractAmount(chunk: string): number | null {
  const patterns = [
    /(?:金額|轉帳金額|交易金額|轉入金額|轉出金額|付款金額)\s*[：:＝=]?\s*[NTD$＄]?\s*([\d,]+(?:\.\d+)?)\s*元?/i,
    /(?:NT\$|TWD|USD\$|\$|＄)\s*([\d,]+(?:\.\d+)?)/i,
    /([\d,]+(?:\.\d+)?)\s*元/,
  ];
  for (const re of patterns) {
    const m = chunk.match(re);
    if (m?.[1]) {
      const n = normalizeAmountToken(m[1]);
      if (n !== null) return n;
    }
  }
  return null;
}

function extractLastFive(chunk: string): string | null {
  const patterns = [
    /(?:帳號|帳戶|轉入帳號|轉出帳號|對方帳號|收款帳號)?(?:末|後)\s*五?\s*碼\s*[：:＝=]?\s*(\d{5})/,
    /(?:末五碼|後五碼|帳號末五碼|帳戶末五碼)\s*[：:＝=]?\s*(\d{5})/,
    /[*＊xXＸ]+\s*(\d{5})\b/,
    /(?:帳號|帳戶)\s*[：:＝=]?\s*[*\＊xXＸ0-9-]*?(\d{5})\b/,
  ];
  for (const re of patterns) {
    const m = chunk.match(re);
    if (m?.[1] && /^\d{5}$/.test(m[1])) return m[1];
  }
  return null;
}

function splitChunks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const byBlank = normalized
    .split(/\n\s*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const lines = normalized
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Group consecutive lines that together look like one txn
  const chunks: string[] = [];
  let buf: string[] = [];
  for (const line of lines) {
    buf.push(line);
    const joined = buf.join("\n");
    if (extractAmount(joined) !== null && extractLastFive(joined) !== null) {
      chunks.push(joined);
      buf = [];
    }
  }
  if (buf.length) chunks.push(buf.join("\n"));
  if (chunks.length === 0) chunks.push(normalized);
  return chunks;
}

/**
 * Parse pasted bank-app transaction text into amount + last-five pairs.
 * Supports multi-transaction pastes (blank-line or line-group separated).
 */
export function parseBankTransactions(text: string): ParsedBankTxn[] {
  const results: ParsedBankTxn[] = [];
  const seen = new Set<string>();

  for (const chunk of splitChunks(text)) {
    const amount = extractAmount(chunk);
    const bankLastFive = extractLastFive(chunk);
    if (amount === null || !bankLastFive) continue;
    const key = `${amount}|${bankLastFive}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ amount, bankLastFive, raw: chunk });
  }

  // Fallback: whole text as one blob if chunking failed
  if (results.length === 0) {
    const amount = extractAmount(text);
    const bankLastFive = extractLastFive(text);
    if (amount !== null && bankLastFive) {
      results.push({ amount, bankLastFive, raw: text.trim() });
    }
  }

  return results;
}

export function amountsEqual(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.005;
}

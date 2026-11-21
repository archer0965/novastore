"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatTWD } from "@/lib/utils-format";
import type { SellerAnalyticsDetail } from "@/lib/seller-analytics";

export default function SellerAnalyticsCharts({
  series,
  fulfillmentPie,
  paymentPie,
}: {
  series: SellerAnalyticsDetail["series"];
  fulfillmentPie: Array<{ name: string; value: number }>;
  paymentPie: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5">
        <h2 className="font-display text-lg font-semibold">收益與訂單趨勢</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          每日收益（左軸）與訂單量（右軸）
        </p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "revenue"
                    ? [formatTWD(value), "收益"]
                    : [value, "訂單"]
                }
                labelFormatter={(label) => `日期 ${label}`}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#0284c7"
                fill="url(#revFill)"
                strokeWidth={2}
              />
              <Bar
                yAxisId="right"
                dataKey="orders"
                name="orders"
                fill="#38bdf8"
                opacity={0.55}
                radius={[4, 4, 0, 0]}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5">
          <h2 className="font-display text-lg font-semibold">出貨狀態占比</h2>
          <div className="mt-4 h-64">
            {fulfillmentPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fulfillmentPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {fulfillmentPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#10b981" : "#fb7185"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5">
          <h2 className="font-display text-lg font-semibold">對帳狀態占比</h2>
          <div className="mt-4 h-64">
            {paymentPie.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {paymentPie.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#0284c7" : "#f59e0b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm sm:p-5">
        <h2 className="font-display text-lg font-semibold">每日出貨量</h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="fulfilled"
                name="已出貨"
                stackId="f"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="unfulfilled"
                name="未出貨"
                stackId="f"
                fill="#fda4af"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      此區間尚無資料
    </div>
  );
}

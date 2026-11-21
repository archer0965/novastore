export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="載入中">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="h-4 w-72 max-w-full rounded bg-secondary/80" />
      </div>
      <div className="h-28 rounded-2xl border border-border bg-card/60" />
      <div className="h-24 rounded-2xl border border-border bg-card/60" />
      <div className="h-40 rounded-2xl border border-border bg-card/60" />
      <div className="space-y-3">
        <div className="h-6 w-28 rounded bg-secondary" />
        <div className="h-48 rounded-2xl border border-border bg-card/60" />
      </div>
    </div>
  );
}

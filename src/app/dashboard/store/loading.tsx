export default function StoreLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="載入中">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-secondary" />
        <div className="h-4 w-64 max-w-full rounded bg-secondary/80" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-36 rounded-2xl border border-border bg-card/60" />
        <div className="h-36 rounded-2xl border border-border bg-card/60" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-xl bg-secondary/70" />
        <div className="h-20 rounded-xl bg-secondary/70" />
        <div className="h-20 rounded-xl bg-secondary/70" />
      </div>
    </div>
  );
}

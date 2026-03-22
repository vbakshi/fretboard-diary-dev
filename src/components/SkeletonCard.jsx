export default function SkeletonCard() {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-brand-surface border border-brand-border animate-pulse">
      <div className="w-20 h-14 rounded bg-brand-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-brand-border rounded w-3/4 mb-2" />
        <div className="h-3 bg-brand-border rounded w-1/2 mb-2" />
        <div className="flex gap-1 mb-2">
          <div className="h-5 w-12 bg-brand-border rounded" />
          <div className="h-5 w-14 bg-brand-border rounded" />
        </div>
        <div className="flex gap-1 flex-wrap">
          <div className="h-5 w-8 bg-brand-border rounded" />
          <div className="h-5 w-10 bg-brand-border rounded" />
          <div className="h-5 w-6 bg-brand-border rounded" />
        </div>
      </div>
    </div>
  );
}

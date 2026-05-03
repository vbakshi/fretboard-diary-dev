export default function FullScreenSpinner() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-brand-bg">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-brand-border border-t-brand-amber"
        aria-label="Loading"
      />
    </div>
  );
}

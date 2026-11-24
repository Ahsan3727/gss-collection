export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-24">
      <div className="w-8 h-8 border-2 border-line border-t-ink rounded-full animate-spin mb-4" />
      <span className="text-xs uppercase tracking-[0.2em] text-ink-3 font-medium">
        Loading GSS Collection...
      </span>
    </div>
  );
}

/** Instant skeleton while a console page loads. */
export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-4 w-40 rounded bg-sand" />
      <div className="mt-3 h-9 w-72 rounded-lg bg-sand" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-line bg-white" />
        ))}
      </div>
      <div className="mt-4 h-80 rounded-2xl border border-line bg-white" />
    </div>
  );
}

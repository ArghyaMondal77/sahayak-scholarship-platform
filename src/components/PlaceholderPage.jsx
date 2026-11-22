export default function PlaceholderPage({ name }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl md:text-5xl">{name}</h1>
      <p className="mt-4 text-base text-ink/70">Coming in Phase 2.</p>
    </section>
  );
}



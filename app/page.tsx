export default function HomePage() {
  return (
    <section className="mx-auto grid w-full max-w-7xl flex-1 place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <p className="mb-5 inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-strong">
          M0 · Repository foundation
        </p>
        <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
          Sift
        </h1>
        <p className="mt-4 text-pretty text-xl leading-8 text-muted-foreground sm:text-2xl">
          Find the right AI agent for the job.
        </p>
        <p className="mt-8 max-w-xl border-l-2 border-brand pl-4 text-sm leading-6 text-muted-foreground sm:text-base">
          The application foundation is ready. Product experiences will be added
          sequentially according to the master ticket.
        </p>
      </div>
    </section>
  );
}

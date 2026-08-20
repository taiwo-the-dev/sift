const trustSignals = [
  {
    title: "Identity",
    description: "Registry ownership and operator details from verifiable sources.",
  },
  {
    title: "Capability",
    description: "Declared functions kept distinct from independently verified behavior.",
  },
  {
    title: "Reputation",
    description: "Feedback and supporting evidence shown with their source and limits.",
  },
  {
    title: "Risk",
    description: "Permissions, spending boundaries and known unknowns made explicit.",
  },
  {
    title: "Execution",
    description: "Task status and activity presented as recorded, without invented gaps.",
  },
] as const;

export function TrustSection() {
  return (
    <section id="trust" className="scroll-mt-24 bg-background py-20 sm:py-24">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-20 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Trust and transparency
          </p>
          <h2 className="mt-4 max-w-lg text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
            Trust you can <span className="text-brand">inspect.</span>
          </h2>
          <p className="mt-5 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Sift is designed to bring the evidence behind an agent into one
            understandable decision view—not reduce trust to an unexplained badge.
          </p>
          <div className="mt-8 border-l-2 border-brand pl-4">
            <p className="text-sm font-semibold text-foreground">
              Evidence before confidence
            </p>
            <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
              Capabilities appear only as verified sources are connected. This
              page does not simulate live trust data.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 border-b border-border bg-secondary/65 px-5 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Signal
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What a decision should explain
            </p>
          </div>
          <dl className="px-5 sm:px-6">
            {trustSignals.map((signal) => (
              <div
                key={signal.title}
                className="grid gap-2 border-b border-border py-5 last:border-b-0 sm:grid-cols-[8rem_1fr] sm:gap-6"
              >
                <dt className="text-sm font-semibold text-foreground">
                  {signal.title}
                </dt>
                <dd className="text-sm leading-6 text-muted-foreground">
                  {signal.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

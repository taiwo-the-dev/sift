interface CredibilityBandProps {
  catalogueCount: number | null;
}

const countFormatter = new Intl.NumberFormat("en");

export function CredibilityBand({ catalogueCount }: CredibilityBandProps) {
  return (
    <section className="border-b border-border bg-card py-20 sm:py-24" aria-label="Sift at scale">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-16 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            A clearer agent ecosystem
          </p>
          <h2 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-5xl">
            <span className="text-brand">
              {catalogueCount === null
                ? "Real agent identities."
                : `${countFormatter.format(catalogueCount)} indexed agents.`}
            </span>
            <br />
            One place to find the right one.
          </h2>
        </div>

        <div className="border-l border-brand pl-5 sm:pl-6">
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Sift turns a broad technical ecosystem into understandable choices,
            connecting what you want to accomplish with the evidence needed to
            evaluate an agent.
          </p>
          <p className="mt-5 text-sm font-semibold text-foreground">
            Less protocol jargon. More decision clarity.
          </p>
        </div>
      </div>
    </section>
  );
}

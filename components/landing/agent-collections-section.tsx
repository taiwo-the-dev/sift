import {
  ArrowRight,
  Clock3,
  Database,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const featuredSignals = [
  "Relevance to the user’s goal",
  "Verifiable identity and reputation",
  "Current capability and availability evidence",
] as const;

export function AgentCollectionsSection() {
  return (
    <section
      id="agent-collections"
      className="scroll-mt-24 bg-background py-20 sm:py-24"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Agent discovery
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
              Featured and <span className="text-brand">recent agents.</span>
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:justify-self-end sm:text-lg">
            Two useful views of the ecosystem: agents selected through verified
            decision signals and the latest identities observed on-chain.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="flex items-start justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  <ScanSearch className="size-4" aria-hidden="true" />
                  Featured collection
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
                  Featured AI agents
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  A focused collection will appear here when Sift can evaluate
                  real agents against consistent, verifiable signals.
                </p>
              </div>
              <span className="hidden size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-brand sm:grid">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
            </header>

            <div className="grid grid-cols-1 border-t border-border md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="flex min-h-56 flex-col justify-between p-6 sm:p-8">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    No verified catalogue connected
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Sift will not display placeholder agents or invented rankings
                    while its agent index is unavailable.
                  </p>
                </div>
                <Link
                  href="#agent-search"
                  className="group mt-8 inline-flex items-center gap-2 self-start rounded-sm text-sm font-semibold text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  Start with your goal
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              <div className="border-t border-border bg-secondary/45 p-6 md:border-l md:border-t-0 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Future selection signals
                </p>
                <ul className="mt-5 space-y-4">
                  {featuredSignals.map((signal, index) => (
                    <li key={signal} className="flex items-start gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-input text-[0.65rem] font-semibold text-brand">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-sm leading-5 text-foreground">
                        {signal}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Clock3 className="size-4" aria-hidden="true" />
              Recent collection
            </p>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Recently registered
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The newest verifiable agent identities will be ordered from
              observed ERC-8004 registration events.
            </p>

            <dl className="mt-8 border-y border-border">
              <div className="grid grid-cols-[6rem_1fr] gap-4 border-b border-border py-4">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Source
                </dt>
                <dd className="text-sm font-medium text-foreground">
                  ERC-8004 registrations
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-4 border-b border-border py-4">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Index
                </dt>
                <dd className="text-sm font-medium text-brand">Not connected</dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-4 py-4">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Display
                </dt>
                <dd className="text-sm font-medium text-foreground">
                  Verified entries only
                </dd>
              </div>
            </dl>

            <div className="mt-auto flex items-start gap-3 pt-8">
              <Database
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                Recent activity remains empty until the Sift Indexer is implemented
                in its designated milestone.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

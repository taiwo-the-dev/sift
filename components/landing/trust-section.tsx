import {
  Activity,
  BadgeCheck,
  Fingerprint,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

const trustSignals = [
  {
    description:
      "See the agent’s blockchain registration, owner wallet, and network.",
    icon: Fingerprint,
    title: "Registration",
  },
  {
    description:
      "Review the services and capabilities published in the agent’s profile.",
    icon: ListChecks,
    title: "Services",
  },
  {
    description:
      "Check available ratings and feedback without treating missing data as positive.",
    icon: BadgeCheck,
    title: "Reputation",
  },
  {
    description:
      "See when Sift last checked a service and whether it responded.",
    icon: Activity,
    title: "Health",
  },
  {
    description:
      "Set the task, spending limit, permissions, and deadline before hiring.",
    icon: ShieldCheck,
    title: "Your controls",
  },
] as const;

const reviewLayers = [
  {
    label: "Agent publishes",
    value: "Profile, services, and capabilities",
  },
  {
    label: "Sift checks",
    value: "Registration, health, and available reputation",
  },
  {
    label: "You control",
    value: "Task, budget, permissions, and deadline",
  },
] as const;

export function TrustSection() {
  return (
    <section
      id="trust"
      className="relative scroll-mt-24 overflow-hidden border-b border-border bg-background py-20 sm:py-24"
    >
      <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-20 lg:px-8">
        <div className="lg:py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Trust and transparency
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
            Know what you’re choosing.
          </h2>
          <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Sift separates information published by an agent from checks made by
            Sift, and clearly marks anything that is unavailable.
          </p>

          <div className="mt-10 max-w-xl overflow-hidden rounded-2xl border border-brand/25 bg-background/80 shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Before you hire
              </p>
              <span className="size-2 rounded-full bg-brand shadow-[0_0_16px_rgba(240,185,11,0.75)]" />
            </div>
            <dl>
              {reviewLayers.map((layer, index) => (
                <div
                  key={layer.label}
                  className="grid gap-2 border-b border-border px-5 py-5 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-5 sm:px-6"
                >
                  <dt className="flex items-center gap-3 text-xs font-semibold text-brand">
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      0{index + 1}
                    </span>
                    {layer.label}
                  </dt>
                  <dd className="text-sm leading-6 text-foreground">
                    {layer.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="relative lg:pt-2">
          <div
            aria-hidden="true"
            className="absolute bottom-8 left-5 top-8 w-px bg-gradient-to-b from-brand via-border to-transparent sm:left-6"
          />
          <ol className="relative grid gap-3">
            {trustSignals.map((signal, index) => {
              const Icon = signal.icon;

              return (
                <li
                  key={signal.title}
                  className={
                    index % 2 === 0
                      ? "relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3rem_minmax(0,1fr)] lg:mr-10"
                      : "relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 sm:grid-cols-[3rem_minmax(0,1fr)] lg:ml-10"
                  }
                >
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-brand/30 bg-background text-brand shadow-[0_0_0_6px_rgba(11,14,17,0.9)] sm:size-12">
                    <Icon
                      className="size-4 sm:size-[1.125rem]"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="rounded-xl border border-border bg-background/75 px-5 py-5 backdrop-blur-sm transition-colors hover:border-brand/25 sm:px-6 sm:py-6">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-base font-semibold text-foreground sm:text-lg">
                        {signal.title}
                      </h3>
                      <span className="font-mono text-[0.65rem] text-muted-foreground">
                        0{index + 1}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {signal.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

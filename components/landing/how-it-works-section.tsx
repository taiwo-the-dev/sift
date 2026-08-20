import {
  Activity,
  MessageSquareText,
  Search,
  Scale,
} from "lucide-react";

const steps = [
  {
    icon: MessageSquareText,
    title: "Describe what you need",
    description:
      "Explain the outcome in plain language and add the constraints that matter.",
  },
  {
    icon: Search,
    title: "Discover relevant agents",
    description:
      "Narrow a broad ecosystem to agents designed for the job you described.",
  },
  {
    icon: Scale,
    title: "Compare trust and capability",
    description:
      "Review evidence, limitations and capabilities in a consistent format.",
  },
  {
    icon: Activity,
    title: "Hire and monitor",
    description:
      "Confirm deliberately, then follow task status and agent activity from one place.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-background py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            How Sift works
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            From intent to the <span className="text-brand">right agent.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            One understandable process for navigating discovery, evidence and
            eventual execution.
          </p>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-0">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <li
                key={step.title}
                className="relative border-t border-dashed border-input pt-8 lg:px-5 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="absolute left-0 top-0 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-input bg-background text-sm font-semibold text-brand lg:left-5 lg:first:left-0">
                  {index + 1}
                </span>
                <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

import { Check } from "lucide-react";

import type { HiringFlowStep } from "@/features/hiring/model";
import { cn } from "@/lib/utils";

const steps: readonly Readonly<{ label: string; value: HiringFlowStep }>[] = [
  { label: "Task", value: "mission" },
  { label: "Price & limits", value: "permissions" },
  { label: "Review", value: "review" },
  { label: "Payment", value: "wallet" },
  { label: "Done", value: "confirmation" },
];

export function HiringStepper({ current }: Readonly<{ current: HiringFlowStep }>) {
  const currentIndex = steps.findIndex((step) => step.value === current);

  return (
    <nav aria-label="Agent hiring progress" className="overflow-x-auto">
      <ol className="flex min-w-[38rem] items-center gap-2">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;

          return (
            <li key={step.value} className="flex flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full border text-[0.68rem] font-bold",
                  complete
                    ? "border-brand bg-brand text-brand-foreground"
                    : active
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {complete ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold",
                  active || complete ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

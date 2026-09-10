import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type TaskFlowStep = "details" | "review" | "result";

const steps = [
  { id: "details", label: "Details" },
  { id: "review", label: "Review" },
  { id: "result", label: "Result" },
] as const;

export function TaskFlowProgress({ step }: Readonly<{ step: TaskFlowStep }>) {
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <nav aria-label="Task progress" className="my-7">
      <ol className="grid grid-cols-3">
        {steps.map((item, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;

          return (
            <li
              aria-current={current ? "step" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-2 text-center",
                index > 0 &&
                  "before:absolute before:top-4 before:right-1/2 before:h-px before:w-full before:bg-border",
              )}
              key={item.id}
            >
              <span
                className={cn(
                  "relative z-10 grid size-8 place-items-center rounded-full border bg-card text-xs font-semibold",
                  complete && "border-brand bg-brand text-brand-foreground",
                  current && "border-brand text-brand",
                  !complete && !current && "border-border text-muted-foreground",
                )}
              >
                {complete ? (
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-[0.68rem] font-semibold",
                  current || complete ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

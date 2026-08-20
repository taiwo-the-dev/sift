import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  align?: "left" | "center";
  description: string;
  eyebrow: string;
  title: string;
}

export function SectionHeading({
  align = "left",
  description,
  eyebrow,
  title,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

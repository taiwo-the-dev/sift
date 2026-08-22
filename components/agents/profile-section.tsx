import type { ReactNode } from "react";

interface ProfileSectionProps {
  children: ReactNode;
  description: string;
  eyebrow: string;
  id: string;
  title: string;
}

export function ProfileSection({
  children,
  description,
  eyebrow,
  id,
  title,
}: ProfileSectionProps) {
  return (
    <section id={id} className="scroll-mt-32 border-b border-border py-12 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-14">
        <header>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </header>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

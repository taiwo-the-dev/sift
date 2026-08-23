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
    <section id={id} className="scroll-mt-32 py-8 sm:py-10 lg:py-12">
      <header className="max-w-3xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-brand">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </header>

      <div className="mt-7 min-w-0">{children}</div>
    </section>
  );
}

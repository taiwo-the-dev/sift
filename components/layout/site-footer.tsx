import Link from "next/link";

import { Brand } from "@/components/layout/brand";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Discover", href: "#agent-search" },
      { label: "Categories", href: "#categories" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Trust approach", href: "#trust" },
    ],
  },
] as const;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_0.7fr_0.7fr_0.8fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Find the right AI agent for the job through clear discovery,
              comparison and trust signals.
            </p>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} links`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                {group.title}
              </p>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-sm text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Ecosystem
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Designed for agents and jobs across BNB Chain.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Sift.</p>
          <p>Evidence first. Unknown stays unknown.</p>
        </div>
      </div>
    </footer>
  );
}

const profileSections = [
  { href: "#overview", label: "Overview" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#evidence", label: "Evidence" },
  { href: "#activity", label: "Activity" },
  { href: "#technical", label: "Technical" },
] as const;

export function ProfileNavigation() {
  return (
    <nav
      aria-label="Agent profile sections"
      className="sticky top-16 z-30 border-y border-border bg-background/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        {profileSections.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="shrink-0 rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

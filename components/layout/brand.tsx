import { ListFilter } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  inverse?: boolean;
}

export function Brand({ className, inverse = false }: BrandProps) {
  return (
    <Link
      href="/"
      aria-label="Sift home"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md font-semibold tracking-[-0.02em] outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground"
      >
        <ListFilter className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-lg">Sift</span>
    </Link>
  );
}

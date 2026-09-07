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
        "group inline-flex items-center gap-2.5 rounded-md font-semibold tracking-[-0.02em] outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-md bg-brand text-brand-foreground transition-[transform,box-shadow] duration-300 group-hover:-rotate-6 group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(240,185,11,0.28)] motion-reduce:transform-none motion-reduce:transition-none"
      >
        <ListFilter className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-lg">Sift</span>
    </Link>
  );
}

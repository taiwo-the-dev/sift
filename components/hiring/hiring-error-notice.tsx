import { CircleAlert } from "lucide-react";

import type { HiringErrorDescription } from "@/features/hiring/error-presentation";

export function HiringErrorNotice({
  error,
}: Readonly<{ error: HiringErrorDescription }>) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-400/25 bg-red-400/8 p-4 text-red-50"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">{error.title}</p>
          <p className="mt-1 text-xs leading-5 text-red-100/75">
            {error.message}
          </p>
        </div>
      </div>
      {error.technicalDetails && error.technicalDetails !== error.message ? (
        <details className="mt-3 border-t border-red-300/15 pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-red-100/80">
            Technical details
          </summary>
          <code className="mt-2 block max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.66rem] leading-5 text-red-100/60">
            {error.technicalDetails}
          </code>
        </details>
      ) : null}
    </div>
  );
}

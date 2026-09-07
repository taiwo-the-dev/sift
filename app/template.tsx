import type { ReactNode } from "react";

export default function Template({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="sift-page-enter flex flex-1 flex-col">{children}</div>;
}

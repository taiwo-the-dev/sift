"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { DiscoveryResultsLoading } from "@/components/discovery/discovery-loading";

interface DiscoveryNavigationContextValue {
  isPending: boolean;
  startNavigation: (destination?: string) => void;
}

const DiscoveryNavigationContext =
  createContext<DiscoveryNavigationContextValue | null>(null);

function normalizedLocation(value: string): string {
  const url = new URL(value, window.location.href);
  const entries = [...url.searchParams.entries()].sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue),
  );
  const search = new URLSearchParams(entries).toString();

  return `${url.pathname}${search ? `?${search}` : ""}`;
}

function isCurrentDestination(destination: string): boolean {
  return normalizedLocation(destination) === normalizedLocation(window.location.href);
}

export function DiscoveryNavigationProvider({
  children,
  routeKey,
}: Readonly<{
  children: ReactNode;
  routeKey: string;
}>) {
  const [pendingFromKey, setPendingFromKey] = useState<string | null>(null);
  const isPending = pendingFromKey === routeKey;

  const startNavigation = useCallback(
    (destination?: string) => {
      if (destination && isCurrentDestination(destination)) {
        return;
      }

      setPendingFromKey(routeKey);
    },
    [routeKey],
  );

  const value = useMemo(
    () => ({ isPending, startNavigation }),
    [isPending, startNavigation],
  );

  return (
    <DiscoveryNavigationContext.Provider value={value}>
      {children}
    </DiscoveryNavigationContext.Provider>
  );
}

export function useDiscoveryNavigation(): DiscoveryNavigationContextValue {
  const context = useContext(DiscoveryNavigationContext);

  if (!context) {
    throw new Error(
      "useDiscoveryNavigation must be used inside DiscoveryNavigationProvider.",
    );
  }

  return context;
}

type DiscoveryNavigationLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onNavigate"
> & {
  href: string;
};

export function DiscoveryNavigationLink({
  href,
  ...props
}: DiscoveryNavigationLinkProps) {
  const { startNavigation } = useDiscoveryNavigation();

  return (
    <Link
      {...props}
      href={href}
      onNavigate={() => startNavigation(href)}
    />
  );
}

export function DiscoveryResultsFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { isPending } = useDiscoveryNavigation();

  return isPending ? <DiscoveryResultsLoading /> : children;
}

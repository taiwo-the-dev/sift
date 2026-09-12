"use client";

import { ArrowRight, Search } from "lucide-react";
import Form from "next/form";

import { useDiscoveryNavigation } from "@/components/discovery/discovery-navigation";
import { Button } from "@/components/ui/button";
import { formatCategory } from "@/features/discovery/format";
import type { DiscoveryQuery } from "@/features/discovery/model";

interface DiscoverySearchFormProps {
  query: DiscoveryQuery;
}

export function DiscoverySearchForm({ query }: DiscoverySearchFormProps) {
  const { startNavigation } = useDiscoveryNavigation();

  return (
    <div>
      <Form
        action="/discover"
        id="discovery-search"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const searchParams = new URLSearchParams();

          for (const [name, value] of formData.entries()) {
            if (typeof value === "string" && value.length > 0) {
              searchParams.append(name, value);
            }
          }

          const queryString = searchParams.toString();
          startNavigation(`/discover${queryString ? `?${queryString}` : ""}`);
        }}
      >
        {query.network !== "bsc-mainnet" ? (
          <input type="hidden" name="network" value={query.network} />
        ) : null}
        {query.categories.map((category) => (
          <input key={category} type="hidden" name="category" value={category} />
        ))}
        {query.metadataStatuses.map((status) => (
          <input key={status} type="hidden" name="metadata" value={status} />
        ))}
        {query.healthStatuses.map((status) => (
          <input key={status} type="hidden" name="health" value={status} />
        ))}
        {query.taskAvailability === "ready" ? (
          <input type="hidden" name="availability" value="ready" />
        ) : null}
        {query.scoreBands.map((band) => (
          <input key={band} type="hidden" name="rating" value={band} />
        ))}
        {query.registrationPeriod ? (
          <input
            type="hidden"
            name="registered"
            value={query.registrationPeriod}
          />
        ) : null}
        {query.pageSize !== 12 ? (
          <input type="hidden" name="size" value={query.pageSize} />
        ) : null}

        <div className="relative min-w-0">
          <label htmlFor="discovery-query" className="sr-only">
            Search agents
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="discovery-query"
            name="q"
            type="search"
            maxLength={180}
            defaultValue={query.query}
            placeholder="Search by task, protocol, service, or capability"
            className="h-14 w-full rounded-lg border border-input bg-background pl-12 pr-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/15"
          />
        </div>

        <Button type="submit" variant="brand" size="lg" className="h-14 px-6">
          Search agents
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </Form>

      {query.inferredCategory && query.categories.length === 0 ? (
        <div
          role="status"
          className="mt-4 flex flex-col gap-1 border-l-2 border-brand pl-4 text-sm sm:flex-row sm:items-center sm:gap-2"
        >
          <span className="font-semibold text-foreground">Suggested category:</span>
          <span className="text-brand">
            {formatCategory(query.inferredCategory)}
          </span>
          <span className="text-muted-foreground sm:before:mr-2 sm:before:content-['·']">
            Based on your search terms
          </span>
        </div>
      ) : null}
    </div>
  );
}

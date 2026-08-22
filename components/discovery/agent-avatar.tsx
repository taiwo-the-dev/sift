"use client";

import { Bot } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { buildAgentImageProxyUrl } from "@/features/discovery/image";
import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  agentId: string;
  imageUrl: string | null;
  name: string;
  size?: "card" | "profile";
}

function AgentArtworkFallback({
  agentId,
  name,
  size = "card",
}: Omit<AgentAvatarProps, "imageUrl">) {
  return (
    <div
      role="img"
      aria-label={`${name} has no registered image`}
      title="No image was supplied in this agent's indexed metadata"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-secondary",
        size === "profile"
          ? "size-24 sm:size-28"
          : "size-16 sm:size-[4.5rem]",
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(240,185,11,0.28),transparent_45%),linear-gradient(145deg,rgba(240,185,11,0.08),transparent_62%)]"
      />
      <div
        className={cn(
          "relative grid place-items-center rounded-xl border border-brand/20 bg-background/80 text-brand shadow-lg shadow-black/20",
          size === "profile" ? "size-14" : "size-9 sm:size-10",
        )}
      >
        <Bot
          className={cn(
            size === "profile" ? "size-7" : "size-5 sm:size-[1.375rem]",
          )}
          aria-hidden="true"
        />
      </div>
      <span className="sr-only">
        Agent {agentId} uses Sift&apos;s missing-image placeholder.
      </span>
    </div>
  );
}

export function AgentAvatar({
  agentId,
  imageUrl,
  name,
  size = "card",
}: AgentAvatarProps) {
  const [failed, setFailed] = useState(false);
  const source = buildAgentImageProxyUrl(imageUrl);

  if (!source || failed) {
    return <AgentArtworkFallback agentId={agentId} name={name} size={size} />;
  }

  return (
    <div
      title="Registered agent image"
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-border bg-secondary shadow-lg shadow-black/15",
        size === "profile"
          ? "size-24 sm:size-28"
          : "size-16 sm:size-[4.5rem]",
      )}
    >
      <Image
        src={source}
        alt={`${name} registered agent image`}
        fill
        unoptimized
        sizes={
          size === "profile"
            ? "(min-width: 640px) 112px, 96px"
            : "(min-width: 640px) 72px, 64px"
        }
        className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

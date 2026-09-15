import { buildAgentProfileHref } from "@/features/agents/route";

export const agentProfileTabs = [
  { label: "Overview", value: "overview" },
  { label: "Services", value: "services" },
  { label: "Trust", value: "trust" },
  { label: "Registry", value: "activity" },
  { label: "Technical", value: "metadata" },
  { label: "Task History", value: "tasks" },
] as const;

export type AgentProfileTab = (typeof agentProfileTabs)[number]["value"];

export function parseAgentProfileTab(
  value: string | string[] | undefined,
): AgentProfileTab {
  const candidate = Array.isArray(value) ? value[0] : value;

  return (
    agentProfileTabs.find((tab) => tab.value === candidate)?.value ?? "overview"
  );
}

export function buildAgentProfileTabHref(
  chainId: number,
  agentId: string,
  tab: AgentProfileTab,
  goal = "",
): string {
  const pathname = buildAgentProfileHref(chainId, agentId);

  if (!pathname) {
    return "/discover";
  }

  const params = new URLSearchParams();

  if (tab !== "overview") {
    params.set("tab", tab);
  }

  if (goal) {
    params.set("goal", goal);
  }

  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

import {
  Activity,
  ChartNoAxesCombined,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { DiscoveryCategory } from "@/features/discovery/model";

export interface AgentCategory {
  description: string;
  icon: LucideIcon;
  slug: DiscoveryCategory;
  shortcut: string;
  title: string;
}

export const agentCategories: readonly AgentCategory[] = [
  {
    shortcut: "Earn Yield",
    slug: "yield-optimisation",
    title: "Yield optimisation",
    description:
      "Agents for yield research, position monitoring, and strategy execution.",
    icon: ChartNoAxesCombined,
  },
  {
    shortcut: "Automate Trading",
    slug: "grid-trading",
    title: "Trading automation",
    description:
      "Rule-based agents for market monitoring and automated trading strategies.",
    icon: Activity,
  },
  {
    shortcut: "Protect a Loan",
    slug: "health-factor-monitoring",
    title: "Loan health protection",
    description:
      "Agents that monitor collateral health, borrowing positions, and liquidation risk.",
    icon: ShieldCheck,
  },
  {
    shortcut: "Rebalance Liquidity",
    slug: "liquidity-rebalancing",
    title: "Liquidity rebalancing",
    description:
      "Agents for liquidity range monitoring and allocation management.",
    icon: RefreshCw,
  },
];

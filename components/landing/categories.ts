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
      "Explore agents designed to assess yield opportunities and manage positions around the constraints you set.",
    icon: ChartNoAxesCombined,
  },
  {
    shortcut: "Automate Trading",
    slug: "grid-trading",
    title: "Trading automation",
    description:
      "Find rule-based agents built to monitor markets and execute defined trading strategies without obscuring the rules.",
    icon: Activity,
  },
  {
    shortcut: "Protect a Loan",
    slug: "health-factor-monitoring",
    title: "Loan health protection",
    description:
      "Identify monitoring agents focused on collateral health, borrowing positions and liquidation risk.",
    icon: ShieldCheck,
  },
  {
    shortcut: "Rebalance Liquidity",
    slug: "liquidity-rebalancing",
    title: "Liquidity rebalancing",
    description:
      "Explore agents designed to watch liquidity positions and respond when a range or allocation needs attention.",
    icon: RefreshCw,
  },
];

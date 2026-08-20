import {
  Activity,
  ChartNoAxesCombined,
  RefreshCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface AgentCategory {
  description: string;
  goal: string;
  icon: LucideIcon;
  shortcut: string;
  title: string;
}

export const agentCategories: readonly AgentCategory[] = [
  {
    shortcut: "Earn Yield",
    title: "Yield optimization",
    description:
      "Explore agents designed to assess yield opportunities and manage positions around the constraints you set.",
    goal: "I want to earn yield without taking excessive risk",
    icon: ChartNoAxesCombined,
  },
  {
    shortcut: "Automate Trading",
    title: "Trading automation",
    description:
      "Find rule-based agents built to monitor markets and execute defined trading strategies without obscuring the rules.",
    goal: "I want an agent to automate a grid trading strategy",
    icon: Activity,
  },
  {
    shortcut: "Protect a Loan",
    title: "Loan health protection",
    description:
      "Identify monitoring agents focused on collateral health, borrowing positions and liquidation risk.",
    goal: "I want to protect a lending position from liquidation risk",
    icon: ShieldCheck,
  },
  {
    shortcut: "Rebalance Liquidity",
    title: "Liquidity rebalancing",
    description:
      "Explore agents designed to watch liquidity positions and respond when a range or allocation needs attention.",
    goal: "I want an agent to keep my liquidity position in range",
    icon: RefreshCw,
  },
];

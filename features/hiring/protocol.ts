import { getAddress, type Address, type Hash } from "viem";

export const HIRING_CHAIN_ID = 97 as const;
export const HIRING_NETWORK_NAME = "BSC Testnet" as const;
export const HIRING_CONFIRMATIONS = 2;

/**
 * BNB Chain's current APEX/ERC-8183 BSC Testnet deployment.
 *
 * Source of truth checked 2026-08-23:
 * https://github.com/bnb-chain/apex-contracts/blob/main/scripts/addresses.ts
 */
export const erc8183Deployment = Object.freeze({
  chainId: HIRING_CHAIN_ID,
  commerce: getAddress("0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de"),
  paymentToken: getAddress("0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565"),
  policy: getAddress("0xd6a4217588f6b1f5657a92a3e94e6422ad771cea"),
  router: getAddress("0xd7d36d66d2f1b608a0f943f722d27e3744f66f25"),
  tokenDecimals: 18,
  tokenSymbol: "U",
});

export const emptyBytes = "0x" as const;

export const commerceAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ],
    outputs: [{ name: "jobId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setBudget",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "expectedBudget", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getJob",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "client", type: "address" },
          { name: "provider", type: "address" },
          { name: "evaluator", type: "address" },
          { name: "description", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "expiredAt", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "hook", type: "address" },
          { name: "submittedAt", type: "uint256" },
          { name: "deliverable", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "paymentToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "platformFeeBP",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "JobCreated",
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "evaluator", type: "address" },
      { indexed: false, name: "expiredAt", type: "uint256" },
      { indexed: false, name: "hook", type: "address" },
    ],
  },
  {
    type: "event",
    name: "BudgetSet",
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "JobFunded",
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "client", type: "address" },
      { indexed: true, name: "provider", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
  },
] as const;

export const evaluatorRouterAbi = [
  {
    type: "function",
    name: "registerJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "policy", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "commerce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "policyWhitelist",
    stateMutability: "view",
    inputs: [{ name: "policy", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "JobRegistered",
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "policy", type: "address" },
      { indexed: true, name: "client", type: "address" },
    ],
  },
] as const;

export const optimisticPolicyAbi = [
  {
    type: "function",
    name: "commerce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "router",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "disputeWindow",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
] as const;

export const paymentTokenAbi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "spender", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
] as const;

export type HiringTransactionStep =
  | "create_job"
  | "register_job"
  | "set_budget"
  | "approve_token"
  | "fund_job";

export const hiringTransactionSteps = [
  "create_job",
  "register_job",
  "set_budget",
  "approve_token",
  "fund_job",
] as const satisfies readonly HiringTransactionStep[];

export function transactionDestination(step: HiringTransactionStep): Address {
  if (step === "register_job") {
    return erc8183Deployment.router;
  }

  if (step === "approve_token") {
    return erc8183Deployment.paymentToken;
  }

  return erc8183Deployment.commerce;
}

export function buildTestnetTransactionHref(hash: Hash): string {
  return `https://testnet.bscscan.com/tx/${hash}`;
}

export function buildTestnetAddressHref(address: Address): string {
  return `https://testnet.bscscan.com/address/${address}`;
}

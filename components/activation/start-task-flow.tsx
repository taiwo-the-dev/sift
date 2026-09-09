"use client";

import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Send,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { McpTransactionReview } from "@/components/activation/mcp-transaction-review";
import { SelectField } from "@/components/ui/select-field";
import { formatProfileTimestamp } from "@/features/agents/format";
import type { AgentProfileService } from "@/features/agents/model";
import {
  formatActivationMethod,
  type ActivationMethod,
} from "@/features/activation/model";
import type { PreparedEvmTransaction } from "@/features/activation/protocol";
import { cn } from "@/lib/utils";

type Agent = Readonly<{ agentId: string; chainId: number; name: string }>;
type ExternalService = Readonly<{
  href: string;
  label: string;
}>;

const methodDetails = {
  a2a: {
    description: "Send one confirmed message to the agent's live A2A service.",
    icon: Send,
  },
  erc8183: {
    description: "Create a protected onchain job with a signed price and receipt checks.",
    icon: ShieldCheck,
  },
  mcp: {
    description: "Run a published tool with confirmation and wallet review when needed.",
    icon: Wrench,
  },
  x402: {
    description: "Review the exact payment requested by the agent before spending anything.",
    icon: CircleDollarSign,
  },
} as const;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function mcpTools(service: AgentProfileService) {
  const summary = record(service.capabilitySummary);
  if (!summary || !Array.isArray(summary.tools)) return [];
  return summary.tools.flatMap((item) => {
    const tool = record(item);
    return tool &&
      typeof tool.name === "string"
      ? [{
          destructive: tool.destructive === true,
          description: typeof tool.description === "string" ? tool.description : null,
          inputSchema: record(tool.inputSchema) ?? {},
          name: tool.name,
          openWorld: tool.openWorld === true,
          readOnly: tool.readOnly === true,
        }]
      : [];
  });
}

function toolArgumentTemplate(
  inputSchema: Readonly<Record<string, unknown>>,
  chainId: number,
): string {
  const properties = record(inputSchema.properties);
  const required = Array.isArray(inputSchema.required)
    ? inputSchema.required.filter((key): key is string => typeof key === "string")
    : [];
  if (!properties) return "{}";

  const result: Record<string, unknown> = {};
  for (const key of required) {
    const rule = record(properties[key]);
    const values = Array.isArray(rule?.enum)
      ? rule.enum.filter((value): value is string => typeof value === "string")
      : [];
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes("chain") && values.includes("bsc")) {
      result[key] = "bsc";
    } else if (normalizedKey.includes("chainid")) {
      result[key] = chainId;
    } else if (values.length > 0) {
      result[key] = values[0];
    } else if (rule?.type === "boolean") {
      result[key] = false;
    } else if (rule?.type === "number" || rule?.type === "integer") {
      result[key] = 0;
    } else if (rule?.type === "array") {
      result[key] = [];
    } else if (rule?.type === "object") {
      result[key] = {};
    } else {
      result[key] = "";
    }
  }
  return JSON.stringify(result, null, 2);
}

function formatToolName(name: string): string {
  return name
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

function x402Options(service: AgentProfileService) {
  const summary = record(service.capabilitySummary);
  if (!summary || !Array.isArray(summary.options)) return [];
  return summary.options.flatMap((item) => {
    const option = record(item);
    return option &&
      typeof option.amount === "string" &&
      typeof option.asset === "string" &&
      typeof option.network === "string" &&
      typeof option.payTo === "string"
      ? [{
          amount: option.amount,
          asset: option.asset,
          network: option.network,
          payTo: option.payTo,
        }]
      : [];
  });
}

async function readApiResult(response: Response): Promise<unknown> {
  const value = (await response.json()) as Readonly<{
    error?: unknown;
    result?: unknown;
  }>;
  if (!response.ok) {
    throw new Error(
      typeof value.error === "string" ? value.error : "The service request failed.",
    );
  }
  return value.result;
}

export function StartTaskFlow({
  agent,
  externalServices = [],
  services,
}: Readonly<{
  agent: Agent;
  externalServices?: readonly ExternalService[];
  services: readonly AgentProfileService[];
}>) {
  const methods = useMemo(
    () =>
      services.reduce<AgentProfileService[]>((result, service) => {
        if (
          service.activationMethod &&
          !result.some((item) => item.activationMethod === service.activationMethod)
        ) {
          result.push(service);
        }
        return result;
      }, []),
    [services],
  );
  const [method, setMethod] = useState<ActivationMethod | null>(
    methods[0]?.activationMethod ?? null,
  );
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const initialMcpService = methods.find(
    (item) => item.activationMethod === "mcp",
  );
  const initialMcpTool = initialMcpService
    ? mcpTools(initialMcpService)[0] ?? null
    : null;
  const [toolName, setToolName] = useState(initialMcpTool?.name ?? "");
  const [toolArguments, setToolArguments] = useState(() =>
    initialMcpTool
      ? toolArgumentTemplate(initialMcpTool.inputSchema, agent.chainId)
      : "{}",
  );
  const [mcpConfirmed, setMcpConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [transactions, setTransactions] = useState<
    readonly PreparedEvmTransaction[]
  >([]);
  const service = methods.find((item) => item.activationMethod === method) ?? null;
  const tools = service?.activationMethod === "mcp" ? mcpTools(service) : [];
  const quotes = service?.activationMethod === "x402" ? x402Options(service) : [];
  const selectedTool = toolName || tools[0]?.name || "";
  const selectedToolDetails =
    tools.find((tool) => tool.name === selectedTool) ?? null;

  async function submitA2a(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !confirmed) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setTransactions([]);
    try {
      const response = await fetch("/api/activation/a2a", {
        body: JSON.stringify({ message, serviceId: service.id ?? "" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setResult(await readApiResult(response));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The task could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMcp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setTransactions([]);
    try {
      const parsed = JSON.parse(toolArguments) as unknown;
      if (!record(parsed)) throw new Error("Tool arguments must be a JSON object.");
      const response = await fetch("/api/activation/mcp", {
        body: JSON.stringify({
          arguments: parsed,
          confirmedSideEffects:
            selectedToolDetails?.readOnly === true ? false : mcpConfirmed,
          serviceId: service.id ?? "",
          toolName: selectedTool,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await readApiResult(response);
      const responseRecord = record(payload);
      setResult(responseRecord?.result ?? payload);
      setTransactions(
        Array.isArray(responseRecord?.transactions)
          ? (responseRecord.transactions as unknown as readonly PreparedEvmTransaction[])
          : [],
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The tool could not run.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-w-0 flex-1 bg-background">
      <section className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href={`/agents/${agent.chainId}/${agent.agentId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to {agent.name}
          </Link>
          <div className="mt-6 flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
              <Bot className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Checked task access
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Start a task with {agent.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Choose a method the agent currently publishes. Sift rechecks direct
                services before sending your request.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-2xl border border-border bg-card p-3">
          <p className="px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Available methods
          </p>
          <div className="mt-1 space-y-2">
            {methods.map((item) => {
              const itemMethod = item.activationMethod!;
              const Icon = methodDetails[itemMethod].icon;
              const selected = itemMethod === method;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMethod(itemMethod);
                    setError(null);
                    setResult(null);
                    setTransactions([]);
                    setMcpConfirmed(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                    selected
                      ? "border-brand/35 bg-brand/8"
                      : "border-transparent hover:border-border hover:bg-background/50",
                  )}
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-brand">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {formatActivationMethod(itemMethod)}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {methodDetails[itemMethod].description}
                    </span>
                    <span className="mt-1.5 block text-[0.65rem] text-muted-foreground/75">
                      Checked {formatProfileTimestamp(item.availabilityCheckedAt ?? null)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {externalServices.length > 0 ? (
            <div className="mt-4 border-t border-border px-3 pt-4 pb-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Published links
              </p>
              <div className="mt-3 space-y-2">
                {externalServices.map((item) => (
                  <a
                    key={`${item.label}:${item.href}`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs font-semibold text-foreground outline-none transition-colors hover:border-brand/30 hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <span className="truncate">{item.label}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-7">
          {!service && externalServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This agent has not published a working service that Sift can use.
            </p>
          ) : null}

          {!service && externalServices.length > 0 ? (
            <div>
              <span className="grid size-11 place-items-center rounded-xl border border-sky-400/25 bg-sky-400/8 text-sky-200">
                <Globe2 className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-foreground">
                Open a published service
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                This agent has not published a checked task protocol, but it does
                list external services. They open outside Sift and follow the
                provider’s own permissions and payment rules.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {externalServices.map((item) => (
                  <a
                    key={`${item.label}:${item.href}:main`}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
                  >
                    {item.label}
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {service?.activationMethod === "erc8183" ? (
            <div>
              <span className="grid size-11 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/8 text-emerald-300">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-foreground">
                Protected onchain hire
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Sift will request a signed price, show your budget and permissions,
                and ask your wallet before each transaction. No payment happens here.
              </p>
              <Link
                href={`/hire/${agent.chainId}/${agent.agentId}`}
                className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-7")}
              >
                <BriefcaseBusiness className="size-4" aria-hidden="true" />
                Configure protected hire
              </Link>
            </div>
          ) : null}

          {service?.activationMethod === "a2a" ? (
            <form onSubmit={submitA2a}>
              <h2 className="text-2xl font-semibold text-foreground">Send one task</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This sends one message to the live A2A service. Sift does not retry it automatically.
              </p>
              <label className="mt-6 block text-sm font-semibold text-foreground" htmlFor="a2a-message">
                What should the agent do?
              </label>
              <textarea
                id="a2a-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                minLength={5}
                maxLength={2000}
                required
                rows={7}
                className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
              />
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background/45 p-4 text-xs leading-5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 accent-brand"
                />
                I understand this sends my message to an external agent service once.
              </label>
              <Button
                type="submit"
                className="mt-5"
                variant="brand"
                size="lg"
                disabled={!confirmed || busy}
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send task
              </Button>
            </form>
          ) : null}

          {service?.activationMethod === "mcp" ? (
            <form className="min-w-0" onSubmit={submitMcp}>
              <h2 className="text-2xl font-semibold text-foreground">Run an agent tool</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Read-only tools run after your click. Other tools require an extra
                confirmation, and any blockchain transaction must still be reviewed
                in your wallet.
              </p>
              <div className="mt-6 min-w-0 max-w-full">
                <SelectField
                  aria-labelledby="mcp-tool-label"
                  label="Choose a tool"
                  options={tools.map((tool) => ({
                    label: formatToolName(tool.name),
                    value: tool.name,
                  }))}
                  triggerClassName="h-10 rounded-xl"
                  value={selectedTool}
                  onValueChange={(value) => {
                    setToolName(value);
                    const nextTool = tools.find((tool) => tool.name === value);
                    setToolArguments(
                      nextTool
                        ? toolArgumentTemplate(nextTool.inputSchema, agent.chainId)
                        : "{}",
                    );
                    setMcpConfirmed(false);
                    setError(null);
                    setResult(null);
                    setTransactions([]);
                  }}
                />
                <span id="mcp-tool-label" className="sr-only">
                  MCP tool
                </span>
              </div>
              {selectedToolDetails ? (
                <div className="mt-3 min-w-0 border-l-2 border-brand/40 pl-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <code className="break-all text-xs font-semibold text-foreground">
                      {selectedToolDetails.name}
                    </code>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                        selectedToolDetails.readOnly
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-amber-400/10 text-amber-200",
                      )}
                    >
                      {selectedToolDetails.readOnly
                        ? "Read only"
                        : "Confirmation required"}
                    </span>
                  </div>
                  {selectedToolDetails.description ? (
                    <p className="mt-1 line-clamp-3 break-words text-xs leading-5 text-muted-foreground">
                      {selectedToolDetails.description}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <label className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground" htmlFor="mcp-arguments">
                Tool input
                <span className="text-xs font-normal text-muted-foreground">JSON format</span>
              </label>
              <textarea
                id="mcp-arguments"
                value={toolArguments}
                onChange={(event) => setToolArguments(event.target.value)}
                rows={5}
                spellCheck={false}
                className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs leading-6 text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
              />
              {selectedToolDetails && !selectedToolDetails.readOnly ? (
                <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/6 p-4 text-xs leading-5 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={mcpConfirmed}
                    onChange={(event) => setMcpConfirmed(event.target.checked)}
                    className="mt-1 accent-brand"
                  />
                  <span>
                    I understand this sends one request to an external agent. It
                    may prepare a transaction or change external data. Sift will
                    not sign or send a wallet transaction automatically.
                  </span>
                </label>
              ) : null}
              <Button
                type="submit"
                className="mt-5"
                variant="brand"
                size="lg"
                disabled={
                  !selectedTool ||
                  busy ||
                  (selectedToolDetails?.readOnly === false && !mcpConfirmed)
                }
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                {selectedToolDetails?.readOnly === false
                  ? "Prepare action"
                  : "Run tool"}
              </Button>
            </form>
          ) : null}

          {service?.activationMethod === "x402" ? (
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Payment quote</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sift checked the x402 challenge. Review its raw token units and addresses below. Payment is deliberately disabled until a wallet can enforce this exact cap.
              </p>
              <div className="mt-6 space-y-3">
                {quotes.map((quote) => (
                  <dl key={`${quote.network}:${quote.asset}:${quote.payTo}`} className="grid gap-3 rounded-xl border border-border bg-background/45 p-4 text-xs sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Network</dt><dd className="mt-1 font-mono text-foreground">{quote.network}</dd></div>
                    <div><dt className="text-muted-foreground">Amount (raw units)</dt><dd className="mt-1 font-mono text-foreground">{quote.amount}</dd></div>
                    <div><dt className="text-muted-foreground">Token</dt><dd className="mt-1 break-all font-mono text-foreground">{quote.asset}</dd></div>
                    <div><dt className="text-muted-foreground">Recipient</dt><dd className="mt-1 break-all font-mono text-foreground">{quote.payTo}</dd></div>
                  </dl>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/8 p-4 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {result !== null ? (
            <div className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/6 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Service response
              </p>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : null}
          <McpTransactionReview transactions={transactions} />
        </section>
      </div>
    </main>
  );
}

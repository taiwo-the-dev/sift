"use client";

import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
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
import { ServiceResponse } from "@/components/activation/service-response";
import {
  TaskFlowProgress,
  type TaskFlowStep,
} from "@/components/activation/task-flow-progress";
import { TaskInputFields } from "@/components/activation/task-input-fields";
import { X402PaymentFlow } from "@/components/activation/x402-payment-flow";
import { SelectField } from "@/components/ui/select-field";
import { formatProfileTimestamp } from "@/features/agents/format";
import type { AgentProfileService } from "@/features/agents/model";
import {
  formatActivationMethod,
  type ActivationMethod,
} from "@/features/activation/model";
import type { PreparedEvmTransaction } from "@/features/activation/protocol";
import {
  buildTaskArguments,
  initialTaskInputValues,
  taskInputFields,
  type TaskInputValues,
} from "@/features/activation/task-input";
import { cn } from "@/lib/utils";

type Agent = Readonly<{ agentId: string; chainId: number; name: string }>;
type ExternalService = Readonly<{
  href: string;
  label: string;
}>;
type A2aSkill = Readonly<{
  description: string | null;
  id: string;
  name: string;
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

function formatToolName(name: string): string {
  return name
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

function a2aSkills(service: AgentProfileService | null): readonly A2aSkill[] {
  const summary = record(service?.capabilitySummary);
  if (!summary || !Array.isArray(summary.skills)) return [];
  return summary.skills.slice(0, 100).flatMap((item) => {
    const skill = record(item);
    return skill &&
      typeof skill.id === "string" &&
      typeof skill.name === "string"
      ? [
          {
            description:
              typeof skill.description === "string" ? skill.description : null,
            id: skill.id,
            name: skill.name,
          },
        ]
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
  const [flowStep, setFlowStep] = useState<TaskFlowStep>("details");
  const initialA2aService = methods.find(
    (item) => item.activationMethod === "a2a",
  );
  const [skillId, setSkillId] = useState(
    a2aSkills(initialA2aService ?? null)[0]?.id ?? "",
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
  const [toolValues, setToolValues] = useState<TaskInputValues>(() =>
    initialTaskInputValues(
      initialMcpTool
        ? taskInputFields(initialMcpTool.inputSchema, agent.chainId)
        : [],
    ),
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
  const selectedTool = toolName || tools[0]?.name || "";
  const selectedToolDetails =
    tools.find((tool) => tool.name === selectedTool) ?? null;
  const selectedToolFields = selectedToolDetails
    ? taskInputFields(selectedToolDetails.inputSchema, agent.chainId)
    : [];
  const skills = service?.activationMethod === "a2a" ? a2aSkills(service) : [];
  const selectedSkillId = skillId || skills[0]?.id || "";
  const selectedSkill =
    skills.find((skill) => skill.id === selectedSkillId) ?? null;

  function resetRequest(nextStep: TaskFlowStep = "details") {
    setConfirmed(false);
    setMcpConfirmed(false);
    setBusy(false);
    setError(null);
    setResult(null);
    setTransactions([]);
    setFlowStep(nextStep);
  }

  function selectMethod(nextService: AgentProfileService) {
    const nextMethod = nextService.activationMethod;
    if (!nextMethod) return;

    setMethod(nextMethod);
    resetRequest();

    if (nextMethod === "a2a") {
      setSkillId(a2aSkills(nextService)[0]?.id ?? "");
    }

    if (nextMethod === "mcp") {
      const nextTool = mcpTools(nextService)[0] ?? null;
      setToolName(nextTool?.name ?? "");
      setToolValues(
        initialTaskInputValues(
          nextTool ? taskInputFields(nextTool.inputSchema, agent.chainId) : [],
        ),
      );
    }
  }

  function startAnotherRequest() {
    resetRequest();
    setMessage("");

    if (selectedToolDetails) {
      setToolValues(
        initialTaskInputValues(
          taskInputFields(selectedToolDetails.inputSchema, agent.chainId),
        ),
      );
    }
  }

  function reviewA2a() {
    setError(null);
    if (message.trim().length < 5) {
      setError("Describe the task in at least five characters.");
      return;
    }
    setFlowStep("review");
  }

  function reviewMcp() {
    setError(null);
    if (!selectedTool) {
      setError("Choose a tool before continuing.");
      return;
    }
    try {
      buildTaskArguments(selectedToolFields, toolValues);
      setFlowStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Check the tool details.");
    }
  }

  async function submitA2a(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || !confirmed) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setTransactions([]);
    try {
      const response = await fetch("/api/activation/a2a", {
        body: JSON.stringify({
          message,
          serviceId: service.id ?? "",
          ...(selectedSkillId ? { skillId: selectedSkillId } : {}),
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setResult(await readApiResult(response));
      setFlowStep("result");
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
      const parsed = buildTaskArguments(selectedToolFields, toolValues);
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
      setFlowStep("result");
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
                  disabled={busy}
                  onClick={() => selectMethod(item)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
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

          {service?.activationMethod === "a2a" && flowStep !== "result" ? (
            <form onSubmit={submitA2a}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Tell the agent what you need
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Send a task
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose one of the agent&apos;s published capabilities, then describe
                the result you want.
              </p>
              <TaskFlowProgress step={flowStep} />

              {flowStep === "details" ? (
                <div>
                  {skills.length > 0 ? (
                    <div>
                      <SelectField
                        label="Capability"
                        onValueChange={(value) => {
                          setSkillId(value);
                          setError(null);
                        }}
                        options={skills.map((skill) => ({
                          label: skill.name,
                          value: skill.id,
                        }))}
                        value={selectedSkillId}
                      />
                      {selectedSkill?.description ? (
                        <p className="mt-3 border-l-2 border-brand/45 py-1 pl-3 text-xs leading-5 text-muted-foreground">
                          {selectedSkill.description}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="border-l-2 border-brand/45 py-1 pl-3 text-xs leading-5 text-muted-foreground">
                      This agent accepts a message but has not published a more specific
                      capability list.
                    </p>
                  )}

                  <label className="mt-6 block text-sm font-semibold text-foreground" htmlFor="a2a-message">
                    Task details
                  </label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Include the goal, relevant assets or identifiers, limits, and the
                    format you want back.
                  </p>
                  <textarea
                    id="a2a-message"
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setError(null);
                    }}
                    minLength={5}
                    maxLength={2000}
                    placeholder={
                      selectedSkill
                        ? `Describe what you need from ${selectedSkill.name}.`
                        : "Describe the task and the result you need."
                    }
                    required
                    rows={6}
                    className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
                  />
                  <Button
                    type="button"
                    className="mt-5"
                    variant="brand"
                    size="lg"
                    onClick={reviewA2a}
                  >
                    Review task
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}

              {flowStep === "review" ? (
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Review your task
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Check the request before it is sent to the external agent.
                  </p>
                  <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-background/45 px-4">
                    {selectedSkill ? (
                      <div className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                        <dt className="text-xs font-medium text-muted-foreground">Capability</dt>
                        <dd className="text-sm font-medium text-foreground">{selectedSkill.name}</dd>
                      </div>
                    ) : null}
                    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                      <dt className="text-xs font-medium text-muted-foreground">Task</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                        {message}
                      </dd>
                    </div>
                  </dl>
                  <label className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background/45 p-4 text-xs leading-5 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      className="mt-1 accent-brand"
                    />
                    I understand this sends my message to an external agent service once.
                  </label>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setConfirmed(false);
                        setError(null);
                        setFlowStep("details");
                      }}
                    >
                      Back to details
                    </Button>
                    <Button
                      type="submit"
                      variant="brand"
                      size="lg"
                      disabled={!confirmed || busy}
                    >
                      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send task
                    </Button>
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}

          {service?.activationMethod === "mcp" && flowStep !== "result" ? (
            <form className="min-w-0" onSubmit={submitMcp}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Use a published capability
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Run an agent tool
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Select what you want to do. Sift builds the form from the fields
                this agent published.
              </p>
              <TaskFlowProgress step={flowStep} />

              {flowStep === "details" ? (
                <div>
                  <div className="min-w-0 max-w-full">
                    <SelectField
                      aria-labelledby="mcp-tool-label"
                      label="Choose a tool"
                      options={tools.map((tool) => ({
                        label: formatToolName(tool.name),
                        value: tool.name,
                      }))}
                      triggerClassName="h-11"
                      value={selectedTool}
                      onValueChange={(value) => {
                        setToolName(value);
                        const nextTool = tools.find((tool) => tool.name === value);
                        setToolValues(
                          initialTaskInputValues(
                            nextTool
                              ? taskInputFields(nextTool.inputSchema, agent.chainId)
                              : [],
                          ),
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
                    <div className="mt-4 min-w-0 border-l-2 border-brand/40 py-1 pl-3">
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
                        <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                          {selectedToolDetails.description}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-7 border-t border-border pt-6">
                    <div className="mb-5">
                      <h3 className="text-sm font-semibold text-foreground">
                        Details for this tool
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Only fields declared by the agent are shown.
                      </p>
                    </div>
                    <TaskInputFields
                      fields={selectedToolFields}
                      onChange={(name, value) => {
                        setToolValues((current) => ({ ...current, [name]: value }));
                        setError(null);
                      }}
                      values={toolValues}
                    />
                  </div>
                  <Button
                    type="button"
                    className="mt-5"
                    variant="brand"
                    size="lg"
                    onClick={reviewMcp}
                  >
                    Review request
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : null}

              {flowStep === "review" ? (
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Review your request
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Confirm the selected tool and the information that will be sent.
                  </p>
                  <dl className="mt-5 divide-y divide-border rounded-xl border border-border bg-background/45 px-4">
                    <div className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                      <dt className="text-xs font-medium text-muted-foreground">Tool</dt>
                      <dd className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {formatToolName(selectedTool)}
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold",
                          selectedToolDetails?.readOnly
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-200",
                        )}>
                          {selectedToolDetails?.readOnly ? "Read only" : "Action request"}
                        </span>
                      </dd>
                    </div>
                    {selectedToolFields
                      .filter((field) => (toolValues[field.name] ?? "").trim())
                      .map((field) => (
                        <div className="grid gap-1 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5" key={field.name}>
                          <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
                          <dd className="break-words font-mono text-xs leading-5 text-foreground">
                            {toolValues[field.name]}
                          </dd>
                        </div>
                      ))}
                  </dl>
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
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        setMcpConfirmed(false);
                        setError(null);
                        setFlowStep("details");
                      }}
                    >
                      Back to details
                    </Button>
                    <Button
                      type="submit"
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
                  </div>
                </div>
              ) : null}
            </form>
          ) : null}

          {service?.activationMethod === "x402" ? (
            <X402PaymentFlow chainId={agent.chainId} service={service} />
          ) : null}

          {error ? (
            <p role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/8 p-4 text-sm text-red-200">
              {error}
            </p>
          ) : null}
          {service &&
          service.activationMethod !== "erc8183" &&
          service.activationMethod !== "x402" &&
          flowStep === "result" ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Request complete
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                {transactions.length > 0
                    ? "Action ready for wallet review"
                    : "The agent responded"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {transactions.length > 0
                    ? "Review every transaction below before deciding whether to continue in your wallet."
                    : "Review the result below. Sift keeps the original response available for technical inspection."}
              </p>
              <TaskFlowProgress step="result" />
              <div className="flex items-start gap-3 border-l-2 border-emerald-400/60 py-1 pl-4">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <p className="text-sm text-foreground">
                  The request finished without Sift automatically signing or sending a wallet transaction.
                </p>
              </div>
              {result !== null ? (
                <ServiceResponse value={result} />
              ) : null}
              {service.activationMethod === "mcp" ? (
                <McpTransactionReview transactions={transactions} />
              ) : null}
              <Button
                type="button"
                className="mt-7"
                variant="outline"
                size="lg"
                onClick={startAnotherRequest}
              >
                Start another request
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

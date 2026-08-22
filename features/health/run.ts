import { selectHealthEndpoint } from "@/features/health/eligibility";
import type { HealthCheckConfig } from "@/features/health/config";
import { probeHealthEndpoint } from "@/features/health/probe";
import { applyHealthObservation } from "@/features/health/transition";
import type { HealthRepository } from "@/lib/db/health-repository";
import type { Logger } from "@/lib/indexer/logger";

export type HealthRunSummary = Readonly<{
  checked: number;
  degraded: number;
  offline: number;
  online: number;
  unknown: number;
}>;

type HealthRunDependencies = Readonly<{
  logger: Logger;
  now?: () => Date;
  probe?: typeof probeHealthEndpoint;
  repository: HealthRepository;
}>;

async function mapWithConcurrency<Input, Output>(
  values: readonly Input[],
  concurrency: number,
  mapper: (value: Input) => Promise<Output>,
): Promise<readonly Output[]> {
  const results: Output[] = new Array(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker(),
    ),
  );
  return results;
}

export async function runHealthChecks(
  config: HealthCheckConfig,
  dependencies: HealthRunDependencies,
): Promise<HealthRunSummary> {
  const now = dependencies.now ?? (() => new Date());
  const probe = dependencies.probe ?? probeHealthEndpoint;
  const startedAt = now();
  const staleBefore = new Date(
    startedAt.getTime() - config.intervalHours * 60 * 60 * 1_000,
  ).toISOString();
  const candidates = await dependencies.repository.listCandidates(
    config.limit,
    staleBefore,
  );

  dependencies.logger.info("health_check_started", {
    candidates: candidates.length,
    concurrency: config.concurrency,
    limit: config.limit,
    staleBefore,
  });

  const observations = await mapWithConcurrency(
    candidates,
    config.concurrency,
    async (candidate) => {
      const selection = selectHealthEndpoint(candidate.services);
      const observation = selection.target
        ? await probe(selection.target, {
            maxBytes: config.maxBytes,
            retries: config.retries,
            timeoutMs: config.timeoutMs,
          })
        : selection.observation;
      const snapshot = applyHealthObservation(
        candidate.previousHealth,
        observation,
        now().toISOString(),
      );

      dependencies.logger.info("agent_health_observed", {
        agentId: candidate.agentId,
        chainId: candidate.chainId,
        outcome: snapshot.outcome,
        status: snapshot.status,
        wasProbed: observation.wasProbed,
      });

      return {
        snapshot: { agentDbId: candidate.agentDbId, ...snapshot },
        wasProbed: observation.wasProbed,
      };
    },
  );
  const snapshots = observations.map((observation) => observation.snapshot);

  await dependencies.repository.save(snapshots);

  const summary: HealthRunSummary = {
    checked: observations.filter((observation) => observation.wasProbed).length,
    degraded: snapshots.filter((snapshot) => snapshot.status === "degraded")
      .length,
    offline: snapshots.filter((snapshot) => snapshot.status === "offline")
      .length,
    online: snapshots.filter((snapshot) => snapshot.status === "online")
      .length,
    unknown: snapshots.filter((snapshot) => snapshot.status === "unknown")
      .length,
  };

  dependencies.logger.info("health_check_complete", summary);
  return summary;
}

import type { ActivationCheckConfig } from "@/features/activation/config";
import { probeActivationService } from "@/features/activation/probe";
import type { ActivationRepository } from "@/lib/db/activation-repository";
import type { Logger } from "@/lib/indexer/logger";

export async function runActivationChecks(
  config: ActivationCheckConfig,
  dependencies: Readonly<{
    logger: Logger;
    now?: () => Date;
    repository: ActivationRepository;
  }>,
) {
  const now = dependencies.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  const staleBefore = new Date(
    Date.parse(checkedAt) - config.intervalHours * 60 * 60 * 1_000,
  ).toISOString();
  const candidates = await dependencies.repository.listCandidates(
    config.limit,
    staleBefore,
  );
  dependencies.logger.info("activation_check_started", {
    candidates: candidates.length,
  });

  const observations = new Array<
    Awaited<ReturnType<typeof probeActivationService>>
  >(candidates.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      observations[index] = await probeActivationService(candidates[index], {
        maxBytes: config.maxBytes,
        timeoutMs: config.timeoutMs,
      });
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(config.concurrency, candidates.length) },
      () => worker(),
    ),
  );
  await dependencies.repository.save(observations, checkedAt);

  const summary = {
    available: observations.filter((item) => item.status === "available").length,
    checked: observations.length,
    degraded: observations.filter((item) => item.status === "degraded").length,
    unavailable: observations.filter((item) => item.status === "unavailable").length,
    unsupported: observations.filter((item) => item.status === "unsupported").length,
  };
  dependencies.logger.info("activation_check_complete", summary);
  return summary;
}

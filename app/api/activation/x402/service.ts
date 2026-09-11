import "server-only";

import { isUsableActivationEvidence, parseActivationStatus } from "@/features/activation/model";
import { createActivationRepository } from "@/lib/db/activation-repository";

export async function resolveCurrentX402Service(serviceId: string) {
  const repository = createActivationRepository();
  const service = await repository.findService(serviceId);
  const identity = service
    ? await repository.findAgentIdentity(service.agent_db_id)
    : null;
  if (
    !service ||
    !identity ||
    service.activation_method !== "x402" ||
    !service.endpoint ||
    !(await repository.isServiceAgentEligible(service.agent_db_id)) ||
    !isUsableActivationEvidence({
      checkedAt: service.availability_checked_at,
      failureCode: service.availability_failure_code,
      lastSuccessAt: service.availability_last_success_at,
      method: "x402",
      status: parseActivationStatus(service.availability_status),
      summary: service.capability_summary,
    })
  ) {
    return null;
  }

  return {
    chainId: identity.chainId,
    endpoint: service.endpoint,
  } as const;
}

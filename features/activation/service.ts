import type { AgentProfileService } from "@/features/agents/model";
import {
  isActivationEvidenceCurrent,
  type ActivationMethod,
} from "@/features/activation/model";

export function currentActivationServices(
  services: readonly AgentProfileService[],
  now: number = Date.now(),
): readonly AgentProfileService[] {
  return services.filter(
    (service) =>
      service.activationMethod !== null &&
      service.activationMethod !== undefined &&
      service.endpoint !== null &&
      service.id !== undefined &&
      isActivationEvidenceCurrent(
        {
          lastSuccessAt: service.availabilityLastSuccessAt,
          status: service.availabilityStatus,
        },
        now,
      ),
  );
}

export function findCurrentActivationService(
  services: readonly AgentProfileService[],
  method: ActivationMethod,
  now: number = Date.now(),
): AgentProfileService | null {
  return (
    currentActivationServices(services, now).find(
      (service) => service.activationMethod === method,
    ) ?? null
  );
}

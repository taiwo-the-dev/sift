import type { AgentProfileService } from "@/features/agents/model";
import {
  classifyActivationMethod,
  isUsableActivationEvidence,
  type ActivationMethod,
} from "@/features/activation/model";
import { normalizeExternalHref } from "@/features/agents/links";

export type ExternalAgentService = Readonly<{
  href: string;
  serviceType: string;
}>;

export function externalAgentServices(
  services: readonly AgentProfileService[],
): readonly ExternalAgentService[] {
  const seen = new Set<string>();
  return services.flatMap((service) => {
    if (classifyActivationMethod(service.serviceType)) return [];
    const href = normalizeExternalHref(service.endpoint);
    if (!href || seen.has(href)) return [];
    seen.add(href);
    return [{ href, serviceType: service.serviceType }];
  });
}

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
      isUsableActivationEvidence(
        {
          checkedAt: service.availabilityCheckedAt,
          failureCode: service.availabilityFailureCode,
          lastSuccessAt: service.availabilityLastSuccessAt,
          method: service.activationMethod,
          status: service.availabilityStatus,
          summary: service.capabilitySummary,
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

const canonicalAgentIdPattern = /^(0|[1-9][0-9]{0,77})$/;
const canonicalChainIdPattern = /^[1-9][0-9]{0,15}$/;
const maximumUint256 = (1n << 256n) - 1n;

export type AgentProfileIdentity = Readonly<{
  agentId: string;
  chainId: number;
}>;

export function parseAgentProfileIdentity(
  chainId: string,
  agentId: string,
): AgentProfileIdentity | null {
  if (
    !canonicalChainIdPattern.test(chainId) ||
    !canonicalAgentIdPattern.test(agentId)
  ) {
    return null;
  }

  const parsedChainId = Number(chainId);

  if (
    !Number.isSafeInteger(parsedChainId) ||
    parsedChainId <= 0 ||
    BigInt(agentId) > maximumUint256
  ) {
    return null;
  }

  return { agentId, chainId: parsedChainId };
}

export function buildAgentProfileHref(
  chainId: number,
  agentId: string,
): string | null {
  const identity = parseAgentProfileIdentity(String(chainId), agentId);

  return identity
    ? `/agents/${identity.chainId}/${identity.agentId}`
    : null;
}

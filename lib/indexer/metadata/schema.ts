import { z } from "zod";

const registrationSchema = z.object({
  agentId: z.union([
    z.number().int().nonnegative().safe(),
    z.string().regex(/^(0|[1-9][0-9]{0,77})$/),
  ]),
  agentRegistry: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[a-z0-9-]+:[^:]+:0x[0-9a-fA-F]{40}$/),
});

const serviceSchema = z
  .object({
    endpoint: z.string().trim().min(1).max(2_048),
    name: z.string().trim().min(1).max(100),
    version: z.string().trim().min(1).max(100).optional(),
  })
  .loose();

export const agentMetadataSchema = z
  .object({
    active: z.boolean().optional(),
    description: z.string().trim().max(10_000).optional(),
    endpoints: z.array(serviceSchema).max(100).optional(),
    image: z.string().trim().max(2_048).optional(),
    name: z.string().trim().min(1).max(256),
    registrations: z.array(registrationSchema).max(100).optional(),
    services: z.array(serviceSchema).max(100).optional(),
    supportedTrust: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    type: z.literal(
      "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    ),
    x402Support: z.boolean().optional(),
  })
  .loose();

export type AgentMetadata = z.infer<typeof agentMetadataSchema>;

export type MetadataValidationResult =
  | Readonly<{ metadata: AgentMetadata; success: true }>
  | Readonly<{ code: "invalid-schema"; success: false }>;

export function validateAgentMetadata(
  input: unknown,
): MetadataValidationResult {
  const result = agentMetadataSchema.safeParse(input);

  if (!result.success) {
    return { code: "invalid-schema", success: false };
  }

  return { metadata: result.data, success: true };
}

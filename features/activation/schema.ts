import { z } from "zod";

const normalizedText = (minimum: number, maximum: number) =>
  z
    .string()
    .transform((value) => value.replaceAll("\r\n", "\n").trim())
    .pipe(
      z
        .string()
        .min(minimum)
        .max(maximum)
        .refine(
          (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
          "Unsupported control characters.",
        ),
    );

export const a2aTaskSchema = z
  .object({
    message: normalizedText(5, 2_000),
    serviceId: z.uuid(),
  })
  .strict();

export const mcpToolCallSchema = z
  .object({
    arguments: z.record(z.string(), z.unknown()),
    confirmedSideEffects: z.boolean(),
    serviceId: z.uuid(),
    toolName: z.string().trim().min(1).max(128),
  })
  .strict();

export type A2aTaskInput = z.infer<typeof a2aTaskSchema>;
export type McpToolCallInput = z.infer<typeof mcpToolCallSchema>;

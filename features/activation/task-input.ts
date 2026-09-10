export type TaskInputKind =
  | "array"
  | "boolean"
  | "integer"
  | "number"
  | "object"
  | "select"
  | "string";

export type TaskInputField = Readonly<{
  defaultValue: string;
  description: string | null;
  kind: TaskInputKind;
  label: string;
  maximum: number | null;
  maxLength: number | null;
  minimum: number | null;
  minLength: number | null;
  name: string;
  options: readonly string[];
  required: boolean;
}>;

export type TaskInputValues = Readonly<Record<string, string>>;

const MAX_FIELDS = 50;
const MAX_ENUM_OPTIONS = 100;
const MAX_LABEL_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function boundedText(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maximum)
    : null;
}

function presentFieldDescription(value: unknown): string | null {
  const description = boundedText(value, MAX_DESCRIPTION_LENGTH);
  if (!description) return null;

  return description
    .replace(
      /the amount to withdraw in human-readable decimal format\s*\(e\.g\.?[,]?\s*['"]?([^'")]+)['"]?\)/gi,
      "the amount to withdraw (for example, $1)",
    )
    .replace(
      /use\s+['"]?(-1)['"]?\s+to withdraw (?:the )?entire balance/gi,
      "Enter $1 to withdraw the full available balance",
    )
    .replace(/^the amount to withdraw/i, "Enter the amount to withdraw");
}

function humanizeFieldName(value: string): string {
  const words = value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase();
      if (normalized === "id") return "ID";
      if (normalized === "url") return "URL";
      if (normalized === "api") return "API";
      if (normalized === "bps") return "BPS";
      if (normalized === "nfa") return "NFA";
      if (normalized === "evm") return "EVM";
      if (normalized === "bnb") return "BNB";
      if (normalized === "usd") return "USD";
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    });
  return words.join(" ").slice(0, MAX_LABEL_LENGTH) || "Input";
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boundedLength(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 10_000
    ? value
    : null;
}

function schemaType(rule: Readonly<Record<string, unknown>>): TaskInputKind {
  const options = Array.isArray(rule.enum)
    ? rule.enum.filter((item): item is string => typeof item === "string")
    : [];
  if (options.length > 0) return "select";

  const direct = rule.type;
  if (
    direct === "array" ||
    direct === "boolean" ||
    direct === "integer" ||
    direct === "number" ||
    direct === "object" ||
    direct === "string"
  ) {
    return direct;
  }

  if (Array.isArray(rule.anyOf)) {
    for (const option of rule.anyOf.slice(0, 10)) {
      const optionType = record(option)?.type;
      if (
        optionType === "array" ||
        optionType === "boolean" ||
        optionType === "integer" ||
        optionType === "number" ||
        optionType === "object" ||
        optionType === "string"
      ) {
        return optionType;
      }
    }
  }

  return "string";
}

function defaultFieldValue(
  name: string,
  kind: TaskInputKind,
  rule: Readonly<Record<string, unknown>>,
  chainId: number,
  required: boolean,
  options: readonly string[],
): string {
  const suppliedDefault = rule.default;
  if (suppliedDefault !== undefined && suppliedDefault !== null) {
    if (typeof suppliedDefault === "string") {
      return kind !== "select" || options.includes(suppliedDefault)
        ? suppliedDefault
        : "";
    }
    if (typeof suppliedDefault === "number" || typeof suppliedDefault === "boolean") {
      return String(suppliedDefault);
    }
    try {
      return JSON.stringify(suppliedDefault);
    } catch {
      return "";
    }
  }

  if (name.toLowerCase() === "chainid") return String(chainId);
  if (kind === "select" && required) return options[0] ?? "";
  if (kind === "array" && required) return "[]";
  if (kind === "object" && required) return "{}";
  return "";
}

export function taskInputFields(
  schema: Readonly<Record<string, unknown>>,
  chainId: number,
): readonly TaskInputField[] {
  const properties = record(schema.properties);
  if (!properties) return [];
  const requiredNames = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter((item): item is string => typeof item === "string")
      : [],
  );

  return Object.entries(properties)
    .slice(0, MAX_FIELDS)
    .flatMap(([name, rawRule]) => {
      if (
        name.length === 0 ||
        name.length > 128 ||
        /[\u0000-\u001F\u007F]/.test(name) ||
        ["__proto__", "constructor", "prototype"].includes(name)
      ) {
        return [];
      }
      const rule = record(rawRule);
      if (!rule) return [];
      const options = Array.isArray(rule.enum)
        ? [...new Set(
            rule.enum.filter(
              (item): item is string =>
                typeof item === "string" && item.length <= 256,
            ),
          )].slice(0, MAX_ENUM_OPTIONS)
        : [];
      const kind = schemaType(rule);
      const required = requiredNames.has(name);
      return [
        {
          defaultValue: defaultFieldValue(
            name,
            kind,
            rule,
            chainId,
            required,
            options,
          ),
          description: presentFieldDescription(rule.description),
          kind,
          label:
            boundedText(rule.title, MAX_LABEL_LENGTH) ?? humanizeFieldName(name),
          maximum: finiteNumber(rule.maximum),
          maxLength: boundedLength(rule.maxLength),
          minimum: finiteNumber(rule.minimum),
          minLength: boundedLength(rule.minLength),
          name,
          options,
          required,
        },
      ];
    });
}

export function initialTaskInputValues(
  fields: readonly TaskInputField[],
): TaskInputValues {
  return Object.fromEntries(fields.map((field) => [field.name, field.defaultValue]));
}

function parseStructuredField(field: TaskInputField, value: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new TypeError(`${field.label} must contain valid JSON.`);
  }
  if (field.kind === "array" && !Array.isArray(parsed)) {
    throw new TypeError(`${field.label} must be a list.`);
  }
  if (field.kind === "object" && !record(parsed)) {
    throw new TypeError(`${field.label} must be an object.`);
  }
  return parsed;
}

export function buildTaskArguments(
  fields: readonly TaskInputField[],
  values: TaskInputValues,
): Readonly<Record<string, unknown>> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const rawValue = values[field.name]?.trim() ?? "";
    if (!rawValue) {
      if (field.required) throw new TypeError(`Enter ${field.label.toLowerCase()}.`);
      continue;
    }

    if (field.kind === "boolean") {
      if (rawValue !== "true" && rawValue !== "false") {
        throw new TypeError(`Choose yes or no for ${field.label.toLowerCase()}.`);
      }
      result[field.name] = rawValue === "true";
      continue;
    }

    if (field.kind === "integer" || field.kind === "number") {
      const parsed = Number(rawValue);
      if (
        !Number.isFinite(parsed) ||
        (field.kind === "integer" && !Number.isInteger(parsed))
      ) {
        throw new TypeError(`Enter a valid number for ${field.label.toLowerCase()}.`);
      }
      if (field.minimum !== null && parsed < field.minimum) {
        throw new TypeError(`${field.label} must be at least ${field.minimum}.`);
      }
      if (field.maximum !== null && parsed > field.maximum) {
        throw new TypeError(`${field.label} must be no more than ${field.maximum}.`);
      }
      result[field.name] = parsed;
      continue;
    }

    if (field.kind === "array" || field.kind === "object") {
      result[field.name] = parseStructuredField(field, rawValue);
      continue;
    }

    if (field.kind === "select" && !field.options.includes(rawValue)) {
      throw new TypeError(`Choose a valid option for ${field.label.toLowerCase()}.`);
    }
    if (field.minLength !== null && rawValue.length < field.minLength) {
      throw new TypeError(
        `${field.label} must contain at least ${field.minLength} characters.`,
      );
    }
    if (field.maxLength !== null && rawValue.length > field.maxLength) {
      throw new TypeError(
        `${field.label} must contain no more than ${field.maxLength} characters.`,
      );
    }
    result[field.name] = rawValue;
  }
  return result;
}

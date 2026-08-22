const timestampFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("en");

export function formatProfileTimestamp(value: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : `${timestampFormatter.format(date)} UTC`;
}

export function formatAddress(value: string | null): string {
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    return "Not available";
  }

  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function formatIdentifierCount(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "Not available"
    : numberFormatter.format(value);
}

export function formatResponseTime(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "Not available"
    : `${numberFormatter.format(value)} ms`;
}

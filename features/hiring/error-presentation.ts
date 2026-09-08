export type HiringErrorDescription = Readonly<{
  message: string;
  technicalDetails: string | null;
  title: string;
}>;

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Unknown error";
}

export function describeHiringError(error: unknown): HiringErrorDescription {
  const technicalDetails = errorText(error).slice(0, 1_000);
  const normalized = technicalDetails.toLowerCase();

  if (normalized.includes("user rejected") || normalized.includes("user denied")) {
    return {
      message: "Nothing was submitted. Approve the request in your wallet when you are ready.",
      technicalDetails,
      title: "The request was cancelled",
    };
  }

  if (
    normalized.includes("0x") &&
    (normalized.includes("executing calls") || normalized.includes("reason:"))
  ) {
    return {
      message:
        "The wallet could not complete the permission transaction. Check that the passkey wallet is on the selected network and has enough BNB for network fees, then try again.",
      technicalDetails,
      title: "The permission was not created",
    };
  }

  if (normalized.includes("insufficient funds")) {
    return {
      message:
        "Add BNB to this wallet for network fees, then check the balance and try again.",
      technicalDetails,
      title: "The wallet needs BNB",
    };
  }

  if (normalized.includes("expired") && normalized.includes("quote")) {
    return {
      message: "Request a new price and review it again before continuing.",
      technicalDetails,
      title: "The price has expired",
    };
  }

  if (
    normalized.includes("older erc-8183 hiring format") ||
    normalized.includes("returned an unsigned price")
  ) {
    return {
      message:
        "This agent's hiring service is outdated. No wallet transaction was started. Try another agent, or wait for this agent's owner to update it.",
      technicalDetails,
      title: "This agent cannot be hired safely yet",
    };
  }

  if (normalized.includes("session") && normalized.includes("memory")) {
    return {
      message:
        "This browser tab no longer has the temporary signing key. Restart the hire to create a fresh protected permission.",
      technicalDetails,
      title: "The protected session has ended",
    };
  }

  return {
    message:
      technicalDetails === "Unknown error"
        ? "Please check your wallet and network, then try again."
        : technicalDetails,
    technicalDetails: technicalDetails === "Unknown error" ? null : technicalDetails,
    title: "Sift could not complete that step",
  };
}

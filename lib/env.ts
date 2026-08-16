const supportedNodeEnvironments = ["development", "production", "test"] as const;

type NodeEnvironment = (typeof supportedNodeEnvironments)[number];

function isNodeEnvironment(value: string): value is NodeEnvironment {
  return supportedNodeEnvironments.some((environment) => environment === value);
}

function readNodeEnvironment(): NodeEnvironment {
  const value = process.env.NODE_ENV ?? "development";

  if (!isNodeEnvironment(value)) {
    throw new Error(`Invalid NODE_ENV: ${value}`);
  }

  return value;
}

export const env = Object.freeze({
  NODE_ENV: readNodeEnvironment(),
});

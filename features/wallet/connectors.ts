export function deduplicateConnectorsById<
  TConnector extends Readonly<{ id: string }>,
>(connectors: readonly TConnector[]): TConnector[] {
  const connectorIds = new Set<string>();

  return connectors.filter((connector) => {
    if (connectorIds.has(connector.id)) {
      return false;
    }

    connectorIds.add(connector.id);
    return true;
  });
}

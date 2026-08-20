export class DatabaseOperationError extends Error {
  readonly operation: string;

  constructor(operation: string, cause: unknown) {
    super(`Database operation "${operation}" failed.`, { cause });
    this.name = "DatabaseOperationError";
    this.operation = operation;
  }
}

/** IDs and snapshots shared by domain transitions. */
export const uid = (): string =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

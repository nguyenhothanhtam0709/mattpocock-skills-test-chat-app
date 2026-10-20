import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  /** Set once the caller is authenticated. */
  userId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Called by authentication once the User is known, so later log lines carry the User ID. */
export function setRequestUserId(userId: string): void {
  const context = storage.getStore();
  if (context) context.userId = userId;
}

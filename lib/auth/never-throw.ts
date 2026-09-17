// @neondatabase/auth's fetch wrapper throws on any non-2xx response (wrong password,
// bad OTP, rate limit) even with `throw: false`, so `await authClient.x()` rejects
// instead of resolving `{ data, error }`. Every form in the app is written against the
// documented `{ data, error }` shape, so a rejection skipped their error handling and
// left buttons stuck on "pending". This wraps the client so async calls always resolve.

export type ClientError = Error & { status?: number; code?: string };

function toClientError(err: unknown): ClientError {
  if (err instanceof Error) return err as ClientError;
  return Object.assign(new Error(typeof err === "string" ? err : "Something went wrong. Please try again."), {
    cause: err,
  });
}

const cache = new WeakMap<object, unknown>();

function wrap<T extends object>(target: T, thisArg: unknown): T {
  const cached = cache.get(target);
  if (cached) return cached as T;

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);
      if (value === null || (typeof value !== "object" && typeof value !== "function")) return value;
      // Proxy invariant: a non-configurable, non-writable property must be returned as-is.
      const desc = Reflect.getOwnPropertyDescriptor(obj, prop);
      if (desc && !desc.configurable && !desc.writable) return value;
      return wrap(value as object, obj);
    },
    apply(fn, _this, args) {
      const result = Reflect.apply(fn as (...a: unknown[]) => unknown, thisArg, args);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        return (result as Promise<unknown>).then(
          (value) => value,
          (err) => ({ data: null, error: toClientError(err) }),
        );
      }
      return result;
    },
  });

  cache.set(target, proxy);
  return proxy;
}

/** Async methods resolve `{ data: null, error }` instead of rejecting; sync APIs (hooks, stores) are untouched. */
export function neverThrow<T extends object>(client: T): T {
  return wrap(client, undefined);
}

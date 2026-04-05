import { PrismaClient } from "@prisma/client";

// Neon free tier suspends after 5 minutes of inactivity. The first query after
// suspension fails with P1001 while the compute wakes up (~2-3s). We retry
// automatically so the caller never sees the error.
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function isNeonWakeError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Can't reach database server") || msg.includes("P1001");
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      if (!isNeonWakeError(err) || i === MAX_RETRIES - 1) throw err;
      lastErr = err;
      console.log(`[Prisma] Neon waking up, retrying in ${RETRY_DELAY_MS}ms (attempt ${i + 1}/${MAX_RETRIES})…`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

const baseClient = new PrismaClient();

// Wrap the client in a Proxy so every model method retries on Neon wake errors.
export const prisma = new Proxy(baseClient, {
  get(target, prop) {
    const value = target[prop as keyof typeof target];
    if (typeof prop === "string" && typeof value === "object" && value !== null) {
      return new Proxy(value as object, {
        get(modelTarget, methodProp) {
          const method = modelTarget[methodProp as keyof typeof modelTarget];
          if (typeof method === "function") {
            return (...args: unknown[]) => withRetry(() => (method as Function).apply(modelTarget, args));
          }
          return method;
        },
      });
    }
    return value;
  },
}) as PrismaClient;

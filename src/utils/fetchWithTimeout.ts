export type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
};

/**
 * Wrapper de fetch com timeout via AbortController.
 * Evita loaders infinitos quando o backend não responde.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...init } = options;

  // Se um signal já foi fornecido externamente, respeitamos ele.
  // Ainda assim aplicamos timeout apenas quando não há signal.
  if (init.signal) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

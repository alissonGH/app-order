export const DEFAULT_BACKEND_ERROR_MESSAGE = 'Erro não esperado, reporte ao administrador.';

export function normalizeMessage(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const msg = value.trim();
    return msg ? msg : null;
  }

  if (value instanceof Error) {
    return normalizeMessage(value.message);
  }

  if (typeof value === 'object' && 'message' in (value as any)) {
    return normalizeMessage((value as any).message);
  }

  return null;
}

function extractMessageFieldFromJson(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  return normalizeMessage((data as any).message);
}

/**
 * Extrai `message` do JSON de erro retornado pelo backend.
 * Se não for possível extrair, retorna uma mensagem padrão.
 */
export async function extractBackendErrorMessage(
  response: Response,
  defaultMessage: string = DEFAULT_BACKEND_ERROR_MESSAGE
): Promise<string> {
  // 1) tenta JSON quando o header indicar
  try {
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const msg = extractMessageFieldFromJson(json);
      if (msg) return msg;
      return defaultMessage;
    }
  } catch {
    // ignore
  }

  // 2) fallback: lê texto e tenta interpretar como JSON
  try {
    const text = await response.text();

    // Se for JSON válido em string, tenta extrair message
    try {
      const parsed = JSON.parse(text);
      const msg = extractMessageFieldFromJson(parsed);
      if (msg) return msg;
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }

  return defaultMessage;
}

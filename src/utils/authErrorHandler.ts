import { Alert } from "react-native";
import { clearToken } from "../auth/authSlice";
import { removeToken } from "../auth/tokenStorage";

type JwtErrorBody = {
  timestamp?: string;
  status?: number;
  error?: string;
  code?: string;
  message?: string;
};

type DispatchLike = (action: any) => void;

function getUserMessage(code?: string, backendMessage?: string) {
  switch (code) {
    case "JWT_MISSING":
      return {
        title: "Login necessário",
        message: backendMessage || "Você precisa fazer login novamente.",
      };
    case "JWT_EXPIRED":
      return {
        title: "Sessão expirada",
        message: backendMessage || "Sua sessão expirou. Faça login novamente.",
      };
    case "JWT_INVALID":
      return {
        title: "Sessão inválida",
        message: backendMessage || "Token inválido. Faça login novamente.",
      };
    case "JWT_REVOKED":
      return {
        title: "Sessão revogada",
        message: backendMessage || "Sua sessão foi revogada. Faça login novamente.",
      };
    default:
      return {
        title: "Autenticação",
        message: backendMessage || "Falha de autenticação. Faça login novamente.",
      };
  }
}

async function tryParseJwtBody(response: Response): Promise<JwtErrorBody | null> {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return null;
    }
    return (await response.json()) as JwtErrorBody;
  } catch {
    return null;
  }
}

/**
 * Trata respostas 401 do backend com o padrão do JwtExceptionHandler.
 * - Limpa token do SecureStore + Redux
 * - Mostra alerta específico por código
 * - Retorna true se foi um erro de autenticação tratado
 */
export async function handleAuthErrorResponse(response: Response, dispatch: DispatchLike): Promise<boolean> {
  if (response.status !== 401) return false;

  const body = await tryParseJwtBody(response);
  const code = body?.code;
  const backendMessage = body?.message;

  await removeToken();
  dispatch(clearToken());

  const ui = getUserMessage(code, backendMessage);
  Alert.alert(ui.title, ui.message);

  return true;
}

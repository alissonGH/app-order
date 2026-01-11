import { clearToken } from "../auth/authSlice";
import { removeAuthKind, removeToken } from "../auth/tokenStorage";

type JwtErrorBody = {
  timestamp?: string;
  status?: number;
  error?: string;
  code?: string;
  message?: string;
};

type DispatchLike = (action: any) => void;

/**
 * Trata respostas 401 do backend com o padrão do JwtExceptionHandler.
 * - Limpa token do SecureStore + Redux
 * - Retorna true se foi um erro de autenticação tratado
 */
export async function handleAuthErrorResponse(response: Response, dispatch: DispatchLike): Promise<boolean> {
  if (response.status !== 401) return false;

  await removeToken();
  await removeAuthKind();
  dispatch(clearToken());

  return true;
}

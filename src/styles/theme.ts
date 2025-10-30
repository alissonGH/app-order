export interface Theme {
  primary: string;
  success: string;
  danger: string;
  muted: string;
  text: string;
  background: string;
  card: string;
  border: string;
}

export const THEME: Theme = {
  primary: "#3b82f6", // azul
  success: "#16a34a", // verde
  danger: "#ef4444",  // vermelho
  muted: "#6b7280",   // cinza para textos secundários
  text: "#111827",
  background: "#fafafa",
  card: "#ffffff",
  border: "#e5e7eb",  // borda suave
};

export default THEME;
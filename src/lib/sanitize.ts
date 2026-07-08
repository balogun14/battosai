const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function escapeHtml(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch);
}


/**
 * AUDITOR DE PRECISIÓN V16.4 (OPTIMIZACIÓN PARA VERCEL)
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Número Crítico (Ej: 1660, 3060, 12400)
  const modelMatch = p.match(/\d{3,5}/);
  if (modelMatch) {
    const model = modelMatch[0];
    if (t.includes(model)) return true;
  }

  // 2. Tokens de Marca/Serie
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);
  const matches = tokens.filter(tk => t.includes(tk));

  return matches.length >= 1; // Si coincide al menos uno de los tokens técnicos (TUF, GTX, etc)
}

export async function fetchHtml(url: string, retry = 1): Promise<string> {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": uas[Math.floor(Math.random() * uas.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        "Referer": "https://www.google.com.ar/"
      },
      // CRÍTICO: El timeout debe ser MENOR al límite de Vercel (10s)
      signal: AbortSignal.timeout(8000)
    });

    if (res.status === 403 || res.status === 429) {
      console.error(`Blocked by ${url} (Status ${res.status})`);
      return "";
    }

    return res.ok ? await res.text() : "";
  } catch (e) {
    if (retry > 0) return fetchHtml(url, retry - 1);
    return "";
  }
}

export function parseArsPrice(text: string): number | null {
  if (!text) return null;
  const cleaned = text.split(",")[0].replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return (n > 1000) ? n : null;
}

export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set();
  return items.filter(it => {
    const base = it.url.split("?")[0];
    return base && !seen.has(base) && seen.add(base);
  });
}

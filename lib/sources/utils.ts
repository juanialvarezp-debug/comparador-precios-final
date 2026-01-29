
/**
 * AUDITOR DE PRECISIÓN V16.5 (PRODUCCIÓN RESILIENTE)
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Detección por Modelo (Ej: 1660, 3060)
  const modelMatch = p.match(/\d{3,5}/);
  if (modelMatch && t.includes(modelMatch[0])) return true;

  // 2. Coincidencia Parcial (TUF, ASUS, GTX)
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);
  return tokens.some(tk => t.includes(tk));
}

export async function fetchHtml(url: string, retry = 1): Promise<string> {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": uas[Math.floor(Math.random() * uas.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.google.com/"
      },
      signal: AbortSignal.timeout(9000) // 9 segundos para no exceder a Vercel
    });
    return res.ok ? await res.text() : "";
  } catch (e) {
    return "";
  }
}

export function parseArsPrice(text: string): number | null {
  if (!text) return null;
  const n = parseInt(text.replace(/[^\d]/g, ""), 10);
  return (n > 5000) ? n : null;
}

export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set();
  return items.filter(it => {
    const base = it.url.split("?")[0];
    return base && !seen.has(base) && seen.add(base);
  });
}


/**
 * AUDITOR DE PRECISIÓN V16.6 (CAMUFLAJE DE PRODUCCIÓN)
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();
  const model = p.match(/\d{3,5}/)?.[0];
  if (model && t.includes(model)) return true;
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);
  return tokens.some(tk => t.includes(tk));
}

export async function fetchHtml(url: string, retry = 1): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
      },
      signal: AbortSignal.timeout(9500)
    });

    if (res.status === 403) return "";
    return res.ok ? await res.text() : "";
  } catch (e) {
    return "";
  }
}

export function parseArsPrice(text: string): number | null {
  if (!text) return null;
  const cleaned = text.split(",")[0].replace(/[^\d]/g, "");
  const n = parseInt(cleaned, 10);
  return (n > 5000) ? n : null;
}

export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set();
  return items.filter(it => {
    const base = it.url.split("?")[0];
    return base && !seen.has(base) && seen.add(base);
  });
}

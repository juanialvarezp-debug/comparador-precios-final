
/**
 * AUDITOR DE PRECISIÓN V16.3 (FLEXIBILIDAD DE PRODUCCIÓN)
 * Optimizado para evitar bloqueos y falsos negativos en Vercel.
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Coincidencia Total (Sin basura)
  const pClean = p.replace(/[^A-Z0-9]/g, "");
  const tClean = t.replace(/[^A-Z0-9]/g, "");
  if (tClean.includes(pClean)) return true;

  // 2. Modelo Numérico (Filtro sagrado)
  const modelMatch = p.match(/\d{3,5}/);
  if (modelMatch) {
    const model = modelMatch[0];
    if (t.includes(model)) return true;
  }

  // 3. Fallback por Tokens (Asus + Tuf)
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);
  const matches = tokens.filter(tk => t.includes(tk));

  return matches.length >= 2;
}

export async function fetchHtml(url: string, retry = 2): Promise<string> {
  // Lista de identidades reales para evitar detecciones de bot en Vercel
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": uas[Math.floor(Math.random() * uas.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8"
      },
      signal: AbortSignal.timeout(18000) // 18 segundos de espera (Vercel es más lento que una PC local)
    });
    return res.ok ? await res.text() : (retry > 0 ? fetchHtml(url, retry - 1) : "");
  } catch (e) {
    return retry > 0 ? fetchHtml(url, retry - 1) : "";
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

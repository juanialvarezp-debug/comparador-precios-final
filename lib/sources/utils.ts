
/**
 * AUDITOR DE PRECISIÓN V18.5 (EVASIÓN DE BLOQUEOS AVANZADA)
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Detección por Modelo (Ej: 1650)
  const modelMatch = p.match(/\d{3,5}/);
  if (modelMatch) {
    const model = modelMatch[0];
    if (!t.includes(model)) return false; // Si no tiene el número de modelo, descartamos
  }

  // 2. Tokens de Marca / Serie
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);

  // Si tiene marca ASUS, debe estar en el título
  if (p.includes("ASUS") && !t.includes("ASUS")) return false;
  if (p.includes("TUF") && !t.includes("TUF")) return false;
  if (p.includes("DUAL") && !t.includes("DUAL")) return false;

  return true;
}

export async function fetchHtml(url: string, retry = 1): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        "Referer": "https://www.google.com.ar/",
        "Connection": "keep-alive"
      },
      redirect: 'follow', // Seguimos redirecciones (Precialo a veces manda de /buscar a /search)
      signal: AbortSignal.timeout(12000) // Aumentamos a 12s para dar aire a Vercel
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
  return (n > 5000) ? n : null;
}

export function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set();
  return items.filter(it => {
    const base = it.url.split("?")[0];
    return base && !seen.has(base) && seen.add(base);
  });
}

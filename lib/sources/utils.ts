
/**
 * AUDITOR DE PRECISIÓN V16 (MODO RELAJADO)
 * Si el número de modelo está, el producto es válido.
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Número Crítico (Ej: 1660, 3060, 12400)
  const modelMatch = p.match(/\d{3,5}/);
  const model = modelMatch ? modelMatch[0] : "";

  if (model && t.includes(model)) {
    // Si tiene el modelo, verificamos que no sea de otra familia (ej: no confundir 1660 con 3060)
    const titleNums = t.match(/\d{3,5}/g) || [];
    if (titleNums.includes(model)) return true;
  }

  // 2. Coincidencia por Palabras Clave (Tuf, Asus, etc)
  const tokens = p.split(/[^A-Z0-9]/).filter(tk => tk.length >= 3);
  const matches = tokens.filter(tk => t.includes(tk));

  return matches.length >= 2;
}

export async function fetchHtml(url: string, retry = 2): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(15000)
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


/**
 * AUDITOR DE PRECISIÓN V18.6 (MÁXIMA TOLERANCIA Y VELOCIDAD)
 */
export function pnMatchesTitle(pn: string, title: string): boolean {
  if (!pn || !title) return false;
  const p = pn.toUpperCase();
  const t = title.toUpperCase();

  // 1. Detección por Modelo (Ej: 1650) - OBLIGATORIO
  const modelMatch = p.match(/\d{3,5}/);
  if (modelMatch) {
    const model = modelMatch[0];
    if (!t.includes(model)) return false;
  }

  // 2. Tolerancia a Variantes (V18.6)
  // No filtramos por marca aquí para evitar descartar resultados que omiten 'ASUS' o 'MSI'

  // Si buscamos SUPER, el título debe decir SUPER o tener la 'S' pegada al modelo
  if (p.includes("SUPER") || p.includes("1660S")) {
    const hasSuper = t.includes("SUPER") || t.includes(modelMatch ? modelMatch[0] + "S" : "SUPER");
    if (!hasSuper) return false;
  }

  return true; // Si tiene el modelo, por ahora lo dejamos pasar
}

export async function fetchHtml(url: string, retry = 1): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
        "Accept": "text/html,*/*",
        "Cache-Control": "no-cache"
      },
      // CRITICO: Timeout de 7s para no matar la función de Vercel (10s total)
      signal: AbortSignal.timeout(7000)
    });

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

import * as cheerio from "cheerio";

let cachedRate: number | null = null;
let lastFetch = 0;

export async function getBnaUsdSellArs(): Promise<number> {
  // Caché simple por 1 hora para no saturar al BNA
  if (cachedRate && Date.now() - lastFetch < 3600000) {
    return cachedRate;
  }

  try {
    const url = "https://www.bna.com.ar/Personas";
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) throw new Error(`BNA status: ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    let sell: number | null = null;

    $("#billetes tr").each((_, tr) => {
      const rowText = $(tr).text().replace(/\s+/g, " ").trim();
      if (!/Dolar\s*U\.?S\.?A/i.test(rowText)) return;

      const tds = $(tr).find("td");
      if (tds.length < 3) return;

      const ventaText = $(tds.get(2)).text().trim();
      const parsed = parseArNumber(ventaText);
      if (parsed && parsed > 500) sell = parsed;
    });

    if (!sell) {
      // Fallback a un selector alternativo si cambió
      const altSell = $(".tab-pane.active .venta").first().text().trim();
      const parsedAlt = parseArNumber(altSell);
      if (parsedAlt && parsedAlt > 500) sell = parsedAlt;
    }

    if (!sell) throw new Error("No se pudo extraer el precio del BNA");

    cachedRate = sell;
    lastFetch = Date.now();
    return sell;
  } catch (error) {
    console.error("Error fetching BNA:", error);
    if (cachedRate) return cachedRate;
    return 1050; // Fallback hardcoded sensato para principios de 2026
  }
}

function parseArNumber(value: string): number | null {
  const cleaned = value.replace(/[^\d.,-]/g, "").trim();
  if (!cleaned) return null;

  if (cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

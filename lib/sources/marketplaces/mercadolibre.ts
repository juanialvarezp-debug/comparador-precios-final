
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, parseArsPrice, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchMercadoLibre(partNumber: string, limit = 25): Promise<PriceResult[]> {
  // ESTRATEGIA GOOGLE: MercadoLibre busca mejor con términos simples.
  // TUF-GTX1660S-O6G-GAMING -> 1660 super
  const modelNum = partNumber.match(/\d{3,4}/)?.[0] || "";
  const series = partNumber.toUpperCase().includes("1660") ? "1660 super" : modelNum;
  const searchTerms = series || partNumber;

  const url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchTerms)}`;

  try {
    const html = await fetchHtml(url);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: PriceResult[] = [];

    // Selectores universales de MercadoLibre 2026
    $(".ui-search-layout__item, .ui-search-result, .poly-card").each((_, el) => {
      const $el = $(el);

      const title = $el.find(".ui-search-item__title, .poly-component__title, h2").first().text().trim();
      if (!title) return;

      // EL AUDITOR DECIDE (V16)
      if (!pnMatchesTitle(partNumber, title)) return;

      const href = $el.find("a").attr("href");
      if (!href) return;

      // Intentamos capturar el precio de varios selectores posibles
      const priceText = $el.find(".andes-money-amount__fraction").first().text().trim();
      const price = parseArsPrice(priceText);

      if (!price || price < 5000) return;

      results.push({
        supplier: "MercadoLibre",
        title,
        priceArs: price,
        originalPrice: price,
        currency: "ARS",
        url: href
      });
    });

    return dedupeByUrl(results).slice(0, limit);
  } catch (error) {
    return [];
  }
}

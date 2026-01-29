
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, parseArsPrice, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchMercadoLibre(partNumber: string, limit = 40): Promise<PriceResult[]> {
  // Traducimos términos técnicos a comerciales (1660S -> 1660 super)
  const model = partNumber.match(/\d{3,4}/)?.[0] || "";
  const searchTerm = partNumber.toUpperCase().includes("1660") ? "1660 super" : model || partNumber;

  const url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchTerm)}`;

  try {
    const html = await fetchHtml(url);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: PriceResult[] = [];

    // Selectores Universales (Capturan el diseño viejo y el nuevo 'Poly')
    $(".ui-search-layout__item, .ui-search-result, .poly-card").each((_, el) => {
      const $el = $(el);

      const title = $el.find(".ui-search-item__title, .poly-component__title, h2, h3").first().text().trim();
      if (!title || !pnMatchesTitle(partNumber, title)) return;

      const href = $el.find("a").attr("href");
      if (!href) return;

      // Buscamos precio en cualquier lugar del contenedor
      const priceText = $el.find(".andes-money-amount__fraction, .price-tag-fraction, .poly-price__current .andes-money-amount__fraction").first().text().trim();
      const price = parseArsPrice(priceText);

      if (!price) return;

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

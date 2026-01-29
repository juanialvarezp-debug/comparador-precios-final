
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchVenex(partNumber: string, limit = 20): Promise<PriceResult[]> {
  const model = partNumber.match(/\d{3,4}/)?.[0] || "";
  const url = `https://www.venex.com.ar/resultado-busqueda.htm?keywords=${encodeURIComponent(model || partNumber)}`;

  try {
    const html = await fetchHtml(url);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: PriceResult[] = [];

    $(".product-card, .item, .product-box").each((_, el) => {
      const $el = $(el);
      const title = $el.find(".product-title, .name, h3").first().text().trim();
      if (!title || !pnMatchesTitle(partNumber, title)) return;

      const priceText = $el.find(".current-price, .precio-nuevo, .price").text();
      const price = parseArsPrice(priceText);
      if (!price) return;

      const href = $el.find("a").first().attr("href");
      if (!href) return;

      results.push({
        supplier: "Venex",
        title,
        priceArs: price,
        originalPrice: price,
        currency: "ARS",
        url: href.startsWith("http") ? href : `https://www.venex.com.ar/${href}`
      });
    });

    return results;
  } catch (e) {
    return [];
  }
}

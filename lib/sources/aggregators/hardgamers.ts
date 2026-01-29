
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchHardGamers(partNumber: string, limit = 50): Promise<PriceResult[]> {
  // HardGamers es extremadamente sensible. 
  // Si el PN falla, probamos con los componentes numéricos básicos que Google usa.
  const modelNum = partNumber.match(/\d{3,4}/)?.[0] || "";
  const series = partNumber.toUpperCase().includes("GTX") ? "GTX" : partNumber.toUpperCase().includes("RTX") ? "RTX" : "";
  const searchTerm = `${series} ${modelNum}`.trim() || partNumber;

  const url = `https://www.hardgamers.com.ar/search?text=${encodeURIComponent(searchTerm)}`;

  try {
    const html = await fetchHtml(url);
    if (!html) return [];

    const $ = cheerio.load(html);
    const results: PriceResult[] = [];

    // Selector ultra-amplio para no perder nada
    $(".product-list-item, .product-container, [itemprop='name']").each((_, el) => {
      const $el = $(el);

      // Si el el es el h3 directo o contiene uno
      const titleEl = $el.is('h3') ? $el : $el.find('h3, [itemprop="name"]').first();
      const title = titleEl.text().trim();
      if (!title) return;

      // EL AUDITOR: Aquí es donde fallábamos. 
      // Si el PN es TUF-GTX1660S-O6G-GAMING, y el título es "ASUS TUF 1660 SUPER"
      // Ahora pnMatchesTitle es mucho más inteligente (ajustado en utils.ts)
      if (!pnMatchesTitle(partNumber, title)) return;

      const container = $el.closest('.product-list-item, .product-container, .col-sm-12');
      const href = container.find('a').attr('href');
      if (!href) return;
      const absUrl = href.startsWith('http') ? href : `https://www.hardgamers.com.ar${href}`;

      const pText = container.find('[itemprop="price"], .product-price').first().text();
      const price = parseArsPrice(pText);
      if (!price) return;

      const store = container.find('.subtitle, .store-name').first().text().trim() || "Tienda";

      results.push({
        supplier: store,
        title,
        priceArs: price,
        originalPrice: price,
        currency: "ARS",
        url: absUrl
      });
    });

    return dedupeByUrl(results).slice(0, limit);
  } catch (error) {
    return [];
  }
}

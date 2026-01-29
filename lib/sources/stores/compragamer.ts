
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchCompraGamer(partNumber: string, limit = 20): Promise<PriceResult[]> {
    // CompraGamer usa un buscador por palabras
    const model = partNumber.match(/\d{3,4}/)?.[0] || "";
    const searchTerm = model || partNumber;

    // URL de búsqueda de CompraGamer (vía AJAX o Web)
    const url = `https://compragamer.com/?seccion=3&destacados=0&nro_max=100&search=${encodeURIComponent(searchTerm)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        // Selectores de CompraGamer (Estructura de grilla)
        $("div[class*='item'], .card-product").each((_, el) => {
            const $el = $(el);
            const title = $el.find("h1, h2, h3, .title").text().trim();
            if (!title || !pnMatchesTitle(partNumber, title)) return;

            const priceText = $el.find("span[class*='price'], .price").text();
            const price = parseArsPrice(priceText);
            if (!price) return;

            const href = $el.find("a").attr("href");
            if (!href) return;

            results.push({
                supplier: "CompraGamer",
                title,
                priceArs: price,
                originalPrice: price,
                currency: "ARS",
                url: href.startsWith("http") ? href : `https://compragamer.com${href}`
            });
        });

        return results;
    } catch (error) {
        return [];
    }
}

import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, parseArsPrice, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchLibreOpcion(partNumber: string, limit = 5): Promise<PriceResult[]> {
    const url = `https://www.libreopcion.com/search?q=${encodeURIComponent(partNumber)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        $(".product-card, .lo-card").each((_, el) => {
            const title = $(el).find(".product-name, .title, h3").text().trim();
            if (!title || !pnMatchesTitle(partNumber, title)) return;

            const href = $(el).find("a").attr("href");
            if (!href) return;
            const absUrl = href.startsWith("http") ? href : `https://www.libreopcion.com${href}`;

            const priceText = $(el).find(".price, .total-price").text().trim();
            const price = parseArsPrice(priceText);
            if (!price) return;

            const img = $(el).find("img").attr("src");

            results.push({
                supplier: "LibreOpcion",
                title,
                priceArs: price,
                originalPrice: price,
                currency: "ARS",
                url: absUrl,
                thumbnail: img
            });
        });

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        console.error("LibreOpcion search error:", error);
        return [];
    }
}

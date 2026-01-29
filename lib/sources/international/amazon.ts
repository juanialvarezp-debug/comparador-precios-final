import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchAmazon(partNumber: string, limit = 5): Promise<PriceResult[]> {
    const url = `https://www.amazon.com/s?k=${encodeURIComponent(partNumber)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        $("[data-component-type='s-search-result']").each((_, el) => {
            if (results.length >= limit) return;

            const title = $(el).find("h2").text().trim();
            if (!title || !pnMatchesTitle(partNumber, title)) return;

            const href = $(el).find("h2 a").attr("href");
            if (!href) return;
            const absUrl = `https://www.amazon.com${href}`;

            // Precio: Amazon usa 'a-price' con 'a-offscreen'
            const priceWhole = $(el).find(".a-price-whole").first().text().replace(/[^\d]/g, "");
            const priceFraction = $(el).find(".a-price-fraction").first().text().replace(/[^\d]/g, "") || "00";

            const priceVal = parseFloat(`${priceWhole}.${priceFraction}`);

            if (isNaN(priceVal) || priceVal <= 0) return;

            const img = $(el).find("img.s-image").attr("src");

            results.push({
                supplier: "Amazon (USA)",
                title,
                priceArs: 0,
                originalPrice: priceVal,
                currency: "USD",
                url: absUrl,
                thumbnail: img
            });
        });

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        console.error("Amazon search error:", error);
        return [];
    }
}

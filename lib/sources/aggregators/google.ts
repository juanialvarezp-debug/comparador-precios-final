import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, parseArsPrice, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchGoogleShopping(partNumber: string, limit = 15): Promise<PriceResult[]> {
    const url = `https://www.google.com.ar/search?q=${encodeURIComponent(partNumber)}&tbm=shop&hl=es-419`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        $(".sh-dgr__content, .sh-prc__content, .sh-np__click-target, .sh-dgr__grid-result").each((_, el) => {
            const title = $(el).find("h3, h4, .sh-np__product-title, .tAx79b").text().trim();
            if (!title || !pnMatchesTitle(partNumber, title)) return;

            let href = $(el).find("a").attr("href");
            if (!href) return;
            if (href.startsWith("/url?q=")) {
                href = new URLSearchParams(href.split("?")[1]).get("q") || href;
            }
            const absUrl = href.startsWith("http") ? href : `https://www.google.com.ar${href}`;

            const priceText = $(el).find("[class*='price'], .OFFS7b, .a861ab, .a861ab").first().text().trim();
            const price = parseArsPrice(priceText);
            if (!price) return;

            const img = $(el).find("img").attr("src");
            const store = $(el).find(".aULzUe, .sh-np__seller-container, .I5vy9c").text().trim() || "Google Shopping";

            results.push({
                supplier: store,
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
        console.error("Google Shopping search error:", error);
        return [];
    }
}

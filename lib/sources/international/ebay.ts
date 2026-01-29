import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { dedupeByUrl, pnMatchesTitle, fetchHtml } from "../utils";

export async function searchEbay(partNumber: string, limit = 10): Promise<PriceResult[]> {
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(partNumber)}&_ipg=25`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        $(".s-item__wrapper").each((_, el) => {
            const title = $(el).find(".s-item__title").text().trim();
            // Ignorar el "Shop on eBay" falso que aparece siempre
            if (!title || title.toLowerCase().includes("shop on ebay") || !pnMatchesTitle(partNumber, title)) return;

            const href = $(el).find(".s-item__link").attr("href") || "";
            if (!href) return;

            const priceText = $(el).find(".s-item__price").text().trim();
            const priceVal = parseFloat(priceText.replace(/[^0-9.]/g, ""));

            if (isNaN(priceVal) || priceVal <= 0) return;

            const img = $(el).find(".s-item__image-img img").attr("src") || $(el).find(".s-item__image-img img").attr("data-src");

            results.push({
                supplier: "eBay (USA)",
                title,
                priceArs: 0,
                originalPrice: priceVal,
                currency: "USD",
                url: href,
                thumbnail: img
            });
        });

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        console.error("eBay search error:", error);
        return [];
    }
}

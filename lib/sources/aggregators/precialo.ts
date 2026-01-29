
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchPrecialo(partNumber: string, limit = 40): Promise<PriceResult[]> {
    // Simplificamos el código para Precialo (Marca + Modelo)
    const model = partNumber.match(/\d{3,4}/)?.[0] || "";
    const brand = partNumber.match(/(ASUS|TUF|GIGABYTE|MSI|EVGA|WD|KINGSTON)/i)?.[0] || "";
    const searchTerm = `${brand} ${model}`.trim();

    const url = `https://www.precialo.com.ar/buscar?q=${encodeURIComponent(searchTerm)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        // Selector para Precialo (versión 2026)
        $(".product-card, .item, .card").each((_, el) => {
            const $el = $(el);
            const title = $el.find(".product-name, .title, h3, h2").first().text().trim();
            if (!title) return;

            // EL AUDITOR VALIDA: ¿Es el componente que buscamos?
            if (!pnMatchesTitle(partNumber, title)) return;

            const href = $el.find("a").attr("href");
            if (!href) return;
            const absUrl = href.startsWith('http') ? href : `https://www.precialo.com.ar${href}`;

            const priceText = $el.find(".price, .product-price, .amount").text();
            const price = parseArsPrice(priceText);
            if (!price) return;

            const store = $el.find(".store-name, .shop, .merchant").text().trim() || "Tienda Detectada";

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


import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchPrecialo(partNumber: string, limit = 40): Promise<PriceResult[]> {
    // CORRECCIÓN V18.3: URL /search y selectores de alta compatibilidad
    const url = `https://www.precialo.com.ar/search?q=${encodeURIComponent(partNumber)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        // Selector Universal (Captura casi cualquier grilla de productos 2025)
        $("div[class*='product'], div[class*='item'], article, .card").each((_, el) => {
            const $el = $(el);

            // Buscamos el título (H2, H3 o clases que contengan 'name' o 'title')
            const title = $el.find("h1, h2, h3, h4, [class*='name'], [class*='title']").first().text().trim();
            if (!title) return;

            // Verificamos si este resultado le sirve al usuario
            if (!pnMatchesTitle(partNumber, title)) return;

            const href = $el.find("a").attr("href");
            if (!href) return;
            const absUrl = href.startsWith('http') ? href : `https://www.precialo.com.ar${href}`;

            // Buscamos el precio con selectores redundantes
            const priceText = $el.find("[class*='price'], [class*='amount'], span:contains('$')").first().text();
            const price = parseArsPrice(priceText);

            if (!price) return;

            const store = $el.find("[class*='store'], [class*='shop'], .merchant").first().text().trim() || "Tienda Detectada";

            results.push({
                supplier: store,
                title,
                priceArs: price,
                originalPrice: price,
                currency: "ARS",
                url: absUrl
            });
        });

        // Si no encontramos nada con selectores, intentamos buscar en el script de datos (JSON-LD)
        if (results.length === 0) {
            $('script[type="application/ld+json"]').each((_, el) => {
                try {
                    const data = JSON.parse($(el).html() || "{}");
                    const items = data.itemListElement || data.offers || [];
                    // ... lógica de backup por JSON si fuera necesario
                } catch (e) { }
            });
        }

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        return [];
    }
}

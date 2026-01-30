
import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchPrecialo(partNumber: string, limit = 40): Promise<PriceResult[]> {
    if (!partNumber || partNumber.length < 3) return [];

    // Precialo usa /search (v18.5)
    // Usamos el término tal cual llega para maximizar coincidencia
    const url = `https://www.precialo.com.ar/search?q=${encodeURIComponent(partNumber)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        // Selectores de Precialo 2025 (Sistema Next.js con Tailwind)
        // Buscamos contenedores que parezcan productos (grid items)
        $("div[class*='grid'] > div, article, .product-card, .search-result-item").each((_, el) => {
            const $el = $(el);

            // BUSQUEDA DE TITULO (H2, H3 o clases que tengan 'name' o 'title')
            const title = $el.find("h1, h2, h3, h4, h5, [class*='name'], [class*='title']").first().text().trim();
            if (!title) return;

            // EL AUDITOR VALIDA: ¿Es el componente que buscamos?
            if (!pnMatchesTitle(partNumber, title)) return;

            const href = $el.find("a").attr("href");
            if (!href) return;
            const absUrl = href.startsWith('http') ? href : `https://www.precialo.com.ar${href}`;

            // BUSQUEDA DE PRECIO (Buscamos el símbolo $ y el número más grande)
            const priceText = $el.find("[class*='price'], [class*='amount'], span:contains('$')").text();
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

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        return [];
    }
}


import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { fetchHtml, parseArsPrice, pnMatchesTitle, dedupeByUrl } from "../utils";

export async function searchPrecialo(partNumber: string, limit = 40): Promise<PriceResult[]> {
    // Precialo usa /search en lugar de /buscar (v18.2)
    const url = `https://www.precialo.com.ar/search?q=${encodeURIComponent(partNumber)}`;

    try {
        const html = await fetchHtml(url);
        if (!html) return [];

        const $ = cheerio.load(html);
        const results: PriceResult[] = [];

        // Selectores actualizados para Precialo (Soporte para diseño 2024/2025)
        $(".product-card, .item, .card, [class*='product-'], .search-result-item").each((_, el) => {
            const $el = $(el);

            // Buscamos el título en encabezados o clases comunes
            const title = $el.find("h2, h3, .product-name, .title, [class*='name']").first().text().trim();
            if (!title) return;

            // EL AUDITOR VALIDA: ¿Es el componente que buscamos?
            // Usamos el PN original para validar si este resultado es útil
            if (!pnMatchesTitle(partNumber, title)) return;

            const href = $el.find("a").attr("href");
            if (!href) return;
            const absUrl = href.startsWith('http') ? href : `https://www.precialo.com.ar${href}`;

            // Buscamos el precio (suele estar en .price, .amount o clases de andes)
            const priceText = $el.find(".price, .amount, [class*='price'], .product-price").text();
            const price = parseArsPrice(priceText);
            if (!price) return;

            const store = $el.find(".store-name, .shop, .merchant, [class*='store']").text().trim() || "Tienda Detectada";

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

import axios from "axios";
import { PriceResult } from "../types";
import { dedupeByUrl, pnMatchesTitle } from "../utils";

export async function searchCompraGamer(partNumber: string, limit = 5): Promise<PriceResult[]> {
    // Usamos el endpoint de autocompletado/búsqueda rápida que es puro JSON y muy estable
    const url = `https://compragamer.com/index.php?listado_prod=&seccion=3&nro_max=50&nombre=${encodeURIComponent(partNumber)}`;

    try {
        const res = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Referer": "https://compragamer.com/",
                "X-Requested-With": "XMLHttpRequest"
            },
            timeout: 8000
        });

        const data = res.data;
        const results: PriceResult[] = [];

        if (data && data.productos) {
            for (const p of data.productos) {
                if (!pnMatchesTitle(partNumber, p.nombre)) continue;

                results.push({
                    supplier: "CompraGamer",
                    title: p.nombre,
                    priceArs: p.precio_especial || p.precio_lista,
                    originalPrice: p.precio_especial || p.precio_lista,
                    currency: "ARS",
                    url: `https://compragamer.com/producto/${p.url}`,
                    thumbnail: p.imagen ? `https://compragamer.com/img_productos/${p.imagen}` : undefined
                });
            }
        }

        return dedupeByUrl(results).slice(0, limit);
    } catch (error) {
        console.error("CompraGamer search error:", error);
        return [];
    }
}

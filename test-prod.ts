
import { searchAll } from "./lib/sources/index";

async function run() {
    console.log("Iniciando búsqueda de prueba: TUF-GTX1660S-O6G-GAMING");
    try {
        const result = await searchAll("TUF-GTX1660S-O6G-GAMING");
        console.log("Búsqueda completada.");
        console.log("Tasa USD (BNA):", result.usdRate);
        console.log("Resultados encontrados:", result.results.length);

        result.results.slice(0, 5).forEach((r, i) => {
            console.log(`[${i + 1}] ${r.supplier} | ${r.title} | ${r.priceArs}`);
        });

        if (result.results.length === 0) {
            console.warn("ADVERTENCIA: No se encontraron resultados.");
        }
    } catch (e) {
        console.error("ERROR CRÍTICO:", e);
    }
}

run();

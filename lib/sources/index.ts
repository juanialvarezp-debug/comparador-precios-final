
import { PriceResult } from "./types";
import { dedupeByUrl, pnMatchesTitle } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelMatch = raw.match(/\d{3,5}/);
  const model = modelMatch ? modelMatch[0] : "";

  // Simplificamos términos para que las tiendas no nos bloqueen por "búsqueda técnica"
  const simpleTerm = raw.includes("GTX") ? `${model} super` : raw.includes("RTX") ? `RTX ${model}` : raw;

  const tasks = [
    searchPrecialo(simpleTerm, 40),
    searchMercadoLibre(simpleTerm, 30),
    searchHardGamers(model, 30)
  ];

  const resultsArr = await Promise.allSettled(tasks);
  const combined: PriceResult[] = [];

  resultsArr.forEach(res => {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  });

  // FILTRO V16.4: Muy flexible para asegurar resultados en producción
  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => {
    const title = item.title.toUpperCase();
    // Si el número de modelo (ej: 1660) está en el título, lo dejamos pasar.
    return model ? title.includes(model) : true;
  });

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate
  };
}

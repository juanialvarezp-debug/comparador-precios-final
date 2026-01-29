
import { PriceResult } from "./types";
import { dedupeByUrl, pnMatchesTitle } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number }> {
  let usdRate = 1465;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  // ESTRATEGIA ATÓMICA: Generamos las búsquedas que Google sabe que funcionan
  const raw = partNumber.toUpperCase();
  const model = raw.match(/\d{3,4}/)?.[0] || "";
  const brand = raw.match(/(ASUS|TUF|GIGABYTE|MSI|EVGA|KINGSTON|WD|LOGITECH)/i)?.[0] || "";

  // Variaciones de ráfaga
  const query1 = raw; // Exacta
  const query2 = `${brand} ${model}`.trim(); // Marca + Modelo
  const query3 = model; // Solo el número (Fuerza Bruta)

  const tasks = [
    searchMercadoLibre(query1, 15),
    searchMercadoLibre(query2, 15),
    searchHardGamers(query1, 20),
    searchHardGamers(query2, 20),
    searchHardGamers(query3, 20)
  ];

  const resultsArr = await Promise.allSettled(tasks);
  const combined: PriceResult[] = [];

  resultsArr.forEach(res => {
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      combined.push(...res.value);
    }
  });

  // Auditoría por Puntuación: Filtramos los duplicados y las coincidencias falsas
  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => pnMatchesTitle(partNumber, item.title));

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);
  return { results: final.slice(0, limit), usdRate };
}

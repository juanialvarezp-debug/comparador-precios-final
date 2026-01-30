
import { PriceResult } from "./types";
import { dedupeByUrl, pnMatchesTitle } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { searchVenex } from "./stores/venex";
import { searchCompraGamer } from "./stores/compragamer";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number, debug?: any }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();
  const modelNum = raw.match(/\d{3,5}/)?.[0] || "";

  // ESTRATEGIA DE BÚSQUEDA EXPLOSIVA (V18.5)
  // Generamos variaciones para "engañar" a buscadores limitados
  const variations = [
    raw, // Exacto: DUAL-GTX1650...
    modelNum ? `${modelNum}` : raw, // Modelo solo: 1650
    modelNum ? `GTX ${modelNum}` : raw, // Genérico: GTX 1650
    modelNum ? `ASUS ${modelNum}` : raw  // Marca + Modelo: ASUS 1650
  ];

  const tasks: { name: string, promise: Promise<PriceResult[]> }[] = [];

  // Precialo y ML: Buscamos exacto y con modelo (2 intentos c/u)
  tasks.push({ name: "Precialo", promise: searchPrecialo(raw, 20) });
  tasks.push({ name: "Precialo", promise: searchPrecialo(modelNum, 20) });

  tasks.push({ name: "MercadoLibre", promise: searchMercadoLibre(raw, 20) });
  tasks.push({ name: "MercadoLibre", promise: searchMercadoLibre(modelNum, 20) });

  // HardGamers: Muy sensible, buscamos modelo + GTX
  tasks.push({ name: "HardGamers", promise: searchHardGamers(modelNum ? `GTX ${modelNum}` : raw, 20) });

  // Tiendas directas: Modelo suele ser suficiente
  tasks.push({ name: "Venex", promise: searchVenex(modelNum || raw, 20) });
  tasks.push({ name: "CompraGamer", promise: searchCompraGamer(modelNum || raw, 20) });

  const resultsArr = await Promise.allSettled(tasks.map(t => t.promise));
  const combined: PriceResult[] = [];
  const debug: any = {};

  resultsArr.forEach((res, i) => {
    const sourceName = tasks[i].name;
    if (res.status === "fulfilled") {
      debug[sourceName] = (debug[sourceName] || 0) + res.value.length;
      combined.push(...res.value);
    }
  });

  // El AUDITOR FINAL es el que decide qué sirve (V18.5)
  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => pnMatchesTitle(partNumber, item.title));

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate,
    debug
  };
}

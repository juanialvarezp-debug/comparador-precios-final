
import { PriceResult } from "./types";
import { dedupeByUrl } from "./utils";
import { searchMercadoLibre } from "./marketplaces/mercadolibre";
import { searchHardGamers } from "./aggregators/hardgamers";
import { searchPrecialo } from "./aggregators/precialo";
import { searchVenex } from "./stores/venex";
import { getBnaUsdSellArs } from "../bna";

export async function searchAll(partNumber: string, limit = 100): Promise<{ results: PriceResult[], usdRate: number, debug?: any }> {
  let usdRate = 1470;
  try {
    usdRate = await getBnaUsdSellArs();
  } catch (e) { }

  const raw = partNumber.toUpperCase();

  // EXTRACCIÓN DE LA ESENCIA (V17.2)
  // Ejemplo: TUF-GTX1660S-O6G-GAMING -> Model: 1660, Variant: SUPER
  const modelNum = raw.match(/\d{3,5}/)?.[0] || "";
  const isSuper = raw.includes("SUPER") || raw.includes("1660S");
  const isTi = raw.includes("TI") && !raw.includes("TITAN");

  // Término de búsqueda optimizado para tiendas rígidas
  let searchTerm = modelNum;
  if (isSuper) searchTerm += " super";
  else if (isTi) searchTerm += " ti";

  if (!searchTerm || searchTerm.length < 3) searchTerm = raw;

  const tasks = [
    { name: "Precialo", promise: searchPrecialo(searchTerm, 30) },
    { name: "MercadoLibre", promise: searchMercadoLibre(searchTerm, 30) },
    { name: "HardGamers", promise: searchHardGamers(searchTerm, 30) },
    { name: "Venex", promise: searchVenex(searchTerm, 30) }
  ];

  const resultsArr = await Promise.allSettled(tasks.map(t => t.promise));
  const combined: PriceResult[] = [];
  const debug: any = {};

  resultsArr.forEach((res, i) => {
    const sourceName = tasks[i].name;
    if (res.status === "fulfilled") {
      debug[sourceName] = res.value.length;
      combined.push(...res.value);
    }
  });

  const processed = combined.map(item => ({
    ...item,
    priceArs: item.currency === "USD" ? Math.round(item.originalPrice * usdRate) : Math.round(item.priceArs)
  })).filter(item => {
    const t = item.title.toUpperCase();
    // El modelo numérico debe estar (ej: 1660)
    if (modelNum && !t.includes(modelNum)) return false;

    // Si buscamos SUPER, el título debe decir SUPER (o el modelo compacto)
    if (isSuper && !t.includes("SUPER") && !t.includes(modelNum + "S")) return false;

    // Si el PN del usuario tiene una marca (ej: TUF), intentamos que el título la tenga
    const brandMatch = raw.match(/(TUF|ASUS|MSI|EVGA|GIGABYTE|ROG)/);
    if (brandMatch && !t.includes(brandMatch[0])) return false;

    return true;
  });

  const final = dedupeByUrl(processed).sort((a, b) => a.priceArs - b.priceArs);

  return {
    results: final.slice(0, limit),
    usdRate,
    debug
  };
}

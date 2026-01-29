import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { parseArsPrice, withTimeout, pnMatchesTitle, fetchHtml } from "../utils";

/**
 * Venex (mejorado):
 * - Ahora intenta capturar el título y la imagen desde el HTML del detalle.
 * - Validación flexible de PN contra el título del detalle si es posible.
 */
export async function searchVenex(pn: string, limit = 5): Promise<PriceResult[]> {
  const searchUrl = `https://www.venex.com.ar/resultado-busqueda.htm?keywords=${encodeURIComponent(pn)}`;

  const searchHtml = await fetchHtml(searchUrl);
  if (!searchHtml) return [];

  const $ = cheerio.load(searchHtml);

  // Links de producto detectados desde resultados
  const productUrls = extractProductUrls($).slice(0, 10);

  const results: PriceResult[] = [];
  for (const url of productUrls) {
    if (results.length >= limit) break;

    const detail = await withTimeout(getVenexProductDetail(url), 20000, "Venex product detail");
    if (!detail || !detail.price) continue;

    // Validación: si tenemos título, verificamos PN. Si no, confiamos en el link de búsqueda de Venex
    if (detail.title && !pnMatchesTitle(pn, detail.title)) continue;

    // Validación objetiva: descartar falsos positivos
    if (detail.price < 500 || detail.price > 50_000_000) continue;

    results.push({
      supplier: "Venex",
      title: detail.title || "Producto en Venex",
      currency: "ARS",
      originalPrice: detail.price,
      priceArs: detail.price,
      url,
      thumbnail: detail.thumbnail || undefined
    });
  }

  // Dedupe por URL + ordenar
  const seen = new Set<string>();
  const out: PriceResult[] = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }

  out.sort((a, b) => a.priceArs - b.priceArs);
  return out.slice(0, limit);
}

/** ---------- helpers ---------- **/

function toAbs(href: string): string {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  return `https://www.venex.com.ar/${href.replace(/^\//, "")}`;
}

function extractProductUrls($: cheerio.CheerioAPI): string[] {
  const urls: string[] = [];

  $("a[href]")
    .toArray()
    .forEach((a) => {
      const hrefRaw = ($(a).attr("href") || "").trim();
      if (!hrefRaw) return;

      const lower = hrefRaw.toLowerCase();

      if (lower.startsWith("javascript:")) return;
      if (lower.startsWith("mailto:")) return;
      if (lower.includes("whatsapp")) return;
      if (lower.includes("api.whatsapp.com")) return;

      if (!hrefRaw.includes(".html")) return;
      if (hrefRaw.includes("resultado-busqueda")) return;

      const abs = toAbs(hrefRaw);

      if (!abs.startsWith("https://www.venex.com.ar/")) return;

      const path = abs.replace("https://www.venex.com.ar/", "");
      if (!path || path === "pagina-inicial.htm") return;

      const slashCount = (path.match(/\//g) || []).length;
      if (slashCount < 2) return;

      urls.push(abs);
    });

  const seen = new Set<string>();
  return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

async function getVenexProductDetail(url: string): Promise<{ price: number | null, title: string | null, thumbnail: string | null } | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  const $ = cheerio.load(html);

  // 1) Datos de JSON-LD
  let price: number | null = null;
  let title: string | null = null;
  let thumbnail: string | null = null;

  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const s of scripts) {
    try {
      const json = JSON.parse($(s).text());
      const objs = Array.isArray(json) ? json : [json];
      for (const o of objs) {
        if (o["@type"] === "Product" || o.offers) {
          if (!title) title = o.name;
          if (!thumbnail) thumbnail = o.image;

          if (o.offers) {
            const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
            for (const ofr of offers) {
              const p = parseArsPrice(String(ofr.price || ""));
              if (p) price = p;
            }
          }
        }
      }
    } catch { }
  }

  // 2) DOM Fallbacks
  if (!title) title = $(".product-title, h1, .name-product").first().text().trim();
  if (!thumbnail) {
    const img = $(".product-image img, #zoom_01").first();
    thumbnail = img.attr("src") || img.attr("data-zoom-image") || null;
    if (thumbnail && !thumbnail.startsWith("http")) thumbnail = toAbs(thumbnail);
  }

  if (!price) {
    const metaItemprop = $('meta[itemprop="price"]').attr("content");
    price = parseArsPrice(metaItemprop || "");
  }

  if (!price) {
    const priceTxt = $('.price-main, .precio-detalle, [class*="precio"]').first().text();
    price = parseArsPrice(priceTxt);
  }

  return { price, title, thumbnail: thumbnail || null };
}

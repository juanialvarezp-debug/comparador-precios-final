import * as cheerio from "cheerio";
import { PriceResult } from "../types";
import { parseArsPrice, withTimeout, norm, pnMatchesTitle, fetchHtml } from "../utils";

/**
 * Maximus (directo) – versión estricta para evitar falsos positivos
 */
export async function searchMaximus(pn: string, limit = 5): Promise<PriceResult[]> {
  const searchUrl = `https://www.maximus.com.ar/Productos/maximus.aspx?CAT=-1/SCAT=-1/M=-1/BUS=${encodeURIComponent(
    pn
  )}/OR=1/PAGE=1/`;

  const html = await fetchHtml(searchUrl);
  const candidates = html ? extractCandidatesFromSearch(html, pn).slice(0, 12) : [];

  const results: PriceResult[] = [];
  for (const c of candidates) {
    if (results.length >= limit) break;

    const detailHtml = await withTimeout(fetchHtml(c.url), 20000, "Maximus detail html");
    if (!detailHtml) continue;

    // Validación: el detalle debe contener el PN (normalizado)
    if (!detailContainsPN(detailHtml, pn)) continue;

    const price = parsePriceFromMaximusHtml(detailHtml);
    if (!price) continue;

    if (price < 500 || price > 50_000_000) continue;

    results.push({
      supplier: "Maximus",
      title: c.title,
      currency: "ARS",
      originalPrice: price,
      priceArs: price,
      url: c.url,
    });
  }

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

/** ---------------- helpers ---------------- */

type Candidate = { title: string; url: string };

function toAbs(href: string): string {
  if (!href) return "";
  if (href.startsWith("http")) return href;
  return `https://www.maximus.com.ar/${href.replace(/^\//, "")}`;
}

function extractCandidatesFromSearch(html: string, pn: string): Candidate[] {
  const $ = cheerio.load(html);
  const out: Candidate[] = [];
  const pnN = norm(pn);

  $("a[href]").toArray().forEach((a) => {
    const hrefRaw = ($(a).attr("href") || "").trim();
    if (!hrefRaw) return;

    const abs = toAbs(hrefRaw);
    if (!abs.startsWith("https://www.maximus.com.ar/")) return;

    const lower = abs.toLowerCase();
    const looksLikeDetail = lower.includes("/producto") || (lower.includes("/productos/") && lower.split("/").length >= 6);
    if (!looksLikeDetail) return;

    const title = clean($(a).text()) || clean($(a).attr("title") || "") || clean($(a).find("img[alt]").attr("alt") || "");
    if (!title) return;

    if (!pnMatchesTitle(pn, title) && !norm(abs).includes(pnN)) return;

    out.push({ title, url: abs });
  });

  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.url) ? false : (seen.add(x.url), true)));
}

function detailContainsPN(detailHtml: string, pn: string): boolean {
  const pnN = norm(pn);
  const htmlN = norm(detailHtml);
  return pnN.length >= 3 && htmlN.includes(pnN);
}

function parsePriceFromMaximusHtml(html: string): number | null {
  if (!html || html.length < 1000) return null;
  const $ = cheerio.load(html);

  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const s of scripts) {
    const p = priceFromJsonLd($(s).text());
    if (p) return p;
  }

  const p1 = parseArsPrice($('meta[itemprop="price"]').attr("content") || "");
  if (p1) return p1;

  const p2 = parseArsPrice($('[class*="precio"],[id*="precio"],[class*="price"],[id*="price"]').first().text());
  if (p2) return p2;

  return null;
}

function priceFromJsonLd(txt: string): number | null {
  try {
    const json = JSON.parse(txt);
    const arr = Array.isArray(json) ? json : [json];
    for (const o of arr) {
      const p = findPriceInLdObject(o);
      if (p) return p;
    }
  } catch { }
  return null;
}

function findPriceInLdObject(o: any): number | null {
  if (!o || typeof o !== "object") return null;
  if (o.offers) {
    const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
    for (const ofr of offers) {
      const price = parseArsPrice(String(ofr?.price ?? ""));
      if (price) return price;
    }
  }
  for (const k of Object.keys(o)) {
    const p = findPriceInLdObject(o[k]);
    if (p) return p;
  }
  return null;
}

function clean(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

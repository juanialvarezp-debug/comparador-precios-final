
import { NextResponse } from "next/server";
import { searchAll } from "../../../lib/sources/index";
import { logLine } from "../../../lib/logger";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { partNumber, limit = 100 } = await req.json();

    if (!partNumber || typeof partNumber !== "string") {
      return NextResponse.json({ error: "Código de producto no válido" }, { status: 400 });
    }

    logLine(`Search: ${partNumber}`);

    // Ejecutamos la búsqueda profesional
    const { results, usdRate, debug } = await searchAll(partNumber, limit);

    return NextResponse.json({
      partNumber,
      results,
      usedBnaUsdSell: usdRate,
      debug
    });
  } catch (err: any) {
    console.error("Critical API Error:", err);
    return NextResponse.json({
      error: "Error en la búsqueda",
      details: err.message
    }, { status: 500 });
  }
}

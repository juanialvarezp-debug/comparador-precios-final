
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ExternalLink,
  FileText,
  Activity,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

type Result = {
  supplier: string;
  title: string;
  priceArs: number;
  currency: string;
  url: string;
};

type ApiResp = {
  partNumber: string;
  results: Result[];
  usedBnaUsdSell: number | null;
  debug?: Record<string, number | string>;
};

export default function Page() {
  const [pn, setPn] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  async function search(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!pn.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partNumber: pn.trim(), limit: 100 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Error al buscar precios");
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Error Crítico de Auditoría");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const formatArs = (n: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(n);
  };

  if (!mounted) return null;

  const minPrice = data?.results.length ? Math.min(...data.results.map(r => r.priceArs)) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 pt-16 pb-12 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Auditor de Precios</h1>
              <div className="mt-3 flex gap-3">
                <div className="bg-blue-50 text-blue-700 px-4 py-1 rounded-full text-[11px] font-black border border-blue-100 uppercase tracking-widest shadow-sm">
                  BNA: {data?.usedBnaUsdSell ? formatArs(data.usedBnaUsdSell) : "$ 1.470"}
                </div>
                <div className="bg-green-50 text-green-700 px-4 py-1 rounded-full text-[11px] font-black border border-green-100 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={12} /> Engine: V18.6 Stable
                </div>
              </div>
            </div>

            {data?.debug && (
              <div className="flex gap-2">
                {Object.entries(data.debug).map(([key, val]) => (
                  <div key={key} className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{key}</span>
                    <div className={`h-1.5 w-8 rounded-full ${Number(val) > 0 ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={search} className="relative flex gap-4 max-w-4xl">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={24} />
              <input
                type="text"
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                placeholder="Ingresar Código Técnico o Nombre del Producto..."
                className="w-full pl-16 pr-5 py-6 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-blue-500 rounded-2xl outline-none text-xl font-medium shadow-inner transition-all placeholder:text-slate-300"
              />
            </div>
            <button
              disabled={loading}
              className="bg-slate-900 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-600 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-3"
            >
              {loading ? <Activity className="animate-spin" size={16} /> : null}
              {loading ? "Auditando..." : "Ejecutar Auditoría"}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-20">
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-48 text-center">
              <div className="bg-white w-24 h-24 rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-10 border border-slate-50">
                <FileText size={48} className="text-slate-100" />
              </div>
              <p className="text-slate-300 font-bold uppercase tracking-[0.4em] text-xs">Sistema de Control de Activos Informáticos</p>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-10 rounded-3xl font-black text-center mb-16 border-2 border-red-100 flex flex-col items-center gap-4 shadow-sm">
              <AlertCircle size={40} className="mb-2" />
              <span className="text-sm tracking-widest">{error.toUpperCase()}</span>
            </div>
          )}

          {data && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-10">
                <h2 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
                  Resultados Auditados: <span className="text-slate-900 text-3xl ml-4 font-black">{data.results.length}</span>
                </h2>
                {data.results.length === 0 && (
                  <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-full border border-amber-100">Posible Quiebre de Stock</span>
                )}
              </div>

              {data.results.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl overflow-hidden mb-20">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="pl-14 py-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Proveedor</th>
                        <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Especificación Técnica</th>
                        <th className="px-12 py-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Valorización (ARS)</th>
                        <th className="pr-14 py-10 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data.results.map((r, i) => {
                        const isBest = r.priceArs === minPrice;
                        return (
                          <tr key={i} className={`hover:bg-slate-50/30 transition-all ${isBest ? 'bg-green-50/20' : ''}`}>
                            <td className="pl-14 py-12">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${r.supplier === 'MercadoLibre' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                r.supplier === 'Venex' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-white text-slate-600 border-slate-200'
                                }`}>
                                {r.supplier}
                              </span>
                            </td>
                            <td className="px-12 py-12">
                              <p className="text-base font-bold text-slate-800 leading-snug max-w-sm">{r.title}</p>
                            </td>
                            <td className="px-12 py-12 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-2xl font-black tracking-tight ${isBest ? 'text-green-600' : 'text-slate-900'}`}>
                                  {formatArs(r.priceArs)}
                                </span>
                                {isBest && (
                                  <span className="text-[9px] font-black text-white bg-green-500 px-3 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-green-100">Oportunidad</span>
                                )}
                              </div>
                            </td>
                            <td className="pr-14 py-12 text-center">
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-white hover:bg-slate-900 text-slate-400 hover:text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:border-slate-900 shadow-sm transition-all active:scale-95"
                              >
                                Acceder <ExternalLink size={14} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-6xl mx-auto px-10 py-32 border-t border-slate-100 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10 opacity-30 grayscale saturate-0">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em]">Auditoría de Activos Informativos</span>
            <span className="text-[8px] font-bold">Central de Control de Precios v18.0</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">© {new Date().getFullYear()} Sistema Centralizado</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

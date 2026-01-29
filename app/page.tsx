
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ExternalLink,
  FileText,
  Activity
} from "lucide-react";

type Result = {
  supplier: string;
  title: string;
  priceArs: number;
  currency: string;
  originalPrice: number;
  url: string;
};

type ApiResp = {
  partNumber: string;
  results: Result[];
  usedBnaUsdSell: number | null
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
      setError(err?.message || "Error de conexión");
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 py-12 shadow-sm">
        <div className="max-w-6xl mx-auto px-10">
          <h1 className="text-5xl font-black text-slate-900 uppercase">Auditor de Precios</h1>
          <div className="mt-4 flex gap-3">
            <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
              BNA: {data?.usedBnaUsdSell ? formatArs(data.usedBnaUsdSell) : "$ 1.470"}
            </div>
            <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold border border-green-100 shadow-sm flex items-center gap-2">
              <Activity size={14} /> Engine: V16 Active
            </div>
          </div>

          <form onSubmit={search} className="mt-10 relative flex gap-4 max-w-4xl">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input
                type="text"
                value={pn}
                onChange={(e) => setPn(e.target.value)}
                placeholder="Pegar Código Técnico o Modelo (ej: 1660 SUPER)..."
                className="w-full pl-16 pr-5 py-6 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none text-xl font-medium shadow-md transition-all"
              />
            </div>
            <button
              disabled={loading}
              className="bg-slate-900 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50 transition-all shadow-xl active:scale-95"
            >
              {loading ? "Auditando..." : "Comparar Catálogo"}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-16">
        <AnimatePresence mode="wait">
          {!data && !loading && (
            <div className="py-40 text-center opacity-20">
              <FileText size={100} className="mx-auto mb-6" />
              <p className="font-bold uppercase tracking-widest">Inicie una auditoría exhaustiva</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-8 rounded-3xl font-black text-center mb-10 border-2 border-red-100 uppercase">
              ⚠️ {error}
            </div>
          )}

          {data && (
            <div className="space-y-10">
              <h2 className="text-slate-400 font-black uppercase tracking-widest text-xs border-b border-slate-200 pb-4">
                Resultados Identificados: <span className="text-slate-900 text-2xl ml-2">{data.results.length}</span>
              </h2>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="pl-14 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Fuente</th>
                      <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción Técnica</th>
                      <th className="px-10 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valorización</th>
                      <th className="pr-14 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-all">
                        <td className="pl-14 py-10">
                          <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm">
                            {r.supplier}
                          </span>
                        </td>
                        <td className="px-10 py-10 text-lg font-bold text-slate-800">{r.title}</td>
                        <td className="px-10 py-10 text-right">
                          <span className="text-2xl font-black text-slate-900">{formatArs(r.priceArs)}</span>
                        </td>
                        <td className="pr-14 py-10 text-center">
                          <a
                            href={r.url}
                            target="_blank"
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-blue-600 transition-all"
                          >
                            Acceder <ExternalLink size={16} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

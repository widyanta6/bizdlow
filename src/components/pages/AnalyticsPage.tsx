import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ShoppingBag,
  Calendar,
  Award,
  Filter,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { api } from '../../services/api';
import { Product } from '../../types/index';

export const AnalyticsPage: React.FC = () => {
  const { activeBusiness, financialSummary, summaryLoading, periodFilter } = useBusiness();

  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChartMetric, setActiveChartMetric] = useState<'sales_vs_expenses' | 'net_profit'>('sales_vs_expenses');

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    Promise.all([
      api.getMonthlyPerformance(activeBusiness.id, 2026),
      api.getProducts(activeBusiness.id),
    ])
      .then(([perf, prods]) => {
        setMonthlyData(perf);
        setProducts(prods);
      })
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, [activeBusiness]);

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  // Find max value for charting scale
  const maxMonthlyVal = Math.max(
    1,
    ...monthlyData.map((m) => Math.max(m.totalPenjualan, m.pengeluaran, Math.abs(m.labaBersih)))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analytics & Business Performance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualisasi performa penjualan, margin laba kotor vs bersih, perbandingan bulan ke bulan, dan analisis produk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveChartMetric('sales_vs_expenses')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeChartMetric === 'sales_vs_expenses'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penjualan vs Pengeluaran
            </button>
            <button
              onClick={() => setActiveChartMetric('net_profit')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeChartMetric === 'net_profit'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tren Laba Bersih
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary (PRD Section 9.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total Sales</span>
          <span className="text-base font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {formatRupiah(financialSummary?.totalPenjualan || 0)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Cash Received</span>
          <span className="text-base font-bold font-mono text-emerald-600 mt-1 block tabular-nums">
            {formatRupiah(financialSummary?.pemasukanDiterima || 0)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Total HPP</span>
          <span className="text-base font-bold font-mono text-amber-600 mt-1 block tabular-nums">
            {formatRupiah(financialSummary?.totalHPP || 0)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Gross Profit</span>
          <span className="text-base font-bold font-mono text-purple-700 mt-1 block tabular-nums">
            {formatRupiah(financialSummary?.labaKotor || 0)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Expenses</span>
          <span className="text-base font-bold font-mono text-rose-600 mt-1 block tabular-nums">
            {formatRupiah(financialSummary?.totalPengeluaran || 0)}
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Net Profit</span>
          <span
            className={`text-base font-bold font-mono mt-1 block tabular-nums ${
              (financialSummary?.labaBersih || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatRupiah(financialSummary?.labaBersih || 0)}
          </span>
        </div>
      </div>

      {/* Interactive Chart Container (PRD Section 9.2) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Grafik Kinerja Tahunan 2026 ({activeBusiness?.name})
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {activeChartMetric === 'sales_vs_expenses' ? (
              <>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-purple-600" />
                  <span>Penjualan</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded bg-rose-400" />
                  <span>Pengeluaran</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>Laba Bersih</span>
              </div>
            )}
          </div>
        </div>

        {/* SVG / Canvas Styled Bar Visualization */}
        <div className="h-64 flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100">
          {monthlyData.map((m) => {
            const salesHeight = Math.max(4, Math.round((m.totalPenjualan / maxMonthlyVal) * 190));
            const expenseHeight = Math.max(4, Math.round((m.pengeluaran / maxMonthlyVal) * 190));
            const netProfitHeight = Math.max(4, Math.round((Math.abs(m.labaBersih) / maxMonthlyVal) * 190));

            return (
              <div key={m.monthKey} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  <p className="font-bold">{m.month}</p>
                  <p>Penjualan: {formatRupiah(m.totalPenjualan)}</p>
                  <p>Laba Bersih: {formatRupiah(m.labaBersih)}</p>
                </div>

                {activeChartMetric === 'sales_vs_expenses' ? (
                  <div className="w-full flex items-end justify-center gap-1">
                    <div
                      style={{ height: `${salesHeight}px` }}
                      className="w-1/2 max-w-[18px] bg-purple-600 rounded-t transition-all group-hover:bg-purple-700"
                    />
                    <div
                      style={{ height: `${expenseHeight}px` }}
                      className="w-1/2 max-w-[18px] bg-rose-400 rounded-t transition-all group-hover:bg-rose-500"
                    />
                  </div>
                ) : (
                  <div
                    style={{ height: `${netProfitHeight}px` }}
                    className={`w-full max-w-[28px] rounded-t transition-all ${
                      m.labaBersih >= 0
                        ? 'bg-emerald-500 group-hover:bg-emerald-600'
                        : 'bg-rose-500 group-hover:bg-rose-600'
                    }`}
                  />
                )}

                <span className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                  {m.month.slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Performance Table (PRD Section 9.3) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Performa Bulanan Januari – Desember 2026</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian komprehensif omzet, jumlah order, pengeluaran, laba bersih, serta persentase perubahan MoM.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
              <tr>
                <th className="px-4 py-2.5">Bulan</th>
                <th className="px-4 py-2.5 text-center">Jumlah Order</th>
                <th className="px-4 py-2.5 text-right">Total Penjualan</th>
                <th className="px-4 py-2.5 text-right">Pemasukan Diterima</th>
                <th className="px-4 py-2.5 text-right">HPP</th>
                <th className="px-4 py-2.5 text-right">Pengeluaran</th>
                <th className="px-4 py-2.5 text-right">Laba Bersih</th>
                <th className="px-4 py-2.5 text-center">Perubahan (MoM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyData.map((m) => (
                <tr key={m.monthKey} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{m.month}</td>
                  <td className="px-4 py-3 text-center font-mono">{m.orderCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900 tabular-nums">
                    {formatRupiah(m.totalPenjualan)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-600 tabular-nums">
                    {formatRupiah(m.pemasukanDiterima)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-600 tabular-nums">
                    {formatRupiah(m.hpp)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-600 tabular-nums">
                    {formatRupiah(m.pengeluaran)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold tabular-nums ${
                      m.labaBersih >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatRupiah(m.labaBersih)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {m.momChangePct !== null ? (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.momChangePct >= 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {m.momChangePct >= 0 ? '+' : ''}
                        {m.momChangePct}%
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Performance Section (PRD Section 9.5) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Performa Produk & Margin Tertinggi</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Data Terkini</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => {
            const margin = p.sellingPrice - p.cogs;
            const marginPct = p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(0) : '0';
            return (
              <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-xs text-slate-800 truncate" title={p.name}>
                    {p.name}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 shrink-0">
                    Margin {marginPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Harga: {formatRupiah(p.sellingPrice)}</span>
                  <span className="text-amber-600">HPP: {formatRupiah(p.cogs)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Margin Kotor:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatRupiah(margin)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

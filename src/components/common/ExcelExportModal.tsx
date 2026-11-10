import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  CheckCircle2,
  Layers,
  Coins,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();
  const [selectedModule, setSelectedModule] = useState<string>('all');

  if (!isOpen || !activeBusiness) return null;

  const exportUrl = api.getExcelExportUrl(activeBusiness.id, selectedModule);

  const moduleOptions = [
    {
      id: 'all',
      title: 'Semua Modul (Workbook Lengkap)',
      desc: 'Mencakup 5 lembar kerja: Ringkasan Laba Rugi, Rekening Kas, Transaksi, Pesanan, dan Produk HPP.',
    },
    {
      id: 'transactions',
      title: 'Buku Kas & Transaksi Saja',
      desc: 'Hanya mengekspor seluruh mutasi kas masuk dan keluar beserta kategori dan rekening.',
    },
    {
      id: 'orders',
      title: 'Daftar Pesanan & Piutang Saja',
      desc: 'Hanya mengekspor daftar order, nomor order, pelanggan, DP terbayar, dan sisa tagihan.',
    },
    {
      id: 'products',
      title: 'Katalog Produk & HPP Saja',
      desc: 'Hanya mengekspor daftar produk, harga jual, biaya modal HPP, margin kotor, dan stok.',
    },
    {
      id: 'accounts',
      title: 'Rekening Kas & Saldo Saja',
      desc: 'Hanya mengekspor saldo seluruh rekening bank, kas tunai, dan e-wallet aktif.',
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ekspor Laporan Resmi (.xlsx)</h3>
              <p className="text-[11px] text-slate-500">Bisnis Aktif: {activeBusiness.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Sistem menyusun berkas Microsoft Excel (.xlsx) valid dengan format mata uang Rupiah (Rp), header resmi, dan pembatasan isolasi tenant untuk <strong>{user?.name}</strong>.
          </p>

          <div>
            <label className="block text-slate-700 font-bold mb-2">Pilih Lingkup / Modul yang Diekspor:</label>
            <div className="space-y-2">
              {moduleOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                    selectedModule === opt.id
                      ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportModule"
                    value={opt.id}
                    checked={selectedModule === opt.id}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="mt-0.5 text-emerald-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">{opt.title}</span>
                    <span className="text-[11px] text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-semibold">Nama Berkas:</span>
            <span className="text-slate-800 truncate max-w-[240px]">
              BizFlow_{activeBusiness.name.replace(/\s+/g, '_')}_{selectedModule}.xlsx
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            Tutup
          </button>
          <a
            href={exportUrl}
            download
            onClick={() => setTimeout(onClose, 500)}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Berkas Excel (.xlsx)</span>
          </a>
        </div>
      </div>
    </div>
  );
};

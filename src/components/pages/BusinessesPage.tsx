import React, { useState } from 'react';
import {
  Building2,
  PlusCircle,
  Archive,
  CheckCircle2,
  Edit2,
  Sparkles,
  Layers,
  Coins,
  ShieldAlert,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Business } from '../../types/index';

export const BusinessesPage: React.FC = () => {
  const { user } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses } = useBusiness();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    category: 'Fashion & Apparel',
    currency: 'IDR',
    taxRate: 0.11,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    'Fashion & Apparel',
    'Cosmetics & Skincare',
    'Creative Agency & Events',
    'Digital Production',
    'Advertising & Media',
    'F&B / Kuliner',
    'Retail & E-Commerce',
    'Lainnya',
  ];

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      tagline: '',
      description: '',
      category: 'Fashion & Apparel',
      currency: 'IDR',
      taxRate: 0.11,
    });
    setEditingBiz(null);
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (b: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBiz(b);
    setFormData({
      name: b.name,
      tagline: b.tagline,
      description: b.description,
      category: b.category,
      currency: b.currency,
      taxRate: b.taxRate || 0.11,
    });
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg('Nama bisnis wajib diisi');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (editingBiz) {
        await api.updateBusiness(editingBiz.id, formData);
      } else {
        await api.createBusiness(formData);
      }
      await refreshBusinesses();
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan bisnis');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    const action = biz.isArchived ? 'mengaktifkan kembali' : 'mengarsipkan';
    if (!confirm(`Apakah Anda yakin ingin ${action} bisnis "${biz.name}"? Riwayat transaksi tetap aman.`)) {
      return;
    }
    try {
      await api.archiveBusiness(biz.id, !biz.isArchived);
      await refreshBusinesses();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status arsip');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Bisnis (My Businesses)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola profil brand, preferensi mata uang, dan status arsip bisnis yang berada dalam wewenang Anda.
          </p>
        </div>

        {!user?.isReadOnly ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Bisnis Baru</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Mode Baca Saja (Tidak dapat menambah/mengedit bisnis)</span>
          </div>
        )}
      </div>

      {/* Businesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {businesses.map((biz) => {
          const isActive = activeBusiness?.id === biz.id;
          return (
            <div
              key={biz.id}
              onClick={() => setActiveBusiness(biz)}
              className={`rounded-2xl p-5 border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
                isActive
                  ? 'border-purple-500 ring-2 ring-purple-100 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
              } ${biz.isArchived ? 'opacity-70 bg-slate-50/70' : ''}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                    {biz.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {biz.isArchived && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Diarsipkan
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" />
                        Aktif
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">{biz.name}</h3>
                <p className="text-xs font-medium text-purple-600 mt-0.5">{biz.category}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {biz.tagline || biz.description || 'Tidak ada deskripsi'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{biz.currency}</span>
                  <span>·</span>
                  <span>PPN {(Number(biz.taxRate || 0.11) * 100).toFixed(0)}%</span>
                </div>

                {!user?.isReadOnly && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenEdit(biz, e)}
                      title="Edit Bisnis"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleToggleArchive(biz, e)}
                      title={biz.isArchived ? 'Aktifkan Kembali' : 'Arsipkan Bisnis'}
                      className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingBiz ? `Edit Bisnis: ${editingBiz.name}` : 'Tambah Bisnis Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {editingBiz
                ? 'Perbarui informasi bisnis Anda. Perubahan akan langsung tersinkronisasi.'
                : 'Bisnis baru akan secara otomatis dibuatkan rekening operasional dan struktur folder cloud storage.'}
            </p>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Brand / Bisnis *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CHEMI Glow Studio"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori Bisnis</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mata Uang</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                  >
                    <option value="IDR">IDR (Rupiah Indonesia)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tagline Bisnis</label>
                <input
                  type="text"
                  placeholder="Contoh: Modest Wear & Daily Essentials"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Deskripsi Lengkap</label>
                <textarea
                  rows={3}
                  placeholder="Jelaskan fokus operasional, lini produk, dan profil bisnis..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : editingBiz ? 'Simpan Perubahan' : 'Buat Bisnis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

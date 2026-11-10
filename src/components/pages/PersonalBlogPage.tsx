import React, { useState, useEffect } from 'react';
import {
  BookOpenText,
  PlusCircle,
  Tag,
  Calendar,
  User,
  Trash2,
  PenSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { BlogPost } from '../../types/index';

export const PersonalBlogPage: React.FC = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const loadBlogs = async () => {
    setLoading(true);
    try {
      const list = await api.getBlogs();
      setBlogs(list);
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    try {
      await api.createBlog(title, content, tags);
      await loadBlogs();
      setShowAddModal(false);
      setTitle('');
      setContent('');
      setTagsInput('');
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan tulisan');
    }
  };

  const handleDelete = async (blogId: string) => {
    if (!confirm('Hapus catatan pribadi ini?')) return;
    try {
      await api.deleteBlog(blogId);
      await loadBlogs();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Personal Blog & Catatan Eksekutif</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Terpisah dari Laporan Keuangan
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ruang refleksi pribadi, gagasan inovasi, rencana ekspansi brand, dan catatan internal para founder.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs self-start sm:self-auto transition-colors"
        >
          <PenSquare className="w-4 h-4" />
          <span>Tulis Catatan Baru</span>
        </button>
      </div>

      {/* Blog Cards */}
      <div className="space-y-4">
        {blogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            Belum ada catatan blog tersimpan. Buat tulisan pertama Anda untuk mencatat visi bisnis.
          </div>
        ) : (
          blogs.map((b) => (
            <article
              key={b.id}
              className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-purple-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{b.title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <User className="w-3.5 h-3.5 text-purple-600" />
                      {b.authorName}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {b.createdAt.split('T')[0]}
                    </span>
                  </div>
                </div>

                {(b.authorId === user?.id || user?.role === 'admin') && (
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"
                    title="Hapus Tulisan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                {b.content}
              </div>

              {b.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {b.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>

      {/* New Blog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tulis Catatan / Refleksi Baru</h3>
            <p className="text-xs text-slate-500 mb-4">
              Catatan ini disimpan pada ruang blog pribadi Anda secara eksklusif.
            </p>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Catatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Evaluasi Kampanye Kolaboratif Q4..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Isi Tulisan *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Tuangkan pemikiran, strategi, catatan meeting penting..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Tags (pisahkan dengan koma)</label>
                <input
                  type="text"
                  placeholder="Strategi, Operasional, Brand, Ekspansi"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Publikasikan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

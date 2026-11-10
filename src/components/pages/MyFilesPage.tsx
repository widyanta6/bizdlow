import React, { useState, useEffect } from 'react';
import {
  FolderClosed,
  FileText,
  UploadCloud,
  FolderPlus,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  Eye,
  Share2,
  HardDrive,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  MoreVertical,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FileItem, FolderItem, Order } from '../../types/index';

interface MyFilesPageProps {
  onNavigateToOrders?: () => void;
}

export const MyFilesPage: React.FC<MyFilesPageProps> = ({ onNavigateToOrders }) => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#DDD6FE');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);
  const [targetFolderForUpload, setTargetFolderForUpload] = useState<string>('');

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const [fldrs, fls, ords] = await Promise.all([
        api.getFolders(activeBusiness.id),
        api.getFiles(activeBusiness.id),
        api.getOrders(activeBusiness.id),
      ]);
      setFolders(fldrs);
      setFiles(fls);
      setOrders(ords.slice(0, 3));
    } catch (err) {
      console.error('Failed to load files data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  // Actual storage calculations (PRD Section 6.6)
  const totalSizeBytes = files.reduce((acc, f) => acc + f.sizeBytes, 0);
  const totalSizeMb = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));
  const maxStorageMb = 50; // 50MB quota
  const storagePercentage = Math.min(100, Math.round((totalSizeMb / maxStorageMb) * 100));

  // Category file counts for storage breakdown
  const documentFiles = files.filter((f) => f.mimeType.includes('pdf') || f.mimeType.includes('document') || f.mimeType.includes('text'));
  const spreadsheetFiles = files.filter((f) => f.mimeType.includes('sheet') || f.mimeType.includes('csv') || f.name.endsWith('.xlsx'));
  const imageFiles = files.filter((f) => f.mimeType.includes('image'));

  // Filtering files
  const filteredFiles = files.filter((f) => {
    const matchesFolder = selectedFolderId ? f.folderId === selectedFolderId : true;
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const getFileIcon = (file: FileItem) => {
    if (file.mimeType.includes('image')) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (file.mimeType.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    return <FileText className="w-5 h-5 text-purple-500" />;
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !newFolderName.trim()) return;
    try {
      await api.createFolder(activeBusiness.id, newFolderName.trim(), newFolderColor);
      await loadData();
      setShowNewFolderModal(false);
      setNewFolderName('');
    } catch (err: any) {
      alert(err.message || 'Gagal membuat folder');
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBusiness) return;
    if (!confirm(`Hapus folder "${folderName}"? File di dalamnya tidak akan terhapus, hanya dipindahkan ke root.`)) return;
    try {
      await api.deleteFolder(activeBusiness.id, folderId);
      if (selectedFolderId === folderId) setSelectedFolderId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus folder');
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !selectedFileForUpload) return;
    setUploadProgress(true);
    try {
      await api.uploadFile(activeBusiness.id, selectedFileForUpload, targetFolderForUpload || undefined);
      await loadData();
      setShowUploadModal(false);
      setSelectedFileForUpload(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah file');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!activeBusiness) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus file "${fileName}"?`)) return;
    try {
      await api.deleteFile(activeBusiness.id, fileId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus file');
    }
  };

  const pastelColors = ['#DDD6FE', '#BAE6FD', '#FED7AA', '#A7F3D0', '#FBCFE8', '#E9D5FF', '#FEF08A', '#CFFAFE'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 6.3 Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Files — Cloud Storage</h1>
          <p className="text-xs text-slate-500 mt-1">
            Penyimpanan awan bisnis terstruktur untuk nota transaksi, invoice, proposal, katalog produk, dan laporan resmi.
          </p>
        </div>

        {!user?.isReadOnly && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-purple-600" />
              <span>New Folder</span>
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Workspace & Right Storage Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left & Center: Folders & Files (3 Columns) */}
        <div className="lg:col-span-3 space-y-6">
          {/* 6.4 Recent Folders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Folders</h3>
              {selectedFolderId && (
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  Tampilkan Semua Folder (Clear Filter)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {folders.map((folder) => {
                const folderFiles = files.filter((f) => f.folderId === folder.id);
                const isSelected = selectedFolderId === folder.id;
                return (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/30 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: folder.color || '#DDD6FE' }}
                      >
                        <FolderClosed className="w-4 h-4 text-purple-900" />
                      </div>

                      {!user?.isReadOnly && (
                        <button
                          onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                          title="Hapus Folder"
                          className="text-slate-300 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800 truncate" title={folder.name}>
                        {folder.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 tabular-nums">
                        {folderFiles.length} files
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6.5 Recent Files Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {selectedFolderId
                    ? `Files dalam Folder: ${folders.find((f) => f.id === selectedFolderId)?.name}`
                    : 'Recent Files'}
                </h3>
                <span className="text-xs text-slate-400 font-mono tabular-nums">({filteredFiles.length})</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Search in files */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-36 sm:w-48 bg-white"
                  />
                </div>

                {/* Grid / List switcher */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'}`}
                    title="Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${viewMode === 'list' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500'}`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Files Display */}
            {filteredFiles.length === 0 ? (
              <div className="py-12 bg-white rounded-xl border border-slate-200/80 text-center text-xs text-slate-400">
                Tidak ada file pada folder atau pencarian ini.
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {getFileIcon(file)}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewFile(file)}
                          title="Preview File"
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={file.url}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          title="Download"
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {!user?.isReadOnly && (
                          <button
                            onClick={() => handleDeleteFile(file.id, file.name)}
                            title="Hapus"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                        <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>{file.uploadDate.split('T')[0]}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Nama File</th>
                      <th className="px-4 py-2.5">Folder</th>
                      <th className="px-4 py-2.5 text-right">Ukuran</th>
                      <th className="px-4 py-2.5">Tanggal Unggah</th>
                      <th className="px-4 py-2.5">Pengunggah</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFiles.map((file) => {
                      const fldr = folders.find((f) => f.id === file.folderId);
                      return (
                        <tr key={file.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-2.5 flex items-center gap-2.5 font-medium text-slate-800 truncate max-w-xs">
                            {getFileIcon(file)}
                            <span className="truncate" title={file.name}>{file.name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {fldr ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">
                                {fldr.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-600 tabular-nums">
                            {(file.sizeBytes / 1024).toFixed(1)} KB
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{file.uploadDate.split('T')[0]}</td>
                          <td className="px-4 py-2.5 text-slate-500">{file.uploadedBy}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-1 text-slate-400 hover:text-purple-600 rounded"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={file.url}
                                download={file.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {!user?.isReadOnly && (
                                <button
                                  onClick={() => handleDeleteFile(file.id, file.name)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 6.6 Right Storage Panel (PRD Section 6.6) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Storage Usage</h3>
            <HardDrive className="w-4 h-4 text-purple-600" />
          </div>

          {/* Circular Storage Progress */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Circular SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#F1F5F9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#purpleGradient)"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * storagePercentage) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333EA" />
                    <stop offset="100%" stopColor="#4F46E5" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight tabular-nums">
                  {storagePercentage}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Kapasitas Terpakai</span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <p className="text-xs font-bold text-slate-800 font-mono tabular-nums">
                {totalSizeMb} MB <span className="text-slate-400 font-normal">/ {maxStorageMb} MB</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cloud Volume: {activeBusiness?.name}</p>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Dokumen PDF & Teks
              </span>
              <span className="font-mono text-slate-800 font-semibold tabular-nums">{documentFiles.length} file</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Spreadsheets (XLSX/CSV)
              </span>
              <span className="font-mono text-slate-800 font-semibold tabular-nums">{spreadsheetFiles.length} file</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Gambar / Foto Nota
              </span>
              <span className="font-mono text-slate-800 font-semibold tabular-nums">{imageFiles.length} file</span>
            </div>
          </div>

          <button
            onClick={() => setShowDetailsModal(true)}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>

      {/* 6.7 Bottom Dashboard Section: 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        {/* Card 1: Shared with Me */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-purple-600" />
                Shared with Me
              </h4>
              <span className="text-[10px] text-purple-600 font-semibold">Tervalidasi</span>
            </div>
            <div className="space-y-2 text-xs">
              {files.filter((f) => f.isShared).length === 0 ? (
                <p className="text-[11px] text-slate-400 py-3">Tidak ada file yang dibagikan secara spesifik.</p>
              ) : (
                files.filter((f) => f.isShared).map((f) => (
                  <div key={f.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <span className="truncate font-medium text-slate-700">{f.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">{(f.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
              Quick Actions
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-left transition-colors"
              >
                Upload File
              </button>
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-left transition-colors"
              >
                New Folder
              </button>
              <button
                onClick={() => alert('Fitur berbagi file aman mengikuti izin RBAC pengguna.')}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-left transition-colors"
              >
                Share File
              </button>
              <button
                onClick={() => alert(`Mengunduh ${files.length} file arsip aktif.`)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 font-semibold text-slate-700 text-left transition-colors"
              >
                Download Files
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Orders */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Upcoming Orders
              </h4>
              <button
                onClick={onNavigateToOrders}
                className="text-[10px] text-purple-600 font-semibold hover:underline"
              >
                See All
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {orders.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-3">Belum ada pesanan aktif.</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-800 block">{o.orderNumber}</span>
                      <span className="text-[10px] text-slate-400">{o.customerName} · Deadline: {o.deadline}</span>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {o.fulfillmentStatus}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Buat Folder Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Gunakan folder untuk mengorganisir dokumen bisnis Anda.</p>
            <form onSubmit={handleCreateFolder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Folder *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pajak & Legal 2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pilih Warna Folder</label>
                <div className="flex items-center gap-2">
                  {pastelColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-6 h-6 rounded-full border transition-all ${
                        newFolderColor === color ? 'ring-2 ring-purple-600 scale-110' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Buat Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Unggah File ke Cloud Workspace</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dukungan format PDF, XLSX, CSV, DOCX, PNG, JPG (maksimal 25MB per file).
            </p>

            <form onSubmit={handleUploadFile} className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-purple-400 transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="fileUploadInput"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFileForUpload(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="fileUploadInput" className="cursor-pointer block">
                  <UploadCloud className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <span className="font-semibold text-purple-700 block text-xs">
                    {selectedFileForUpload ? selectedFileForUpload.name : 'Pilih file dari perangkat'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {selectedFileForUpload
                      ? `Ukuran: ${(selectedFileForUpload.size / 1024).toFixed(1)} KB`
                      : 'Atau seret dan lepas file di sini'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Simpan di Folder:</label>
                <select
                  value={targetFolderForUpload}
                  onChange={(e) => setTargetFolderForUpload(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                >
                  <option value="">-- Root (Tanpa Folder) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedFileForUpload || uploadProgress}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {uploadProgress ? 'Mengunggah...' : 'Unggah Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{previewFile.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {(previewFile.sizeBytes / 1024).toFixed(1)} KB · {previewFile.mimeType}
                </p>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto py-4 flex items-center justify-center bg-slate-50/50 rounded-xl my-2">
              {previewFile.mimeType.includes('image') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-96 max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="w-16 h-16 text-purple-600 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-700">Preview Dokumen Terbuka</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                    File ini dapat diunduh langsung untuk melihat konten selengkapnya.
                  </p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File ({previewFile.name.split('.').pop()?.toUpperCase()})</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Tutup
              </button>
              <a
                href={previewFile.url}
                download={previewFile.name}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Storage Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Rincian Kapasitas Storage</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total File:</span>
                  <span className="font-mono font-bold text-slate-800">{files.length} dokumen</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Ukuran:</span>
                  <span className="font-mono font-bold text-slate-800">{totalSizeMb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kuota Workspace:</span>
                  <span className="font-mono text-slate-600">{maxStorageMb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Kuota:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {(maxStorageMb - totalSizeMb).toFixed(2)} MB
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

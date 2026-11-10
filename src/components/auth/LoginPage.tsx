import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Shield,
  ArrowRight,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, forgotPassword } = useAuth();

  const [email, setEmail] = useState('ika@bizflow.id');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password mode
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setForgotSuccess('');
    try {
      const msg = await forgotPassword(forgotEmail, forgotNewPass);
      setForgotSuccess(msg);
      setTimeout(() => {
        setIsForgotMode(false);
        setEmail(forgotEmail);
        setPassword(forgotNewPass);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mereset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (fillEmail: string) => {
    setEmail(fillEmail);
    setPassword('password123');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Lockup */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-purple-200 mb-3">
            <span className="font-bold text-lg tracking-tighter">BF</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">BizFlow Multi-Brand</h1>
          <p className="text-xs text-slate-500 mt-1">
            Business Management Workspace — Keuangan, Rekening, Orders & AI
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-5">
          {!isForgotMode ? (
            <>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">Masuk ke Workspace</h2>
                <p className="text-xs text-slate-500">
                  Gunakan kredensial akun terdaftar untuk mengakses bisnis Anda.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Terdaftar</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="nama@bizflow.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-semibold">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(true);
                        setForgotEmail(email);
                        setErrorMsg('');
                      }}
                      className="text-purple-600 hover:text-purple-700 text-[11px] font-medium"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                >
                  <span>{loading ? 'Memverifikasi...' : 'Masuk ke BizFlow'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Login Helper according to PRD Section 2.1 */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pilih Akun Terdaftar (Sesuai PRD):
                </span>
                <div className="space-y-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('ika@bizflow.id')}
                    className="w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-300 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Ika (Owner)</p>
                      <p className="text-[10px] text-slate-500">Akses: Tirama & CHEMI</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      Pilih
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('redi@bizflow.id')}
                    className="w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-300 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Redi (Owner)</p>
                      <p className="text-[10px] text-slate-500">Akses: BYE, Metamorph, Presta Media</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      Pilih
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@baliyoutevolution.com')}
                    className="w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-amber-50 hover:border-amber-300 text-left transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Admin Baliyoutevolution</p>
                      <p className="text-[10px] text-slate-500">Akses: Transparansi Read-Only</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      Pilih
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password Flow */
            <div className="space-y-4 text-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pemulihan Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Masukkan email akun dan tentukan password baru yang aman.
                </p>
              </div>

              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{forgotSuccess} Mengalihkan ke login...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Terdaftar *</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password Baru (min. 6 karakter) *</label>
                  <input
                    type="password"
                    required
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
                  >
                    {loading ? 'Mereset...' : 'Simpan Password Baru'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <p className="text-[11px] text-center text-slate-400 leading-relaxed max-w-xs mx-auto">
          BizFlow Multi-Brand menerapkan isolasi data ketat berbasis role. Sesi aktif dilindungi dengan audit log otomatis.
        </p>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  FileText,
  TrendingUp,
  Compass,
  Copy,
  Trash2,
  Check,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NavItemKey } from '../layout/Sidebar';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  mode?: string;
}

interface AiAssistantPageProps {
  onNavigate?: (tab: NavItemKey) => void;
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeBusiness, financialSummary, periodFilter } = useBusiness();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `Halo ${user?.name}! Saya adalah **BizFlow AI Assistant** untuk bisnis **${activeBusiness?.name || 'Multi-Brand'}**.

Saya siap membantu Anda dalam 4 mode:
1. 💡 **Help Assistant**: Panduan fitur (cara catat kas, koreksi saldo aman, ganti password, export Excel).
2. 📊 **Business Data Assistant**: Tanya angka aktual penjualan, laba bersih, HPP, atau order aktif.
3. 📑 **Automatic Financial Report**: Susun draf analisis laporan keuangan berkala secara otomatis.
4. 🧭 **Navigation Assistant**: Panduan cepat menuju modul yang relevan.

Pilih pertanyaan cepat di bawah atau ketik langsung pertanyaan Anda!`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<'general' | 'help' | 'data' | 'report'>('general');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const suggestedQuestions = [
    { label: 'Berapa total penjualan dan laba bersih bulan ini?', mode: 'data' },
    { label: 'Buat draf Laporan Keuangan Eksekutif lengkap', mode: 'report' },
    { label: 'Bagaimana cara melakukan koreksi saldo rekening secara aman?', mode: 'help' },
    { label: 'Berapa pesanan yang belum selesai dan sisa piutang?', mode: 'data' },
    { label: 'Bagaimana memisahkan pencatatan DP dengan pelunasan order?', mode: 'help' },
  ];

  const handleSendMessage = async (textToSend?: string, modeOverride?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim() || !activeBusiness) return;

    const mode = modeOverride || selectedMode;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      mode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    try {
      const reply = await api.sendAiMessage(text, activeBusiness.id, mode);
      const aiMsg: Message = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        mode,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: 'ai_err_' + Date.now(),
        sender: 'ai',
        text: `⚠️ Kendala: ${err.message || 'Layanan AI tidak dapat diakses saat ini.'}`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: `Percakapan telah dibersihkan. Silakan tanyakan hal lain seputar keuangan ${activeBusiness?.name}.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto h-[calc(100vh-64px)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">BizFlow AI Assistant</h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Online (Gemini 3.8 Flash)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Analisis cerdas data riil untuk bisnis aktif: <span className="font-semibold text-purple-700">{activeBusiness?.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          title="Bersihkan Percakapan"
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Suggested Questions Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs select-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Saran:
        </span>
        {suggestedQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(sq.label, sq.mode)}
            className="px-3 py-1.5 rounded-full bg-white border border-slate-200/80 hover:border-purple-400 hover:bg-purple-50 text-slate-700 hover:text-purple-800 text-xs whitespace-nowrap transition-colors shadow-2xs"
          >
            {sq.label}
          </button>
        ))}
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 relative group shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-none'
                  : 'bg-slate-50 border border-slate-200/70 text-slate-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

              <div
                className={`flex items-center justify-between text-[10px] pt-1.5 border-t ${
                  msg.sender === 'user' ? 'border-purple-500/50 text-purple-200' : 'border-slate-200 text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.sender === 'ai' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="flex items-center gap-1 hover:text-purple-700 transition-colors ml-4"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? 'Tersalin' : 'Copy'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70 w-36 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
            <span>Menganalisis...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 flex items-center gap-3"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedMode('report')}
            title="Mode Draf Laporan Otomatis"
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              selectedMode === 'report' ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Laporan</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode('data')}
            title="Mode Analisis Data Aktual"
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              selectedMode === 'data' ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden md:inline">Data Aktual</span>
          </button>
        </div>

        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={`Tanya apapun seputar keuangan dan operasional ${activeBusiness?.name}...`}
          className="flex-1 text-xs border-0 focus:outline-none focus:ring-0 bg-transparent text-slate-800"
        />

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isTyping}
          className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

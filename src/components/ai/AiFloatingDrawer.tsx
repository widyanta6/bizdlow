import React, { useState } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Copy,
  Trash2,
  Check,
  Maximize2,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { NavItemKey } from '../layout/Sidebar';

interface AiFloatingDrawerProps {
  onOpenFullPage: () => void;
}

export const AiFloatingDrawer: React.FC<AiFloatingDrawerProps> = ({ onOpenFullPage }) => {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Halo! Saya BizFlow AI untuk **${activeBusiness?.name || 'Bisnis Anda'}**. Ada yang bisa saya bantu terkait laporan keuangan atau operasional hari ini?`,
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const quickChips = [
    'Berapa laba bersih bulan ini?',
    'Ringkasan arus kas aktual',
    'Cara koreksi saldo aman',
  ];

  const handleSend = async (customText?: string) => {
    const text = customText || prompt;
    if (!text.trim() || !activeBusiness) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setPrompt('');
    setIsTyping(true);

    try {
      const reply = await api.sendAiMessage(text, activeBusiness.id, 'general');
      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: `⚠️ ${err.message || 'Gagal memproses pesan AI.'}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <>
      {/* Floating Trigger Button in Bottom-Right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Buka BizFlow AI Assistant"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Floating Drawer / Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">BizFlow AI Assistant</h4>
                <p className="text-[10px] text-purple-200 leading-tight truncate max-w-[170px]">
                  {activeBusiness?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullPage();
                }}
                title="Buka Layar Penuh"
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {quickChips.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-purple-700 hover:border-purple-300 whitespace-nowrap shrink-0 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.sender === 'ai' && (
                    <div className="pt-1 mt-1 border-t border-slate-200/60 flex justify-end">
                      <button
                        onClick={() => handleCopy(idx, m.text)}
                        className="text-[10px] text-slate-400 hover:text-purple-700 flex items-center gap-1"
                      >
                        {copiedIdx === idx ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedIdx === idx ? 'Tersalin' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg w-28 text-[11px] text-slate-500">
                <Sparkles className="w-3 h-3 text-purple-600 animate-spin" />
                <span>Mengetik...</span>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 border-t border-slate-100 flex items-center gap-2 bg-white"
          >
            <input
              type="text"
              placeholder="Tanya angka atau fitur..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isTyping}
              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

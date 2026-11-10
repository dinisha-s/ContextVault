import React, { useState } from 'react';
import { Database, FileText, Sparkles, Key, Copy, Check, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function Header({ 
  docCount, 
  isConnected, 
  onOpenDocs, 
  sessionId, 
  authRequired = false, 
  apiKey = '', 
  onApiKeyChange 
}) {
  const [copiedSession, setCopiedSession] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleCopySession = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 2000);
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    onApiKeyChange(tempKey.trim());
    setIsEditingKey(false);
  };

  return (
    <header className="h-16 px-6 bg-[#F0F4F1] border-b border-[#BB8A52]/25 shadow-[0_4px_14px_rgba(208,221,210,0.45)] flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3.5">
        {/* Soft UI Raised Icon Box */}
        <div className="w-9 h-9 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 flex items-center justify-center text-[#FFBA00]">
          <Sparkles className="w-4 h-4 animate-pulse fill-[#FFBA00]/30 text-[#FFBA00]" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#0C3B2E] tracking-tight flex items-center gap-2">
            Active Knowledge Workspace
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#FFBA00] text-[#0C3B2E] font-bold shadow-[1px_1px_3px_rgba(187,138,82,0.3)] border border-[#BB8A52]/30">
              RAG v1.0
            </span>
          </h2>
          <p className="text-xs text-[#516D56] font-medium">Grounded semantic search with local vector embeddings</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs font-mono">
        {/* Session ID Pill */}
        {sessionId && (
          <div 
            onClick={handleCopySession}
            title="Click to copy isolated Session ID"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/25 text-[#1B3B32] cursor-pointer hover:border-[#6D9773] transition"
          >
            <span className="text-[10px] text-[#516D56] uppercase font-bold">Session:</span>
            <span className="text-[11px] font-semibold text-[#0C3B2E] truncate max-w-[90px]">{sessionId}</span>
            {copiedSession ? (
              <Check className="w-3 h-3 text-[#6D9773]" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </div>
        )}

        {/* API Key Modal / Pill */}
        <div className="relative">
          <button
            onClick={() => setIsEditingKey(!isEditingKey)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border transition text-[11px] font-semibold ${
              authRequired && !apiKey
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-[#F0F4F1] border-[#BB8A52]/25 text-[#0C3B2E] hover:border-[#6D9773]'
            }`}
            title={authRequired ? 'Authentication Required' : 'Optional API Key'}
          >
            <Key className="w-3 h-3 text-[#BB8A52]" />
            <span className="hidden sm:inline">
              {apiKey ? 'API Key Set' : authRequired ? 'Key Required' : 'Auth'}
            </span>
            {authRequired && !apiKey ? (
              <ShieldAlert className="w-3 h-3 text-rose-600" />
            ) : apiKey ? (
              <ShieldCheck className="w-3 h-3 text-[#6D9773]" />
            ) : null}
          </button>

          {isEditingKey && (
            <div className="absolute right-0 top-10 w-72 p-3 bg-[#F5F8F5] shadow-[6px_6px_16px_#D0DDD2,-6px_-6px_16px_#FFFFFF] border border-[#BB8A52]/30 rounded-2xl z-30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#0C3B2E]">
                <span>Set Custom API Key</span>
                <span className="text-[10px] font-normal text-[#516D56]">
                  {authRequired ? 'Required by server' : 'Optional'}
                </span>
              </div>
              <form onSubmit={handleSaveKey} className="space-y-2">
                <input
                  type="password"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="Enter X-API-Key..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-[#F2F6F3] shadow-[inset_2px_2px_4px_#D0DDD2,inset_-2px_-2px_4px_#FFFFFF] border border-[#BB8A52]/30 text-[#0C3B2E] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingKey(false)}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-[#516D56] hover:text-[#0C3B2E]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-[#0C3B2E] text-white text-[11px] font-bold shadow hover:bg-[#114D3C]"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ChromaDB Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 text-[#1B3B32]">
          <Database className="w-3.5 h-3.5 text-[#6D9773]" />
          <span>
            ChromaDB:{' '}
            <strong className={`font-semibold ${isConnected ? 'text-[#0C3B2E]' : 'text-rose-600'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </strong>
          </span>
        </div>

        {/* Sources Counter Pill */}
        <div 
          onClick={onOpenDocs}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 text-[#1B3B32] cursor-pointer hover:border-[#6D9773] transition"
          title="Refresh indexed sources"
        >
          <FileText className="w-3.5 h-3.5 text-[#BB8A52]" />
          <span>
            Sources:{' '}
            <strong className="text-[#0C3B2E] font-bold">{docCount}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}

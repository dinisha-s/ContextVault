import React from 'react';
import { Database, FileText, Sparkles } from 'lucide-react';

export default function Header({ docCount, isConnected, onOpenDocs }) {
  return (
    <header className="h-16 px-6 bg-[#EEF2F7] border-b border-white/80 shadow-[0_4px_14px_rgba(203,213,225,0.45)] flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3.5">
        {/* Soft UI Raised Icon Box */}
        <div className="w-9 h-9 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_8px_#CBD5E1,-3px_-3px_8px_#FFFFFF] border border-white/80 flex items-center justify-center text-blue-600">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Active Knowledge Workspace
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#EEF2F7] text-blue-600 shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/60 font-semibold">
              RAG v1.0
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">Grounded semantic search with local vector embeddings</p>
        </div>
      </div>

      <div className="flex items-center gap-3.5 text-xs font-mono">
        {/* ChromaDB Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_7px_#CBD5E1,-3px_-3px_7px_#FFFFFF] border border-white/80 text-slate-700">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>
            ChromaDB:{' '}
            <strong className={`font-semibold ${isConnected ? 'text-emerald-600' : 'text-rose-500'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </strong>
          </span>
        </div>

        {/* Sources Counter Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_7px_#CBD5E1,-3px_-3px_7px_#FFFFFF] border border-white/80 text-slate-700">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Indexed Sources:{' '}
            <strong className="text-blue-600 font-bold">{docCount}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}

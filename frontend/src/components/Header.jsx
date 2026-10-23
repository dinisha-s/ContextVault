import React from 'react';
import { Database, FileText, Sparkles } from 'lucide-react';

export default function Header({ docCount, isConnected, onOpenDocs }) {
  return (
    <header className="h-16 px-6 bg-[#F0F4F1] border-b border-[#BB8A52]/25 shadow-[0_4px_14px_rgba(208,221,210,0.45)] flex items-center justify-between z-10 select-none">
      <div className="flex items-center gap-3.5">
        {/* Soft UI Raised Icon Box with Deep Forest Green & Amber Sparkle */}
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

      <div className="flex items-center gap-3.5 text-xs font-mono">
        {/* ChromaDB Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 text-[#1B3B32]">
          <Database className="w-3.5 h-3.5 text-[#6D9773]" />
          <span>
            ChromaDB:{' '}
            <strong className={`font-semibold ${isConnected ? 'text-[#0C3B2E]' : 'text-rose-600'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </strong>
          </span>
        </div>

        {/* Sources Counter Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 text-[#1B3B32]">
          <FileText className="w-3.5 h-3.5 text-[#BB8A52]" />
          <span>
            Indexed Sources:{' '}
            <strong className="text-[#0C3B2E] font-bold">{docCount}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}

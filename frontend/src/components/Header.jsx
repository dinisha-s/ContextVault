import React from 'react';
import { Database, Cpu, FileText, Sparkles, BookOpen } from 'lucide-react';

export default function Header({ docCount, isConnected, onOpenDocs }) {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-200 tracking-tight flex items-center gap-2">
            Active Workspace
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              RAG v1.0
            </span>
          </h2>
          <p className="text-xs text-slate-400">Grounded semantic search with local embeddings</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>ChromaDB: <strong className="text-emerald-400 font-semibold">{isConnected ? "Connected" : "Offline"}</strong></span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Indexed Sources: <strong className="text-indigo-400 font-semibold">{docCount}</strong></span>
        </div>
      </div>
    </header>
  );
}

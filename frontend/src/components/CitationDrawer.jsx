import React from 'react';
import { X, FileText, Layers, Hash, Bookmark } from 'lucide-react';

export default function CitationDrawer({ isOpen, onClose, citations, activeCitationId }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-sm text-slate-100">Retrieved Grounding Citations</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
            {citations.length} chunks
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close citation drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No citations available for this message.
          </div>
        ) : (
          citations.map((c) => {
            const isTarget = activeCitationId === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-4 transition ${
                  isTarget
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500/40'
                    : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate max-w-[200px]" title={c.source}>{c.source}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Chunk #{c.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3 font-mono">
                  {c.page && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Page {c.page}
                    </span>
                  )}
                  {c.score !== null && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Distance: {c.score}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/70 border border-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {c.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[11px] text-slate-500 text-center">
        Extracted via ChromaDB Cosine Similarity
      </div>
    </div>
  );
}

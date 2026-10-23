import React from 'react';
import { X, FileText, Layers, Hash, Bookmark } from 'lucide-react';

export default function CitationDrawer({ isOpen, onClose, citations, activeCitationId }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#EEF2F7] border-l border-white/80 shadow-[-12px_0_30px_rgba(203,213,225,0.6)] z-50 flex flex-col transition-all duration-300 select-none">
      {/* Header */}
      <div className="p-4 border-b border-white/80 shadow-[0_2px_8px_rgba(203,213,225,0.25)] flex items-center justify-between bg-[#EEF2F7]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#EEF2F7] shadow-[2px_2px_5px_#CBD5E1,-2px_-2px_5px_#FFFFFF] border border-white/80 text-blue-600">
            <Bookmark className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">Retrieved Grounding Citations</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EEF2F7] text-blue-600 shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/60 font-semibold">
            {citations.length} chunks
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[#EEF2F7] shadow-[2px_2px_5px_#CBD5E1,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/80 text-slate-600 hover:text-slate-900 transition"
          aria-label="Close citation drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm font-medium">
            No citations available for this message.
          </div>
        ) : (
          citations.map((c) => {
            const isTarget = activeCitationId === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl p-4 transition-all duration-200 bg-[#EEF2F7] ${
                  isTarget
                    ? 'shadow-[6px_6px_16px_rgba(59,130,246,0.25),-6px_-6px_16px_#FFFFFF] border-2 border-blue-500/60'
                    : 'shadow-[5px_5px_12px_#CBD5E1,-5px_-5px_12px_#FFFFFF] border border-white/90 hover:shadow-[6px_6px_14px_#CBD5E1,-6px_-6px_14px_#FFFFFF]'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate max-w-[200px]" title={c.source}>{c.source}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#EEF2F7] text-blue-600 shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/60 font-semibold">
                    Chunk #{c.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3 font-mono font-medium">
                  {c.page && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" /> Page {c.page}
                    </span>
                  )}
                  {c.score !== null && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" /> Distance: {c.score}
                    </span>
                  )}
                </div>

                {/* Inset Snippet Box */}
                <div className="bg-[#EEF2F7] shadow-[inset_2.5px_2.5px_5px_#CBD5E1,inset_-2.5px_-2.5px_5px_#FFFFFF] border border-white/60 rounded-xl p-3.5 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {c.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 border-t border-white/80 bg-[#EEF2F7] shadow-[0_-2px_8px_rgba(203,213,225,0.2)] text-[11px] text-slate-500 font-medium text-center">
        Extracted via ChromaDB Cosine Similarity
      </div>
    </div>
  );
}

import React from 'react';
import { X, FileText, Layers, Hash, Bookmark } from 'lucide-react';

export default function CitationDrawer({ isOpen, onClose, citations, activeCitationId }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#F0F4F1] border-l border-[#BB8A52]/30 shadow-[-12px_0_30px_rgba(208,221,210,0.6)] z-50 flex flex-col transition-all duration-300 select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#BB8A52]/20 shadow-[0_2px_8px_rgba(208,221,210,0.25)] flex items-center justify-between bg-[#F0F4F1]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#F0F4F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] border border-[#BB8A52]/30 text-[#FFBA00]">
            <Bookmark className="w-4 h-4 fill-[#FFBA00]/30 text-[#FFBA00]" />
          </div>
          <h3 className="font-bold text-sm text-[#0C3B2E]">Retrieved Grounding Citations</h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FFBA00] text-[#0C3B2E] shadow-[1px_1px_3px_rgba(187,138,82,0.3)] border border-[#BB8A52]/30 font-bold">
            {citations.length} chunks
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[#F0F4F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/30 text-[#516D56] hover:text-[#0C3B2E] transition"
          aria-label="Close citation drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {citations.length === 0 ? (
          <div className="text-center py-12 text-[#516D56] text-sm font-medium">
            No citations available for this message.
          </div>
        ) : (
          citations.map((c) => {
            const isTarget = activeCitationId === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl p-4 transition-all duration-200 bg-[#F5F8F5] ${
                  isTarget
                    ? 'shadow-[6px_6px_16px_rgba(12,59,46,0.25),-6px_-6px_16px_#FFFFFF] border-2 border-[#0C3B2E]'
                    : 'shadow-[5px_5px_12px_#D0DDD2,-5px_-5px_12px_#FFFFFF] border border-[#BB8A52]/25 hover:shadow-[6px_6px_14px_#D0DDD2,-6px_-6px_14px_#FFFFFF]'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0C3B2E]">
                    <FileText className="w-3.5 h-3.5 text-[#BB8A52]" />
                    <span className="truncate max-w-[200px]" title={c.source}>{c.source}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#E7EFE9] text-[#0C3B2E] shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#6D9773]/30 font-semibold">
                    Chunk #{c.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#516D56] mb-3 font-mono font-medium">
                  {c.page && (
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#6D9773]" /> Page {c.page}
                    </span>
                  )}
                  {c.score !== null && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-[#BB8A52]" /> Distance: {c.score}
                    </span>
                  )}
                </div>

                {/* Inset Snippet Box with Bronze/Sage borders */}
                <div className="bg-[#F2F6F3] shadow-[inset_2.5px_2.5px_5px_#D0DDD2,inset_-2.5px_-2.5px_5px_#FFFFFF] border border-[#BB8A52]/25 rounded-xl p-3.5 text-xs text-[#1B3B32] font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {c.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 border-t border-[#BB8A52]/20 bg-[#F0F4F1] shadow-[0_-2px_8px_rgba(208,221,210,0.2)] text-[11px] text-[#516D56] font-semibold text-center">
        Extracted via ChromaDB Cosine Similarity
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Bookmark, 
  Copy, 
  Check, 
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  "What are the three caching invalidation patterns and their trade-offs?",
  "How does recursive character chunking prevent semantic context loss?",
  "Explain the difference between horizontal sharding and vertical partitioning.",
  "What distance metrics are used in vector embeddings and how does Cosine Similarity work?"
];

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  isLoading, 
  onOpenCitation,
  onClearChat,
  hasDocuments 
}) {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    onSendMessage(inputQuery);
    setInputQuery('');
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSuggestionClick = (query) => {
    onSendMessage(query);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#EEF2F7] to-[#F4F7FC] relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
            {/* Soft UI Hero Icon Box */}
            <div className="w-16 h-16 rounded-2xl bg-[#EEF2F7] shadow-[8px_8px_18px_#CBD5E1,-8px_-8px_18px_#FFFFFF] border border-white/90 flex items-center justify-center text-blue-600 mb-5">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              ContextVault Knowledge Assistant
            </h2>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed max-w-lg">
              Query your indexed documents with zero-hallucination grounded retrieval. Every statement is strictly linked to source chunks stored in ChromaDB.
            </p>

            {hasDocuments ? (
              <div className="w-full space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 text-left font-semibold">
                  Suggested Prompts to Explore
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(q)}
                      className="p-3.5 rounded-xl bg-[#EEF2F7] shadow-[4px_4px_10px_#CBD5E1,-4px_-4px_10px_#FFFFFF] border border-white/80 hover:shadow-[6px_6px_14px_#CBD5E1,-6px_-6px_14px_#FFFFFF] active:shadow-[inset_2px_2px_4px_#CBD5E1,inset_-2px_-2px_4px_#FFFFFF] active:scale-[0.985] text-xs text-slate-700 font-medium transition text-left flex items-start gap-2.5 group"
                    >
                      <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition" />
                      <span className="leading-snug">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#EEF2F7] shadow-[inset_3px_3px_6px_#CBD5E1,inset_-3px_-3px_6px_#FFFFFF] border border-white/60 text-xs text-slate-700 max-w-md leading-relaxed font-medium">
                💡 <strong className="text-blue-600">Tip:</strong> Upload a PDF or Markdown document in the left sidebar (or try our pre-bundled docs in <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-mono text-[11px]">backend/data/sample_documents</code>) to begin querying!
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex gap-3 sm:gap-4 max-w-3xl mx-auto ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'bot' && (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-[3px_3px_8px_rgba(37,99,235,0.35),-2px_-2px_6px_#FFFFFF]">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-2.5 max-w-[85%] sm:max-w-[78%]`}>
                <div 
                  className={`p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none shadow-[4px_4px_14px_rgba(37,99,235,0.3),-2px_-2px_8px_#FFFFFF]'
                      : 'bg-[#EEF2F7] text-slate-800 rounded-2xl rounded-tl-none shadow-[6px_6px_16px_#CBD5E1,-6px_-6px_16px_#FFFFFF] border border-white/85'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-normal">{msg.text}</p>
                </div>

                {/* Citations & Source Attribution Bar */}
                {msg.sender === 'bot' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.citations && msg.citations.length > 0 && (
                        <button
                          onClick={() => onOpenCitation(msg.citations)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#EEF2F7] shadow-[2px_2px_6px_#CBD5E1,-2px_-2px_6px_#FFFFFF] hover:shadow-[3px_3px_8px_#CBD5E1,-3px_-3px_8px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/80 text-blue-600 text-[11px] font-semibold transition"
                        >
                          <Bookmark className="w-3 h-3 text-blue-600" />
                          <span>{msg.citations.length} Grounding Chunks</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </button>
                      )}

                      {msg.sources && msg.sources.map((s, sIdx) => (
                        <span 
                          key={sIdx}
                          className="px-2.5 py-0.5 rounded-lg bg-[#EEF2F7] shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/60 text-slate-600 text-[11px] font-mono font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.provider && (
                        <span className="text-[10px] text-slate-500 font-mono font-medium">
                          {msg.provider}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="p-1.5 rounded-lg bg-[#EEF2F7] shadow-[2px_2px_5px_#CBD5E1,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/80 text-slate-500 hover:text-slate-800 transition"
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_7px_#CBD5E1,-3px_-3px_7px_#FFFFFF] border border-white/80 flex items-center justify-center text-slate-600 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto items-start">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_7px_#CBD5E1,-3px_-3px_7px_#FFFFFF] border border-white/80 flex items-center justify-center text-blue-600 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-[#EEF2F7] shadow-[6px_6px_16px_#CBD5E1,-6px_-6px_16px_#FFFFFF] border border-white/85 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                <span className="font-bold text-slate-800">Executing Cosine Similarity Vector Retrieval...</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Searching ChromaDB embedding space and synthesizing grounded answer with precise citations.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[#EEF2F7] border-t border-white/80 shadow-[0_-4px_14px_rgba(203,213,225,0.45)]">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2 bg-[#EEF2F7] shadow-[inset_3px_3px_6px_#CBD5E1,inset_-3px_-3px_6px_#FFFFFF] border border-white/70 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all duration-200"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              title="Clear conversation"
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl bg-[#EEF2F7] shadow-[2px_2px_5px_#CBD5E1,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] transition ml-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              hasDocuments 
                ? "Ask anything about your uploaded documents (e.g. 'Summarize chunking strategies')..." 
                : "Upload documents on the left or type your query..."
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className={`p-2.5 rounded-xl font-medium text-xs flex items-center justify-center transition-all duration-200 ${
              !inputQuery.trim() || isLoading
                ? 'bg-[#E2E8F0] text-slate-400 cursor-not-allowed shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF]'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[3px_3px_10px_rgba(37,99,235,0.35),-2px_-2px_6px_#FFFFFF] active:scale-[0.96]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="max-w-3xl mx-auto mt-2 text-center text-[10px] text-slate-500 font-medium">
          ContextVault provides verified citations. Responses are strictly anchored to your vector database.
        </div>
      </div>
    </main>
  );
}

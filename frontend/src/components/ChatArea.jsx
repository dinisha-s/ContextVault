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
    <main className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              ContextVault Knowledge Assistant
            </h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Query your indexed documents with zero-hallucination grounded retrieval. Every statement is strictly linked to source chunks stored in ChromaDB.
            </p>

            {hasDocuments ? (
              <div className="w-full space-y-2">
                <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 text-left">
                  Suggested Prompts to Explore
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(q)}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 transition text-left flex items-start gap-2 group"
                    >
                      <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-indigo-900/40 bg-indigo-950/20 text-xs text-indigo-300 max-w-md">
                💡 <strong>Tip:</strong> Upload a PDF or Markdown document in the left sidebar (or try our sample docs in <code className="bg-indigo-950 px-1 py-0.5 rounded text-indigo-200">backend/data/sample_documents</code>) to begin querying!
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
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-2 max-w-[85%] sm:max-w-[78%]`}>
                <div 
                  className={`rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Citations & Source Attribution Drawer trigger */}
                {msg.sender === 'bot' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.citations && msg.citations.length > 0 && (
                        <button
                          onClick={() => onOpenCitation(msg.citations)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 text-[11px] font-medium transition"
                        >
                          <Bookmark className="w-3 h-3" />
                          <span>{msg.citations.length} Grounding Chunks</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </button>
                      )}

                      {msg.sources && msg.sources.map((s, sIdx) => (
                        <span 
                          key={sIdx}
                          className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-mono"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.provider && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {msg.provider}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition"
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span className="font-medium text-slate-300">Executing Cosine Similarity Vector Retrieval...</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Searching ChromaDB embedding space and synthesizing grounded answer with precise citations.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition shadow-inner"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              title="Clear conversation"
              className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition ml-1"
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
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className={`p-2.5 rounded-lg font-medium text-xs flex items-center justify-center transition ${
              !inputQuery.trim() || isLoading
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="max-w-3xl mx-auto mt-2 text-center text-[10px] text-slate-500">
          ContextVault provides verified citations. Responses are strictly anchored to your vector database.
        </div>
      </div>
    </main>
  );
}

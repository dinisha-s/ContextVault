import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export default function ChatArea({ 
  messages, 
  onSendMessage, 
  isLoading, 
  onOpenCitation, 
  onClearChat, 
  documents = [] 
}) {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const hasDocuments = Boolean(documents && documents.length > 0);

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

  // Generate context-aware suggestions based on currently indexed documents
  const getSuggestions = () => {
    if (!hasDocuments) return [];
    const firstDoc = documents[0]?.filename || 'your document';
    return [
      `Summarize the key concepts and structure in "${firstDoc}".`,
      `What are the main technical conclusions and arguments in "${firstDoc}"?`,
      `Explain the specific methods or definitions detailed in the indexed files.`,
      `List key recommendations or takeaways supported by source citations.`
    ];
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-gradient-to-br from-[#F5F7F5] to-[#EBF1EC] relative overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center px-4">
            {/* Soft UI Hero Icon Box */}
            <div className="w-16 h-16 rounded-2xl bg-[#F5F8F5] shadow-[8px_8px_18px_#D0DDD2,-8px_-8px_18px_#FFFFFF] border border-[#BB8A52]/25 flex items-center justify-center text-[#FFBA00] mb-5">
              <Sparkles className="w-8 h-8 animate-pulse text-[#FFBA00] fill-[#FFBA00]/25" />
            </div>
            
            <h2 className="text-xl font-bold text-[#0C3B2E] mb-2 tracking-tight">
              ContextVault Knowledge Assistant
            </h2>
            <p className="text-sm text-[#516D56] mb-8 leading-relaxed max-w-lg font-medium">
              Query your indexed documents with grounded semantic retrieval. ContextVault extracts relevant passages from ChromaDB using cosine similarity to answer your questions with precise citations.
            </p>

            {hasDocuments ? (
              <div className="w-full space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-[#0C3B2E] mb-2 text-left font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#6D9773]" />
                  Suggested Prompts to Explore
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {getSuggestions().map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(q)}
                      className="p-3.5 rounded-xl bg-[#F2F6F3] shadow-[4px_4px_10px_#D0DDD2,-4px_-4px_10px_#FFFFFF] border border-[#BB8A52]/30 hover:border-[#6D9773] hover:shadow-[6px_6px_14px_#D0DDD2,-6px_-6px_14px_#FFFFFF] active:shadow-[inset_2px_2px_4px_#D0DDD2,inset_-2px_-2px_4px_#FFFFFF] active:scale-[0.985] text-xs text-[#0C3B2E] font-semibold transition text-left flex items-start gap-2.5 group"
                    >
                      <ChevronRight className="w-4 h-4 text-[#BB8A52] shrink-0 mt-0.5 group-hover:translate-x-0.5 group-hover:text-[#0C3B2E] transition" />
                      <span className="leading-snug">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F2F6F3] shadow-[inset_3px_3px_6px_#D0DDD2,inset_-3px_-3px_6px_#FFFFFF] border border-[#BB8A52]/30 text-xs text-[#1B3B32] max-w-md leading-relaxed font-medium">
                💡 <strong className="text-[#0C3B2E]">Getting Started:</strong> Upload a PDF, Markdown, or text document using the sidebar on the left to begin asking questions.
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0C3B2E] via-[#155A46] to-[#0C3B2E] flex items-center justify-center text-[#FFBA00] shrink-0 shadow-[3px_3px_8px_rgba(12,59,46,0.35),-2px_-2px_6px_#FFFFFF] border border-[#FFBA00]/30 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="space-y-2.5 max-w-[85%] sm:max-w-[78%]">
                <div 
                  className={`p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-[#0C3B2E] via-[#155A46] to-[#0C3B2E] text-white rounded-2xl rounded-tr-none shadow-[4px_4px_14px_rgba(12,59,46,0.3),-2px_-2px_8px_#FFFFFF] border border-[#FFBA00]/25'
                      : 'bg-[#F5F8F5] text-[#1B3B32] rounded-2xl rounded-tl-none shadow-[6px_6px_16px_#D0DDD2,-6px_-6px_16px_#FFFFFF] border border-[#BB8A52]/20 font-medium'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div className="markdown-content text-xs sm:text-sm space-y-2 leading-relaxed text-[#1B3B32]">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-[#0C3B2E]">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ inline, children, ...props }) => {
                            if (inline) {
                              return (
                                <code className="bg-[#E7EFE9] text-[#0C3B2E] font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#6D9773]/30" {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <pre className="bg-[#0C3B2E] text-[#FFBA00] p-3 rounded-xl overflow-x-auto font-mono text-xs my-2 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.4)]">
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-[#FFBA00] pl-3 my-2 italic text-[#516D56]">
                              {children}
                            </blockquote>
                          ),
                          h1: ({ children }) => <h1 className="text-base font-bold text-[#0C3B2E] mt-3 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-[#0C3B2E] mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xs font-bold text-[#0C3B2E] mt-2 mb-0.5">{children}</h3>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Citations & Source Attribution Bar */}
                {msg.sender === 'bot' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-[#516D56]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {msg.citations && msg.citations.length > 0 && (
                        <>
                          <button
                            onClick={() => onOpenCitation(msg.citations, null)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F0F5F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] hover:shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/30 text-[#0C3B2E] text-[11px] font-bold transition mr-1"
                            title="Open all retrieved citations"
                          >
                            <Bookmark className="w-3 h-3 text-[#FFBA00] fill-[#FFBA00]/40" />
                            <span>{msg.citations.length} Grounding Chunks</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 text-[#BB8A52]" />
                          </button>

                          {/* Clickable individual chunk badges */}
                          {msg.citations.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => onOpenCitation(msg.citations, c.id)}
                              className="px-2 py-0.5 rounded-lg bg-[#EAF0EB] shadow-[1.5px_1.5px_3px_#D0DDD2,-1.5px_-1.5px_3px_#FFFFFF] hover:bg-[#DCE7DE] border border-[#6D9773]/30 text-[#0C3B2E] text-[10px] font-mono font-semibold transition active:scale-95"
                              title={`Inspect Chunk #${c.id} (${c.source}${c.page ? ` p.${c.page}` : ''})`}
                            >
                              [{c.id}]
                            </button>
                          ))}
                        </>
                      )}

                      {msg.sources && msg.sources.map((s, sIdx) => (
                        <span 
                          key={sIdx}
                          className="px-2 py-0.5 rounded-lg bg-[#EAF0EB] shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#6D9773]/30 text-[#0C3B2E] text-[10px] font-mono font-semibold truncate max-w-[140px]"
                          title={s}
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.provider && (
                        <span className="text-[10px] text-[#516D56] font-mono font-medium">
                          {msg.provider}
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(msg.text, idx)}
                        className="p-1.5 rounded-lg bg-[#F0F4F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/25 text-[#516D56] hover:text-[#0C3B2E] transition"
                        title="Copy answer"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-[#0C3B2E]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-9 h-9 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 flex items-center justify-center text-[#0C3B2E] shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto items-start">
            <div className="w-9 h-9 rounded-xl bg-[#F0F4F1] shadow-[3px_3px_7px_#D0DDD2,-3px_-3px_7px_#FFFFFF] border border-[#BB8A52]/25 flex items-center justify-center text-[#0C3B2E] shrink-0">
              <Bot className="w-4 h-4 animate-spin text-[#0C3B2E]" />
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-[#F5F8F5] shadow-[6px_6px_16px_#D0DDD2,-6px_-6px_16px_#FFFFFF] border border-[#BB8A52]/25 text-xs text-[#1B3B32] space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBA00] animate-ping" />
                <span className="font-bold text-[#0C3B2E]">Executing Cosine Similarity Vector Retrieval...</span>
              </div>
              <p className="text-[11px] text-[#516D56] font-medium">
                Querying ChromaDB embedding space and synthesizing grounded answer with source citations.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[#F0F4F1] border-t border-[#BB8A52]/20 shadow-[0_-4px_14px_rgba(208,221,210,0.45)]">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2 bg-[#F2F6F3] shadow-[inset_3px_3px_6px_#D0DDD2,inset_-3px_-3px_6px_#FFFFFF] border border-[#BB8A52]/30 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#0C3B2E]/30 transition-all duration-200"
        >
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              title="Clear conversation"
              className="p-2 text-[#516D56] hover:text-[#0C3B2E] rounded-xl bg-[#F0F4F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/20 transition ml-1"
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
                ? "Ask anything about your uploaded documents..." 
                : "Upload documents in the sidebar or ask a question..."
            }
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#0C3B2E] placeholder:text-[#8AA890] focus:outline-none font-medium"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className={`p-2.5 rounded-xl font-medium text-xs flex items-center justify-center transition-all duration-200 ${
              !inputQuery.trim() || isLoading
                ? 'bg-[#E5ECE7] text-[#9CBFA9] cursor-not-allowed shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF]'
                : 'bg-gradient-to-r from-[#0C3B2E] via-[#155A46] to-[#0C3B2E] hover:from-[#114D3C] hover:to-[#175C49] text-[#FFBA00] hover:text-white shadow-[3px_3px_10px_rgba(12,59,46,0.35),-2px_-2px_6px_#FFFFFF] border border-[#FFBA00]/30 active:scale-[0.96]'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="max-w-3xl mx-auto mt-2 text-center text-[10px] text-[#516D56] font-medium">
          ContextVault provides source-grounded answers. Citations are retrieved from your session's vector store.
        </div>
      </div>
    </main>
  );
}

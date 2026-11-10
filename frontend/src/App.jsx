import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import CitationDrawer from './components/CitationDrawer';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.port === '5173' || window.location.port === '3000'
    ? 'http://127.0.0.1:8000'
    : '');

const getStoredSessionId = () => {
  let sid = localStorage.getItem('contextvault_session_id');
  if (!sid) {
    sid = 'session_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('contextvault_session_id', sid);
  }
  return sid;
};

export default function App() {
  const [sessionId] = useState(getStoredSessionId);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('contextvault_api_key') || '');
  const [config, setConfig] = useState({
    embedding_model: 'all-MiniLM-L6-v2',
    llm_provider: 'auto',
    max_upload_size_mb: 10,
    supported_formats: ['.pdf', '.md', '.txt'],
    auth_required: false,
  });

  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Citation Drawer state
  const [isCitationDrawerOpen, setIsCitationDrawerOpen] = useState(false);
  const [activeCitations, setActiveCitations] = useState([]);
  const [activeCitationId, setActiveCitationId] = useState(null);

  const getHeaders = (contentType = null) => {
    const headers = { 'X-Session-ID': sessionId };
    if (apiKey) headers['X-API-Key'] = apiKey;
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // Retain default config if offline
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/documents`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 20000);
    return () => clearInterval(interval);
  }, [apiKey]);

  const handleApiKeyChange = (newKey) => {
    setApiKey(newKey);
    localStorage.setItem('contextvault_api_key', newKey);
  };

  const handleSendMessage = async (queryText) => {
    if (!queryText.trim()) return;

    const userMessage = {
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: getHeaders('application/json'),
        body: JSON.stringify({ query: queryText, top_k: 4, session_id: sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Chat query failed (Status ${res.status})`);
      }

      const data = await res.json();
      const botMessage = {
        sender: 'bot',
        text: data.answer,
        sources: data.sources || [],
        citations: data.citations || [],
        provider: data.provider || 'RAG Engine',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `⚠️ Query Error: ${err.message}. Please check if the FastAPI backend is running.`,
          sources: [],
          citations: [],
          provider: 'System Error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCitation = (citations, targetId = null) => {
    setActiveCitations(citations || []);
    setActiveCitationId(targetId);
    setIsCitationDrawerOpen(true);
  };

  const handleCloseCitation = () => {
    setIsCitationDrawerOpen(false);
    setActiveCitationId(null);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#F5F7F5] to-[#EBF1EC] font-sans text-[#1B3B32] antialiased selection:bg-[#0C3B2E] selection:text-[#FFBA00]">
      {/* Left Sidebar for Ingestion and Document Storage */}
      <Sidebar
        documents={documents}
        onUploadSuccess={fetchDocuments}
        onResetSuccess={fetchDocuments}
        apiBaseUrl={API_BASE_URL}
        config={config}
        sessionId={sessionId}
        apiKey={apiKey}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
        <Header
          docCount={documents.length}
          isConnected={isConnected}
          onOpenDocs={fetchDocuments}
          sessionId={sessionId}
          authRequired={config.auth_required}
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
        />

        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onOpenCitation={handleOpenCitation}
          onClearChat={handleClearChat}
          documents={documents}
        />
      </div>

      {/* Slide-out Citation Drawer */}
      <CitationDrawer
        isOpen={isCitationDrawerOpen}
        onClose={handleCloseCitation}
        citations={activeCitations}
        activeCitationId={activeCitationId}
      />
    </div>
  );
}

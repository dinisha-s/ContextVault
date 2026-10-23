import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  BrainCircuit, 
  Layers, 
  Sparkles,
  FileCode,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({ 
  documents, 
  onUploadSuccess, 
  onResetSuccess,
  apiBaseUrl 
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error', message: '' }
  const [isResetting, setIsResetting] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadStatus({
        type: 'success',
        message: `Indexed ${data.chunks} chunks (${data.characters.toLocaleString()} chars) from "${data.filename}".`
      });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
      
      onUploadSuccess();
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.message || 'Error uploading file'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to clear the vector database and all indexed documents?")) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/reset`, { method: 'POST' });
      if (res.ok) {
        setUploadStatus({
          type: 'success',
          message: 'Vector database reset successfully.'
        });
        onResetSuccess();
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: 'Failed to reset vector database.'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (ext === 'md') return <FileCode className="w-4 h-4 text-sky-400" />;
    return <FileSpreadsheet className="w-4 h-4 text-amber-400" />;
  };

  return (
    <aside className="w-80 md:w-88 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-full select-none">
      {/* Top Section */}
      <div className="p-5 overflow-y-auto space-y-6">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              ContextVault
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI RAG
              </span>
            </h1>
            <p className="text-xs text-slate-400">Knowledge Assistant</p>
          </div>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              Ingest Documents
            </span>
            <span className="text-[11px] text-slate-500 font-mono">PDF, MD, TXT</span>
          </div>

          <form onSubmit={handleUpload} className="space-y-3">
            <label 
              htmlFor="file-upload-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-4 cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition group"
            >
              <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition mb-1.5" />
              <span className="text-xs font-medium text-slate-300 text-center truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : 'Choose file or drop here'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Up to 25MB</span>
              <input 
                id="file-upload-input"
                type="file" 
                accept=".pdf,.md,.txt" 
                onChange={handleFileChange}
                className="hidden" 
              />
            </label>

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition shadow-md ${
                !selectedFile || isUploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Chunking & Vectorizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Process & Index into ChromaDB
                </>
              )}
            </button>
          </form>

          {/* Upload Status Banner */}
          {uploadStatus && (
            <div 
              className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                uploadStatus.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{uploadStatus.message}</span>
            </div>
          )}
        </div>

        {/* Document Index List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Indexed Documents ({documents.length})
            </span>
            {documents.length > 0 && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                title="Wipe vector database"
                className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="text-center py-6 px-3 border border-slate-800/60 rounded-xl bg-slate-950/30 text-slate-500 text-xs">
                No documents indexed yet. Upload a PDF, Markdown, or text file above to start querying.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-800 transition group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(doc.filename)}
                    <span className="text-xs text-slate-200 truncate font-medium" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                    {doc.chunk_count} chunks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Embeddings:</span>
          <span className="text-slate-300 font-mono">all-MiniLM-L6-v2</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Vector Store:</span>
          <span className="text-indigo-400 font-semibold font-mono">ChromaDB</span>
        </div>
        <div className="pt-2 border-t border-slate-800/70 text-[10px] text-slate-500 flex justify-between">
          <span>ContextVault Workstation</span>
          <span>FastAPI + React</span>
        </div>
      </div>
    </aside>
  );
}

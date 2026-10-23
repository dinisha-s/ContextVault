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
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-500" />;
    if (ext === 'md') return <FileCode className="w-4 h-4 text-blue-600" />;
    return <FileSpreadsheet className="w-4 h-4 text-amber-600" />;
  };

  return (
    <aside className="w-80 md:w-88 bg-[#EEF2F7] border-r border-white/80 shadow-[4px_0_18px_rgba(203,213,225,0.45)] flex flex-col justify-between h-full select-none z-20">
      {/* Top Section */}
      <div className="p-5 overflow-y-auto space-y-6">
        {/* Branding with Neumorphic Floating Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-[4px_4px_12px_rgba(37,99,235,0.35),-2px_-2px_8px_#FFFFFF] text-white">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-tight flex items-center gap-1.5">
              ContextVault
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-[#EEF2F7] text-blue-600 shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/70 font-semibold">
                AI RAG
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Personal Knowledge Workstation</p>
          </div>
        </div>

        {/* Upload Card - Soft Raised Neumorphic Container */}
        <div className="rounded-2xl bg-[#EEF2F7] shadow-[6px_6px_16px_#CBD5E1,-6px_-6px_16px_#FFFFFF] border border-white/85 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Ingest Documents
            </span>
            <span className="text-[11px] text-slate-500 font-mono font-medium">PDF, MD, TXT</span>
          </div>

          <form onSubmit={handleUpload} className="space-y-3.5">
            {/* Neumorphic Inset Dropzone */}
            <label 
              htmlFor="file-upload-input"
              className="flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer bg-[#EEF2F7] shadow-[inset_3px_3px_6px_#CBD5E1,inset_-3px_-3px_6px_#FFFFFF] border border-slate-300/60 hover:border-blue-500/60 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-[#EEF2F7] shadow-[3px_3px_6px_#CBD5E1,-3px_-3px_6px_#FFFFFF] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                <UploadCloud className="w-5 h-5 text-blue-600 transition" />
              </div>
              <span className="text-xs font-semibold text-slate-700 text-center truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : 'Choose file or drop here'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium">Supports multi-format up to 25MB</span>
              <input 
                id="file-upload-input"
                type="file" 
                accept=".pdf,.md,.txt" 
                onChange={handleFileChange}
                className="hidden" 
              />
            </label>

            {/* Primary Action Button - Royal Blue Gradient with Soft Glow */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                !selectedFile || isUploading
                  ? 'bg-[#E2E8F0] text-slate-400 cursor-not-allowed shadow-[inset_2px_2px_4px_#CBD5E1,inset_-2px_-2px_4px_#FFFFFF]'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[4px_4px_14px_rgba(37,99,235,0.35),-2px_-2px_8px_#FFFFFF] active:scale-[0.985]'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
              className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                uploadStatus.type === 'success' 
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 shadow-[inset_1.5px_1.5px_3px_#A7F3D0,inset_-1.5px_-1.5px_3px_#FFFFFF]' 
                  : 'bg-rose-50/70 border-rose-300 text-rose-800 shadow-[inset_1.5px_1.5px_3px_#FECDD3,inset_-1.5px_-1.5px_3px_#FFFFFF]'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug font-medium">{uploadStatus.message}</span>
            </div>
          )}
        </div>

        {/* Document Index List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Indexed Documents ({documents.length})
            </span>
            {documents.length > 0 && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                title="Wipe vector database"
                className="px-2 py-1 rounded-lg bg-[#EEF2F7] shadow-[2px_2px_5px_#CBD5E1,-2px_-2px_5px_#FFFFFF] border border-white/80 active:shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] text-[11px] text-slate-600 hover:text-rose-600 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="text-center py-6 px-3 rounded-xl bg-[#EEF2F7] shadow-[inset_2px_2px_5px_#CBD5E1,inset_-2px_-2px_5px_#FFFFFF] border border-white/60 text-slate-500 text-xs font-medium">
                No documents indexed yet. Upload a PDF, Markdown, or text file above to start querying.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#EEF2F7] shadow-[3px_3px_8px_#CBD5E1,-3px_-3px_8px_#FFFFFF] border border-white/80 transition hover:shadow-[4px_4px_10px_#CBD5E1,-4px_-4px_10px_#FFFFFF] group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[#EEF2F7] shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF]">
                      {getFileIcon(doc.filename)}
                    </div>
                    <span className="text-xs text-slate-800 truncate font-semibold" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EEF2F7] text-blue-600 shadow-[inset_1.5px_1.5px_3px_#CBD5E1,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-white/60 font-semibold shrink-0">
                    {doc.chunk_count} chunks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="p-4 bg-[#EEF2F7] border-t border-white/80 shadow-[0_-4px_12px_rgba(203,213,225,0.3)] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <span>Embeddings:</span>
          <span className="text-slate-800 font-mono font-semibold">all-MiniLM-L6-v2</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <span>Vector Store:</span>
          <span className="text-blue-600 font-semibold font-mono">ChromaDB</span>
        </div>
        <div className="pt-2 border-t border-slate-300/60 text-[10px] text-slate-500 font-medium flex justify-between">
          <span>ContextVault Workstation</span>
          <span>FastAPI + React</span>
        </div>
      </div>
    </aside>
  );
}

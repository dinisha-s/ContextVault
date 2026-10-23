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
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-[#BB8A52]" />;
    if (ext === 'md') return <FileCode className="w-4 h-4 text-[#6D9773]" />;
    return <FileSpreadsheet className="w-4 h-4 text-[#FFBA00]" />;
  };

  return (
    <aside className="w-80 md:w-88 bg-[#F0F4F1] border-r border-[#BB8A52]/25 shadow-[4px_0_18px_rgba(208,221,210,0.45)] flex flex-col justify-between h-full select-none z-20">
      {/* Top Section */}
      <div className="p-5 overflow-y-auto space-y-6">
        {/* Branding with Deep Forest Green & Warm Amber Floating Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0C3B2E] via-[#155A46] to-[#0C3B2E] flex items-center justify-center shadow-[4px_4px_12px_rgba(12,59,46,0.35),-2px_-2px_8px_#FFFFFF] text-[#FFBA00] border border-[#FFBA00]/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#0C3B2E] tracking-tight flex items-center gap-1.5">
              ContextVault
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-[#FFBA00] text-[#0C3B2E] font-bold shadow-[1px_1px_3px_rgba(187,138,82,0.3)] border border-[#BB8A52]/30">
                AI RAG
              </span>
            </h1>
            <p className="text-xs text-[#516D56] font-medium">Personal Knowledge Workstation</p>
          </div>
        </div>

        {/* Upload Card - Soft Raised Earth-Toned Container */}
        <div className="rounded-2xl bg-[#F5F8F5] shadow-[6px_6px_16px_#D0DDD2,-6px_-6px_16px_#FFFFFF] border border-[#BB8A52]/25 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0C3B2E] flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-[#6D9773]" />
              Ingest Documents
            </span>
            <span className="text-[11px] text-[#516D56] font-mono font-medium">PDF, MD, TXT</span>
          </div>

          <form onSubmit={handleUpload} className="space-y-3.5">
            {/* Neumorphic Inset Dropzone with Bronze Accent */}
            <label 
              htmlFor="file-upload-input"
              className="flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer bg-[#F2F6F3] shadow-[inset_3px_3px_6px_#D0DDD2,inset_-3px_-3px_6px_#FFFFFF] border border-dashed border-[#BB8A52]/40 hover:border-[#0C3B2E] transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-[#F2F6F3] shadow-[3px_3px_6px_#D0DDD2,-3px_-3px_6px_#FFFFFF] border border-[#BB8A52]/25 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                <UploadCloud className="w-5 h-5 text-[#0C3B2E] transition" />
              </div>
              <span className="text-xs font-semibold text-[#0C3B2E] text-center truncate max-w-[200px]">
                {selectedFile ? selectedFile.name : 'Choose file or drop here'}
              </span>
              <span className="text-[10px] text-[#516D56] mt-0.5 font-medium">Supports multi-format up to 25MB</span>
              <input 
                id="file-upload-input"
                type="file" 
                accept=".pdf,.md,.txt" 
                onChange={handleFileChange}
                className="hidden" 
              />
            </label>

            {/* Primary Action Button - Deep Forest Green with Amber Accents */}
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                !selectedFile || isUploading
                  ? 'bg-[#E5ECE7] text-[#9CBFA9] cursor-not-allowed shadow-[inset_2px_2px_4px_#D0DDD2,inset_-2px_-2px_4px_#FFFFFF]'
                  : 'bg-gradient-to-r from-[#0C3B2E] via-[#155A46] to-[#0C3B2E] hover:from-[#114D3C] hover:to-[#175C49] text-white shadow-[4px_4px_14px_rgba(12,59,46,0.35),-2px_-2px_8px_#FFFFFF] border border-[#FFBA00]/30 active:scale-[0.985]'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-[#FFBA00] rounded-full animate-spin" />
                  Chunking & Vectorizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#FFBA00]" />
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
                  ? 'bg-[#EAF3EC] border-[#6D9773]/60 text-[#0C3B2E] shadow-[inset_1.5px_1.5px_3px_#C2D6C6,inset_-1.5px_-1.5px_3px_#FFFFFF]' 
                  : 'bg-[#FDF2F0] border-[#BB8A52]/60 text-[#8C2A1E] shadow-[inset_1.5px_1.5px_3px_#E8C6C0,inset_-1.5px_-1.5px_3px_#FFFFFF]'
              }`}
            >
              {uploadStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#6D9773] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#BB8A52] shrink-0 mt-0.5" />
              )}
              <span className="leading-snug font-medium">{uploadStatus.message}</span>
            </div>
          )}
        </div>

        {/* Document Index List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0C3B2E] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#6D9773]" />
              Indexed Documents ({documents.length})
            </span>
            {documents.length > 0 && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                title="Wipe vector database"
                className="px-2.5 py-1 rounded-lg bg-[#F0F4F1] shadow-[2px_2px_5px_#D0DDD2,-2px_-2px_5px_#FFFFFF] border border-[#BB8A52]/30 active:shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] text-[11px] text-[#BB8A52] hover:text-rose-700 font-semibold flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3 text-[#BB8A52]" />
                Clear
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="text-center py-6 px-3 rounded-xl bg-[#F2F6F3] shadow-[inset_2px_2px_5px_#D0DDD2,inset_-2px_-2px_5px_#FFFFFF] border border-[#BB8A52]/20 text-[#516D56] text-xs font-medium">
                No documents indexed yet. Upload a PDF, Markdown, or text file above to start querying.
              </div>
            ) : (
              documents.map((doc, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F5F8F5] shadow-[3px_3px_8px_#D0DDD2,-3px_-3px_8px_#FFFFFF] border border-[#BB8A52]/20 transition hover:shadow-[4px_4px_10px_#D0DDD2,-4px_-4px_10px_#FFFFFF] group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[#F0F4F1] shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#BB8A52]/20">
                      {getFileIcon(doc.filename)}
                    </div>
                    <span className="text-xs text-[#0C3B2E] truncate font-semibold" title={doc.filename}>
                      {doc.filename}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E7EFE9] text-[#0C3B2E] shadow-[inset_1.5px_1.5px_3px_#D0DDD2,inset_-1.5px_-1.5px_3px_#FFFFFF] border border-[#6D9773]/30 font-semibold shrink-0">
                    {doc.chunk_count} chunks
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="p-4 bg-[#F0F4F1] border-t border-[#BB8A52]/20 shadow-[0_-4px_12px_rgba(208,221,210,0.3)] space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[#516D56] font-medium">
          <span>Embeddings:</span>
          <span className="text-[#0C3B2E] font-mono font-semibold">all-MiniLM-L6-v2</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#516D56] font-medium">
          <span>Vector Store:</span>
          <span className="text-[#0C3B2E] font-semibold font-mono">ChromaDB</span>
        </div>
        <div className="pt-2 border-t border-[#BB8A52]/20 text-[10px] text-[#516D56] font-medium flex justify-between">
          <span>ContextVault Workstation</span>
          <span className="text-[#BB8A52] font-semibold">FastAPI + React</span>
        </div>
      </div>
    </aside>
  );
}

import React, { useState } from "react";
import { X, FileText, Play, Upload, ArrowRight, CheckCircle2 } from "lucide-react";

export function PdfUploadModal({ isOpen, onClose, onGetStarted }) {
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-box">
            <FileText className="modal-icon purple" />
            <h3>Upload PDF Documentation</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X className="icon" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Upload technical manuals, architecture papers, or internal guides to parse and embed into your isolated RAG workspace.
          </p>

          <label className="dropzone-area">
            <Upload className="dropzone-icon" />
            <span className="dropzone-title">Click or drag PDF file here</span>
            <span className="dropzone-sub">Supports .pdf up to 50MB</span>
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden-file-input"
              onChange={(e) => setSelectedFile(e.target.files[0])} 
            />
          </label>

          {selectedFile && (
            <div className="file-selected-badge">
              <CheckCircle2 className="icon" />
              <span>{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="btn-modal-submit" onClick={() => { onClose(); onGetStarted(); }} type="button">
            <span>Process & Index PDF</span>
            <ArrowRight className="btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function YoutubeUrlModal({ isOpen, onClose, onGetStarted }) {
  const [ytUrl, setYtUrl] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-box">
            <Play className="modal-icon red" />
            <h3>Add YouTube Video Transcript</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X className="icon" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Paste any YouTube video tutorial or conference talk URL to extract timestamped transcripts and search across spoken knowledge.
          </p>

          <div className="modal-input-group">
            <label>YouTube Video URL:</label>
            <input 
              type="url" 
              className="modal-text-input"
              placeholder="https://youtube.com/watch?v=..."
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-modal-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="btn-modal-submit" onClick={() => { onClose(); onGetStarted(); }} type="button">
            <span>Extract & Index Transcript</span>
            <ArrowRight className="btn-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}

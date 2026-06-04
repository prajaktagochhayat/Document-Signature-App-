import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, FileText, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

interface UploadPanelProps {
  onUploadSuccess: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const UploadPanel: React.FC<UploadPanelProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccess(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        setError('Only PDF files are allowed!');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        setError('Only PDF files are allowed!');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_URL}/docs/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(true);
      setFile(null);
      onUploadSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pastel-card rounded-3xl p-6 border border-slate-100 bg-white">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-1.5">
        Upload Document
        <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
      </h3>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-brand-400 bg-brand-50/50 scale-[1.01]'
            : file
            ? 'border-pastel-green-border bg-pastel-green-light/20'
            : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50/40'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf"
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-pastel-green-light rounded-full flex items-center justify-center border border-pastel-green-border">
              <FileText className="w-6 h-6 text-pastel-green-text" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 max-w-[200px] truncate">
                {file.name}
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center border border-brand-200">
              <Upload className="w-6 h-6 text-pastel-purple-solid" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                Drag & drop your PDF here
              </p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                or click to browse from files
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3.5 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3.5 bg-pastel-green-light border border-pastel-green-border text-pastel-green-text text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-bold">Document uploaded successfully!</span>
        </div>
      )}

      {file && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUpload();
          }}
          disabled={isLoading}
          className={`w-full mt-4 py-3 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-md shadow-brand-100 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            'Upload to Signy'
          )}
        </button>
      )}
    </div>
  );
};

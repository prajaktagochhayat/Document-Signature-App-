import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadPanel } from './UploadPanel';
import { Editor } from './Editor';
import { VisualSignEditor } from './VisualSignEditor';
import { useAuth } from '../context/AuthContext';
import { FileText, Calendar, ChevronRight, Eye, Search, CheckCircle, Clock, XCircle, Share2, Award, Info, Plus, Sparkles } from 'lucide-react';

import confetti from 'canvas-confetti';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: 'Pending' | 'Signed' | 'Rejected';
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Signed' | 'Rejected'>('All');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Upgraded sign flow states
  const [isVisualSignOpen, setIsVisualSignOpen] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [lastPromptedDocId, setLastPromptedDocId] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !requestEmail) return;
    try {
      const response = await axios.post(`${API_URL}/signatures/request`, {
        documentId: selectedDoc.id,
        signerEmail: requestEmail
      });
      setGeneratedLink(response.data.link);
      // Refetch signatures to show on list
      axios.get(`${API_URL}/signatures/${selectedDoc.id}`)
        .then((res) => setSignatures(res.data))
        .catch((err) => console.error(err));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate guest signing link');
    }
  };


  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/docs`);
      setDocuments(response.data);
      if (response.data.length > 0 && !selectedDoc) {
        // Option to select first by default
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      axios.get(`${API_URL}/signatures/${selectedDoc.id}`)
        .then((res) => setSignatures(res.data))
        .catch((err) => console.error(err));
      
      axios.get(`${API_URL}/audit/${selectedDoc.id}`)
        .then((res) => setAuditLogs(res.data))
        .catch((err) => console.error(err));
    } else {
      setSignatures([]);
      setAuditLogs([]);
    }
  }, [selectedDoc]);

  // Autoprompt download when viewing a signed document
  useEffect(() => {
    if (selectedDoc && selectedDoc.status === 'Signed' && lastPromptedDocId !== selectedDoc.id) {
      setDownloadUrl(selectedDoc.file_path);
      setShowDownloadPrompt(true);
      setLastPromptedDocId(selectedDoc.id);
    } else if (selectedDoc && selectedDoc.status !== 'Signed') {
      setLastPromptedDocId(null);
    }
  }, [selectedDoc]);

  const getPdfUrl = (filePath: string) => {
    if (filePath.startsWith('http')) {
      return filePath;
    }
    const BACKEND_BASE = API_URL.replace('/api', '');
    return `${BACKEND_BASE}${filePath}`;
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'Signed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-pastel-green-light border border-pastel-green-border text-pastel-green-text text-xs rounded-full font-bold">
            <CheckCircle className="w-3 h-3" />
            Signed
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text text-xs rounded-full font-bold">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-pastel-orange-light border border-pastel-orange-border text-pastel-orange-text text-xs rounded-full font-bold animate-pulse-pastel">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left side: Upload & Document list */}
      <div className="lg:col-span-8 space-y-6">
        {/* Upload Panel */}
        <UploadPanel onUploadSuccess={fetchDocuments} />

        {/* Search & Filters */}
        <div className="pastel-card p-6 rounded-3xl border border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 self-start sm:self-center">
              Your Documents
            </h3>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all placeholder-slate-400 text-slate-800"
              />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
            {(['All', 'Pending', 'Signed', 'Rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
                  statusFilter === status
                    ? status === 'Signed'
                      ? 'bg-pastel-green-light border-pastel-green-border text-pastel-green-text'
                      : status === 'Rejected'
                      ? 'bg-pastel-pink-light border-pastel-pink-border text-pastel-pink-text'
                      : status === 'Pending'
                      ? 'bg-pastel-orange-light border-pastel-orange-border text-pastel-orange-text'
                      : 'bg-pastel-purple-light border-pastel-purple-border text-pastel-purple-text'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {status} ({status === 'All' ? documents.length : documents.filter(d => d.status === status).length})
              </button>
            ))}
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-pastel-purple-border border-t-pastel-purple-solid rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400">Loading documents...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No documents found</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Upload your first PDF to get started!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`py-4 flex items-center justify-between cursor-pointer group transition-all rounded-2xl px-3 -mx-3 ${
                    selectedDoc?.id === doc.id
                      ? 'bg-brand-50/40 border border-brand-100/50'
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-100">
                      <FileText className="w-5 h-5 text-pastel-purple-solid" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors max-w-[200px] sm:max-w-[320px] truncate">
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {getStatusBadge(doc.status)}
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Selected Document Detail Panel */}
      <div className="lg:col-span-4">
        {selectedDoc ? (
          <div className="pastel-card p-6 rounded-3xl border border-slate-100 bg-white sticky top-24 space-y-6">
            <div>
              <span className="text-xs font-bold text-brand-500 uppercase tracking-wider pl-0.5">
                Document Details
              </span>
              <h3 className="text-base font-extrabold text-slate-800 mt-1 break-words">
                {selectedDoc.name}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Uploaded: {new Date(selectedDoc.created_at).toLocaleString()}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              {selectedDoc.status === 'Signed' ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={getPdfUrl(selectedDoc.file_path)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-pastel-green-solid hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.97] text-center"
                  >
                    <Award className="w-4 h-4" />
                    Download PDF
                  </a>
                  <button
                    onClick={() => {
                      setIsVisualSignOpen(true);
                    }}
                    className="py-2.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.97] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Re-sign PDF
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setIsVisualSignOpen(true);
                    }}
                    className="py-2.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.97] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Sign PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowRequestForm(!showRequestForm);
                      setGeneratedLink('');
                      setRequestEmail('');
                    }}
                    className="py-2.5 px-3 bg-pastel-purple-light border border-pastel-purple-border text-pastel-purple-text hover:bg-brand-50 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    Request Sign
                  </button>
                  
                  {/* Keep old buttons for advanced placement */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="col-span-2 py-2 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    Advanced: Place Coordinates
                  </button>
                </div>
              )}
            </div>

            {/* Request Signature Form overlay-in-sidebar */}
            {showRequestForm && selectedDoc && selectedDoc.status !== 'Signed' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 animate-pulse-pastel [animation-duration:5s]">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider pl-0.5">
                    Request External Signature
                  </span>
                  <button
                    onClick={() => {
                      setShowRequestForm(false);
                      setGeneratedLink('');
                      setRequestEmail('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Close
                  </button>
                </div>

                {!generatedLink ? (
                  <form onSubmit={handleRequestSignature} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase pl-0.5">
                        Signer's Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-200 text-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Generate Signing Link
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500 font-semibold pl-0.5">
                      Guest signature link generated successfully! You can send this link to the signer:
                    </p>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        readOnly
                        value={generatedLink}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-medium text-slate-500 truncate"
                      />
                      <button
                        onClick={handleCopyLink}
                        type="button"
                        className="px-3 bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-bold rounded-xl hover:bg-brand-100 transition-all flex items-center justify-center"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Status Info */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Signing Status</span>
              {getStatusBadge(selectedDoc.status)}
            </div>

            {/* Signature Requests Panel */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 block px-1">
                Signature Placeholders ({signatures.length})
              </span>
              {signatures.length === 0 ? (
                <p className="text-xs text-slate-400 pl-1 font-semibold">
                  No signature fields placed on this document yet. Click "Sign Document" to place placeholders.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {signatures.map((sig: any) => (
                    <div key={sig.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="font-bold text-slate-600 truncate max-w-[120px]">{sig.signer_email}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 border text-[10px] rounded-full font-bold ${
                          sig.status === 'Signed'
                            ? 'bg-pastel-green-light border-pastel-green-border text-pastel-green-text'
                            : sig.status === 'Rejected'
                            ? 'bg-pastel-pink-light border-pastel-pink-border text-pastel-pink-text'
                            : 'bg-pastel-orange-light border-pastel-orange-border text-pastel-orange-text animate-pulse-pastel'
                        }`}>
                          Pg {sig.page} ({sig.status})
                        </span>
                        {sig.status === 'Pending' && (
                          <button
                            onClick={async () => {
                              try {
                                const response = await axios.post(`${API_URL}/signatures/request`, { signatureId: sig.id });
                                navigator.clipboard.writeText(response.data.link);
                                alert(`Link copied for ${sig.signer_email}!`);
                              } catch (err) {
                                alert('Failed to generate link');
                              }
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-brand-500 cursor-pointer"
                            title="Copy Guest Sign Link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PDF Preview Frame */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  PDF Preview
                </span>
                <a
                  href={getPdfUrl(selectedDoc.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-pastel-purple-text hover:underline"
                >
                  Open in New Tab
                </a>
              </div>
              <div className="w-full h-[480px] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative group">
                <iframe
                  src={`${getPdfUrl(selectedDoc.file_path)}#toolbar=0`}
                  title="PDF Preview"
                  className="w-full h-full border-none"
                />
                {/* Overlay to prevent interaction inside card preview */}
                <div className="absolute inset-0 bg-transparent pointer-events-none border-2 border-transparent group-hover:border-brand-200 transition-all rounded-2xl"></div>
              </div>
            </div>

            {/* Audit Trail - Day 10 */}
            <div className="p-4 bg-pastel-purple-light/20 border border-pastel-purple-border/30 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-pastel-purple-text flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Audit Trail & History ({auditLogs.length})
              </h4>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 font-semibold pl-1">No log entries found.</p>
              ) : (
                <div className="space-y-3 max-h-40 overflow-y-auto pr-1 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l border-brand-200">
                      <div className="absolute w-2 h-2 bg-brand-400 rounded-full -left-[5px] top-1"></div>
                      <div className="font-bold text-slate-700 leading-tight">
                        {log.action}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {log.user_email} • {log.ip_address}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="pastel-card p-8 rounded-3xl border border-slate-100 bg-white sticky top-24 text-center text-slate-400 py-16">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <Eye className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-800">No document selected</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              Click on a document from the list to view preview and signing links.
            </p>
          </div>
        )}
      </div>

      {/* Editor Modal Integration */}
      {isEditing && selectedDoc && (
        <Editor
          documentId={selectedDoc.id}
          documentName={selectedDoc.name}
          pdfUrl={getPdfUrl(selectedDoc.file_path)}
          onClose={() => setIsEditing(false)}
          onSaveSuccess={() => {
            fetchDocuments();
            // Refetch signatures
            axios.get(`${API_URL}/signatures/${selectedDoc.id}`)
              .then((res) => setSignatures(res.data))
              .catch((err) => console.error(err));
          }}
        />
      )}

      {/* Visual Self-Signing Editor */}
      {isVisualSignOpen && selectedDoc && (
        <VisualSignEditor
          documentId={selectedDoc.id}
          documentName={selectedDoc.name}
          pdfUrl={getPdfUrl(selectedDoc.file_path)}
          isSelfSign={true}
          defaultSignerName={user?.name || ''}
          onClose={() => setIsVisualSignOpen(false)}
          onSignSuccess={(signedUrl) => {
            setIsVisualSignOpen(false);
            setDownloadUrl(signedUrl);
            setShowDownloadPrompt(true);
            fetchDocuments();
            try {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch (e) {
              console.error('Confetti failed to run', e);
            }
          }}
        />
      )}

      {/* Download Signed PDF Prompt Modal */}
      {showDownloadPrompt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl flex flex-col items-center text-center gap-5 animate-float [animation-duration:8s]">
            <div className="w-16 h-16 bg-pastel-green-light rounded-full flex items-center justify-center border border-pastel-green-border animate-bounce">
              <CheckCircle className="w-9 h-9 text-pastel-green-solid" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-1.5 font-sans">
                Document Signed!
                <Sparkles className="w-5 h-5 text-pastel-orange-solid animate-pulse-pastel" />
              </h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                The signature has been successfully compiled and embedded into your document. Would you like to download the signed PDF?
              </p>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowDownloadPrompt(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-2xl transition-all cursor-pointer border border-slate-200"
              >
                Maybe Later
              </button>
              
              <a
                href={getPdfUrl(downloadUrl)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowDownloadPrompt(false)}
                className="flex-1 py-3 bg-pastel-green-solid hover:bg-emerald-600 text-white text-xs font-bold rounded-2xl transition-all shadow-md active:scale-[0.97] text-center"
              >
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

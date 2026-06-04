import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadPanel } from './UploadPanel';
import { FileText, Calendar, ChevronRight, Eye, Trash2, Search, CheckCircle, Clock, XCircle, Share2, Award, Info, FileSpreadsheet } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  file_path: string;
  status: 'Pending' | 'Signed' | 'Rejected';
  created_at: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Signed' | 'Rejected'>('All');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);

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
    } else {
      setSignatures([]);
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  // Direct edit / sign action placeholder for Day 6
                  alert('Editor functionality will be added on Day 6!');
                }}
                className="py-2.5 px-3 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-[0.97] cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Sign Document
              </button>
              <button
                onClick={() => {
                  // Sharing placeholder for Day 9
                  alert('Sharing links functionality will be added on Day 9!');
                }}
                className="py-2.5 px-3 bg-pastel-purple-light border border-pastel-purple-border text-pastel-purple-text hover:bg-brand-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>

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
                      <span className="font-bold text-slate-600 truncate max-w-[150px]">{sig.signer_email}</span>
                      <span className={`px-2 py-0.5 border text-[10px] rounded-full font-bold ${
                        sig.status === 'Signed'
                          ? 'bg-pastel-green-light border-pastel-green-border text-pastel-green-text'
                          : sig.status === 'Rejected'
                          ? 'bg-pastel-pink-light border-pastel-pink-border text-pastel-pink-text'
                          : 'bg-pastel-orange-light border-pastel-orange-border text-pastel-orange-text animate-pulse-pastel'
                      }`}>
                        Pg {sig.page} ({sig.status})
                      </span>
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
              <div className="w-full h-64 bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative group">
                <iframe
                  src={`${getPdfUrl(selectedDoc.file_path)}#toolbar=0`}
                  title="PDF Preview"
                  className="w-full h-full border-none"
                />
                {/* Overlay to prevent interaction inside card preview */}
                <div className="absolute inset-0 bg-transparent pointer-events-none border-2 border-transparent group-hover:border-brand-200 transition-all rounded-2xl"></div>
              </div>
            </div>

            {/* Placeholder for Audit Trail - Day 10 */}
            <div className="p-4 bg-pastel-purple-light/20 border border-pastel-purple-border/30 rounded-2xl">
              <h4 className="text-xs font-bold text-pastel-purple-text flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Audit Trail & History
              </h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Timeline logs and IP audits will be displayed here in Day 10.
              </p>
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
    </div>
  );
};

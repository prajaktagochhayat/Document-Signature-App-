import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, ArrowRight, Sparkles, Mail, Info, Plus, Move } from 'lucide-react';

interface EditorProps {
  documentId: string;
  documentName: string;
  pdfUrl: string;
  onClose: () => void;
  onSaveSuccess: () => void;
}

interface Placeholder {
  id: string;
  x: number; // percentage
  y: number; // percentage
  page: number;
  signerEmail: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PDFIframe = React.memo(({ url }: { url: string }) => {
  return (
    <iframe
      src={`${url}#toolbar=0`}
      title="PDF Canvas View"
      className="w-full h-full border-none pointer-events-none opacity-80"
    />
  );
});

export const Editor: React.FC<EditorProps> = ({
  documentId,
  documentName,
  pdfUrl,
  onClose,
  onSaveSuccess,
}) => {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/docs/${documentId}/dimensions`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => {
      setDimensions(res.data);
    })
    .catch((err) => {
      console.error('Failed to get dimensions in editor', err);
      setDimensions({ width: 612, height: 792 }); // default portrait Letter fallback
    });
  }, [documentId]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleAddPlaceholder = () => {
    const newId = `new_${Date.now()}`;
    const newPlaceholder: Placeholder = {
      id: newId,
      x: 40, // center it
      y: 40,
      page: 1,
      signerEmail: '',
    };
    setPlaceholders([...placeholders, newPlaceholder]);
    setSelectedId(newId);
    setError(null);
  };

  const handleRemovePlaceholder = (id: string) => {
    setPlaceholders(placeholders.filter((p) => p.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleEmailChange = (id: string, email: string) => {
    setPlaceholders(
      placeholders.map((p) => (p.id === id ? { ...p, signerEmail: email } : p))
    );
  };

  // Dragging event handlers
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedId(id);
    isDraggingRef.current = true;

    const placeholderIndex = placeholders.findIndex((p) => p.id === id);
    if (placeholderIndex === -1) return;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate relative coordinates in percentage
      let newX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      let newY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Clamping coordinates inside bounds (accounting for placeholder size roughly 30% x 8%)
      newX = Math.max(0, Math.min(newX, 70));
      newY = Math.max(0, Math.min(newY, 92));

      setPlaceholders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, x: newX, y: newY } : p))
      );
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSave = async () => {
    setError(null);
    
    // Validations
    if (placeholders.length === 0) {
      setError('Please add at least one signature placeholder.');
      return;
    }

    for (const p of placeholders) {
      if (!p.signerEmail) {
        setError('Please specify a signer email for all placeholders.');
        setSelectedId(p.id);
        return;
      }
      if (!/\S+@\S+\.\S+/.test(p.signerEmail)) {
        setError(`"${p.signerEmail}" is not a valid email address.`);
        setSelectedId(p.id);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Save each signature placeholder
      for (const p of placeholders) {
        await axios.post(`${API_URL}/signatures`, {
          documentId,
          x: p.x,
          y: p.y,
          page: p.page,
          signerEmail: p.signerEmail,
        });
      }
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to save placeholders.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPlaceholder = placeholders.find((p) => p.id === selectedId) || null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-float [animation-duration:10s]">
        
        {/* Editor Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              Place Signature Fields
              <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
            </h3>
            <p className="text-xs text-slate-400 font-semibold truncate max-w-[300px] sm:max-w-md">
              Position markers for signers on: {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Main Viewport Container */}
          <div className="flex-1 bg-slate-50/50 p-6 overflow-y-auto flex justify-center items-start min-h-0">
            <div className="relative w-full max-w-lg space-y-4">
              <div className="p-3 bg-pastel-purple-light/50 border border-pastel-purple-border text-pastel-purple-text rounded-2xl text-[11px] font-bold flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  Add signature placeholders from the right. Click and drag the markers inside the page canvas to position them.
                </span>
              </div>

              {/* PDF Container Wrapper */}
              <div
                ref={containerRef}
                style={dimensions ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` } : {}}
                className={`relative w-full bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden select-none ${
                  dimensions ? 'h-auto' : 'h-[550px]'
                }`}
              >
                {/* Embed PDF inside background */}
                <PDFIframe url={pdfUrl} />

                {/* Overlaid placeholders */}
                {placeholders.map((sig) => (
                  <div
                    key={sig.id}
                    onMouseDown={(e) => handleMouseDown(sig.id, e)}
                    style={{
                      left: `${sig.x}%`,
                      top: `${sig.y}%`,
                    }}
                    className={`absolute w-[150px] p-2 bg-pastel-purple-light/95 border-2 rounded-xl shadow-md cursor-move flex flex-col gap-1 z-10 transition-shadow select-none ${
                      selectedId === sig.id
                        ? 'border-pastel-purple-solid ring-2 ring-pastel-purple-light'
                        : 'border-pastel-purple-border hover:border-pastel-purple-solid'
                    }`}
                  >
                    <div className="flex justify-between items-center border-b border-pastel-purple-border/30 pb-1">
                      <span className="text-[9px] font-bold text-pastel-purple-text flex items-center gap-0.5 uppercase tracking-wider">
                        <Move className="w-2.5 h-2.5" />
                        Signature Field
                      </span>
                      <button
                        onMouseDown={(e) => e.stopPropagation()} // don't trigger drag
                        onClick={() => handleRemovePlaceholder(sig.id)}
                        className="text-slate-400 hover:text-pastel-pink-text text-[9px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="truncate text-[10px] font-bold text-slate-700 h-4 pl-0.5">
                      {sig.signerEmail || 'Set email...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-between flex-shrink-0 min-h-0 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Fields & Signers</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Set who needs to sign and where.
                </p>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddPlaceholder}
                className="w-full py-2.5 px-4 bg-brand-50 border border-brand-200 text-pastel-purple-text hover:bg-brand-100/70 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Signature Block
              </button>

              {/* Active Placeholder Config Form */}
              {selectedPlaceholder ? (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                      Edit Selected Block
                    </span>
                    <span className="px-2 py-0.5 bg-brand-200 text-brand-700 text-[9px] rounded-full font-bold">
                      Pg {selectedPlaceholder.page}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                      Signer Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Mail className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="email"
                        value={selectedPlaceholder.signerEmail}
                        onChange={(e) => handleEmailChange(selectedPlaceholder.id, e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-200 transition-all text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="text-[9px] font-semibold text-slate-400 leading-normal pl-0.5">
                    Position coordinates:<br />
                    X: {selectedPlaceholder.x.toFixed(1)}% | Y: {selectedPlaceholder.y.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  Select a placed signature marker on the canvas to configure the signer's email.
                </div>
              )}

              {error && (
                <div className="p-3 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text text-xs rounded-xl flex items-center gap-1.5">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}
            </div>

            {/* Save Actions */}
            <div className="pt-6 border-t border-slate-100 flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || placeholders.length === 0}
                className={`flex-1 py-2.5 px-4 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-2xl shadow-md shadow-brand-100 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSaving || placeholders.length === 0 ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Save Fields</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

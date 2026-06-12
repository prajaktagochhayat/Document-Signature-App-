import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, Sparkles, Info, Move, Award, Plus, Edit } from 'lucide-react';
import { SignatureCreator } from './SignatureCreator';
import confetti from 'canvas-confetti';

interface VisualSignEditorProps {
  documentId: string;
  documentName: string;
  pdfUrl: string;
  onClose: () => void;
  onSignSuccess: (pdfUrl: string) => void;
  isSelfSign: boolean;
  token?: string; // guest token
  defaultSignerName?: string;
  defaultDimensions?: { width: number; height: number };
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PDFIframe = React.memo(({ url }: { url: string }) => {
  return (
    <iframe
      src={`${url}#toolbar=0`}
      title="PDF Canvas View"
      className="w-full h-full border-none pointer-events-none opacity-85"
    />
  );
});

export const VisualSignEditor: React.FC<VisualSignEditorProps> = ({
  documentId,
  documentName,
  pdfUrl,
  onClose,
  onSignSuccess,
  isSelfSign,
  token,
  defaultSignerName = '',
  defaultDimensions
}) => {
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(defaultDimensions || null);

  useEffect(() => {
    if (!dimensions && isSelfSign) {
      const tokenLocal = localStorage.getItem('token');
      axios.get(`${API_URL}/docs/${documentId}/dimensions`, {
        headers: { Authorization: `Bearer ${tokenLocal}` }
      })
      .then((res) => {
        setDimensions(res.data);
      })
      .catch((err) => {
        console.error('Failed to get dimensions', err);
        setDimensions({ width: 612, height: 792 }); // default portrait Letter fallback
      });
    }
  }, [documentId, isSelfSign, dimensions]);
  const [x, setX] = useState(40); // default position (center)
  const [y, setY] = useState(70); // default position (bottom)
  const [page, setPage] = useState(1);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate relative coordinates in percentage
      let newX = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      let newY = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Clamp coordinates inside bounds (accounting for signature block size roughly 25% x 7%)
      newX = Math.max(0, Math.min(newX, 75));
      newY = Math.max(0, Math.min(newY, 93));

      setX(newX);
      setY(newY);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSaveSignature = (base64Image: string) => {
    setSignatureImage(base64Image);
    setShowCreator(false);
    setError(null);
  };

  const handleFinalizeSign = async () => {
    if (!signatureImage) {
      setError('Please create your signature first.');
      return;
    }

    setIsSigning(true);
    setError(null);

    try {
      if (isSelfSign) {
        // Self-signing call
        const response = await axios.post(`${API_URL}/signatures/self-sign`, {
          documentId,
          signatureImageBase64: signatureImage,
          x,
          y,
          page
        });
        
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        onSignSuccess(response.data.pdfUrl);
      } else {
        // Guest signing call
        const response = await axios.post(`${API_URL}/signatures/guest-sign/${token}`, {
          status: 'Signed',
          signatureImageBase64: signatureImage,
          x,
          y,
          page
        });

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        onSignSuccess(response.data.pdfUrl);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to compile and sign PDF document.');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-float [animation-duration:10s]">
        
        {/* Editor Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5 font-sans">
              {isSelfSign ? 'Sign Your Document' : 'Place Your Guest Signature'}
              <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
            </h3>
            <p className="text-xs text-slate-400 font-semibold truncate max-w-[300px] sm:max-w-md">
              PDF Document: {documentName}
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
              <div className="p-3.5 bg-pastel-purple-light/50 border border-pastel-purple-border text-pastel-purple-text rounded-2xl text-[11px] font-bold flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>
                  Create your signature from the sidebar. Then, drag and drop the signature block onto the PDF canvas page to place it free-hand.
                </span>
              </div>

              {/* PDF Container Wrapper */}
              <div
                ref={containerRef}
                style={dimensions ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` } : {}}
                className={`relative w-full bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden select-none ${
                  dimensions ? 'h-auto' : 'h-[520px]'
                }`}
              >
                {/* Embed PDF inside background */}
                <PDFIframe url={pdfUrl} />

                {/* Overlaid draggable signature block */}
                {signatureImage && (
                  <div
                    onMouseDown={handleMouseDown}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    className="absolute w-[140px] h-[55px] bg-white/95 border-2 border-brand-400 rounded-xl shadow-lg cursor-move flex items-center justify-center p-1.5 z-10 transition-shadow select-none group border-dashed"
                    title="Drag to place signature"
                  >
                    <img
                      src={signatureImage}
                      alt="Signature Overlay"
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center shadow text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      <Move className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-between flex-shrink-0 min-h-0 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Your Signature</h4>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Create and place your signature.
                </p>
              </div>

              {/* Signature Preview / Add Button */}
              {signatureImage ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 text-center flex flex-col items-center">
                  <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                    Signature Preview
                  </span>
                  
                  <div className="h-20 w-full border border-slate-200 bg-white rounded-xl flex items-center justify-center p-2 relative">
                    <img src={signatureImage} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                  </div>

                  <button
                    onClick={() => setShowCreator(true)}
                    className="py-1.5 px-3 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-xl flex items-center gap-1 transition-all cursor-pointer bg-white border border-slate-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Change Signature
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreator(true)}
                  className="w-full py-5 bg-brand-50 hover:bg-brand-100/70 border-2 border-dashed border-brand-200 text-pastel-purple-text text-xs font-bold rounded-2xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-6 h-6 text-brand-400" />
                  Create Signature
                </button>
              )}

              {/* Coordinates & Page settings */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Signature Options
                </span>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                    Sign on PDF Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={page}
                    onChange={(e) => setPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="text-[9px] font-semibold text-slate-400 leading-normal pl-0.5">
                  Relative coordinates:<br />
                  X: {x.toFixed(1)}% | Y: {y.toFixed(1)}%
                </div>
              </div>

              {error && (
                <div className="p-3 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text text-xs rounded-xl flex items-center gap-1.5">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span className="font-bold">{error}</span>
                </div>
              )}
            </div>

            {/* Final Action Buttons */}
            <div className="pt-6 border-t border-slate-100 flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeSign}
                disabled={isSigning || !signatureImage}
                className={`flex-1 py-2.5 px-4 bg-pastel-green-solid hover:bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSigning || !signatureImage ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSigning ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Award className="w-4 h-4" />
                    <span>Sign PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Signature Creator Modal Overlay */}
      {showCreator && (
        <SignatureCreator
          defaultName={defaultSignerName}
          onSave={handleSaveSignature}
          onClose={() => setShowCreator(false)}
        />
      )}
    </div>
  );
};

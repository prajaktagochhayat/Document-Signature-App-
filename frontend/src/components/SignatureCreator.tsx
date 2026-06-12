import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Trash2, Check, X, Type, Edit3 } from 'lucide-react';

interface SignatureCreatorProps {
  onSave: (base64Image: string) => void;
  onClose: () => void;
  defaultName?: string;
}

const FONTS = [
  { name: 'Pacifico', family: "'Pacifico', cursive" },
  { name: 'Great Vibes', family: "'Great Vibes', cursive" },
  { name: 'Caveat', family: "'Caveat', cursive" },
  { name: 'Satisfy', family: "'Satisfy', cursive" },
  { name: 'Dancing Script', family: "'Dancing Script', cursive" },
  { name: 'Parisienne', family: "'Parisienne', cursive" }
];

export const SignatureCreator: React.FC<SignatureCreatorProps> = ({
  onSave,
  onClose,
  defaultName = ''
}) => {
  const [activeTab, setActiveTab] = useState<'type' | 'draw'>('type');
  const [typedName, setTypedName] = useState(defaultName);
  const [selectedFont, setSelectedFont] = useState(0);

  // Drawing States
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (activeTab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = '#000000'; // Black
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [activeTab]);

  // Canvas drawing handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  // Generate image
  const handleApply = () => {
    if (activeTab === 'type') {
      if (!typedName.trim()) return;

      // Draw text on hidden canvas to convert to PNG
      const hiddenCanvas = document.createElement('canvas');
      hiddenCanvas.width = 440;
      hiddenCanvas.height = 140;
      const ctx = hiddenCanvas.getContext('2d');
      if (!ctx) return;

      // Draw transparent background
      ctx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);

      // Setup cursive font
      const fontObj = FONTS[selectedFont];
      ctx.font = `italic 36px ${fontObj.name}, cursive`;
      ctx.fillStyle = '#000000'; // black color for signature
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, hiddenCanvas.width / 2, hiddenCanvas.height / 2);

      const base64Image = hiddenCanvas.toDataURL('image/png');
      onSave(base64Image);
    } else {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      const base64Image = canvas.toDataURL('image/png');
      onSave(base64Image);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-100 shadow-2xl flex flex-col gap-5 animate-float [animation-duration:8s]">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
              Create Your Signature
              <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
            </h3>
            <p className="text-xs text-slate-400 font-semibold">
              Choose to type your name or draw it free-hand.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'type'
                ? 'bg-white text-pastel-purple-text shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Type className="w-4 h-4" />
            Type Name
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'draw'
                ? 'bg-white text-pastel-purple-text shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Draw Freehand
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[220px] flex flex-col">
          {activeTab === 'type' ? (
            <div className="space-y-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                  Type Your Name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Alice Cooper"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-200 transition-all text-slate-800"
                />
              </div>

              {/* Font Selector Grid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                  Choose Typography Style
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {FONTS.map((font, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedFont(idx)}
                      style={{ fontFamily: font.family }}
                      className={`h-14 flex items-center justify-center text-lg bg-slate-50 border rounded-2xl p-2 text-slate-800 transition-all text-center select-none truncate cursor-pointer ${
                        selectedFont === idx
                          ? 'border-brand-500 bg-brand-50/30 ring-2 ring-brand-100'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {typedName.trim() || 'Signature'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {/* Canvas Area */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 relative h-[180px] flex justify-center items-center">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none bg-transparent"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-semibold select-none">
                    Draw your signature here...
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={handleClear}
                className="self-start px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Drawing
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-100 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={activeTab === 'type' ? !typedName.trim() : !hasDrawn}
            className={`px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-2xl flex items-center gap-1 transition-all cursor-pointer ${
              (activeTab === 'type' ? !typedName.trim() : !hasDrawn) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Check className="w-4 h-4" />
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
};

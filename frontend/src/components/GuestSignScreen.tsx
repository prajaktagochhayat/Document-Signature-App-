import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Award, XCircle, Sparkles, Feather, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

interface GuestSignScreenProps {
  token: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const GuestSignScreen: React.FC<GuestSignScreenProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docDetails, setDocDetails] = useState<any>(null);
  const [signatureDetails, setSignatureDetails] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPad, setShowPad] = useState(false);

  const verifyToken = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/signatures/verify/${token}`);
      setDocDetails(response.data.document);
      setSignatureDetails(response.data.signature);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid or expired signature link.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyToken();
  }, [token]);

  const handleSign = async (base64Image: string) => {
    setShowPad(false);
    setSigning(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/signatures/guest-sign/${token}`, {
        status: 'Signed',
        signatureImageBase64: base64Image
      });
      setSuccess('Document signed successfully!');
      setDocDetails((prev: any) => ({ ...prev, status: 'Signed' }));
      setSignatureDetails((prev: any) => ({ ...prev, status: 'Signed' }));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to sign document.');
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setSigning(true);
    setError(null);
    try {
      await axios.post(`${API_URL}/signatures/guest-sign/${token}`, {
        status: 'Rejected',
        reason: rejectReason
      });
      setSuccess('Signature request rejected.');
      setIsRejected(true);
      setDocDetails((prev: any) => ({ ...prev, status: 'Rejected' }));
      setSignatureDetails((prev: any) => ({ ...prev, status: 'Rejected' }));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to reject signature.');
    } finally {
      setSigning(false);
    }
  };

  const getPdfUrl = (filePath: string) => {
    if (filePath.startsWith('http')) {
      return filePath;
    }
    const BACKEND_BASE = API_URL.replace('/api', '');
    return `${BACKEND_BASE}${filePath}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pastel-purple-border border-t-pastel-purple-solid rounded-full animate-spin"></div>
          <p className="text-slate-400 font-semibold text-sm animate-pulse-pastel">
            Verifying signature request...
          </p>
        </div>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="pastel-card p-8 rounded-3xl max-w-md w-full text-center border-2 border-pastel-pink-border bg-white flex flex-col items-center">
          <div className="w-14 h-14 bg-pastel-pink-light rounded-full flex items-center justify-center mb-4 border border-pastel-pink-border">
            <ShieldAlert className="w-7 h-7 text-pastel-pink-solid" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Invalid</h2>
          <p className="text-slate-500 text-sm font-medium mb-6">
            {error}
          </p>
          <p className="text-xs text-slate-400 font-semibold leading-relaxed">
            Please ask the document owner to send you a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Brand Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-200">
            <Feather className="w-5 h-5 text-pastel-purple-solid" />
          </div>
          <span className="text-2xl font-black text-brand-600 tracking-tight flex items-center gap-0.5">
            Signy
            <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
          </span>
        </div>
        <div className="px-3.5 py-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs rounded-full font-bold">
          Guest Access
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PDF Document Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div className="pastel-card p-4 rounded-3xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Document Document Preview
              </span>
              {docDetails && (
                <a
                  href={getPdfUrl(docDetails.file_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-pastel-purple-text hover:underline"
                >
                  Open PDF in New Tab
                </a>
              )}
            </div>

            {docDetails && (
              <div className="w-full h-[650px] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative">
                <iframe
                  src={`${getPdfUrl(docDetails.file_path)}#toolbar=0`}
                  title="Guest Preview"
                  className="w-full h-full border-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Signing Controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="pastel-card p-6 rounded-3xl border border-slate-100 bg-white sticky top-24 space-y-6">
            
            {success ? (
              <div className="text-center py-6 space-y-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
                  isRejected 
                    ? 'bg-pastel-pink-light border-pastel-pink-border text-pastel-pink-solid' 
                    : 'bg-pastel-green-light border-pastel-green-border text-pastel-green-solid animate-bounce'
                }`}>
                  {isRejected ? <XCircle className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isRejected ? 'Declined' : 'Success!'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {isRejected 
                    ? 'You have rejected this signature request. The owner has been notified.' 
                    : 'Your signature has been embedded into the document successfully!'}
                </p>
                <div className="pt-2 text-[10px] text-slate-400 font-bold">
                  You can now close this browser tab.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-xs font-bold text-brand-500 uppercase tracking-wider pl-0.5">
                    Signature Request
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 mt-1">
                    {docDetails?.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Requested for: <span className="text-slate-600 font-bold">{signatureDetails?.signer_email}</span>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Document Status</span>
                    <span className="capitalize">{docDetails?.status}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Your Field Position</span>
                    <span>Page {signatureDetails?.page} (X: {signatureDetails?.x.toFixed(0)}%, Y: {signatureDetails?.y.toFixed(0)}%)</span>
                  </div>
                </div>

                {/* Main Guest Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPad(true)}
                    disabled={signing || signatureDetails?.status !== 'Pending'}
                    className={`w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-md shadow-brand-100 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      signing || signatureDetails?.status !== 'Pending' ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {signing ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        Accept & Sign Document
                      </>
                    )}
                  </button>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5 mb-1">
                      Reason for Rejection (Required to Decline)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Layout is wrong / wrong amount..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-pastel-pink-border transition-all text-slate-800 placeholder-slate-400"
                      rows={3}
                    />
                  </div>

                  <button
                    onClick={handleReject}
                    disabled={signing || !rejectReason || signatureDetails?.status !== 'Pending'}
                    className={`w-full py-2.5 px-4 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text hover:bg-rose-100 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      signing || !rejectReason || signatureDetails?.status !== 'Pending'
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Decline Signature
                  </button>
                </div>
              </>
            )}

            <div className="p-4 bg-pastel-purple-light/20 border border-pastel-purple-border/30 rounded-2xl">
              <h4 className="text-[10px] font-bold text-pastel-purple-text flex items-center gap-1 uppercase tracking-wider">
                🔒 Secure Signing
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1">
                Your interaction IP address, timestamp, and user-agent will be logged in the audit trail to verify your identity.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Signature Pad Modal Overlay */}
      {showPad && (
        <SignaturePad
          onSave={handleSign}
          onClose={() => setShowPad(false)}
        />
      )}
    </div>
  );
};

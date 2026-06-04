import React from 'react';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { LogOut, User, Feather, Sparkles } from 'lucide-react';

function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pastel-purple-border border-t-pastel-purple-solid rounded-full animate-spin"></div>
          <p className="text-slate-400 font-semibold text-sm animate-pulse-pastel">
            Loading Signy...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Dashboard layout for logged in users
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Cute Pastel Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 border-b border-slate-100 px-6 py-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center border border-brand-200">
            <Feather className="w-5 h-5 text-pastel-purple-solid" />
          </div>
          <span className="text-2xl font-black text-brand-600 tracking-tight flex items-center gap-0.5">
            Signy
            <Sparkles className="w-4 h-4 text-pastel-orange-solid animate-pulse-pastel" />
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-pastel-purple-light border border-pastel-purple-border text-pastel-purple-text rounded-2xl text-sm font-bold">
            <User className="w-4 h-4 text-pastel-purple-solid" />
            <span>Hi, {user.name}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-pastel-pink-text hover:bg-pastel-pink-light border border-slate-200 hover:border-pastel-pink-border rounded-2xl transition-all cursor-pointer bg-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Workspace Placeholder for Day 2 */}
      <main className="flex-1 p-8 flex flex-col items-center justify-center">
        <div className="pastel-card p-10 rounded-3xl max-w-md w-full text-center border-2 border-brand-100 flex flex-col items-center bg-white">
          <div className="w-14 h-14 bg-pastel-green-light rounded-full flex items-center justify-center mb-4 border border-pastel-green-border">
            <span className="text-2xl">✨</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Auth Active!</h2>
          <p className="text-slate-400 text-sm font-medium mb-4">
            You have successfully authenticated as <span className="text-brand-500 font-bold">{user.email}</span>.
          </p>
          <div className="px-4 py-2 bg-pastel-green-light border border-pastel-green-border text-pastel-green-text text-xs rounded-2xl font-extrabold animate-pulse-pastel">
            Ready for Day 3: File Upload API
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

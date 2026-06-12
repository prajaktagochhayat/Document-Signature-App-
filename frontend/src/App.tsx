import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { GuestSignScreen } from './components/GuestSignScreen';
import { LogOut, User, Feather, Sparkles } from 'lucide-react';

function App() {
  const { user, loading, logout } = useAuth();

  // Simple Router for Public Sign Links
  const path = window.location.pathname;
  const isSignLink = path.startsWith('/sign/');
  const signToken = isSignLink ? path.split('/sign/')[1] : null;

  if (isSignLink && signToken) {
    return <GuestSignScreen token={signToken} />;
  }

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

      {/* Dashboard Workspace */}
      <main className="flex-1">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;

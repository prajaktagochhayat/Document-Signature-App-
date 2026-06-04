import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldAlert, Sparkles, Feather } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;

export const AuthScreen: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
  });

  const onSubmit = async (data: any) => {
    setError(null);
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(data.email, data.password);
      } else {
        await register(data.name, data.email, data.password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Pastel Background Blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-pastel-purple-light rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-float" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-pastel-green-light rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-float [animation-delay:1.5s]" />
      <div className="absolute top-1/3 right-1/4 w-60 h-60 bg-pastel-pink-light rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-float [animation-delay:0.7s]" />

      <div className="w-full max-w-md z-10">
        {/* Header App Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center border border-brand-200 shadow-sm animate-bounce mb-3">
            <Feather className="w-7 h-7 text-pastel-purple-solid" />
          </div>
          <h1 className="text-4xl font-extrabold text-brand-700 tracking-tight flex items-center gap-1 font-sans">
            Signy
            <Sparkles className="w-5 h-5 text-pastel-orange-solid animate-pulse-pastel" />
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            {isLogin ? 'Welcome back! Sign your PDFs with ease.' : 'Create an account to manage your document signatures.'}
          </p>
        </div>

        {/* Card Body */}
        <div className="pastel-card rounded-3xl p-8 border border-slate-100 bg-white/80">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            {isLogin ? 'Log In' : 'Sign Up'}
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-pastel-pink-light border border-pastel-pink-border text-pastel-pink-text text-sm rounded-2xl flex items-start gap-2 animate-pulse-pastel">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    {...registerField('name')}
                    placeholder="Alice Smith"
                    className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all shadow-sm"
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-pastel-pink-text font-bold pl-1">{errors.name.message as string}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  {...registerField('email')}
                  placeholder="alice@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all shadow-sm"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-pastel-pink-text font-bold pl-1">{errors.email.message as string}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  {...registerField('password')}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all shadow-sm"
                />
              </div>
              {errors.password && (
                <p className="text-xs text-pastel-pink-text font-bold pl-1">{errors.password.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-md shadow-brand-100 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isLogin ? (
                'Log In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Toggle Footnote */}
          <div className="mt-6 text-center text-sm font-medium text-slate-500">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={handleToggleMode}
              className="text-pastel-purple-text font-bold hover:underline bg-transparent border-0 cursor-pointer"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="pastel-card p-8 rounded-3xl max-w-md w-full text-center border-2 border-brand-100 flex flex-col items-center animate-float">
        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mb-4 border border-brand-200">
          <span className="text-3xl text-center flex items-center justify-center">🖋️</span>
        </div>
        <h1 className="text-3xl font-bold text-brand-600 mb-2 font-sans">Signy</h1>
        <p className="text-slate-500 mb-6 font-medium text-sm">
          Your cute, pastel document signature companion is getting ready!
        </p>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-pastel-purple-light border border-pastel-purple-border text-pastel-purple-text text-xs rounded-full font-bold">
            React
          </span>
          <span className="px-3 py-1 bg-pastel-green-light border border-pastel-green-border text-pastel-green-text text-xs rounded-full font-bold">
            TypeScript
          </span>
          <span className="px-3 py-1 bg-pastel-blue-light border border-pastel-blue-border text-pastel-blue-text text-xs rounded-full font-bold">
            Tailwind CSS
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;

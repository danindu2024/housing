import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/nhd-logo.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, bypass login screen
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    
    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in both your email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(cleanEmail, cleanPassword);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else if (result.status === 429) {
      const mins = result.retryAfter ? Math.ceil(result.retryAfter / 60) : 15;
      setError(`Account temporarily locked due to too many failed attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
    } else {
      setError(result.error);
    }

  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background visual elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-900/30 blur-3xl" />

      {/* Main card panel */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-3">
          <img 
            src={logo} 
            alt="National Housing Development Authority Logo" 
            className="w-24 h-24 object-contain filter drop-shadow-lg"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
          Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 font-medium">
          Village & House Details Collection Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 py-8 px-4 shadow-2xl rounded-2xl sm:px-10 border border-slate-800 backdrop-blur-md">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-semibold text-rose-300 leading-relaxed">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Email Address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="officer@ndh.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.038 10.038 0 013.682-.863c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3.5 px-4 rounded-xl border border-transparent shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-white animate-spin" />
                    <span>Verifying Credentials</span>
                  </div>
                ) : (
                  'Authorize Access'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

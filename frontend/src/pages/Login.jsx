// Login.jsx — Institutional Grade Authentication Page for RiskLens
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck,
  CheckCircle2, AlertCircle, Database, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-10 animate-fade-in select-none">
      <div className="w-full max-w-[460px]">
        {/* ── Brand Card ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-[#ECEFF4] p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,11,71,0.06)]"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF2FF] border border-[#3478CC]/20 text-[#3478CC] text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Institutional Portfolio Access
            </div>
            <h1 className="text-2xl font-extrabold text-[#181A24] tracking-tight">
              Sign In to RiskLens
            </h1>
            <p className="text-xs sm:text-sm text-[#7B8290] mt-1.5">
              Access your real-time MongoDB portfolio and quant risk models
            </p>
          </div>

          {/* Switch tab */}
          <div className="flex bg-[#F4F5F8] p-1 rounded-xl mb-6">
            <button
              type="button"
              className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white text-[#181A24] shadow-xs"
            >
              Sign In
            </button>
            <Link
              to="/register"
              className="flex-1 py-1.5 text-xs font-bold rounded-lg text-[#7B8290] hover:text-[#181A24] text-center transition-colors"
            >
              Register
            </Link>
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3 rounded-xl bg-[#FDF0F0] border border-[#F36F69]/30 text-[#D84E4E] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#181A24] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7B8290]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E6EE] rounded-xl text-xs sm:text-sm text-[#181A24] placeholder-[#9BA3AF] focus:outline-none focus:border-[#3478CC] focus:ring-2 focus:ring-[#3478CC]/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#181A24]">
                  Password
                </label>
                <span className="text-[11px] font-semibold text-[#3478CC] hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7B8290]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] border border-[#E2E6EE] rounded-xl text-xs sm:text-sm text-[#181A24] placeholder-[#9BA3AF] focus:outline-none focus:border-[#3478CC] focus:ring-2 focus:ring-[#3478CC]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7B8290] hover:text-[#181A24]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#3478CC] hover:bg-[#2B66B1] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="mt-5 pt-4 border-t border-[#F0F2F6] flex items-center justify-between text-[11px] text-[#7B8290]">
            <span>Need an account?</span>
            <Link
              to="/register"
              className="font-bold text-[#3478CC] hover:underline"
            >
              Create Account
            </Link>
          </div>
        </motion.div>

        {/* Security Trust Badges */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/60">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#27AE60]" />
            <span>MongoDB Atlas Connected</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#3478CC]" />
            <span>256-Bit JWT Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}

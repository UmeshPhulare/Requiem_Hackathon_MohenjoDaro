// Register.jsx — Institutional Sign Up & Portfolio Registration Page
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck,
  AlertCircle, Database, Check, Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const RISK_PREFERENCES = [
  {
    id: 'conservative',
    label: 'Conservative',
    tagline: 'Capital Preservation',
    color: '#27AE60',
    bg: '#EAF8F0',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    tagline: 'Balanced Risk Parity',
    color: '#3478CC',
    bg: '#EAF2FF',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    tagline: 'High Alpha Growth',
    color: '#A65DF0',
    bg: '#F5ECFE',
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [riskPreference, setRiskPreference] = useState('moderate');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, riskPreference);
      navigate('/overview');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex items-center justify-center py-6 sm:py-10 animate-fade-in select-none">
      <div className="w-full max-w-[500px]">
        {/* ── Brand Registration Card ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-[#ECEFF4] p-6 sm:p-8 shadow-[0_12px_40px_rgba(8,11,71,0.06)]"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF8F0] border border-[#27AE60]/20 text-[#27AE60] text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              New Account Registration
            </div>
            <h1 className="text-2xl font-extrabold text-[#181A24] tracking-tight">
              Create Your RiskLens Portfolio
            </h1>
            <p className="text-xs sm:text-sm text-[#7B8290] mt-1.5">
              Zero dummy values — live database tracking powered by MongoDB Atlas
            </p>
          </div>

          {/* Switch tab */}
          <div className="flex bg-[#F4F5F8] p-1 rounded-xl mb-6">
            <Link
              to="/login"
              className="flex-1 py-1.5 text-xs font-bold rounded-lg text-[#7B8290] hover:text-[#181A24] text-center transition-colors"
            >
              Sign In
            </Link>
            <button
              type="button"
              className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-white text-[#181A24] shadow-xs"
            >
              Register
            </button>
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
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7B8290]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Umesh Patel"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E6EE] rounded-xl text-xs sm:text-sm text-[#181A24] placeholder-[#9BA3AF] focus:outline-none focus:border-[#3478CC] focus:ring-2 focus:ring-[#3478CC]/20 transition-all font-medium"
                />
              </div>
            </div>

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
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E6EE] rounded-xl text-xs sm:text-sm text-[#181A24] placeholder-[#9BA3AF] focus:outline-none focus:border-[#3478CC] focus:ring-2 focus:ring-[#3478CC]/20 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#181A24] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7B8290]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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

            {/* Risk Appetite Preference */}
            <div>
              <label className="block text-xs font-bold text-[#181A24] mb-1.5 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#3478CC]" />
                Investment Risk Profile
              </label>
              <div className="grid grid-cols-3 gap-2">
                {RISK_PREFERENCES.map((pref) => {
                  const isSelected = riskPreference === pref.id;
                  return (
                    <div
                      key={pref.id}
                      onClick={() => setRiskPreference(pref.id)}
                      className={`cursor-pointer rounded-xl p-2.5 border text-center transition-all ${
                        isSelected
                          ? 'border-[#3478CC] bg-[#F8FAFF] shadow-xs ring-1 ring-[#3478CC]'
                          : 'border-[#ECEFF4] bg-[#F8FAFC] hover:border-[#3478CC]/40'
                      }`}
                    >
                      <span className="block text-xs font-bold text-[#181A24]">
                        {pref.label}
                      </span>
                      <span className="block text-[10px] text-[#7B8290] mt-0.5">
                        {pref.tagline}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#27AE60] hover:bg-[#219653] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start Portfolio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick link */}
          <div className="mt-5 pt-4 border-t border-[#F0F2F6] flex items-center justify-between text-[11px] text-[#7B8290]">
            <span>Already registered?</span>
            <Link
              to="/login"
              className="font-bold text-[#3478CC] hover:underline"
            >
              Sign In Instead
            </Link>
          </div>
        </motion.div>

        {/* Security Trust Badges */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-white/60">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#27AE60]" />
            <span>MongoDB Atlas Persistent Storage</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3478CC]" />
            <span>Encrypted Credentials</span>
          </div>
        </div>
      </div>
    </div>
  );
}

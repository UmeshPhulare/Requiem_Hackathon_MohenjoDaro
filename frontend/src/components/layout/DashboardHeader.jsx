// DashboardHeader.jsx — Compact horizontal top navigation matching Reference Image 1
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Settings, Bell, ChevronDown, CheckCircle2,
  Menu, X, Briefcase, PlusSquare, ShieldAlert, Sliders,
  FlaskConical, Zap, Newspaper, BarChart3, FileText, User, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { clsx } from 'clsx';

const PRIMARY_NAV = [
  { path: '/overview', label: 'Overview' },
  { path: '/portfolio', label: 'My Portfolio' },
  { path: '/risk', label: 'Risk Analysis' },
  { path: '/backtesting', label: 'Backtesting' },
  { path: '/builder', label: 'Portfolio Builder' },
  { path: '/optimizer', label: 'Allocation Optimizer' },
];

const MORE_NAV = [
  { path: '/scenarios', label: 'Scenario Simulator', icon: Zap },
  { path: '/intelligence', label: 'Market Intelligence', icon: Newspaper },
  { path: '/strategies', label: 'Strategy Comparison', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function DashboardHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const isMoreActive = MORE_NAV.some((item) => item.path === location.pathname);

  return (
    <header className="relative w-full flex items-center justify-between pb-1 pt-1 border-b border-[#E5E7EB]/80 gap-3">
      {/* ── Left: Logo ────────────────────────────────────────── */}
      <div
        onClick={() => navigate('/')}
        className="flex items-center gap-2 cursor-pointer select-none group flex-shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-[#3478CC] flex items-center justify-center shadow-sm transition-transform group-hover:scale-105">
          <TrendingUp size={18} color="white" strokeWidth={2.6} />
        </div>
        <div className="flex items-center tracking-tight">
          <span className="text-[#181A24] font-extrabold text-[18px]">Risk</span>
          <span className="text-[#3478CC] font-extrabold text-[18px]">Lens</span>
        </div>
      </div>

      {/* ── Center: Desktop Navigation Pills ───────────────────── */}
      <nav className="hidden lg:flex items-center gap-1.5 flex-1 justify-center py-0.5">
        {PRIMARY_NAV.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-[12.5px] xl:text-[13px] font-medium whitespace-nowrap transition-all duration-150',
                isActive
                  ? 'bg-[#080B47] text-white shadow-xs font-semibold'
                  : 'text-[#6B7890] hover:text-[#181A24] hover:bg-black/5'
              )}
            >
              {item.label}
            </NavLink>
          );
        })}

        {/* More dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-[12.5px] xl:text-[13px] font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer',
              isMoreActive
                ? 'bg-[#080B47] text-white shadow-xs font-semibold'
                : 'text-[#6B7890] hover:text-[#181A24] hover:bg-black/5'
            )}
          >
            <span>More</span>
            <ChevronDown
              size={13}
              className={clsx('transition-transform duration-150', showMoreMenu && 'rotate-180')}
            />
          </button>

          {showMoreMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMoreMenu(false)}
              />
              <div className="absolute left-1/2 -translate-x-1/2 top-9 mt-1 w-56 bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_10px_30px_rgba(8,11,71,0.12)] p-1.5 z-50 animate-fade-in">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setShowMoreMenu(false);
                        navigate(item.path);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-colors text-left cursor-pointer',
                        isActive
                          ? 'bg-[#EAF2FF] text-[#3478CC] font-semibold'
                          : 'text-[#181A24] hover:bg-[#F4F5F8]'
                      )}
                    >
                      <Icon size={15} className={isActive ? 'text-[#3478CC]' : 'text-[#7B8290]'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </nav>

      {/* ── Right: Indicators & Controls ───────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7B8290] hover:text-[#181A24] hover:bg-black/5 transition-colors relative"
          >
            <Bell size={16} strokeWidth={1.8} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F36F69] rounded-full ring-2 ring-white" />
          </button>

          {showNotifs && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifs(false)}
              />
              <div
                className="absolute right-0 top-10 w-72 bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_12px_36px_rgba(8,11,71,0.15)] p-3 z-50 animate-fade-in"
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[13px] font-bold text-[#181A24]">Notifications</span>
                  <span className="text-[11px] font-semibold text-[#3478CC] cursor-pointer hover:underline">Mark read</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-[#EAF2FF] text-[12px] text-[#17365A]">
                    <p className="font-semibold text-[#181A24]">Portfolio Risk Notification</p>
                    <p className="text-[#7B8290] mt-0.5">IT sector concentration reaches 38%</p>
                  </div>
                  <div className="p-2.5 rounded-xl hover:bg-[#F4F5F8] text-[12px] text-[#181A24] transition-colors">
                    <p className="font-semibold text-[#181A24]">HDFC Bank Q2 Results</p>
                    <p className="text-[#7B8290] mt-0.5">Net profit up 16% YoY</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Auth Section */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#3478CC]/30 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3478CC] to-[#5B61FF] text-white flex items-center justify-center text-[12px] font-bold shadow-sm">
                {initials}
              </div>
            </button>

            {showProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfile(false)}
                />
                <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_12px_36px_rgba(8,11,71,0.15)] p-2 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-[#E5E7EB] mb-1">
                    <p className="text-[13px] font-bold text-[#181A24] truncate">{user?.name || 'User'}</p>
                    <p className="text-[11.5px] text-[#7B8290] truncate">{user?.email || ''}</p>
                    <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EAF2FF] text-[#3478CC] text-[10px] font-bold capitalize">
                      Profile: {user?.risk_preference || 'Moderate'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      navigate('/portfolio');
                    }}
                    className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-[#181A24] hover:bg-[#F4F5F8] rounded-xl transition-colors cursor-pointer"
                  >
                    My Portfolio
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full text-left px-3 py-2 text-[12.5px] font-medium text-[#F36F69] hover:bg-[#FDF0F0] rounded-xl transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 text-xs font-bold text-[#181A24] hover:text-[#3478CC] hover:bg-[#F4F5F8] rounded-full transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-3 py-1.5 text-xs font-bold bg-[#3478CC] text-white hover:bg-[#2B66B1] rounded-full shadow-xs transition-all cursor-pointer"
            >
              Register
            </button>
          </div>
        )}

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#181A24] hover:bg-black/5"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile Menu Drawer ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl mt-2 p-3 z-50 space-y-1 animate-fade-in">
          {[...PRIMARY_NAV, ...MORE_NAV].map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className={clsx(
                  'w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-[#080B47] text-white'
                    : 'text-[#181A24] hover:bg-[#F4F5F8]'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}

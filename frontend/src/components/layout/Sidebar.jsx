// Sidebar.jsx — Collapsible left navigation
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, PlusSquare, ShieldAlert,
  Sliders, FlaskConical, Zap, Newspaper, BarChart3,
  FileText, Settings, User, ChevronLeft, ChevronRight,
  TrendingUp
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/portfolio', label: 'My Portfolio', icon: Briefcase },
  { path: '/builder', label: 'Portfolio Builder', icon: PlusSquare },
  { path: '/risk', label: 'Risk Analysis', icon: ShieldAlert },
  { path: '/optimizer', label: 'Allocation Optimizer', icon: Sliders },
  { path: '/backtesting', label: 'Historical Backtesting', icon: FlaskConical },
  { path: '/scenarios', label: 'Scenario Simulator', icon: Zap },
  { path: '/intelligence', label: 'Market Intelligence', icon: Newspaper },
  { path: '/strategies', label: 'Strategy Comparison', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: FileText },
];

function Logo({ collapsed }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[#E1E7EF]">
      <div className="w-8 h-8 rounded-lg bg-[#3478CC] flex items-center justify-center flex-shrink-0">
        <TrendingUp size={16} color="white" strokeWidth={2.5} />
      </div>
      {!collapsed && (
        <div>
          <span className="text-[#17365A] font-bold text-[17px] leading-none tracking-tight">Risk</span>
          <span className="text-[#3478CC] font-bold text-[17px] leading-none tracking-tight">Lens</span>
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 transition-all duration-150 group relative',
          isActive
            ? 'bg-[#EAF2FF] text-[#3478CC] font-semibold'
            : 'text-[#6B7890] hover:bg-[#F5F7FB] hover:text-[#172D4A]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="flex-shrink-0"
          />
          {!collapsed && (
            <span className="text-[13.5px] whitespace-nowrap">{item.label}</span>
          )}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3478CC] rounded-r-full" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full bg-white border-r border-[#E1E7EF] flex flex-col z-30 transition-all duration-250 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
      style={{ boxShadow: '1px 0 0 #E1E7EF' }}
    >
      <Logo collapsed={collapsed} />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[#E1E7EF] py-3 space-y-0.5">
        <NavLink
          to="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 text-[#6B7890] hover:bg-[#F5F7FB] hover:text-[#172D4A] transition-all"
        >
          <Settings size={18} strokeWidth={1.8} className="flex-shrink-0" />
          {!collapsed && <span className="text-[13.5px]">Settings</span>}
        </NavLink>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mx-2 cursor-pointer hover:bg-[#F5F7FB] transition-all">
          <div className="w-6 h-6 rounded-full bg-[#3478CC] flex items-center justify-center flex-shrink-0">
            <User size={13} color="white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-[#172D4A] truncate">Demo User</p>
              <p className="text-[11px] text-[#6B7890] truncate">demo@risklens.in</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-[#E1E7EF] rounded-full flex items-center justify-center shadow-sm hover:bg-[#F5F7FB] transition-all z-40"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight size={12} className="text-[#6B7890]" />
        ) : (
          <ChevronLeft size={12} className="text-[#6B7890]" />
        )}
      </button>
    </aside>
  );
}

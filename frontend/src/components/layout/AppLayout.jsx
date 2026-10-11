// AppLayout.jsx — Main application shell layout
import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AppLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 60 : 220;

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Topbar sidebarCollapsed={collapsed} />

      {/* Main content area */}
      <main
        className="transition-all duration-250 pt-14"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

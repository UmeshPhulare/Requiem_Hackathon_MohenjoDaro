// EmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data', description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#EAF2FF] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[#3478CC]" />
      </div>
      <h3 className="text-[14px] font-semibold text-[#172D4A] mb-1">{title}</h3>
      {description && <p className="text-[13px] text-[#6B7890] max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

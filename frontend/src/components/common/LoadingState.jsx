// LoadingState.jsx
import React from 'react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#6B7890]">
      <svg className="animate-spin w-8 h-8 text-[#3478CC]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-[13px]">{message}</p>
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white border border-[#E1E7EF] rounded-[12px] p-5 ${className}`}>
      <div className="skeleton h-3 w-24 mb-3" />
      <div className="skeleton h-7 w-36 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}

export function SkeletonChart({ className = '' }) {
  return (
    <div className={`bg-white border border-[#E1E7EF] rounded-[12px] p-5 ${className}`}>
      <div className="skeleton h-3 w-32 mb-4" />
      <div className="skeleton h-48 w-full rounded-lg" />
    </div>
  );
}

// Button.jsx
import React from 'react';
import { clsx } from 'clsx';

const VARIANTS = {
  primary: 'bg-[#3478CC] text-white hover:bg-[#2968b8] shadow-sm hover:shadow-[0_2px_8px_rgba(52,120,204,0.3)]',
  secondary: 'bg-[#EAF2FF] text-[#3478CC] border border-[#d0e4f8] hover:bg-[#d8ecff]',
  ghost: 'bg-transparent text-[#6B7890] hover:bg-[#F0F3F7] hover:text-[#172D4A]',
  danger: 'bg-[#FDF0F0] text-[#D84E4E] border border-[#f5d0d0] hover:bg-[#fce0e0]',
  outline: 'bg-white text-[#172D4A] border border-[#E1E7EF] hover:bg-[#F5F7FB]',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-[12.5px] gap-1.5',
  md: 'px-4 py-2 text-[13.5px] gap-2',
  lg: 'px-5 py-2.5 text-[14px] gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  icon,
  iconPosition = 'left',
  ...props
}) {
  return (
    <button
      className={clsx(
        'inline-flex items-center font-medium rounded-[8px] transition-all duration-150 cursor-pointer border-0 outline-none',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}

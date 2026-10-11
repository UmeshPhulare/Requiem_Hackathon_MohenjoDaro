// Card.jsx
import React from 'react';
import { clsx } from 'clsx';

export default function Card({ children, className, hover = false, padding = true, ...props }) {
  return (
    <div
      className={clsx(
        'bg-white border border-[#E1E7EF] rounded-[12px]',
        'shadow-[0_1px_3px_rgba(23,45,74,0.06),0_1px_2px_rgba(23,45,74,0.04)]',
        hover && 'hover:shadow-[0_4px_12px_rgba(23,45,74,0.10)] transition-shadow duration-200 cursor-pointer',
        padding && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between mb-4', className)}>
      <div>
        <h3 className="text-[14px] font-semibold text-[#172D4A]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#6B7890] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

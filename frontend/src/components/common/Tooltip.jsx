// Tooltip.jsx — Info tooltip with hover content
import React, { useState, useRef } from 'react';
import { Info } from 'lucide-react';

export default function Tooltip({ content, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children || (
        <Info size={13} className="text-[#6B7890] cursor-help" />
      )}
      {visible && (
        <span
          className={`absolute z-50 w-52 bg-[#17365A] text-white text-[11.5px] px-2.5 py-2 rounded-lg shadow-lg leading-relaxed whitespace-normal ${positionClass}`}
          style={{ pointerEvents: 'none' }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export function InfoTooltip({ content, position }) {
  return (
    <Tooltip content={content} position={position}>
      <Info size={13} className="text-[#6B7890] cursor-help" />
    </Tooltip>
  );
}

// HoldingsTable.jsx — Sortable holdings table component
import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { formatINR } from '../../utils/formatCurrency.js';

const COLUMNS = [
  { key: 'symbol', label: 'Asset' },
  { key: 'quantity', label: 'Qty', align: 'right' },
  { key: 'currentPrice', label: 'Price', align: 'right' },
  { key: 'marketValue', label: 'Market Value', align: 'right' },
  { key: 'weight', label: 'Allocation', align: 'right' },
  { key: 'unrealizedPLPct', label: 'Return', align: 'right' },
];

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ArrowUpDown size={12} className="text-[#D0D7E3]" />;
  return sortDir === 'asc'
    ? <ArrowUp size={12} className="text-[#3478CC]" />
    : <ArrowDown size={12} className="text-[#3478CC]" />;
}

export default function HoldingsTable({ holdings = [], compact = false, onRowClick }) {
  const [sortKey, setSortKey] = useState('marketValue');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    return [...holdings].sort((a, b) => {
      let aVal = a[sortKey] ?? 0;
      let bVal = b[sortKey] ?? 0;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [holdings, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const displayHoldings = compact ? sorted.slice(0, 5) : sorted;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'text-left py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap border-b border-[#E1E7EF]',
                  col.align === 'right' && 'text-right'
                )}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                </span>
              </th>
            ))}
            {onRowClick && <th className="w-8 border-b border-[#E1E7EF]" />}
          </tr>
        </thead>
        <tbody>
          {displayHoldings.map((h) => (
            <tr
              key={h.id || h.symbol}
              className={clsx(
                'border-b border-[#F0F3F7] last:border-0 transition-colors',
                onRowClick && 'hover:bg-[#FAFBFD] cursor-pointer'
              )}
              onClick={() => onRowClick?.(h)}
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] flex items-center justify-center text-[10px] font-bold text-[#3478CC] flex-shrink-0">
                    {h.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#172D4A]">{h.symbol}</p>
                    <p className="text-[11px] text-[#6B7890] truncate max-w-[120px]">{h.name}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right text-[13px] text-[#172D4A] tabular-nums">{h.quantity?.toLocaleString('en-IN')}</td>
              <td className="py-3 px-3 text-right text-[13px] text-[#172D4A] tabular-nums">{formatINR(h.currentPrice, true)}</td>
              <td className="py-3 px-3 text-right text-[13px] font-medium text-[#172D4A] tabular-nums">{formatINR(h.marketValue)}</td>
              <td className="py-3 px-3 text-right text-[13px] text-[#6B7890] tabular-nums">{((h.weight || 0) * 100).toFixed(1)}%</td>
              <td className="py-3 px-3 text-right">
                <span className={clsx(
                  'text-[12.5px] font-semibold tabular-nums',
                  (h.unrealizedPLPct || 0) >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'
                )}>
                  {(h.unrealizedPLPct || 0) >= 0 ? '+' : ''}{((h.unrealizedPLPct || 0) * 100).toFixed(2)}%
                </span>
              </td>
              {onRowClick && (
                <td className="py-3 px-2">
                  <ChevronRight size={14} className="text-[#D0D7E3]" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

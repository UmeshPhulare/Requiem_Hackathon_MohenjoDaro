// MetricCard.jsx — KPI metric card with trend indicator
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export default function MetricCard({
  title,
  value,
  subtitle,
  trend, // 'up' | 'down' | 'neutral'
  trendValue,
  icon: Icon,
  badge,
  badgeColor, // 'positive' | 'negative' | 'warning' | 'neutral'
  index = 0,
}) {
  const trendColors = {
    up: 'text-[#16845D]',
    down: 'text-[#D84E4E]',
    neutral: 'text-[#6B7890]',
  };

  const badgeStyles = {
    positive: 'bg-[#EBF8F2] text-[#16845D]',
    negative: 'bg-[#FDF0F0] text-[#D84E4E]',
    warning: 'bg-[#FEF6E7] text-[#D99120]',
    neutral: 'bg-[#F0F3F7] text-[#6B7890]',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)] hover:shadow-[0_4px_12px_rgba(23,45,74,0.10)] transition-shadow duration-200"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11.5px] font-medium text-[#6B7890] uppercase tracking-wider">{title}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] flex items-center justify-center">
            <Icon size={14} className="text-[#3478CC]" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[22px] font-bold text-[#172D4A] tabular-nums leading-none mb-1">
            {value}
          </p>
          {subtitle && (
            <p className={clsx('text-[12px] font-medium flex items-center gap-1', trendColors[trend] || 'text-[#6B7890]')}>
              {trend && <TrendIcon size={12} />}
              {subtitle}
            </p>
          )}
        </div>

        {badge && (
          <span className={clsx('text-[12px] font-semibold px-2.5 py-1 rounded-full', badgeStyles[badgeColor] || badgeStyles.neutral)}>
            {badge}
          </span>
        )}
      </div>
    </motion.div>
  );
}

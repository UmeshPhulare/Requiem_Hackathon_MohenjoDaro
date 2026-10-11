// MyPortfolio.jsx — Portfolio management workspace
import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, ChevronDown, X } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { DEMO_ASSETS } from '../data/demoAssets.js';
import HoldingsTable from '../components/portfolio/HoldingsTable.jsx';
import Modal from '../components/common/Modal.jsx';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatINR, formatINRSigned } from '../utils/formatCurrency.js';
import { Briefcase } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

function AddHoldingModal({ open, onClose, onAdd }) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [search, setSearch] = useState('');

  const filtered = DEMO_ASSETS.filter(
    (a) =>
      a.type !== 'Index' &&
      (a.symbol.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = DEMO_ASSETS.find((a) => a.symbol === symbol);

  const handleAdd = () => {
    if (!selected || !quantity || !buyPrice) return;
    onAdd({
      symbol: selected.symbol,
      name: selected.name,
      sector: selected.sector,
      type: selected.type,
      quantity: parseFloat(quantity),
      avgBuyPrice: parseFloat(buyPrice),
      currentPrice: selected.currentPrice,
      exchange: selected.exchange,
    });
    onClose();
    setSymbol(''); setQuantity(''); setBuyPrice(''); setSearch('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Holding" size="md">
      <div className="space-y-4">
        {/* Asset search */}
        <div>
          <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Search Asset</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7890]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ticker..."
              className="w-full pl-9 pr-3 py-2 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
            />
          </div>
          <div className="mt-1.5 max-h-40 overflow-y-auto border border-[#E1E7EF] rounded-lg">
            {filtered.slice(0, 8).map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => { setSymbol(asset.symbol); setBuyPrice(asset.currentPrice.toString()); setSearch(''); }}
                className={clsx(
                  'w-full text-left px-3 py-2 flex items-center justify-between text-[13px] transition-all',
                  symbol === asset.symbol ? 'bg-[#EAF2FF]' : 'hover:bg-[#F5F7FB]'
                )}
              >
                <span className="font-medium text-[#172D4A]">{asset.symbol}</span>
                <span className="text-[#6B7890] text-[12px] truncate ml-2 max-w-[180px]">{asset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="bg-[#EAF2FF] rounded-lg p-3 text-[12.5px]">
            <p className="font-semibold text-[#17365A]">{selected.symbol} — {selected.name}</p>
            <p className="text-[#6B7890] mt-0.5">{selected.sector} · Current: {formatINR(selected.currentPrice, true)}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Quantity</label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Avg Buy Price (₹)</label>
            <input
              type="number"
              min="0"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full px-3 py-2 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
            />
          </div>
        </div>

        {selected && quantity && buyPrice && (
          <div className="bg-[#F5F7FB] rounded-lg p-3 text-[12.5px] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#6B7890]">Total cost basis:</span>
              <span className="font-semibold text-[#172D4A]">{formatINR(parseFloat(quantity) * parseFloat(buyPrice))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7890]">Current market value:</span>
              <span className="font-semibold text-[#172D4A]">{formatINR(parseFloat(quantity) * selected.currentPrice)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selected || !quantity || !buyPrice}>
            Add to Portfolio
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function HoldingDetailModal({ open, onClose, holding, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  React.useEffect(() => {
    if (holding) {
      setQty(holding.quantity?.toString() || '');
      setPrice(holding.avgBuyPrice?.toString() || '');
    }
  }, [holding]);

  if (!holding) return null;

  const handleSave = () => {
    onEdit({ ...holding, quantity: parseFloat(qty), avgBuyPrice: parseFloat(price) });
    setEditing(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={holding.symbol} size="sm">
      <div className="space-y-3">
        <div className="p-3 bg-[#F5F7FB] rounded-xl space-y-2">
          {[
            ['Asset', `${holding.symbol} — ${holding.name}`],
            ['Sector', holding.sector],
            ['Type', holding.type],
            ['Exchange', holding.exchange],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[12.5px]">
              <span className="text-[#6B7890]">{k}</span>
              <span className="font-medium text-[#172D4A]">{v}</span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-[#F5F7FB] rounded-xl space-y-2">
          {editing ? (
            <>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11.5px] text-[#6B7890]">Qty</label>
                  <input value={qty} onChange={(e) => setQty(e.target.value)} type="number"
                    className="w-full mt-1 px-2 py-1.5 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]" />
                </div>
                <div className="flex-1">
                  <label className="text-[11.5px] text-[#6B7890]">Buy Price</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} type="number"
                    className="w-full mt-1 px-2 py-1.5 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <>
              {[
                ['Quantity', holding.quantity?.toLocaleString('en-IN')],
                ['Avg Buy Price', formatINR(holding.avgBuyPrice, true)],
                ['Current Price', formatINR(holding.currentPrice, true)],
                ['Market Value', formatINR(holding.marketValue)],
                ['Unrealized P&L', formatINRSigned(holding.unrealizedPL)],
                ['Return', `${(holding.unrealizedPLPct * 100).toFixed(2)}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12.5px]">
                  <span className="text-[#6B7890]">{k}</span>
                  <span className={clsx('font-medium', k === 'Unrealized P&L' || k === 'Return'
                    ? holding.unrealizedPLPct >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'
                    : 'text-[#172D4A]')}>{v}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {!editing && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => { onRemove(holding.id); onClose(); }}>Remove</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function MyPortfolio() {
  const { portfolio, addHolding, updateHolding, removeHolding } = usePortfolio();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const types = ['All', ...new Set(portfolio.holdings.map((h) => h.type))];

  const filtered = useMemo(() => {
    return portfolio.holdings.filter((h) => {
      const matchSearch = !search ||
        h.symbol.toLowerCase().includes(search.toLowerCase()) ||
        h.name.toLowerCase().includes(search.toLowerCase());
      const matchType = filter === 'All' || h.type === filter;
      return matchSearch && matchType;
    });
  }, [portfolio.holdings, search, filter]);

  const { totalMarketValue, totalCostBasis, totalUnrealizedPL, totalUnrealizedPLPct } = portfolio;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#172D4A]">My Portfolio</h1>
          <p className="text-[13.5px] text-[#6B7890] mt-1">Manage your holdings and track performance.</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setShowAdd(true)}>Add Holding</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio Value', value: formatINR(totalMarketValue), sub: '' },
          { label: 'Invested Amount', value: formatINR(totalCostBasis), sub: '' },
          { label: 'Unrealized P&L', value: formatINRSigned(totalUnrealizedPL), positive: totalUnrealizedPL >= 0 },
          { label: 'Overall Return', value: `${totalUnrealizedPLPct >= 0 ? '+' : ''}${(totalUnrealizedPLPct * 100).toFixed(2)}%`, positive: totalUnrealizedPLPct >= 0 },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="bg-white border border-[#E1E7EF] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(23,45,74,0.06)]"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <p className="text-[11.5px] font-medium text-[#6B7890] uppercase tracking-wider mb-2">{card.label}</p>
            <p className={clsx(
              'text-[20px] font-bold tabular-nums',
              card.positive === true ? 'text-[#16845D]' : card.positive === false ? 'text-[#D84E4E]' : 'text-[#172D4A]'
            )}>
              {card.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Holdings table */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E1E7EF]">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7890]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search holdings..."
              className="w-full pl-9 pr-3 py-2 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
            />
          </div>
          <div className="flex gap-1.5">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                  filter === t ? 'bg-[#EAF2FF] text-[#3478CC]' : 'text-[#6B7890] hover:bg-[#F5F7FB]'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <span className="text-[12px] text-[#6B7890] ml-auto">{filtered.length} holdings</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No holdings found"
            description={search ? 'Try a different search term.' : 'Add your first holding to get started.'}
            icon={Briefcase}
            action={<Button onClick={() => setShowAdd(true)} icon={<Plus size={14} />}>Add Holding</Button>}
          />
        ) : (
          <HoldingsTable
            holdings={filtered}
            onRowClick={(h) => setSelectedHolding(h)}
          />
        )}
      </div>

      {/* Modals */}
      <AddHoldingModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={addHolding}
      />
      <HoldingDetailModal
        open={!!selectedHolding}
        onClose={() => setSelectedHolding(null)}
        holding={selectedHolding}
        onEdit={updateHolding}
        onRemove={removeHolding}
      />
    </div>
  );
}

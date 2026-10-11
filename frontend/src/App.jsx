// App.jsx — Application shell and routing
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import LoadingState from './components/common/LoadingState.jsx';

// Lazy-load pages for code splitting
const Overview = lazy(() => import('./pages/Overview.jsx'));
const MyPortfolio = lazy(() => import('./pages/MyPortfolio.jsx'));
const PortfolioBuilder = lazy(() => import('./pages/PortfolioBuilder.jsx'));
const RiskAnalysis = lazy(() => import('./pages/RiskAnalysis.jsx'));
const AllocationOptimizer = lazy(() => import('./pages/AllocationOptimizer.jsx'));
const Backtesting = lazy(() => import('./pages/Backtesting.jsx'));
const ScenarioSimulator = lazy(() => import('./pages/ScenarioSimulator.jsx'));
const MarketIntelligence = lazy(() => import('./pages/MarketIntelligence.jsx'));
const StrategyComparison = lazy(() => import('./pages/StrategyComparison.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingState message="Loading page..." />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/portfolio" element={<MyPortfolio />} />
          <Route path="/builder" element={<PortfolioBuilder />} />
          <Route path="/risk" element={<RiskAnalysis />} />
          <Route path="/optimizer" element={<AllocationOptimizer />} />
          <Route path="/backtesting" element={<Backtesting />} />
          <Route path="/scenarios" element={<ScenarioSimulator />} />
          <Route path="/intelligence" element={<MarketIntelligence />} />
          <Route path="/strategies" element={<StrategyComparison />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

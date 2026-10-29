import { useState, type ReactElement } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import './index.css';

// --- Pages ---
import HomePage          from './pages/HomePage';
import WorkloadsPage     from './pages/WorkloadsPage';
import SimulationLabPage from './pages/SimulationLabPage';
import ResultsPage       from './pages/ResultsPage';
import DocumentationPage from './pages/DocumentationPage';

// --- Nav Icons ---
const Icon = {
  home:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 7l7-6 7 6v8H10V9H6v6H1z"/></svg>,
  workloads: () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="14" height="3" rx="1"/><rect x="1" y="7" width="14" height="3" rx="1"/><rect x="1" y="12" width="9" height="3" rx="1"/></svg>,
  lab:     () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v5.5L3 13h10l-3-5.5V2M5 2h6"/></svg>,
  results: () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12l3-4 3 2 3-5 3 3"/><rect x="1" y="1" width="14" height="14" rx="1"/></svg>,
  docs:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 1h8l2 3v11H2V1h2z"/><path d="M4 1v4h8"/><path d="M5 9h6M5 12h4"/></svg>,
};

type PageId = 'home' | 'workloads' | 'lab' | 'results' | 'docs';

interface NavItem {
  id: PageId;
  label: string;
  icon: () => ReactElement;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home',      label: 'Home',              icon: Icon.home,      description: 'Overview & start' },
  { id: 'workloads', label: 'Workloads',          icon: Icon.workloads, description: 'Select & inspect orders' },
  { id: 'lab',       label: 'Simulation Lab',     icon: Icon.lab,       description: 'Configure & run' },
  { id: 'results',   label: 'Results & Compare',  icon: Icon.results,   description: 'Metrics, trace & experiments' },
];

function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const { state } = useSimulation();
  const simStatus = state.simulation?.status ?? 'READY';

  const navigateTo = (page: string) => setActivePage(page as PageId);

  const renderPage = () => {
    switch (activePage) {
      case 'home':      return <HomePage onNavigate={navigateTo} />;
      case 'workloads': return <WorkloadsPage onNavigate={navigateTo} />;
      case 'lab':       return <SimulationLabPage />;
      case 'results':   return <ResultsPage />;
      case 'docs':      return <DocumentationPage />;
      default:          return <HomePage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-logo">
          <div className="logo-mark">AF</div>
          <span>ArchFlow</span>
        </div>

        {/* Primary Nav in topbar */}
        <nav className="topbar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`topbar-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.description}
            >
              <span className="nav-icon"><item.icon /></span>
              <span className="topbar-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-spacer" />

        {/* Status chips */}
        <div className="topbar-chips">
          <div className="topbar-chip">
            <span className="chip-label">WORKLOAD</span>
            <span className="chip-value truncate" style={{ maxWidth: 120 }}>{state.activeWorkload.name}</span>
          </div>
          <div className="topbar-chip">
            <span className="chip-label">ARCH</span>
            <span className="chip-value">{state.currentConfig.name}</span>
          </div>
          <StatusPill status={simStatus} />
        </div>

        {/* Docs link */}
        <button
          className={`topbar-docs-btn ${activePage === 'docs' ? 'active' : ''}`}
          onClick={() => setActivePage('docs')}
          title="Documentation"
        >
          <Icon.docs />
          <span>Docs</span>
        </button>
      </header>

      {/* Main content — no sidebar */}
      <main className="main-content-full">
        {renderPage()}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls = status.toLowerCase();
  return (
    <div className={`status-pill ${cls}`}>
      <div className="status-dot" />
      {status}
    </div>
  );
}

export default function App() {
  return (
    <SimulationProvider>
      <AppShell />
    </SimulationProvider>
  );
}

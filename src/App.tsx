import { useState, type ReactElement } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import './index.css';

// --- Pages ---
import OverviewPage       from './pages/OverviewPage';
import WorkloadsPage      from './pages/WorkloadsPage';
import ArchitectureLabPage from './pages/ArchitectureLabPage';
import ProcessorPage      from './pages/ProcessorPage';
import ALUPage            from './pages/ALUPage';
import MemoryPage         from './pages/MemoryPage';
import CachePage          from './pages/CachePage';
import ParallelPage       from './pages/ParallelPage';
import ExecutionTracePage from './pages/ExecutionTracePage';
import ComparisonPage     from './pages/ComparisonPage';
import ExperimentsPage    from './pages/ExperimentsPage';
import DocumentationPage  from './pages/DocumentationPage';

// --- Icons (using SVG inline components) ---
const Icon = {
  overview:  () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>,
  workloads: () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h12M2 12h8"/></svg>,
  lab:       () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v6l-3 5h10l-3-5V2M5 2h6"/></svg>,
  processor: () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 1v3M10 1v3M6 12v3M10 12v3M1 6h3M1 10h3M12 6h3M12 10h3"/></svg>,
  alu:       () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13L8 3l5 10H3z"/><path d="M5.5 10h5"/></svg>,
  memory:    () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1"/><path d="M5 3v10M11 3v10"/></svg>,
  cache:     () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1L14 4v4c0 3.5-2.5 6-6 7C2.5 14 0 11.5 0 8V4l6-3z" transform="translate(1,0)"/></svg>,
  parallel:  () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="8" r="2"/><path d="M6 8h4M4 4v2M12 4v2M4 10v2M12 10v2"/></svg>,
  trace:     () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h12M2 6h8M2 9h10M2 12h6"/></svg>,
  compare:   () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="2" width="6" height="12" rx="1"/><rect x="9" y="2" width="6" height="12" rx="1"/></svg>,
  experiment:() => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/></svg>,
  docs:      () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 1h8l2 3v11H2V1h2z"/><path d="M4 1v4h8"/><path d="M5 9h6M5 12h4"/></svg>,
};

type PageId =
  | 'overview' | 'workloads' | 'lab' | 'processor' | 'alu'
  | 'memory' | 'cache' | 'parallel' | 'trace' | 'compare'
  | 'experiments' | 'docs';

interface NavItem {
  id: PageId;
  label: string;
  icon: () => ReactElement;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',     label: 'Overview',          icon: Icon.overview,   section: 'SYSTEM' },
  { id: 'workloads',    label: 'Delivery Workloads', icon: Icon.workloads },
  { id: 'lab',          label: 'Architecture Lab',   icon: Icon.lab,        section: 'ARCHITECTURE' },
  { id: 'processor',    label: 'Processor',           icon: Icon.processor },
  { id: 'alu',          label: 'ALU & Arithmetic',    icon: Icon.alu },
  { id: 'memory',       label: 'Memory Hierarchy',    icon: Icon.memory },
  { id: 'cache',        label: 'Cache & Coherence',   icon: Icon.cache },
  { id: 'parallel',     label: 'Parallel System',     icon: Icon.parallel },
  { id: 'trace',        label: 'Execution Trace',     icon: Icon.trace,      section: 'ANALYSIS' },
  { id: 'compare',      label: 'Arch Comparison',     icon: Icon.compare },
  { id: 'experiments',  label: 'Experiments',          icon: Icon.experiment },
  { id: 'docs',         label: 'Documentation',        icon: Icon.docs,       section: 'REFERENCE' },
];

function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const { state } = useSimulation();
  const simStatus = state.simulation?.status ?? 'READY';

  const navigateTo = (page: string) => setActivePage(page as PageId);

  const renderPage = () => {
    switch (activePage) {
      case 'overview':     return <OverviewPage onNavigate={navigateTo} />;
      case 'workloads':    return <WorkloadsPage />;
      case 'lab':          return <ArchitectureLabPage />;
      case 'processor':    return <ProcessorPage />;
      case 'alu':          return <ALUPage />;
      case 'memory':       return <MemoryPage />;
      case 'cache':        return <CachePage />;
      case 'parallel':     return <ParallelPage />;
      case 'trace':        return <ExecutionTracePage />;
      case 'compare':      return <ComparisonPage />;
      case 'experiments':  return <ExperimentsPage />;
      case 'docs':         return <DocumentationPage />;
      default:             return <OverviewPage onNavigate={navigateTo} />;
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
        <div className="topbar-divider" />
        <div className="topbar-chip">
          <span className="chip-label">ARCH</span>
          {state.currentConfig.name}
        </div>
        <div className="topbar-chip">
          <span className="chip-label">CORES</span>
          {state.currentConfig.numCores}
        </div>
        <div className="topbar-chip">
          <span className="chip-label">ISA</span>
          {state.currentConfig.isa}
        </div>
        <div className="topbar-chip">
          <span className="chip-label">COHERENCE</span>
          {state.currentConfig.coherenceProtocol}
        </div>
        <div className="topbar-spacer" />
        <StatusPill status={simStatus} />
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        {NAV_ITEMS.map((item) => (
          <div key={item.id}>
            {item.section && (
              <div className="sidebar-section-label">{item.section}</div>
            )}
            <div
              className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon"><item.icon /></span>
              {item.label}
            </div>
          </div>
        ))}
      </nav>

      {/* Main content */}
      <main className="main-content">
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
      Simulation: {status}
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

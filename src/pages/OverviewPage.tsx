import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { SimulationMetrics } from '../types';

type PageId = string;

interface Props {
  onNavigate: (page: PageId) => void;
}

const ARCH_FLOW_NODES = [
  { id: 'workload',    label: 'Delivery Workload',     page: 'workloads' },
  { id: 'instr_gen',  label: 'Instruction Generator', page: 'processor' },
  { id: 'control',    label: 'Control Unit',           page: 'processor' },
  { id: 'cores',      label: 'CPU Cores',              page: 'processor' },
  { id: 'cache',      label: 'Cache Hierarchy',        page: 'cache' },
  { id: 'coherence',  label: 'Cache Coherence (MESI)', page: 'cache' },
  { id: 'interconnect', label: 'Interconnect',         page: 'parallel' },
  { id: 'result',     label: 'Processed Result',       page: 'trace' },
];

function MetricTile({ label, value, unit, sub, color = '' }: { label: string; value: string | number; unit?: string; sub?: string; color?: string }) {
  return (
    <div className={`metric-tile ${color}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

function formatMetrics(m: SimulationMetrics | undefined) {
  if (!m) return null;
  return {
    instructions: m.totalInstructions.toLocaleString(),
    cycles:       m.totalCycles.toLocaleString(),
    cpi:          m.cpi.toFixed(3),
    hitRate:      (m.cacheHitRate * 100).toFixed(1) + '%',
    l1Hits:       m.l1Hits.toLocaleString(),
    l1Misses:     m.l1Misses.toLocaleString(),
    memAccesses:  m.memoryAccesses.toLocaleString(),
    busTransact:  m.busTransactions.toLocaleString(),
    cohMsgs:      m.coherenceMessages.toLocaleString(),
    speedup:      m.parallelSpeedup.toFixed(2) + 'x',
    utilization:  (m.processorUtilization * 100).toFixed(1) + '%',
    stalls:       m.pipelineStalls.toLocaleString(),
    aluOps:       m.aluOperations.toLocaleString(),
  };
}

export default function OverviewPage({ onNavigate }: Props) {
  const { state, runSim } = useSimulation();
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);
  const metrics = formatMetrics(state.simulation?.metrics);
  const sim = state.simulation;
  const cfg = state.currentConfig;

  const systemStatus = [
    { label: 'Simulation',    value: sim?.status ?? 'READY' },
    { label: 'Architecture',  value: cfg.name },
    { label: 'Cores',         value: cfg.numCores.toString() },
    { label: 'Pipeline',      value: cfg.pipelineEnabled ? '5-stage' : 'Disabled' },
    { label: 'Cache',         value: cfg.cacheConfig },
    { label: 'Coherence',     value: cfg.coherenceProtocol },
    { label: 'ISA',           value: cfg.isa },
    { label: 'Interconnect',  value: cfg.interconnect },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">ArchFlow</h1>
            <p className="page-subtitle">
              Computer Architecture for Intelligent Delivery Processing ·{' '}
              <span>Simulate. Process. Compare.</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate('workloads')}
            >
              Load Workload
            </button>
            <button
              className="btn btn-primary"
              onClick={runSim}
              disabled={state.isRunning}
            >
              {state.isRunning ? '⏳ Running...' : '▶ Run Simulation'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Left: Architecture diagram + metrics */}
        <div className="flex flex-col gap-4">

          {/* Architecture Flow */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>System Architecture Flow</span>
                <span className="panel-tag">INTERACTIVE</span>
              </div>
              <span className="text-xs text-muted">Click nodes to navigate</span>
            </div>
            <div className="panel-body">
              <div className="arch-flow">
                {ARCH_FLOW_NODES.map((node, i) => (
                  <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {node.id === 'cores' ? (
                      <div className="arch-flow-cores">
                        {Array.from({ length: cfg.numCores }, (_, c) => (
                          <div
                            key={c}
                            className={`core-node ${sim?.cores[c]?.status === 'RUNNING' ? 'running' : sim?.cores[c]?.status === 'COMPLETED' ? 'completed' : ''}`}
                            onClick={() => onNavigate('processor')}
                          >
                            CPU {c}
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                          ──
                        </div>
                        <div
                          className="core-node"
                          style={{ borderStyle: 'dashed' }}
                          onClick={() => onNavigate('memory')}
                        >
                          Shared Mem
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`arch-flow-node ${highlightedNode === node.id ? 'highlighted' : ''}`}
                        onMouseEnter={() => setHighlightedNode(node.id)}
                        onMouseLeave={() => setHighlightedNode(null)}
                        onClick={() => onNavigate(node.page as PageId)}
                      >
                        {node.label}
                      </div>
                    )}
                    {i < ARCH_FLOW_NODES.length - 1 && node.id !== 'control' && (
                      <div className="arch-flow-arrow" />
                    )}
                    {node.id === 'control' && <div className="arch-flow-arrow" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>Live Simulation Metrics</span>
                <span className="panel-tag">MEASURED</span>
              </div>
              {!metrics && <span className="text-xs text-muted">Run simulation to populate</span>}
            </div>
            <div className="panel-body">
              {!metrics ? (
                <div className="alert alert-info">
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><path d="M8 7v4M8 5h.01"/></svg>
                  No simulation data yet. Load a workload and click <strong style={{ marginLeft: 4 }}>Run Simulation</strong> to begin.
                </div>
              ) : (
                <div className="grid grid-4 gap-3">
                  <MetricTile label="Instructions" value={metrics.instructions} sub="executed" color="accent" />
                  <MetricTile label="Exec Cycles" value={metrics.cycles} sub="total" />
                  <MetricTile label="CPI" value={metrics.cpi} sub="cycles/instr" color={parseFloat(metrics.cpi) > 2 ? 'amber' : 'green'} />
                  <MetricTile label="Cache Hit Rate" value={metrics.hitRate} sub="L1+L2" color={parseFloat(metrics.hitRate) > 70 ? 'green' : 'amber'} />
                  <MetricTile label="L1 Hits" value={metrics.l1Hits} color="green" />
                  <MetricTile label="L1 Misses" value={metrics.l1Misses} color="red" />
                  <MetricTile label="Memory Accesses" value={metrics.memAccesses} />
                  <MetricTile label="Bus Transactions" value={metrics.busTransact} color="amber" />
                  <MetricTile label="Coherence Msgs" value={metrics.cohMsgs} />
                  <MetricTile label="Parallel Speedup" value={metrics.speedup} color="accent" />
                  <MetricTile label="Proc Utilization" value={metrics.utilization} color={parseFloat(metrics.utilization) > 70 ? 'green' : 'amber'} />
                  <MetricTile label="ALU Ops" value={metrics.aluOps} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: System status + quick actions */}
        <div className="flex flex-col gap-4">

          {/* System Status */}
          <div className="panel">
            <div className="panel-header">
              <span>System Status</span>
            </div>
            <div className="panel-body">
              <div className="flex flex-col gap-2">
                {systemStatus.map(s => (
                  <div key={s.label} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                    <span className="text-mono" style={{ fontSize: '0.78rem' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Workload */}
          <div className="panel">
            <div className="panel-header">
              <span>Active Workload</span>
              <span className="panel-tag">{state.activeWorkload.orders.length} orders</span>
            </div>
            <div className="panel-body">
              <div className="flex flex-col gap-2">
                {state.activeWorkload.orders.slice(0, 4).map(order => (
                  <div key={order.id} className="flex justify-between items-center"
                    style={{ background: 'var(--bg-base)', borderRadius: 4, padding: '6px 8px', border: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{order.id}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.customer}</div>
                    </div>
                    <div className="flex flex-col" style={{ alignItems: 'flex-end', gap: 2 }}>
                      <span className={`badge badge-${order.priority.toLowerCase()}`}>{order.priority}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.distance} km</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="panel">
            <div className="panel-header">
              <span>Quick Navigation</span>
            </div>
            <div className="panel-body">
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Architecture Lab', page: 'lab', desc: 'Configure & experiment' },
                  { label: 'ALU Laboratory', page: 'alu', desc: 'Arithmetic operations' },
                  { label: 'Cache & MESI', page: 'cache', desc: 'Coherence simulation' },
                  { label: 'Comparison', page: 'compare', desc: 'A vs B architecture' },
                  { label: 'Experiments', page: 'experiments', desc: 'Preset experiments' },
                ].map(n => (
                  <button
                    key={n.page}
                    className="btn btn-ghost w-full"
                    style={{ justifyContent: 'space-between', textAlign: 'left' }}
                    onClick={() => onNavigate(n.page as PageId)}
                  >
                    <span>{n.label}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{n.desc} →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {state.lastError && (
        <div className="alert alert-error mt-4">
          <strong>Simulation Error:</strong> {state.lastError}
        </div>
      )}
    </div>
  );
}

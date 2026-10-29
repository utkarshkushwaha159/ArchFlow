import { useSimulation } from '../context/SimulationContext';
import type { SimulationMetrics } from '../types';

type PageId = string;
interface Props { onNavigate: (page: PageId) => void; }

function formatMetrics(m: SimulationMetrics) {
  return {
    instructions: m.totalInstructions.toLocaleString(),
    cycles: m.totalCycles.toLocaleString(),
    cpi: m.cpi.toFixed(3),
    hitRate: (m.cacheHitRate * 100).toFixed(1) + '%',
    speedup: m.parallelSpeedup.toFixed(2) + 'x',
    stalls: m.pipelineStalls.toLocaleString(),
  };
}

export default function HomePage({ onNavigate }: Props) {
  const { state, runSim } = useSimulation();
  const sim = state.simulation;
  const cfg = state.currentConfig;
  const metrics = sim ? formatMetrics(sim.metrics) : null;
  const isRunning = state.isRunning;

  return (
    <div className="single-screen-page home-dashboard">

      {/* ── 1. Modern High-Tech Hero Card ── */}
      <div className="home-hero-card">
        <div className="home-hero-info">
          <div className="home-hero-badge-row">
            <span className="home-hero-badge">⚡ PBL Computer Architecture</span>
            <span className="panel-tag" style={{ color: 'var(--text-muted)' }}>Course CCSE0304</span>
          </div>
          <h1 className="home-hero-title">
            ArchFlow <span className="home-hero-title-accent">— Smart Delivery CPU Architecture</span>
          </h1>
          <p className="home-hero-desc">
            A computer architecture simulation platform modeling how multi-core processors, ISA decoders,
            cache coherence protocols, and pipelining execute real delivery order batches.
          </p>
        </div>

        <div className="home-hero-actions">
          <button
            className="btn-hero-secondary"
            onClick={() => onNavigate('workloads')}
            title="Inspect or select delivery batches"
          >
            📦 Select Workload
          </button>
          <button
            className="btn-hero-secondary"
            onClick={() => onNavigate('lab')}
            title="Configure CPU Cores, Cache & Coherence"
          >
            ⚙️ Configure Arch
          </button>
          <button
            className="btn-hero-primary"
            onClick={() => {
              runSim();
              onNavigate('lab');
            }}
            disabled={isRunning}
            title="Run simulation and observe live slow-motion execution in the lab"
          >
            <span>{isRunning ? '⏳ Initializing...' : '▶ Start Simulation'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Split Body Grid (Single-Screen) ── */}
      <div className="home-split-grid">

        {/* LEFT COLUMN: Interactive Hardware Architecture Fabric */}
        <div className="fabric-card">
          <div className="fabric-header">
            <div className="panel-title-group">
              <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Simulated Architecture Processing Fabric
              </span>
              <span className="panel-tag">
                {cfg.numCores} Cores · {cfg.isa} · {cfg.cacheConfig} · {cfg.coherenceProtocol}
              </span>
            </div>
            <button
              className="text-xs text-mono"
              style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => onNavigate('lab')}
            >
              Open in Lab →
            </button>
          </div>

          <div className="fabric-body">
            {/* Tier 1: Workload Memory Mapping */}
            <div
              className="fabric-tier-workload"
              onClick={() => onNavigate('workloads')}
              title="Click to view delivery orders & generated instruction sequence"
            >
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📦</span>
                  <span>Delivery Workload: {state.activeWorkload.name}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {state.activeWorkload.orders.length} orders mapped to RAM memory addresses (0x1000+)
                </div>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Inspect Orders →</span>
            </div>

            {/* Bus Connector 1 */}
            <div className="fabric-bus-connector">
              <span className="fabric-bus-line" />
              <span>↓ Hardware Core Dispatcher (Round-Robin Instruction Balancing)</span>
              <span className="fabric-bus-line" />
            </div>

            {/* Tier 2: CPU Cores Fabric */}
            <div className="fabric-cores-grid">
              {Array.from({ length: cfg.numCores }, (_, i) => {
                const core = sim?.cores[i];
                const isExecuting = core?.status === 'RUNNING';
                const isDone = core?.status === 'COMPLETED';

                return (
                  <div
                    key={i}
                    className={`fabric-core-chip ${isExecuting ? 'running' : isDone ? 'completed' : ''}`}
                    onClick={() => onNavigate('lab')}
                    title={`Click to inspect Core ${i} registers and ALU`}
                  >
                    <div className="text-mono" style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)' }}>
                      CORE {i}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', margin: '3px 0' }}>
                      {cfg.isa} · {cfg.pipelineEnabled ? '5-Stage' : 'Seq'}
                    </div>
                    <div className="text-mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {core ? `${core.executedInstructions} instrs` : 'IDLE'}
                    </div>
                    <div style={{ fontSize: '0.6rem', marginTop: 3, fontWeight: 600, color: isDone ? 'var(--green)' : isExecuting ? 'var(--amber)' : 'var(--blue)' }}>
                      ● {core?.status ?? 'READY'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bus Connector 2 */}
            <div className="fabric-bus-connector">
              <span className="fabric-bus-line" />
              <span>↓ Interconnect Fabric ({cfg.coherenceMechanism} Mechanism · {cfg.coherenceProtocol} Protocol)</span>
              <span className="fabric-bus-line" />
            </div>

            {/* Tier 3: Memory & Cache Hierarchy */}
            <div className="fabric-cache-grid">
              <div
                className="fabric-cache-block"
                onClick={() => onNavigate('lab')}
                title="L1 Private Caches"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)' }}>
                    L1 Private Cache ({cfg.numCores} Cores)
                  </span>
                  <span className="badge badge-normal" style={{ fontSize: '0.62rem' }}>{cfg.l1Size} lines</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  Hit Rate: <strong style={{ color: 'var(--green)' }}>{metrics ? metrics.hitRate : 'Ready'}</strong> · Protocol: {cfg.coherenceProtocol}
                </div>
              </div>

              <div
                className="fabric-cache-block"
                onClick={() => onNavigate('lab')}
                title="L2 Shared Cache Fabric"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue)' }}>
                    L2 Shared Cache
                  </span>
                  <span className="badge badge-normal" style={{ fontSize: '0.62rem' }}>
                    {cfg.cacheConfig === 'L1+L2' ? `${cfg.l2Size} lines` : 'Bypassed'}
                  </span>
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {cfg.cacheConfig === 'L1+L2' ? 'Shared multi-core access · 12cy latency' : 'Disabled in current profile'}
                </div>
              </div>
            </div>

            {/* Tier 4: Main RAM Bus */}
            <div
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 5,
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--red)' }}>Main Memory (RAM)</span>
                <span className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  0x0000 – 0xFFFF
                </span>
              </div>
              <div className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                {sim ? `${sim.memory.accesses} bus transactions` : 'Bus Idle'} · {cfg.memoryLatency}cy Latency
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Benchmark Gauges & Hardware Profile Specs */}
        <div className="home-card-col">

          {/* Card 1: Benchmark Gauges */}
          <div className="panel" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-3">
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
                Simulation Benchmark Gauges
              </span>
              <button
                className="text-xs text-mono"
                style={{ color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => onNavigate('results')}
              >
                Full Analytics →
              </button>
            </div>

            <div className="metrics-gauges-grid" style={{ flex: 1, alignContent: 'center' }}>
              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">EXECUTION CYCLES</div>
                <div className="metric-gauge-val" style={{ color: 'var(--accent)' }}>
                  {metrics ? metrics.cycles : '—'}
                </div>
                <div className="metric-gauge-sub">{metrics ? 'Clock ticks' : 'Run simulation'}</div>
              </div>

              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">AVERAGE CPI</div>
                <div className="metric-gauge-val" style={{ color: 'var(--green)' }}>
                  {metrics ? metrics.cpi : '—'}
                </div>
                <div className="metric-gauge-sub">Cycles / Instruction</div>
              </div>

              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">L1 HIT RATE</div>
                <div className="metric-gauge-val" style={{ color: 'var(--amber)' }}>
                  {metrics ? metrics.hitRate : '—'}
                </div>
                <div className="metric-gauge-sub">Cache efficiency</div>
              </div>

              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">PARALLEL SPEEDUP</div>
                <div className="metric-gauge-val" style={{ color: 'var(--blue)' }}>
                  {metrics ? metrics.speedup : '—'}
                </div>
                <div className="metric-gauge-sub">vs Single Core</div>
              </div>

              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">PIPELINE STALLS</div>
                <div className="metric-gauge-val" style={{ color: 'var(--red)' }}>
                  {metrics ? metrics.stalls : '—'}
                </div>
                <div className="metric-gauge-sub">Hazard penalties</div>
              </div>

              <div className="metric-gauge-card">
                <div className="metric-gauge-sub">INSTRUCTIONS</div>
                <div className="metric-gauge-val" style={{ color: 'var(--text-primary)' }}>
                  {metrics ? metrics.instructions : '—'}
                </div>
                <div className="metric-gauge-sub">Total executed</div>
              </div>
            </div>
          </div>

          {/* Quick Hardware Profile Specs Table */}
          <div className="panel" style={{ padding: '12px 14px', background: 'var(--bg-base)' }}>
            <div className="flex justify-between items-center" style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              <span className="text-muted">ACTIVE PROFILE:</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{cfg.name}</span>
            </div>
            <div className="flex justify-between items-center mt-1.5" style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
              <span className="text-muted">CONFIGURATION:</span>
              <span style={{ color: 'var(--text-primary)' }}>
                {cfg.numCores} Cores · {cfg.isa} ISA · {cfg.pipelineEnabled ? '5-Stage Pipeline' : 'Non-Pipelined'} · {cfg.cacheConfig} · {cfg.coherenceProtocol}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { EventComponent, SimulationMetrics } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type ResultTab = 'summary' | 'trace' | 'compare' | 'experiments';

const COMPONENTS: EventComponent[] = ['FETCH', 'DECODE', 'ALU', 'CACHE', 'MEMORY', 'COHERENCE', 'INTERCONNECT', 'CONTROL', 'SYNC', 'PIPELINE'];

const componentColors: Record<EventComponent, string> = {
  FETCH: 'var(--blue)', DECODE: 'var(--accent)', ALU: 'var(--amber)',
  CACHE: 'var(--green)', MEMORY: 'var(--red)', COHERENCE: 'var(--text-secondary)',
  INTERCONNECT: 'var(--blue)', CONTROL: 'var(--text-muted)', SYNC: 'var(--amber)', PIPELINE: 'var(--accent)',
};

const CHART_STYLE = {
  background: 'transparent', fontSize: '11px',
  fontFamily: "'JetBrains Mono', monospace",
};

// ── Metric comparison row ──
function MetricRow({ label, a, b, unit = '', lowerBetter = false }: {
  label: string; a: number; b: number; unit?: string; lowerBetter?: boolean;
}) {
  const aBetter = lowerBetter ? a < b : a > b;
  const diff = a !== 0 ? Math.abs((a - b) / a * 100) : 0;
  return (
    <tr>
      <td style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.78rem', padding: '6px 8px' }}>{label}</td>
      <td className="text-mono" style={{ color: aBetter ? 'var(--green)' : 'var(--red)', padding: '6px 8px', textAlign: 'right' }}>
        {a.toFixed(a < 10 ? 3 : 0)}{unit}
        {aBetter && <span style={{ marginLeft: 4, fontSize: '0.62rem' }}>✓</span>}
      </td>
      <td className="text-mono" style={{ color: !aBetter ? 'var(--green)' : 'var(--red)', padding: '6px 8px', textAlign: 'right' }}>
        {b.toFixed(b < 10 ? 3 : 0)}{unit}
        {!aBetter && <span style={{ marginLeft: 4, fontSize: '0.62rem' }}>✓</span>}
      </td>
      <td className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', padding: '6px 8px', textAlign: 'right' }}>
        {diff > 0.1 ? `${diff.toFixed(1)}%` : '≈'}
      </td>
    </tr>
  );
}

// ── Summary section ──
function SummarySection() {
  const { state } = useSimulation();
  const sim = state.simulation;
  if (!sim) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">No simulation results yet</div>
        <div className="empty-state-desc">
          Go to Simulation Lab, configure the architecture, and run a simulation to see results here.
        </div>
      </div>
    );
  }
  const m = sim.metrics;
  const cfg = sim.config;
  return (
    <div className="flex flex-col gap-4">
      {/* Key metrics */}
      <div className="grid grid-4 gap-3">
        {[
          { label: 'Instructions', value: m.totalInstructions.toLocaleString(), color: 'accent', sub: 'executed' },
          { label: 'Total Cycles', value: m.totalCycles.toLocaleString(), sub: 'clock cycles' },
          { label: 'CPI', value: m.cpi.toFixed(3), color: m.cpi > 2 ? 'amber' : 'green', sub: 'cycles per instruction' },
          { label: 'Cache Hit Rate', value: (m.cacheHitRate * 100).toFixed(1) + '%', color: m.cacheHitRate > 0.7 ? 'green' : 'amber', sub: 'L1+L2 combined' },
          { label: 'ALU Operations', value: m.aluOperations.toLocaleString(), sub: 'arithmetic/logic' },
          { label: 'Memory Accesses', value: m.memoryAccesses.toLocaleString(), sub: 'total load/store' },
          { label: 'Parallel Speedup', value: m.parallelSpeedup.toFixed(2) + 'x', color: 'accent', sub: `vs single-core` },
          { label: 'Proc Utilization', value: (m.processorUtilization * 100).toFixed(1) + '%', color: m.processorUtilization > 0.7 ? 'green' : 'amber', sub: 'of available cycles' },
        ].map(tile => (
          <div key={tile.label} className={`metric-tile ${tile.color ?? ''}`}>
            <div className="metric-label">{tile.label}</div>
            <div className="metric-value">{tile.value}</div>
            {tile.sub && <div className="metric-sub">{tile.sub}</div>}
          </div>
        ))}
      </div>

      {/* Performance details */}
      <div className="grid grid-2 gap-4">
        <div className="panel">
          <div className="panel-header"><span>Cache Performance</span></div>
          <div className="panel-body">
            <div className="flex flex-col gap-2">
              {[
                { l: 'L1 Hits', v: m.l1Hits, c: 'var(--green)' },
                { l: 'L1 Misses', v: m.l1Misses, c: 'var(--red)' },
                { l: 'L2 Hits', v: m.l2Hits, c: 'var(--green)' },
                { l: 'L2 Misses', v: m.l2Misses, c: 'var(--red)' },
              ].map(r => (
                <div key={r.l} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.l}</span>
                  <span className="text-mono" style={{ fontSize: '0.82rem', color: r.c, fontWeight: 600 }}>{r.v.toLocaleString()}</span>
                </div>
              ))}
              <div className="progress-bar mt-2" style={{ height: 8 }}>
                <div className="progress-fill green" style={{ width: (m.cacheHitRate * 100) + '%' }} />
              </div>
              <div className="text-xs text-muted text-center">Overall cache hit rate: {(m.cacheHitRate * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><span>Parallel Processing</span></div>
          <div className="panel-body">
            <div className="flex flex-col gap-2">
              {[
                { l: 'Pipeline Stalls', v: m.pipelineStalls, c: m.pipelineStalls > 0 ? 'var(--amber)' : 'var(--green)' },
                { l: 'Coherence Msgs', v: m.coherenceMessages, c: 'var(--text-secondary)' },
                { l: 'Bus Transactions', v: m.busTransactions, c: 'var(--text-secondary)' },
                { l: 'Interconnect Hops', v: m.interconnectHops, c: 'var(--text-secondary)' },
              ].map(r => (
                <div key={r.l} className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.l}</span>
                  <span className="text-mono" style={{ fontSize: '0.82rem', color: r.c, fontWeight: 600 }}>{r.v.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Config summary */}
      <div className="alert alert-info" style={{ fontSize: '0.78rem' }}>
        <strong>Configuration:</strong> {cfg.name} · {cfg.numCores} core(s) · {cfg.isa} · {cfg.cacheConfig} cache · {cfg.coherenceProtocol} coherence · Pipeline {cfg.pipelineEnabled ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}

// ── Execution Trace section ──
function TraceSection() {
  const { state } = useSimulation();
  const sim = state.simulation;
  const [filterCore, setFilterCore] = useState<number | 'ALL'>('ALL');
  const [filterComponent, setFilterComponent] = useState<EventComponent | 'ALL'>('ALL');
  const [filterText, setFilterText] = useState('');

  const events = useMemo(() => {
    if (!sim) return [];
    return sim.executionLog.filter(ev => {
      if (filterCore !== 'ALL' && ev.coreId !== filterCore) return false;
      if (filterComponent !== 'ALL' && ev.component !== filterComponent) return false;
      if (filterText && !ev.instruction.toLowerCase().includes(filterText.toLowerCase()) &&
          !ev.event.toLowerCase().includes(filterText.toLowerCase())) return false;
      return true;
    });
  }, [sim, filterCore, filterComponent, filterText]);

  function exportCSV() {
    if (!sim) return;
    const header = 'ID,Cycle,Core,Stage,Instruction,Component,Event,Result\n';
    const rows = events.map(ev =>
      `${ev.id},${ev.cycle},${ev.coreId},${ev.stage ?? ''},${ev.instruction},${ev.component},${ev.event},${ev.result}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'archflow-trace.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  if (!sim) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-title">No trace data</div>
        <div className="empty-state-desc">Run a simulation to generate an execution trace.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="panel">
        <div className="panel-header">
          <span>Filters</span>
          <div className="flex gap-2">
            <span className="badge badge-accent">{events.length} events</span>
            <button className="btn btn-ghost btn-sm" onClick={exportCSV}>↓ Export CSV</button>
          </div>
        </div>
        <div className="panel-body">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="form-group" style={{ minWidth: 120 }}>
              <label className="form-label">Core</label>
              <select className="form-control" value={String(filterCore)}
                onChange={e => setFilterCore(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}>
                <option value="ALL">All Cores</option>
                {Array.from({ length: state.currentConfig.numCores }, (_, i) => (
                  <option key={i} value={i}>Core {i}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: 160 }}>
              <label className="form-label">Component</label>
              <select className="form-control" value={filterComponent}
                onChange={e => setFilterComponent(e.target.value as EventComponent | 'ALL')}>
                <option value="ALL">All Components</option>
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Search</label>
              <input type="text" className="form-control" placeholder="Filter by instruction or event..."
                value={filterText} onChange={e => setFilterText(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Trace table */}
      <div className="panel">
        <div className="panel-header"><span>Execution Events</span></div>
        <div style={{ overflowX: 'auto', maxHeight: 480, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cycle</th><th>Core</th><th>Stage</th><th>Instruction</th><th>Component</th><th>Event</th><th>Result</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 500).map(ev => (
                <tr key={ev.id}>
                  <td>{ev.cycle}</td>
                  <td style={{ color: 'var(--blue)' }}>P{ev.coreId}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{ev.stage ?? '—'}</td>
                  <td style={{ color: 'var(--amber)' }}>{ev.instruction}</td>
                  <td>
                    <span style={{ color: componentColors[ev.component] ?? 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600 }}>
                      {ev.component}
                    </span>
                  </td>
                  <td style={{ color: ev.event.includes('HIT') ? 'var(--green)' : ev.event.includes('MISS') ? 'var(--red)' : 'var(--text-secondary)' }}>
                    {ev.event}
                  </td>
                  <td style={{ color: 'var(--green)' }}>{ev.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length > 500 && (
            <div className="text-center text-muted text-xs" style={{ padding: 12 }}>
              Showing first 500 of {events.length} events. Use filters or export CSV for full trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Architecture Comparison section ──
function CompareSection() {
  const { state, runComparison, updateConfigB } = useSimulation();
  const [compResult, setCompResult] = useState<{
    stateA: { metrics: SimulationMetrics };
    stateB: { metrics: SimulationMetrics };
    observation: string;
  } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const cfgA = state.currentConfig;
  const cfgB = state.comparisonConfigB;

  function runComp() {
    setIsRunning(true);
    setTimeout(() => {
      const result = runComparison();
      if (result) setCompResult(result as typeof compResult);
      setIsRunning(false);
    }, 10);
  }

  const mA = compResult?.stateA.metrics;
  const mB = compResult?.stateB.metrics;

  const chartData = mA && mB ? [
    { name: 'Cycles', A: mA.totalCycles, B: mB.totalCycles },
    { name: 'CPI×100', A: Math.round(mA.cpi * 100), B: Math.round(mB.cpi * 100) },
    { name: 'L1 Misses', A: mA.l1Misses, B: mB.l1Misses },
    { name: 'Coherence', A: mA.coherenceMessages, B: mB.coherenceMessages },
    { name: 'Stalls', A: mA.pipelineStalls, B: mB.pipelineStalls },
  ] : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Config A vs B */}
      <div className="grid grid-2 gap-4">
        <div className="panel">
          <div className="panel-header">
            <span>Architecture A</span>
            <span className="panel-tag" style={{ color: 'var(--accent)' }}>PRIMARY</span>
          </div>
          <div className="panel-body">
            <div className="flex flex-col gap-2 text-xs">
              {[
                ['Name', cfgA.name], ['ISA', cfgA.isa], ['Cores', cfgA.numCores],
                ['Pipeline', cfgA.pipelineEnabled ? 'Enabled' : 'Disabled'],
                ['Cache', cfgA.cacheConfig], ['Coherence', cfgA.coherenceProtocol],
                ['Interconnect', cfgA.interconnect],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span className="text-muted">{l}</span>
                  <span className="text-mono">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="alert alert-info mt-3" style={{ fontSize: '0.72rem' }}>
              Configured in Simulation Lab
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <span>Architecture B</span>
            <span className="panel-tag" style={{ color: 'var(--blue)' }}>COMPARISON</span>
          </div>
          <div className="panel-body">
            <div className="flex flex-col gap-2 text-xs">
              {[
                ['Name', cfgB.name], ['ISA', cfgB.isa], ['Cores', cfgB.numCores],
                ['Pipeline', cfgB.pipelineEnabled ? 'Enabled' : 'Disabled'],
                ['Cache', cfgB.cacheConfig], ['Coherence', cfgB.coherenceProtocol],
                ['Interconnect', cfgB.interconnect],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  <span className="text-muted">{l}</span>
                  <span className="text-mono">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-ghost btn-sm" onClick={() => updateConfigB({ isa: cfgB.isa === 'RISC' ? 'CISC' : 'RISC' })}>
                Toggle ISA
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => updateConfigB({ pipelineEnabled: !cfgB.pipelineEnabled })}>
                Toggle Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button className="btn btn-primary btn-lg" onClick={runComp} disabled={isRunning}>
          {isRunning ? '⏳ Comparing...' : '▶ Run A vs B Comparison'}
        </button>
      </div>

      {compResult && mA && mB && (
        <>
          {/* Observation */}
          <div className="alert alert-success">
            <strong>Observation:</strong> {compResult.observation}
          </div>

          {/* Chart */}
          <div className="panel">
            <div className="panel-header"><span>Performance Comparison</span></div>
            <div className="panel-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} style={CHART_STYLE} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="A" name={cfgA.name} fill="var(--accent)" fillOpacity={0.8} />
                  <Bar dataKey="B" name={cfgB.name} fill="var(--blue)" fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric table */}
          <div className="panel">
            <div className="panel-header"><span>Detailed Metrics</span></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ textAlign: 'right' }}>A: {cfgA.name}</th>
                    <th style={{ textAlign: 'right' }}>B: {cfgB.name}</th>
                    <th style={{ textAlign: 'right' }}>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="Total Cycles" a={mA.totalCycles} b={mB.totalCycles} lowerBetter />
                  <MetricRow label="Instructions" a={mA.totalInstructions} b={mB.totalInstructions} />
                  <MetricRow label="CPI" a={mA.cpi} b={mB.cpi} lowerBetter />
                  <MetricRow label="Cache Hit Rate" a={mA.cacheHitRate} b={mB.cacheHitRate} unit="%" />
                  <MetricRow label="L1 Hits" a={mA.l1Hits} b={mB.l1Hits} />
                  <MetricRow label="L1 Misses" a={mA.l1Misses} b={mB.l1Misses} lowerBetter />
                  <MetricRow label="Coherence Msgs" a={mA.coherenceMessages} b={mB.coherenceMessages} lowerBetter />
                  <MetricRow label="Pipeline Stalls" a={mA.pipelineStalls} b={mB.pipelineStalls} lowerBetter />
                  <MetricRow label="Parallel Speedup" a={mA.parallelSpeedup} b={mB.parallelSpeedup} />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Experiments section ──
function ExperimentsSection() {
  const { state, runExperiment } = useSimulation();
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const experiments = state.experiments;

  function handleRun(id: string) {
    setRunning(id);
    setSelectedExp(id);
    setTimeout(() => { runExperiment(id); setRunning(null); }, 10);
  }

  const selected = experiments.find(e => e.id === selectedExp);

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 16 }}>
      {/* List */}
      <div className="panel">
        <div className="panel-header">
          <span>Preset Experiments</span>
          <span className="panel-tag">{experiments.filter(e => e.ran).length}/{experiments.length} run</span>
        </div>
        <div style={{ padding: 0 }}>
          {experiments.map(exp => (
            <div key={exp.id}
              onClick={() => setSelectedExp(exp.id)}
              style={{
                padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                background: selectedExp === exp.id ? 'var(--bg-elevated)' : 'transparent',
                borderLeft: `3px solid ${selectedExp === exp.id ? 'var(--accent)' : 'transparent'}`,
              }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--accent)' }}>{exp.id.toUpperCase()}</span>
                <span className={`badge ${exp.ran ? 'badge-success' : 'badge-normal'}`}>{exp.ran ? 'Done' : 'Ready'}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 2 }}>{exp.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{exp.description}</div>
              {!exp.ran && (
                <button
                  className="btn btn-primary btn-sm mt-2"
                  onClick={e => { e.stopPropagation(); handleRun(exp.id); }}
                  disabled={running === exp.id}
                >
                  {running === exp.id ? '⏳ Running...' : '▶ Run'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div>
        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <span>{selected.name}</span>
                  <span className="panel-tag">{selected.id.toUpperCase()}</span>
                </div>
                {!selected.ran && (
                  <button className="btn btn-primary btn-sm"
                    onClick={() => handleRun(selected.id)} disabled={running === selected.id}>
                    {running === selected.id ? '⏳...' : '▶ Run Experiment'}
                  </button>
                )}
              </div>
              <div className="panel-body">
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{selected.description}</p>
                <div className="grid grid-2 gap-3">
                  <div>
                    <div className="form-label mb-1">Config A</div>
                    <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{selected.configA.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {selected.configA.isa} · {selected.configA.numCores}C · {selected.configA.cacheConfig}
                    </div>
                  </div>
                  <div>
                    <div className="form-label mb-1">Config B</div>
                    <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--blue)' }}>{selected.configB.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {selected.configB.isa} · {selected.configB.numCores}C · {selected.configB.cacheConfig}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selected.ran && selected.results && (() => {
              const mA = selected.results.metricsA;
              const mB = selected.results.metricsB;
              const chartData = [
                { name: 'Cycles', A: mA.totalCycles, B: mB.totalCycles },
                { name: 'CPI×100', A: Math.round(mA.cpi * 100), B: Math.round(mB.cpi * 100) },
                { name: 'L1 Misses', A: mA.l1Misses, B: mB.l1Misses },
                { name: 'Stalls', A: mA.pipelineStalls, B: mB.pipelineStalls },
              ];
              return (
                <>
                  <div className="alert alert-success" style={{ fontSize: '0.78rem' }}>
                    <strong>Result:</strong> {selected.results.observation}
                  </div>
                  <div className="panel">
                    <div className="panel-header"><span>Experiment Results</span></div>
                    <div className="panel-body">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} style={CHART_STYLE} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                          <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4 }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="A" name={selected.configA.name} fill="var(--accent)" fillOpacity={0.8} />
                          <Bar dataKey="B" name={selected.configB.name} fill="var(--blue)" fillOpacity={0.8} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              <div className="empty-state-title">Select an experiment</div>
              <div className="empty-state-desc">Click any experiment on the left to see its configuration and run it.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================
// MAIN RESULTS PAGE
// =============================================================
export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');

  const tabs: { id: ResultTab; label: string }[] = [
    { id: 'summary',     label: '📊 Summary' },
    { id: 'trace',       label: '📋 Execution Trace' },
    { id: 'compare',     label: '⚖️ A vs B Compare' },
    { id: 'experiments', label: '🔬 Experiments' },
  ];

  return (
    <div className="single-screen-page">
      <div className="page-header shrink-0" style={{ marginBottom: 8, paddingBottom: 6 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title" style={{ fontSize: '1.2rem', margin: 0 }}>Results & Compare</h1>
            <p className="page-subtitle" style={{ fontSize: '0.72rem', margin: 0 }}>
              Simulation results · Execution trace · Architecture comparison · Experiments
            </p>
          </div>
        </div>
      </div>

      <div className="tabs mb-3 shrink-0">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        {activeTab === 'summary'     && <SummarySection />}
        {activeTab === 'trace'       && <TraceSection />}
        {activeTab === 'compare'     && <CompareSection />}
        {activeTab === 'experiments' && <ExperimentsSection />}
      </div>
    </div>
  );
}

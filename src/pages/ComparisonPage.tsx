import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useSimulation } from '../context/SimulationContext';
import type { SimulationMetrics } from '../types';

const CHART_STYLE = {
  background: 'transparent',
  fontSize: '11px',
  fontFamily: "'JetBrains Mono', monospace",
};

function MetricRow({ label, a, b, unit = '', lowerBetter = false }: {
  label: string; a: number; b: number; unit?: string; lowerBetter?: boolean;
}) {
  const aBetter = lowerBetter ? a < b : a > b;
  const diff = a !== 0 ? Math.abs((a - b) / a * 100) : 0;
  return (
    <tr>
      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</td>
      <td className="text-mono" style={{ color: aBetter ? 'var(--green)' : 'var(--red)' }}>
        {typeof a === 'number' ? a.toFixed(a < 10 ? 3 : 0) : a}{unit}
        {aBetter && <span style={{ marginLeft: 6, fontSize: '0.65rem' }}>✓</span>}
      </td>
      <td className="text-mono" style={{ color: !aBetter ? 'var(--green)' : 'var(--red)' }}>
        {typeof b === 'number' ? b.toFixed(b < 10 ? 3 : 0) : b}{unit}
        {!aBetter && <span style={{ marginLeft: 6, fontSize: '0.65rem' }}>✓</span>}
      </td>
      <td className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        {diff > 0.1 ? `${diff.toFixed(1)}%` : '≈'}
      </td>
    </tr>
  );
}

export default function ComparisonPage() {
  const { state, runComparison, updateConfig, updateConfigB } = useSimulation();
  const [compResult, setCompResult] = useState<{ stateA: { metrics: SimulationMetrics }; stateB: { metrics: SimulationMetrics }; observation: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const cfgA = state.currentConfig;
  const cfgB = state.comparisonConfigB;

  function runComp() {
    setIsRunning(true);
    setTimeout(() => {
      const result = runComparison();
      if (result) setCompResult(result as typeof compResult);
      setIsRunning(false);
    }, 100);
  }

  const mA = compResult?.stateA.metrics;
  const mB = compResult?.stateB.metrics;

  const barData = mA && mB ? [
    { metric: 'Cycles', A: mA.totalCycles, B: mB.totalCycles },
    { metric: 'CPI', A: mA.cpi * 100, B: mB.cpi * 100 },
    { metric: 'Stalls', A: mA.pipelineStalls, B: mB.pipelineStalls },
    { metric: 'Coh.Msgs', A: mA.coherenceMessages, B: mB.coherenceMessages },
    { metric: 'L1 Misses', A: mA.l1Misses, B: mB.l1Misses },
  ] : [];

  const hitRateData = mA && mB ? [
    { name: 'L1 Hits', A: mA.l1Hits, B: mB.l1Hits },
    { name: 'L1 Misses', A: mA.l1Misses, B: mB.l1Misses },
    { name: 'L2 Hits', A: mA.l2Hits, B: mB.l2Hits },
    { name: 'L2 Misses', A: mA.l2Misses, B: mB.l2Misses },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Architecture Comparison</h1>
            <p className="page-subtitle">Same workload · Different architecture · Measured performance difference</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={runComp} disabled={isRunning}>
            {isRunning ? '⏳ Comparing...' : '▶ Run Comparison'}
          </button>
        </div>
      </div>

      {/* Architecture A vs B config */}
      <div className="grid grid-2 gap-4 mb-4">
        {[
          { label: 'Architecture A', cfg: cfgA, update: updateConfig, color: 'var(--accent)' },
          { label: 'Architecture B', cfg: cfgB, update: updateConfigB, color: 'var(--blue)' },
        ].map(({ label, cfg, update, color }) => (
          <div className="panel" key={label}>
            <div className="panel-header">
              <span style={{ color }}>{label}</span>
              <span className="panel-tag" style={{ color }}>{cfg.name}</span>
            </div>
            <div className="panel-body">
              <div className="grid grid-2 gap-2" style={{ fontSize: '0.78rem' }}>
                {([
                  { l: 'ISA', val: cfg.isa, opts: ['RISC', 'CISC'], setter: (v: string) => update({ isa: v as 'RISC' | 'CISC' }) },
                  { l: 'Cores', val: cfg.numCores, opts: [1, 2, 4, 8], setter: (v: string) => update({ numCores: parseInt(v) as 1|2|4|8 }) },
                  { l: 'Coherence', val: cfg.coherenceProtocol, opts: ['VI', 'MSI', 'MESI', 'Dragon'], setter: (v: string) => update({ coherenceProtocol: v as 'VI'|'MSI'|'MESI'|'Dragon' }) },
                  { l: 'Interconnect', val: cfg.interconnect, opts: ['Bus', 'Ring', 'Mesh', 'PointToPoint'], setter: (v: string) => update({ interconnect: v as 'Bus'|'Ring'|'Mesh'|'PointToPoint' }) },
                ]).map(({ l, val, opts, setter }) => (
                  <div key={l} className="form-group">
                    <label className="form-label">{l}</label>
                    <select className="form-control" value={String(val)} onChange={e => setter(e.target.value)}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Pipeline</label>
                  <select className="form-control" value={cfg.pipelineEnabled ? 'on' : 'off'}
                    onChange={e => update({ pipelineEnabled: e.target.value === 'on' })}>
                    <option value="on">Enabled (5-stage)</option>
                    <option value="off">Disabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cache</label>
                  <select className="form-control" value={cfg.cacheConfig}
                    onChange={e => update({ cacheConfig: e.target.value as 'L1' | 'L1+L2' })}>
                    <option value="L1">L1 Only</option>
                    <option value="L1+L2">L1 + L2</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color }}>
                {cfg.name} · {cfg.numCores}C · {cfg.isa} · {cfg.coherenceProtocol} · {cfg.interconnect} · {cfg.pipelineEnabled ? '5-stage' : 'sequential'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
      {!compResult ? (
        <div className="alert alert-info">
          Configure architectures above and click <strong>Run Comparison</strong> to compare them on the same workload.
        </div>
      ) : (
        <>
          {/* Observation banner */}
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
            borderRadius: 6, padding: '14px 18px', marginBottom: 16,
            borderLeft: '3px solid var(--accent)',
          }}>
            <div className="form-label mb-2" style={{ color: 'var(--accent)' }}>Architecture Insight</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {compResult.observation}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-2 gap-4 mb-4">
            <div className="panel">
              <div className="panel-header"><span>Performance Metrics</span></div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} style={CHART_STYLE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11 }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="A" name={cfgA.name} fill="var(--accent)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="B" name={cfgB.name} fill="var(--blue)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><span>Cache Performance</span></div>
              <div className="panel-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hitRateData} style={CHART_STYLE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="A" name={cfgA.name} fill="var(--accent)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="B" name={cfgB.name} fill="var(--blue)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed comparison table */}
          <div className="panel">
            <div className="panel-header">
              <span>Detailed Metrics Comparison</span>
            </div>
            <div className="panel-body" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ color: 'var(--accent)' }}>{cfgA.name}</th>
                    <th style={{ color: 'var(--blue)' }}>{cfgB.name}</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <MetricRow label="Execution Cycles"    a={mA!.totalCycles}          b={mB!.totalCycles}          lowerBetter />
                  <MetricRow label="Total Instructions"  a={mA!.totalInstructions}     b={mB!.totalInstructions} />
                  <MetricRow label="CPI"                 a={mA!.cpi}                   b={mB!.cpi}                  lowerBetter />
                  <MetricRow label="Cache Hit Rate"      a={mA!.cacheHitRate * 100}    b={mB!.cacheHitRate * 100}   unit="%" />
                  <MetricRow label="L1 Hits"             a={mA!.l1Hits}                b={mB!.l1Hits} />
                  <MetricRow label="L1 Misses"           a={mA!.l1Misses}              b={mB!.l1Misses}             lowerBetter />
                  <MetricRow label="L2 Hits"             a={mA!.l2Hits}                b={mB!.l2Hits} />
                  <MetricRow label="Memory Accesses"     a={mA!.memoryAccesses}        b={mB!.memoryAccesses}       lowerBetter />
                  <MetricRow label="Coherence Messages"  a={mA!.coherenceMessages}     b={mB!.coherenceMessages}    lowerBetter />
                  <MetricRow label="Invalidations"       a={mA!.invalidations}         b={mB!.invalidations}        lowerBetter />
                  <MetricRow label="Bus Transactions"    a={mA!.busTransactions}       b={mB!.busTransactions}      lowerBetter />
                  <MetricRow label="Pipeline Stalls"     a={mA!.pipelineStalls}        b={mB!.pipelineStalls}       lowerBetter />
                  <MetricRow label="Parallel Speedup"    a={mA!.parallelSpeedup}       b={mB!.parallelSpeedup}      unit="×" />
                  <MetricRow label="Interconnect Hops"   a={mA!.interconnectHops}      b={mB!.interconnectHops}     lowerBetter />
                  <MetricRow label="Proc Utilization"    a={mA!.processorUtilization * 100} b={mB!.processorUtilization * 100} unit="%" />
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span className="text-green">Green</span> = better value · <span className="text-red">Red</span> = worse value · ✓ = winner for this metric
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

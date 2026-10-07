import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function ExperimentsPage() {
  const { state, runExperiment } = useSimulation();
  const [selectedExp, setSelectedExp] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const experiments = state.experiments;

  function handleRun(id: string) {
    setRunning(id);
    setSelectedExp(id);
    setTimeout(() => {
      runExperiment(id);
      setRunning(null);
    }, 200);
  }

  const selected = experiments.find(e => e.id === selectedExp);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Experiments</h1>
        <p className="page-subtitle">Preset architecture experiments · Measured observations · Educational comparison</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 16 }}>

        {/* Experiment list */}
        <div>
          <div className="panel">
            <div className="panel-header">
              <span>Experiment Presets</span>
              <span className="panel-tag">{experiments.filter(e => e.ran).length}/{experiments.length} ran</span>
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {experiments.map(exp => (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExp(exp.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: selectedExp === exp.id ? 'var(--bg-elevated)' : 'transparent',
                    borderLeft: `2px solid ${selectedExp === exp.id ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{exp.id.toUpperCase()}</span>
                    <span className={`badge ${exp.ran ? 'badge-success' : 'badge-normal'}`}>{exp.ran ? 'Done' : 'Pending'}</span>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: '0.82rem', marginTop: 4, color: 'var(--text-primary)' }}>{exp.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>{exp.description}</div>
                  <div className="flex gap-3 mt-2" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    <span>A: {exp.configA.name}</span>
                    <span>vs</span>
                    <span>B: {exp.configB.name}</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm mt-2 w-full"
                    disabled={running === exp.id}
                    onClick={e => { e.stopPropagation(); handleRun(exp.id); }}
                  >
                    {running === exp.id ? '⏳ Running...' : exp.ran ? '↻ Re-run' : '▶ Run Experiment'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div>
          {!selected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Select an experiment to view results
            </div>
          ) : !selected.ran ? (
            <div>
              <div className="panel">
                <div className="panel-header">
                  <span>{selected.name}</span>
                </div>
                <div className="panel-body">
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{selected.description}</div>
                  <div className="grid grid-2 gap-4 mb-4">
                    {[
                      { lbl: 'A', cfg: selected.configA },
                      { lbl: 'B', cfg: selected.configB }
                    ].map(({ lbl, cfg }) => (
                      <div key={lbl} style={{
                        background: 'var(--bg-base)', border: `1px solid ${lbl === 'A' ? 'rgba(0,180,216,0.3)' : 'rgba(96,165,250,0.3)'}`,
                        borderRadius: 5, padding: 12,
                      }}>
                        <div style={{ fontSize: '0.72rem', color: lbl === 'A' ? 'var(--accent)' : 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>
                          Architecture {lbl}
                        </div>
                        {cfg && Object.entries({
                          Name: cfg.name,
                          ISA: cfg.isa,
                          Cores: cfg.numCores,
                          Cache: cfg.cacheConfig,
                          Coherence: cfg.coherenceProtocol,
                          Pipeline: cfg.pipelineEnabled ? '5-stage' : 'Off',
                        }).map(([k, v]) => (
                          <div key={k} className="flex justify-between" style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border)', padding: '3px 0' }}>
                            <span className="text-muted">{k}</span>
                            <span className="text-mono text-primary">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary w-full" onClick={() => handleRun(selected.id)}>
                    ▶ Run This Experiment
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Result banner */}
              {selected.results && (
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
                  borderLeft: '3px solid var(--green)', borderRadius: 6, padding: '14px 18px',
                }}>
                  <div className="form-label mb-2" style={{ color: 'var(--green)' }}>Observation</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    {selected.results.observation}
                  </div>
                </div>
              )}

              {/* Chart */}
              {selected.results && (() => {
                const mA = selected.results.metricsA;
                const mB = selected.results.metricsB;
                const chartData = [
                  { metric: 'Cycles', A: mA.totalCycles, B: mB.totalCycles },
                  { metric: 'CPI×10', A: Math.round(mA.cpi * 10), B: Math.round(mB.cpi * 10) },
                  { metric: 'Stalls', A: mA.pipelineStalls, B: mB.pipelineStalls },
                  { metric: 'Coh.Msg', A: mA.coherenceMessages, B: mB.coherenceMessages },
                  { metric: 'L1 Miss', A: mA.l1Misses, B: mB.l1Misses },
                ];
                return (
                  <div className="panel">
                    <div className="panel-header"><span>Performance Comparison</span></div>
                    <div className="panel-body">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="A" name={selected.configA.name} fill="var(--accent)" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="B" name={selected.configB.name} fill="var(--blue)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Metrics table */}
              {selected.results && (
                <div className="panel">
                  <div className="panel-header">
                    <span>Metrics</span>
                    <span className="text-xs text-muted">Ran {new Date(selected.results.ranAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="panel-body" style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th style={{ color: 'var(--accent)' }}>{selected.configA.name}</th>
                          <th style={{ color: 'var(--blue)' }}>{selected.configB.name}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Execution Cycles', selected.results.metricsA.totalCycles, selected.results.metricsB.totalCycles],
                          ['CPI', selected.results.metricsA.cpi.toFixed(3), selected.results.metricsB.cpi.toFixed(3)],
                          ['Cache Hit Rate', `${(selected.results.metricsA.cacheHitRate * 100).toFixed(1)}%`, `${(selected.results.metricsB.cacheHitRate * 100).toFixed(1)}%`],
                          ['Coherence Messages', selected.results.metricsA.coherenceMessages, selected.results.metricsB.coherenceMessages],
                          ['Pipeline Stalls', selected.results.metricsA.pipelineStalls, selected.results.metricsB.pipelineStalls],
                          ['Parallel Speedup', `${selected.results.metricsA.parallelSpeedup.toFixed(2)}×`, `${selected.results.metricsB.parallelSpeedup.toFixed(2)}×`],
                          ['L1 Misses', selected.results.metricsA.l1Misses, selected.results.metricsB.l1Misses],
                        ].map(([label, a, b]) => (
                          <tr key={label as string}>
                            <td style={{ fontWeight: 500 }}>{label}</td>
                            <td className="text-mono" style={{ color: 'var(--accent)' }}>{String(a)}</td>
                            <td className="text-mono" style={{ color: 'var(--blue)' }}>{String(b)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

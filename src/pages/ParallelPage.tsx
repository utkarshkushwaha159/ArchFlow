import { useSimulation } from '../context/SimulationContext';
import type { NumCores } from '../types';

export default function ParallelPage() {
  const { state, updateConfig, runSim } = useSimulation();
  const sim = state.simulation;
  const cfg = state.currentConfig;

  const cores = sim?.cores ?? [];
  const metrics = sim?.metrics;

  const FLYNN_CLASSES = [
    { id: 'SISD', desc: 'Single Instruction, Single Data', example: 'Traditional single-core sequential' },
    { id: 'SIMD', desc: 'Single Instruction, Multiple Data', example: 'Vector/GPU processing' },
    { id: 'MISD', desc: 'Multiple Instruction, Single Data', example: 'Pipeline redundancy (rare)' },
    { id: 'MIMD', desc: 'Multiple Instruction, Multiple Data', example: 'Multi-core processors (our model)' },
  ] as const;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Parallel System</h1>
            <p className="page-subtitle">Multi-core execution · Flynn's taxonomy · NUMA · Interconnect · Synchronization</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={runSim} disabled={state.isRunning}>▶ Run</button>
          </div>
        </div>
      </div>

      {/* Core count selector */}
      <div className="panel mb-4">
        <div className="panel-header">
          <span>Core Configuration</span>
        </div>
        <div className="panel-body">
          <div className="flex gap-4 items-center">
            <span className="form-label">Cores:</span>
            <div className="toggle-group" style={{ width: 'fit-content' }}>
              {([1, 2, 4, 8] as NumCores[]).map(n => (
                <button
                  key={n}
                  className={`toggle-option ${cfg.numCores === n ? 'active' : ''}`}
                  onClick={() => updateConfig({ numCores: n })}
                >{n} Core{n > 1 ? 's' : ''}</button>
              ))}
            </div>
            <span className="form-label" style={{ marginLeft: 20 }}>Flynn:</span>
            <div className="toggle-group" style={{ width: 'fit-content' }}>
              {(['SISD', 'SIMD', 'MISD', 'MIMD'] as const).map(f => (
                <button
                  key={f}
                  className={`toggle-option ${cfg.flynnsClass === f ? 'active' : ''}`}
                  onClick={() => updateConfig({ flynnsClass: f })}
                  style={{ fontSize: '0.72rem' }}
                >{f}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div className="flex flex-col gap-4">

          {/* Core status grid */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>CPU Core Status</span>
                <span className="panel-tag">{cfg.numCores} cores · {cfg.flynnsClass}</span>
              </div>
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cfg.numCores, 4)}, 1fr)`, gap: 12 }}>
                {Array.from({ length: cfg.numCores }, (_, i) => {
                  const core = cores[i];
                  const orderIdx = i;
                  const order = state.activeWorkload.orders[orderIdx];
                  const statusColor = !core ? 'var(--text-muted)' :
                    core.status === 'RUNNING'    ? 'var(--amber)' :
                    core.status === 'COMPLETED'  ? 'var(--green)' :
                    core.status === 'STALLED'    ? 'var(--red)' : 'var(--text-muted)';

                  return (
                    <div key={i} style={{
                      background: 'var(--bg-base)',
                      border: `1px solid ${statusColor}44`,
                      borderRadius: 6, padding: 14,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>CORE {i}</div>
                        <span style={{
                          padding: '2px 6px', borderRadius: 3, fontSize: '0.65rem', fontFamily: 'var(--font-mono)',
                          background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33`,
                        }}>
                          {core?.status ?? 'IDLE'}
                        </span>
                      </div>

                      {order && (
                        <div style={{ marginBottom: 8, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <div style={{ color: 'var(--amber)' }}>→ {order.id}</div>
                          <div>{order.customer}</div>
                          <div>Qty:{order.quantity} · ₹{order.price}</div>
                        </div>
                      )}

                      <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {core ? (
                          <>
                            <div>PC: 0x{core.registers.PC.toString(16).toUpperCase()}</div>
                            <div>IR: {core.registers.IR || 'NOP'}</div>
                            <div style={{ color: 'var(--accent)', marginTop: 4 }}>
                              {core.executedInstructions} instrs · {core.cycles} cy
                            </div>
                          </>
                        ) : (
                          <>
                            <div>PC: 0x0040</div>
                            <div>IR: NOP</div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{cfg.isa} · {cfg.pipelineEnabled ? '5-stage' : 'sequential'}</div>
                          </>
                        )}
                      </div>

                      {core && (
                        <div style={{ marginTop: 8 }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{
                              width: core.status === 'COMPLETED' ? '100%' :
                                `${(core.executedInstructions / Math.max(1, (sim?.instructions.length ?? 1) / cfg.numCores)) * 100}%`,
                              background: statusColor,
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Parallel speedup visualization */}
          {metrics && (
            <div className="panel">
              <div className="panel-header"><span>Parallel Speedup Analysis</span></div>
              <div className="panel-body">
                <div className="grid grid-3 gap-4">
                  <div className="metric-tile accent">
                    <div className="metric-label">Measured Speedup</div>
                    <div className="metric-value">{metrics.parallelSpeedup.toFixed(2)}<span className="metric-unit">×</span></div>
                    <div className="metric-sub">vs single-core</div>
                  </div>
                  <div className="metric-tile">
                    <div className="metric-label">Single-Core Estimate</div>
                    <div className="metric-value">{Math.round(metrics.singleCoreBaseline).toLocaleString()}</div>
                    <div className="metric-sub">cycles</div>
                  </div>
                  <div className="metric-tile green">
                    <div className="metric-label">Amdahl Efficiency</div>
                    <div className="metric-value">{(metrics.parallelSpeedup / cfg.numCores * 100).toFixed(1)}<span className="metric-unit">%</span></div>
                    <div className="metric-sub">speedup / cores</div>
                  </div>
                </div>

                {/* Speedup bar */}
                <div style={{ marginTop: 16 }}>
                  <div className="form-label mb-2">Speedup vs Core Count</div>
                  {([1, 2, 4, 8] as NumCores[]).map(n => {
                    const theoreticalSpeedup = Math.min(n, n * 0.85); // Amdahl approximation
                    return (
                      <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        <span className="text-mono text-xs" style={{ minWidth: 50, color: 'var(--text-muted)' }}>{n} core{n > 1 ? 's' : ''}</span>
                        <div style={{ flex: 1, height: 18, background: 'var(--bg-base)', borderRadius: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${(theoreticalSpeedup / 8) * 100}%`,
                            background: n === cfg.numCores ? 'var(--accent)' : 'var(--border-accent)',
                            borderRadius: 2,
                          }} />
                        </div>
                        <span className="text-mono text-xs" style={{ minWidth: 40, color: n === cfg.numCores ? 'var(--accent)' : 'var(--text-muted)' }}>
                          {theoreticalSpeedup.toFixed(1)}×
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Synchronization */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>Synchronization</span>
                <span className="panel-tag">{cfg.syncPrimitive}</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="grid grid-2 gap-4">
                <div>
                  <div className="form-label mb-2">LL-SC (Load-Linked / Store-Conditional)</div>
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', lineHeight: 2 }}>
                      <div style={{ color: 'var(--amber)' }}>LL R1, [addr]</div>
                      <div style={{ color: 'var(--text-muted)' }}>  ; Load & reserve addr</div>
                      <div style={{ color: 'var(--amber)' }}>... modify R1 ...</div>
                      <div style={{ color: 'var(--accent)' }}>SC R2, R1, [addr]</div>
                      <div style={{ color: 'var(--text-muted)' }}>  ; R2=1 if succeeded</div>
                      <div style={{ color: 'var(--text-muted)' }}>  ; R2=0 if addr changed</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                    Success: reservation held, no intervening write.
                    <br />Failure: another core wrote the address — retry.
                  </div>
                </div>
                <div>
                  <div className="form-label mb-2">Barrier Synchronization</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: cfg.numCores }, (_, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: 8, alignItems: 'center',
                        background: 'var(--bg-base)', border: '1px solid var(--border)',
                        borderRadius: 4, padding: '6px 10px',
                      }}>
                        <span className="text-mono text-xs" style={{ color: 'var(--accent)', minWidth: 50 }}>Core {i}</span>
                        <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                          <div style={{ flex: i + 1, height: 10, background: 'var(--green-bg)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 2 }} />
                          <div style={{
                            width: 8, height: 10,
                            background: sim?.status === 'COMPLETED' ? 'var(--green)' : 'var(--amber)',
                            borderRadius: 1,
                          }} />
                          <div style={{ flex: cfg.numCores - i - 1, height: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 2, opacity: 0.5 }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: sim?.status === 'COMPLETED' ? 'var(--green)' : 'var(--text-muted)' }}>
                          {sim?.status === 'COMPLETED' ? '✓ Done' : 'Waiting'}
                        </span>
                      </div>
                    ))}
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      ↑ Barrier: all cores must arrive before any proceeds
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Flynn's taxonomy + NUMA */}
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header"><span>Flynn's Taxonomy</span></div>
            <div className="panel-body">
              {FLYNN_CLASSES.map(f => (
                <div
                  key={f.id}
                  onClick={() => updateConfig({ flynnsClass: f.id })}
                  style={{
                    background: cfg.flynnsClass === f.id ? 'var(--accent-glow)' : 'var(--bg-base)',
                    border: `1px solid ${cfg.flynnsClass === f.id ? 'rgba(0,180,216,0.3)' : 'var(--border)'}`,
                    borderRadius: 4, padding: '8px 10px', marginBottom: 6, cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: cfg.flynnsClass === f.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {f.id}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>{f.desc}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{f.example}</div>
                </div>
              ))}
            </div>
          </div>

          {/* NUMA simplified */}
          <div className="panel">
            <div className="panel-header">
              <span>NUMA Model</span>
              <span className="panel-tag">EDUCATIONAL</span>
            </div>
            <div className="panel-body">
              <div className="alert alert-info" style={{ fontSize: '0.72rem', marginBottom: 10 }}>
                Simplified NUMA educational simulation model.
              </div>
              {Array.from({ length: Math.min(2, Math.ceil(cfg.numCores / 2)) }, (_, nodeId) => {
                const corePair = [nodeId * 2, nodeId * 2 + 1].filter(c => c < cfg.numCores);
                return (
                  <div key={nodeId} style={{
                    background: 'var(--bg-base)', border: '1px solid var(--border-accent)',
                    borderRadius: 5, padding: 10, marginBottom: 8,
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>
                      NUMA Node {nodeId}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      {corePair.map(c => (
                        <div key={c} style={{ padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 3, fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                          CPU {c}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Local mem: 1KB · Remote penalty: 2×
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture case studies */}
          <div className="panel">
            <div className="panel-header"><span>Case Studies</span></div>
            <div className="panel-body">
              {[
                { name: 'SGI Origin 2000', role: 'NUMA-based ccNUMA design. Hierarchical directory coherence across nodes.', year: '1996' },
                { name: 'Sequent NUMA-Q', role: 'Quad-node NUMA with Intel Pentium Pro. Hardware directory coherence.', year: '1997' },
              ].map(c => (
                <div key={c.name} style={{ marginBottom: 10, padding: '8px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.68rem' }}>({c.year})</span></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>{c.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

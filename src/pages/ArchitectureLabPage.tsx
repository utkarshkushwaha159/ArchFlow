import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { CoherenceProtocol, InterconnectType, NumCores, ISAType, CacheConfig2, CoherenceMechanism, MemoryConsistency, SyncPrimitive, ControlUnitType } from '../types';
import { getMicroOps } from '../simulation/controlUnit';
import { buildPipelineTimeline } from '../simulation/pipeline';

function ConfigRow({
  label, desc, children,
}: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
      <div className="flex justify-between items-center mb-2">
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ArchitectureLabPage() {
  const { state, updateConfig, runSim } = useSimulation();
  const cfg = state.currentConfig;
  const sim = state.simulation;
  const [activeTab, setActiveTab] = useState<'config' | 'pipeline' | 'microops'>('config');

  // Pipeline timeline
  const pipelineTimeline = sim
    ? buildPipelineTimeline(sim.instructions.slice(0, 8), sim.metrics.hazards > 0 ? [] : [], cfg.pipelineEnabled)
    : buildPipelineTimeline([], [], cfg.pipelineEnabled);

  // Sample micro-ops
  const sampleInstr = sim?.instructions[0];
  const microOps = sampleInstr ? getMicroOps(sampleInstr, cfg.controlUnitType) : [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Architecture Lab</h1>
        <p className="page-subtitle">Configure virtual processor · Run simulation · Observe effects</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 260px', gap: 16 }}>

        {/* LEFT: Configuration */}
        <div className="panel" style={{ alignSelf: 'start', position: 'sticky', top: 0 }}>
          <div className="panel-header">
            <span>Architecture Configuration</span>
          </div>
          <div className="panel-body" style={{ fontSize: '0.8rem' }}>
            <div className="form-group mb-3">
              <label className="form-label">Profile Name</label>
              <input
                type="text"
                className="form-control form-control-mono"
                value={cfg.name}
                onChange={e => updateConfig({ name: e.target.value })}
              />
            </div>

            <ConfigRow label="ISA" desc="Instruction Set Architecture">
              <div className="toggle-group">
                {(['RISC', 'CISC'] as ISAType[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.isa === v ? 'active' : ''}`} onClick={() => updateConfig({ isa: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Core Count" desc="Number of parallel cores">
              <div className="toggle-group">
                {([1, 2, 4, 8] as NumCores[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.numCores === v ? 'active' : ''}`} onClick={() => updateConfig({ numCores: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Pipeline" desc="5-stage IF/ID/EX/MEM/WB">
              <div className="toggle-group">
                <button className={`toggle-option ${cfg.pipelineEnabled ? 'active' : ''}`} onClick={() => updateConfig({ pipelineEnabled: true })}>Enabled</button>
                <button className={`toggle-option ${!cfg.pipelineEnabled ? 'active' : ''}`} onClick={() => updateConfig({ pipelineEnabled: false })}>Disabled</button>
              </div>
            </ConfigRow>

            <ConfigRow label="Cache" desc="Cache hierarchy">
              <div className="toggle-group">
                {(['L1', 'L1+L2'] as CacheConfig2[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.cacheConfig === v ? 'active' : ''}`} onClick={() => updateConfig({ cacheConfig: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Coherence Protocol">
              <div className="toggle-group">
                {(['VI', 'MSI', 'MESI', 'Dragon'] as CoherenceProtocol[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.coherenceProtocol === v ? 'active' : ''}`} onClick={() => updateConfig({ coherenceProtocol: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Coherence Mechanism">
              <div className="toggle-group">
                {(['Snooping', 'Directory'] as CoherenceMechanism[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.coherenceMechanism === v ? 'active' : ''}`} onClick={() => updateConfig({ coherenceMechanism: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Interconnect" desc="Network topology">
              <div className="toggle-group">
                {(['Bus', 'Ring', 'Mesh', 'PointToPoint'] as InterconnectType[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.interconnect === v ? 'active' : ''}`} onClick={() => updateConfig({ interconnect: v })}
                    style={{ fontSize: '0.68rem', padding: '5px 6px' }}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Memory Consistency">
              <div className="toggle-group">
                {(['Sequential', 'Relaxed'] as MemoryConsistency[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.memoryConsistency === v ? 'active' : ''}`} onClick={() => updateConfig({ memoryConsistency: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Synchronization">
              <div className="toggle-group">
                {(['LL-SC', 'Barrier', 'Both'] as SyncPrimitive[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.syncPrimitive === v ? 'active' : ''}`} onClick={() => updateConfig({ syncPrimitive: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <ConfigRow label="Control Unit">
              <div className="toggle-group">
                {(['Hardwired', 'Microprogrammed'] as ControlUnitType[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.controlUnitType === v ? 'active' : ''}`} onClick={() => updateConfig({ controlUnitType: v })}
                    style={{ fontSize: '0.72rem' }}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            <div className="grid grid-2 gap-2">
              <div className="form-group">
                <label className="form-label">L1 Size (lines)</label>
                <input type="number" className="form-control" value={cfg.l1Size}
                  onChange={e => updateConfig({ l1Size: parseInt(e.target.value) || 4 })} />
              </div>
              <div className="form-group">
                <label className="form-label">L2 Size (lines)</label>
                <input type="number" className="form-control" value={cfg.l2Size}
                  onChange={e => updateConfig({ l2Size: parseInt(e.target.value) || 16 })} />
              </div>
              <div className="form-group">
                <label className="form-label">Mem Latency (cy)</label>
                <input type="number" className="form-control" value={cfg.memoryLatency}
                  onChange={e => updateConfig({ memoryLatency: parseInt(e.target.value) || 50 })} />
              </div>
            </div>

            <button className="btn btn-primary w-full mt-3" onClick={runSim} disabled={state.isRunning}>
              {state.isRunning ? '⏳ Running...' : '▶ Run Simulation'}
            </button>
          </div>
        </div>

        {/* CENTER: Live visualization */}
        <div className="flex flex-col gap-4">
          <div className="tabs">
            {(['config', 'pipeline', 'microops'] as const).map(t => (
              <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t === 'config' ? 'Architecture View' : t === 'pipeline' ? 'Pipeline Timeline' : 'Micro-Operations'}
              </button>
            ))}
          </div>

          {activeTab === 'config' && (
            <div className="panel">
              <div className="panel-header">
                <span>Architecture Visualization</span>
                <span className="panel-tag">{cfg.name}</span>
              </div>
              <div className="panel-body">
                {/* CPU cores visualization */}
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label mb-2">CPU Cores ({cfg.numCores} × {cfg.isa})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cfg.numCores}, 1fr)`, gap: 8 }}>
                    {Array.from({ length: cfg.numCores }, (_, i) => {
                      const core = sim?.cores[i];
                      return (
                        <div key={i} style={{
                          background: 'var(--bg-base)',
                          border: `1px solid ${core?.status === 'RUNNING' ? 'var(--amber)' : core?.status === 'COMPLETED' ? 'var(--green)' : 'var(--border)'}`,
                          borderRadius: 5, padding: 10, textAlign: 'center',
                        }}>
                          <div className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CORE {i}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '4px 0' }}>{cfg.isa} · {cfg.pipelineEnabled ? '5-stage' : 'non-pipe'}</div>
                          <div className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>
                            {core ? `${core.executedInstructions} instrs` : 'IDLE'}
                          </div>
                          {core && (
                            <div style={{ fontSize: '0.65rem', color: core.status === 'COMPLETED' ? 'var(--green)' : core.status === 'RUNNING' ? 'var(--amber)' : 'var(--text-muted)' }}>
                              {core.status}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cache */}
                <div style={{ marginBottom: 16 }}>
                  <div className="form-label mb-2">Cache Hierarchy</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Array.from({ length: cfg.numCores }, (_, i) => {
                      const l1 = sim?.caches[i];
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '6px 10px' }}>
                          <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--accent)', minWidth: 50 }}>L1 C{i}</span>
                          <div style={{ flex: 1 }}>
                            <div className="progress-bar">
                              <div className="progress-fill green" style={{ width: l1 ? `${(l1.hits / Math.max(1, l1.hits + l1.misses) * 100)}%` : '0%' }} />
                            </div>
                          </div>
                          <span className="text-mono text-xs text-muted">
                            {l1 ? `${l1.hits}H / ${l1.misses}M` : `${cfg.l1Size} lines`}
                          </span>
                        </div>
                      );
                    })}
                    {cfg.cacheConfig === 'L1+L2' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)', borderRadius: 4, padding: '6px 10px' }}>
                        <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--blue)', minWidth: 50 }}>L2 Shared</span>
                        <div style={{ flex: 1 }}>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{
                              width: sim?.caches.find(c => c.config.level === 'L2')
                                ? `${(sim.caches.find(c => c.config.level === 'L2')!.hits /
                                  Math.max(1, sim.caches.find(c => c.config.level === 'L2')!.hits + sim.caches.find(c => c.config.level === 'L2')!.misses) * 100)}%`
                                : '0%'
                            }} />
                          </div>
                        </div>
                        <span className="text-mono text-xs text-muted">{cfg.l2Size} lines</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Memory */}
                <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Main Memory</span>
                    <span className="text-mono text-xs text-muted">
                      {sim ? `${sim.memory.accesses} accesses` : `${cfg.memoryLatency}cy latency`}
                    </span>
                  </div>
                </div>

                {/* Interconnect */}
                <div style={{ marginTop: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Interconnect: {cfg.interconnect}
                    </span>
                    <span className="text-mono text-xs text-muted">
                      {sim ? `${sim.packets.length} packets · ${sim.metrics.interconnectHops} hops` : 'no data'}
                    </span>
                  </div>
                  {/* Simple topology visualization */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                    {cfg.interconnect === 'Mesh' && cfg.numCores >= 4 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 40px)', gap: 4 }}>
                        {Array.from({ length: Math.min(4, cfg.numCores) }, (_, i) => (
                          <div key={i} style={{
                            width: 40, height: 28,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: 3,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                          }}>C{i}</div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {Array.from({ length: Math.min(8, cfg.numCores) }, (_, i) => (
                          <span key={i} style={{
                            padding: '3px 6px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-accent)',
                            borderRadius: 3,
                            fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)',
                          }}>C{i}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <span>Pipeline Timeline</span>
                  <span className="panel-tag">{cfg.pipelineEnabled ? '5-STAGE' : 'DISABLED'}</span>
                </div>
              </div>
              <div className="panel-body" style={{ overflowX: 'auto' }}>
                {!cfg.pipelineEnabled ? (
                  <div className="alert alert-warning">
                    Pipeline is disabled. Instructions execute one at a time (non-pipelined). Enable pipeline in the configuration to see the timeline.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 40px)', gap: 2, marginBottom: 8 }}>
                      <div />
                      {Array.from({ length: 12 }, (_, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          C{i + 1}
                        </div>
                      ))}
                    </div>
                    {pipelineTimeline.map((entry, ri) => (
                      <div key={ri} style={{ display: 'grid', gridTemplateColumns: '160px repeat(12, 40px)', gap: 2, marginBottom: 2 }}>
                        <div style={{
                          fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          alignSelf: 'center',
                        }}>
                          {entry.instructionStr.split(';')[0].trim()}
                        </div>
                        {entry.stages.map((s, ci) => {
                          const stageColors: Record<string, string> = {
                            IF: 'var(--blue)', ID: 'var(--accent)', EX: 'var(--amber)',
                            MEM: 'var(--green)', WB: 'var(--text-secondary)',
                          };
                          return (
                            <div key={ci} style={{
                              height: 22,
                              background: `${stageColors[s.stage]}22`,
                              border: `1px solid ${stageColors[s.stage]}44`,
                              borderRadius: 2,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                              color: stageColors[s.stage],
                            }}>
                              {s.stage}
                            </div>
                          );
                        })}
                        {/* Fill remaining columns */}
                        {Array.from({ length: Math.max(0, 12 - entry.stages.length) }, (_, i) => (
                          <div key={`e${i}`} />
                        ))}
                      </div>
                    ))}
                    <div className="flex gap-4 mt-3">
                      {Object.entries({ IF: 'var(--blue)', ID: 'var(--accent)', EX: 'var(--amber)', MEM: 'var(--green)', WB: 'var(--text-secondary)' }).map(([s, c]) => (
                        <span key={s} style={{ fontSize: '0.68rem', display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ width: 10, height: 10, background: `${c}44`, border: `1px solid ${c}66`, borderRadius: 2, display: 'inline-block' }} />
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'microops' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <span>Micro-Operations</span>
                  <span className="panel-tag">{cfg.controlUnitType.toUpperCase()}</span>
                </div>
              </div>
              <div className="panel-body">
                {!sampleInstr ? (
                  <div className="alert alert-info">Run a simulation to see micro-operation sequences.</div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px' }}>
                      <span className="form-label">Instruction: </span>
                      <span className="text-mono" style={{ color: 'var(--accent)' }}>
                        {sampleInstr.opcode} {[sampleInstr.operand1, sampleInstr.operand2, sampleInstr.operand3].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {microOps.map((op, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          background: 'var(--bg-base)', border: '1px solid var(--border)',
                          borderRadius: 4, padding: '7px 10px',
                        }}>
                          <span className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', minWidth: 20 }}>
                            {String(op.step).padStart(2, '0')}
                          </span>
                          <span className="text-mono" style={{ fontSize: '0.75rem', color: 'var(--amber)', minWidth: 180 }}>
                            {op.signal}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            {op.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Metrics */}
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span>Simulation Metrics</span>
            </div>
            <div className="panel-body">
              {!sim ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                  Run simulation to see results
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[
                    { l: 'Exec Cycles',    v: sim.metrics.totalCycles, c: '' },
                    { l: 'Instructions',   v: sim.metrics.totalInstructions, c: '' },
                    { l: 'CPI',            v: sim.metrics.cpi.toFixed(3), c: sim.metrics.cpi > 2 ? 'amber' : 'green' },
                    { l: 'Cache Hit Rate', v: (sim.metrics.cacheHitRate * 100).toFixed(1) + '%', c: sim.metrics.cacheHitRate > 0.7 ? 'green' : 'amber' },
                    { l: 'Coherence Msgs', v: sim.metrics.coherenceMessages, c: '' },
                    { l: 'Pipeline Stalls',v: sim.metrics.pipelineStalls, c: sim.metrics.pipelineStalls > 0 ? 'amber' : 'green' },
                    { l: 'Speedup',        v: sim.metrics.parallelSpeedup.toFixed(2) + 'x', c: 'accent' },
                    { l: 'Proc Util.',     v: (sim.metrics.processorUtilization * 100).toFixed(1) + '%', c: '' },
                  ].map(m => (
                    <div key={m.l} className="flex justify-between items-center"
                      style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{m.l}</span>
                      <span className={`text-mono text-${m.c || 'primary'}`} style={{ fontSize: '0.82rem', fontWeight: 600 }}>{m.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution Events (last few) */}
          {sim && sim.executionLog.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <span>Recent Events</span>
                <span className="panel-tag">{sim.executionLog.length}</span>
              </div>
              <div className="panel-body" style={{ padding: '8px 12px' }}>
                <div className="exec-log">
                  {sim.executionLog.slice(-12).map(ev => (
                    <div key={ev.id} className="log-entry" style={{ display: 'flex', gap: 8, fontSize: '0.7rem', padding: '2px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="log-cycle">C{ev.cycle}</span>
                      <span className="log-core">P{ev.coreId}</span>
                      <span className="log-result" style={{
                        color: ev.event.includes('HIT') ? 'var(--green)' : ev.event.includes('MISS') ? 'var(--red)' : 'var(--text-secondary)',
                      }}>
                        {ev.event}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

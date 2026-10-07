import { useSimulation } from '../context/SimulationContext';
import { cacheHitRate } from '../simulation/memory';

const HIERARCHY_LEVELS = [
  { name: 'REGISTERS',    color: 'var(--accent)', latency: '0 cycles',    size: '8 × 32-bit' },
  { name: 'L1 CACHE',     color: 'var(--green)',  latency: '4 cycles',    size: 'per-core' },
  { name: 'L2 CACHE',     color: 'var(--blue)',   latency: '12 cycles',   size: 'shared' },
  { name: 'MAIN MEMORY',  color: 'var(--amber)',  latency: '100 cycles',  size: '4 KB sim.' },
  { name: 'VIRTUAL MEM',  color: 'var(--text-muted)', latency: '>1000 cy', size: 'logical' },
];

export default function MemoryPage() {
  const { state } = useSimulation();
  const sim = state.simulation;
  const cfg = state.currentConfig;

  const l1Caches = sim?.caches.filter(c => c.config.level === 'L1') ?? [];
  const l2Cache  = sim?.caches.find(c => c.config.level === 'L2');
  const memory   = sim?.memory;

  const totalHits   = l1Caches.reduce((s, c) => s + c.hits, 0) + (l2Cache?.hits ?? 0);
  const totalMisses = l1Caches.reduce((s, c) => s + c.misses, 0) + (l2Cache?.misses ?? 0);
  const overallHitRate = totalHits / Math.max(1, totalHits + totalMisses);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Memory Hierarchy</h1>
        <p className="page-subtitle">Registers · L1 Cache · L2 Cache · Main Memory · Virtual Memory</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Hierarchy diagram */}
        <div>
          <div className="panel">
            <div className="panel-header"><span>Memory Pyramid</span></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                {HIERARCHY_LEVELS.map((level, i) => {
                  const width = 60 + i * 20;
                  return (
                    <div key={level.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                      <div style={{
                        width: `${width}%`,
                        background: `${level.color}18`,
                        border: `1px solid ${level.color}44`,
                        borderRadius: 4,
                        padding: '8px 12px',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: level.color, letterSpacing: '0.05em' }}>
                          {level.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {level.latency} · {level.size}
                        </div>
                      </div>
                      {i < HIERARCHY_LEVELS.length - 1 && (
                        <div style={{ width: 1, height: 12, background: 'var(--border-accent)' }} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="section-divider" />
              <div className="form-label mb-2">Access Latency (cycles)</div>
              {[
                ['Registers', 0, 'var(--accent)'],
                ['L1 Cache', cfg.l1Latency, 'var(--green)'],
                ['L2 Cache', cfg.l2Latency, 'var(--blue)'],
                ['Main Memory', cfg.memoryLatency, 'var(--amber)'],
              ].map(([name, lat, color]) => (
                <div key={name as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '0.72rem', minWidth: 90, color: 'var(--text-secondary)' }}>{name}</span>
                  <div style={{ flex: 1, height: 10, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((lat as number) / cfg.memoryLatency) * 100)}%`,
                      background: color as string,
                      borderRadius: 3,
                    }} />
                  </div>
                  <span className="text-mono text-xs" style={{ color: color as string, minWidth: 30 }}>{lat}cy</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cache detail */}
        <div className="flex flex-col gap-4">
          {/* Summary metrics */}
          {sim && (
            <div className="grid grid-4 gap-3">
              <div className={`metric-tile ${overallHitRate > 0.7 ? 'green' : 'amber'}`}>
                <div className="metric-label">Overall Hit Rate</div>
                <div className="metric-value">{(overallHitRate * 100).toFixed(1)}<span className="metric-unit">%</span></div>
              </div>
              <div className="metric-tile green">
                <div className="metric-label">L1 Hits</div>
                <div className="metric-value">{l1Caches.reduce((s, c) => s + c.hits, 0).toLocaleString()}</div>
              </div>
              <div className="metric-tile red">
                <div className="metric-label">L1 Misses</div>
                <div className="metric-value">{l1Caches.reduce((s, c) => s + c.misses, 0).toLocaleString()}</div>
              </div>
              <div className="metric-tile">
                <div className="metric-label">Mem Accesses</div>
                <div className="metric-value">{memory?.accesses.toLocaleString() ?? 0}</div>
              </div>
            </div>
          )}

          {/* Per-core L1 caches */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>L1 Cache — Per Core</span>
                <span className="panel-tag">{cfg.l1Size} lines · {cfg.coherenceProtocol}</span>
              </div>
            </div>
            <div className="panel-body">
              {l1Caches.length === 0 ? (
                <div className="alert alert-info">Run simulation to see cache state.</div>
              ) : (
                l1Caches.map((cache, i) => {
                  const hr = cacheHitRate(cache);
                  return (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="form-label">Core {i} L1 Cache</span>
                        <div className="flex gap-3 text-xs text-mono">
                          <span className="text-green">{cache.hits} hits</span>
                          <span className="text-red">{cache.misses} misses</span>
                          <span className="text-accent">{(hr * 100).toFixed(1)}% hit rate</span>
                        </div>
                      </div>
                      <div className="progress-bar mb-2">
                        <div className="progress-fill green" style={{ width: `${hr * 100}%` }} />
                      </div>
                      {/* Cache lines */}
                      <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: '0.7rem' }}>
                          <thead>
                            <tr><th>Line</th><th>Valid</th><th>State</th><th>Tag</th><th>Data[0]</th><th>Accesses</th></tr>
                          </thead>
                          <tbody>
                            {cache.lines.slice(0, 8).map((line, j) => (
                              <tr key={j}>
                                <td style={{ color: 'var(--text-muted)' }}>{j}</td>
                                <td><span className={`badge ${line.valid ? 'badge-success' : 'badge-normal'}`}>{line.valid ? 'Y' : 'N'}</span></td>
                                <td><span className={`cache-state ${line.state}`}>{line.state}</span></td>
                                <td>{line.tag >= 0 ? `0x${line.tag.toString(16).toUpperCase()}` : '--'}</td>
                                <td>{line.valid ? `0x${(line.data[0] ?? 0).toString(16).toUpperCase()}` : '--'}</td>
                                <td>{line.accessCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* L2 Cache */}
          {cfg.cacheConfig === 'L1+L2' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <span>L2 Cache — Shared</span>
                  <span className="panel-tag">{cfg.l2Size} lines · 4-way</span>
                </div>
                {l2Cache && (
                  <span className="text-xs text-mono" style={{ color: 'var(--blue)' }}>
                    Hit rate: {(cacheHitRate(l2Cache) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="panel-body">
                {!l2Cache ? (
                  <div className="alert alert-info">Run simulation to see L2 cache state.</div>
                ) : (
                  <table className="data-table" style={{ fontSize: '0.7rem' }}>
                    <thead>
                      <tr><th>Line</th><th>Valid</th><th>State</th><th>Tag</th><th>Data[0]</th><th>Dirty</th></tr>
                    </thead>
                    <tbody>
                      {l2Cache.lines.slice(0, 10).map((line, j) => (
                        <tr key={j}>
                          <td style={{ color: 'var(--text-muted)' }}>{j}</td>
                          <td><span className={`badge ${line.valid ? 'badge-success' : 'badge-normal'}`}>{line.valid ? 'Y' : 'N'}</span></td>
                          <td><span className={`cache-state ${line.state}`}>{line.state}</span></td>
                          <td>{line.tag >= 0 ? `0x${line.tag.toString(16).toUpperCase()}` : '--'}</td>
                          <td>{line.valid ? `0x${(line.data[0] ?? 0).toString(16).toUpperCase()}` : '--'}</td>
                          <td>{line.dirty ? <span style={{ color: 'var(--amber)' }}>Y</span> : 'N'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Miss type breakdown */}
          {sim && sim.metrics.l1Misses > 0 && (
            <div className="panel">
              <div className="panel-header"><span>Miss Type Analysis</span></div>
              <div className="panel-body">
                <div className="alert alert-info mb-3" style={{ fontSize: '0.74rem' }}>
                  Educational simulation model. Miss types approximate based on workload access patterns.
                </div>
                <div className="grid grid-3 gap-3">
                  {[
                    { type: 'Compulsory', desc: 'First access (cold miss)', color: 'var(--blue)', pct: 40 },
                    { type: 'Conflict',   desc: 'Address maps to occupied line', color: 'var(--amber)', pct: 40 },
                    { type: 'Capacity',   desc: 'Cache too small for working set', color: 'var(--red)', pct: 20 },
                  ].map(m => (
                    <div key={m.type} style={{
                      background: 'var(--bg-base)', border: '1px solid var(--border)',
                      borderRadius: 5, padding: 12,
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.type}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 8 }}>{m.desc}</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: m.color, textAlign: 'right', marginTop: 4 }}>~{m.pct}%</div>
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

import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { CoherenceProtocol } from '../types';
import { stateLabel } from '../simulation/coherence';

type MechTab = 'state' | 'events' | 'directory' | 'protocols';

// MESI state transition diagram data
const MESI_TRANSITIONS: Record<string, { from: string; to: string; trigger: string; action?: string }[]> = {
  M: [
    { from: 'M', to: 'S', trigger: 'Bus Read (another core)', action: 'Flush to bus' },
    { from: 'M', to: 'I', trigger: 'Bus Write/Invalidate', action: 'Flush' },
  ],
  E: [
    { from: 'E', to: 'M', trigger: 'Processor Write' },
    { from: 'E', to: 'S', trigger: 'Bus Read (another core)' },
    { from: 'E', to: 'I', trigger: 'Bus Write' },
  ],
  S: [
    { from: 'S', to: 'M', trigger: 'Processor Write', action: 'BusUpgrade / Invalidate others' },
    { from: 'S', to: 'I', trigger: 'Bus Invalidate' },
  ],
  I: [
    { from: 'I', to: 'E', trigger: 'Processor Read (no sharers)', action: 'BusRead' },
    { from: 'I', to: 'S', trigger: 'Processor Read (others share)', action: 'BusRead' },
    { from: 'I', to: 'M', trigger: 'Processor Write', action: 'BusWrite' },
  ],
};

export default function CachePage() {
  const { state, updateConfig } = useSimulation();
  const sim = state.simulation;
  const cfg = state.currentConfig;
  const [tab, setTab] = useState<MechTab>('state');
  const [selectedState, setSelectedState] = useState<string>('M');

  const protocol = cfg.coherenceProtocol;
  const mechanism = cfg.coherenceMechanism;

  const coherenceEvents = sim?.coherenceEvents.slice(-20) ?? [];
  const directory = sim?.directory;

  const stateColors: Record<string, string> = {
    M: 'var(--red)',
    E: 'var(--accent)',
    S: 'var(--green)',
    I: 'var(--text-muted)',
    V: 'var(--blue)',
  };

  const stateBgColors: Record<string, string> = {
    M: 'var(--red-bg)',
    E: 'var(--accent-glow)',
    S: 'var(--green-bg)',
    I: 'var(--bg-base)',
    V: 'var(--blue-bg)',
  };

  const statesForProtocol = protocol === 'VI' ? ['V', 'I'] : protocol === 'MSI' ? ['M', 'S', 'I'] : ['M', 'E', 'S', 'I'];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Cache & Coherence</h1>
            <p className="page-subtitle">MESI · MSI · VI · Dragon · Snooping · Directory</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted">Protocol:</span>
            {(['VI', 'MSI', 'MESI', 'Dragon'] as CoherenceProtocol[]).map(p => (
              <button
                key={p}
                className={`btn btn-sm ${cfg.coherenceProtocol === p ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => updateConfig({ coherenceProtocol: p })}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        {([
          ['state', 'MESI State Machine'],
          ['events', 'Coherence Events'],
          ['directory', 'Directory / Snooping'],
          ['protocols', 'Protocol Comparison'],
        ] as [MechTab, string][]).map(([t, l]) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* State machine tab */}
      {tab === 'state' && (
        <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 16 }}>
          <div className="panel">
            <div className="panel-header">
              <span>{protocol} States</span>
              <span className="panel-tag">{mechanism}</span>
            </div>
            <div className="panel-body">
              <div className="state-diagram mb-4">
                {statesForProtocol.map(s => (
                  <div
                    key={s}
                    className="state-box"
                    onClick={() => setSelectedState(s)}
                    style={{
                      borderColor: stateColors[s],
                      background: selectedState === s ? stateBgColors[s] : 'var(--bg-base)',
                      color: stateColors[s],
                      cursor: 'pointer',
                      boxShadow: selectedState === s ? `0 0 0 2px ${stateColors[s]}40` : 'none',
                    }}
                  >
                    {s}
                    <div style={{ fontSize: '0.65rem', fontWeight: 400, marginTop: 4, color: 'var(--text-muted)' }}>
                      {stateLabel(s as 'M' | 'E' | 'S' | 'I' | 'V')}
                    </div>
                  </div>
                ))}
              </div>

              {/* State description */}
              <div style={{
                background: stateBgColors[selectedState] ?? 'var(--bg-base)',
                border: `1px solid ${stateColors[selectedState] ?? 'var(--border)'}44`,
                borderRadius: 5, padding: 12,
              }}>
                <div style={{ fontSize: '0.72rem', color: stateColors[selectedState], fontWeight: 700, marginBottom: 6 }}>
                  {selectedState} — {stateLabel(selectedState as 'M' | 'E' | 'S' | 'I' | 'V')}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {selectedState === 'M' && 'Cache line is modified. Local copy is the only valid copy. Must write back on eviction.'}
                  {selectedState === 'E' && 'Cache line is exclusive. Only this core has the line. Clean (matches memory). Can transition to M without bus transaction.'}
                  {selectedState === 'S' && 'Cache line is shared. Multiple cores may have valid copies. Cannot write without first invalidating/upgrading.'}
                  {selectedState === 'I' && 'Cache line is invalid. This core does not have a valid copy. Must fetch from bus/directory on access.'}
                  {selectedState === 'V' && 'Cache line is valid (VI protocol simplified version of shared state).'}
                </div>
              </div>

              {/* Per-core cache states */}
              <div className="section-divider" />
              <div className="form-label mb-2">Current Cache States</div>
              {sim ? (
                <table className="data-table" style={{ fontSize: '0.72rem' }}>
                  <thead>
                    <tr><th>Core</th><th>Line 0</th><th>Line 1</th><th>Line 2</th><th>Line 3</th></tr>
                  </thead>
                  <tbody>
                    {sim.caches.filter(c => c.config.level === 'L1').map((cache, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--accent)' }}>C{i}</td>
                        {cache.lines.slice(0, 4).map((line, j) => (
                          <td key={j}><span className={`cache-state ${line.state}`}>{line.state}</span></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-xs text-muted">Run simulation to see live cache states.</div>
              )}
            </div>
          </div>

          {/* Transitions */}
          <div className="panel">
            <div className="panel-header">
              <span>State Transitions from {selectedState}</span>
            </div>
            <div className="panel-body">
              {(MESI_TRANSITIONS[selectedState] ?? []).length === 0 ? (
                <div className="text-xs text-muted">No transitions defined for this state.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(MESI_TRANSITIONS[selectedState] ?? []).map((t, i) => (
                    <div key={i} style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border-accent)',
                      borderRadius: 5, padding: 12,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                        <span className={`cache-state ${t.from}`}>{t.from}</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border-accent)', position: 'relative' }}>
                          <div style={{
                            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                            borderLeft: '6px solid var(--border-accent)',
                            borderTop: '3px solid transparent', borderBottom: '3px solid transparent',
                          }} />
                        </div>
                        <span className={`cache-state ${t.to}`}>{t.to}</span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                        <strong>Trigger:</strong> {t.trigger}
                      </div>
                      {t.action && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--amber)' }}>
                          → Bus action: {t.action}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Protocol explanation */}
              <div className="section-divider" />
              <div className="form-label mb-2">Protocol: {protocol}</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {protocol === 'MESI' && (
                  <ul style={{ paddingLeft: 16 }}>
                    <li>4 states: Modified, Exclusive, Shared, Invalid</li>
                    <li>E state avoids upgrade bus transaction on first write</li>
                    <li>Reduces bus traffic vs MSI for single-copy workloads</li>
                    <li>Used in Intel processors, most modern designs</li>
                  </ul>
                )}
                {protocol === 'MSI' && (
                  <ul style={{ paddingLeft: 16 }}>
                    <li>3 states: Modified, Shared, Invalid</li>
                    <li>No Exclusive state — all reads initially go to Shared</li>
                    <li>Requires upgrade transaction even if only one reader</li>
                    <li>Simpler but potentially more bus traffic than MESI</li>
                  </ul>
                )}
                {protocol === 'VI' && (
                  <ul style={{ paddingLeft: 16 }}>
                    <li>2 states: Valid, Invalid</li>
                    <li>Simplest protocol — write triggers invalidation</li>
                    <li>No shared state — all writes must invalidate</li>
                    <li>High bus traffic, suitable for write-once data</li>
                  </ul>
                )}
                {protocol === 'Dragon' && (
                  <ul style={{ paddingLeft: 16 }}>
                    <li>Update-based protocol (vs invalidate-based)</li>
                    <li>On write: broadcast new value to all sharers</li>
                    <li>Reduces cache misses but increases bus bandwidth</li>
                    <li>Educational simulation model</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events tab */}
      {tab === 'events' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Coherence Events</span>
              <span className="panel-tag">{sim?.coherenceEvents.length ?? 0} total</span>
            </div>
            <span className="text-xs text-muted">Showing last 20</span>
          </div>
          <div className="panel-body">
            {coherenceEvents.length === 0 ? (
              <div className="alert alert-info">Run simulation to see coherence events.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Cycle</th><th>Core</th><th>Address</th><th>Type</th><th>From</th><th>To</th><th>Broadcast</th></tr>
                </thead>
                <tbody>
                  {coherenceEvents.map((ev, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{ev.cycle}</td>
                      <td style={{ color: 'var(--accent)' }}>C{ev.coreId}</td>
                      <td>0x{ev.address.toString(16).toUpperCase()}</td>
                      <td style={{
                        color: ev.type === 'INVALIDATE' ? 'var(--red)' :
                          ev.type === 'WRITE' ? 'var(--amber)' : 'var(--text-secondary)',
                      }}>{ev.type}</td>
                      <td><span className={`cache-state ${ev.fromState}`}>{ev.fromState}</span></td>
                      <td><span className={`cache-state ${ev.toState}`}>{ev.toState}</span></td>
                      <td>{ev.broadcast ? <span className="badge badge-accent">BCAST</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {sim && (
              <div className="grid grid-4 gap-3 mt-4">
                <div className="metric-tile">
                  <div className="metric-label">Total Messages</div>
                  <div className="metric-value">{sim.metrics.coherenceMessages}</div>
                </div>
                <div className="metric-tile red">
                  <div className="metric-label">Invalidations</div>
                  <div className="metric-value">{sim.metrics.invalidations}</div>
                </div>
                <div className="metric-tile amber">
                  <div className="metric-label">Bus Transactions</div>
                  <div className="metric-value">{sim.metrics.busTransactions}</div>
                </div>
                <div className="metric-tile">
                  <div className="metric-label">Protocol</div>
                  <div className="metric-value" style={{ fontSize: '1rem' }}>{protocol}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory tab */}
      {tab === 'directory' && (
        <div className="grid grid-2 gap-4">
          <div className="panel">
            <div className="panel-header">
              <span>Mechanism: {mechanism}</span>
              <div className="toggle-group" style={{ width: 'fit-content' }}>
                <button className={`toggle-option ${mechanism === 'Snooping' ? 'active' : ''}`}
                  onClick={() => updateConfig({ coherenceMechanism: 'Snooping' })} style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                  Snooping
                </button>
                <button className={`toggle-option ${mechanism === 'Directory' ? 'active' : ''}`}
                  onClick={() => updateConfig({ coherenceMechanism: 'Directory' })} style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                  Directory
                </button>
              </div>
            </div>
            <div className="panel-body">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                {mechanism === 'Snooping'
                  ? '→ All caches monitor (snoop) a shared bus. Each cache controller watches bus transactions and reacts to maintain coherence. Simple but scales poorly.'
                  : '→ A central directory tracks which caches hold each memory block. Messages go directly to relevant caches. Scalable to many cores.'}
              </div>
              <div className="grid grid-2 gap-3">
                {['Snooping', 'Directory'].map(m => (
                  <div key={m} style={{
                    background: mechanism === m ? 'var(--accent-glow)' : 'var(--bg-base)',
                    border: `1px solid ${mechanism === m ? 'rgba(0,180,216,0.3)' : 'var(--border)'}`,
                    borderRadius: 5, padding: 12,
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: mechanism === m ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 8 }}>{m}</div>
                    <ul style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', paddingLeft: 14, lineHeight: 1.8 }}>
                      {m === 'Snooping' ? (
                        <>
                          <li>Broadcast-based</li>
                          <li>Low core counts (&lt;16)</li>
                          <li>Simple implementation</li>
                          <li>Bus bandwidth limited</li>
                        </>
                      ) : (
                        <>
                          <li>Point-to-point messages</li>
                          <li>Scalable (&gt;16 cores)</li>
                          <li>Directory overhead</li>
                          <li>NUMA friendly</li>
                        </>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span>Directory State</span>
              <span className="panel-tag">{sim ? `${directory?.size ?? 0} entries` : 'no data'}</span>
            </div>
            <div className="panel-body">
              {(!sim || !directory || directory.size === 0) ? (
                <div className="alert alert-info">
                  {mechanism === 'Directory' ? 'Run simulation with Directory mechanism to see entries.' : 'Directory not active in Snooping mode.'}
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr><th>Address</th><th>State</th><th>Owner</th><th>Sharers</th></tr>
                  </thead>
                  <tbody>
                    {Array.from(directory.entries()).slice(0, 12).map(([addr, entry]) => (
                      <tr key={addr}>
                        <td>0x{addr.toString(16).toUpperCase()}</td>
                        <td>
                          <span className={`badge ${
                            entry.state === 'MODIFIED' ? 'badge-urgent' :
                            entry.state === 'SHARED'   ? 'badge-success' :
                            entry.state === 'EXCLUSIVE' ? 'badge-accent' : 'badge-normal'
                          }`}>{entry.state}</span>
                        </td>
                        <td>{entry.owner >= 0 ? `C${entry.owner}` : '—'}</td>
                        <td>{entry.sharers.length > 0 ? entry.sharers.map(s => `C${s}`).join(', ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Protocol comparison tab */}
      {tab === 'protocols' && (
        <div className="panel">
          <div className="panel-header"><span>Protocol Comparison</span></div>
          <div className="panel-body">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>VI</th>
                  <th>MSI</th>
                  <th>MESI</th>
                  <th>Dragon (Update)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['States', '2', '3', '4', '4'],
                  ['Type', 'Invalidate', 'Invalidate', 'Invalidate', 'Update'],
                  ['Exclusive State', '—', '—', 'Yes (E)', '—'],
                  ['Write → Miss', 'Invalidate all', 'BusWrite', 'BusUpgrade', 'BroadcastUpdate'],
                  ['Read → Miss', 'BusRead', 'BusRead', 'BusRead', 'BusRead'],
                  ['Write-back', 'On eviction', 'On eviction', 'On eviction', 'Immediate'],
                  ['Bus traffic', 'High', 'Medium', 'Low', 'Variable'],
                  ['Complexity', 'Simple', 'Simple', 'Medium', 'Medium'],
                  ['Common use', 'Educational', 'Research', 'Intel, AMD', 'Research'],
                ].map(row => (
                  <tr key={row[0]}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row[0]}</td>
                    {row.slice(1).map((v, i) => (
                      <td key={i} style={{
                        color: ['MESI', 'Yes (E)'].includes(v) ? 'var(--green)' : v === '—' ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

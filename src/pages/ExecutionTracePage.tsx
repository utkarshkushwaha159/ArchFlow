import { useState, useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { EventComponent } from '../types';

const COMPONENTS: EventComponent[] = ['FETCH', 'DECODE', 'ALU', 'CACHE', 'MEMORY', 'COHERENCE', 'INTERCONNECT', 'CONTROL', 'SYNC', 'PIPELINE'];

const componentColors: Record<EventComponent, string> = {
  FETCH:       'var(--blue)',
  DECODE:      'var(--accent)',
  ALU:         'var(--amber)',
  CACHE:       'var(--green)',
  MEMORY:      'var(--red)',
  COHERENCE:   'var(--text-secondary)',
  INTERCONNECT:'var(--blue)',
  CONTROL:     'var(--text-muted)',
  SYNC:        'var(--amber)',
  PIPELINE:    'var(--accent)',
};

export default function ExecutionTracePage() {
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Execution Trace</h1>
        <p className="page-subtitle">Cycle-by-cycle trace · Filter by core, component, instruction</p>
      </div>

      {/* Filters */}
      <div className="panel mb-4">
        <div className="panel-header"><span>Filters</span></div>
        <div className="panel-body">
          <div className="flex gap-4 items-center flex-wrap">
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
            <div style={{ alignSelf: 'flex-end' }}>
              <span className="badge badge-accent">{events.length} events</span>
            </div>
          </div>
        </div>
      </div>

      {!sim ? (
        <div className="alert alert-info">
          Run a simulation to generate the execution trace.
        </div>
      ) : (
        <>
          {/* Trace table */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>Execution Trace</span>
                <span className="panel-tag">{sim.executionLog.length} total events</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
              <table className="data-table">
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>
                  <tr>
                    <th>Cycle</th>
                    <th>Core</th>
                    <th>Stage</th>
                    <th>Instruction</th>
                    <th>Component</th>
                    <th>Event</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 200).map(ev => (
                    <tr key={ev.id}>
                      <td className="log-cycle">{String(ev.cycle).padStart(3, '0')}</td>
                      <td className="log-core">P{ev.coreId}</td>
                      <td className="log-stage">{ev.stage ?? '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--amber)' }}>
                        {ev.instruction}
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.68rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                          color: componentColors[ev.component],
                        }}>
                          {ev.component}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{ev.event}</td>
                      <td style={{
                        fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                        color: ev.result.includes('HIT') ? 'var(--green)' :
                          ev.result.includes('MISS') || ev.result.includes('ERROR') ? 'var(--red)' :
                          ev.result.includes('stall') || ev.result.includes('HALT') ? 'var(--amber)' :
                          'var(--text-secondary)',
                      }}>
                        {ev.result}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {events.length > 200 && (
                <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Showing first 200 of {events.length} events. Use filters to narrow results.
                </div>
              )}
            </div>
          </div>

          {/* Component legend */}
          <div className="panel mt-4">
            <div className="panel-header"><span>Component Legend</span></div>
            <div className="panel-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {COMPONENTS.map(c => (
                  <span key={c} style={{
                    padding: '3px 10px', borderRadius: 3, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                    color: componentColors[c],
                    background: `${componentColors[c]}18`,
                    border: `1px solid ${componentColors[c]}33`,
                  }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

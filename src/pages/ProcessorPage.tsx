import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { decodeInstruction, getMicroOps, getControlSignals } from '../simulation/controlUnit';

export default function ProcessorPage() {
  const { state, runSim } = useSimulation();
  const sim = state.simulation;
  const cfg = state.currentConfig;
  const [selectedCoreId, setSelectedCoreId] = useState(0);
  const [controlType, setControlType] = useState(cfg.controlUnitType);

  const core = sim?.cores[selectedCoreId];
  const instr = sim?.instructions[Math.min(selectedCoreId * 3, (sim?.instructions.length ?? 1) - 1)];
  const microOps = instr ? getMicroOps(instr, controlType) : [];
  const controlSig = instr ? getControlSignals(instr.opcode) : null;
  const decoded = instr ? decodeInstruction(instr, cfg.isa === 'RISC') : null;

  const reg = core?.registers;
  const GP = reg?.GP ?? new Array(8).fill(0);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Processor</h1>
            <p className="page-subtitle">Register file · Instruction decode · Control unit · Execution cycle</p>
          </div>
          <button className="btn btn-primary" onClick={runSim} disabled={state.isRunning}>
            {state.isRunning ? '⏳' : '▶ Run'}
          </button>
        </div>
      </div>

      {/* Core selector */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: cfg.numCores }, (_, i) => {
          const c = sim?.cores[i];
          return (
            <button
              key={i}
              className={`btn ${selectedCoreId === i ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCoreId(i)}
            >
              Core {i}
              {c && <span style={{ marginLeft: 6, opacity: 0.7 }}> · {c.status}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Registers */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Register File</span>
              <span className="panel-tag">CORE {selectedCoreId}</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="flex flex-col gap-2">
              {[
                ['PC',  `0x${(reg?.PC ?? 0x0040).toString(16).toUpperCase().padStart(4, '0')}`],
                ['IR',  reg?.IR ?? 'NOP'],
                ['MAR', `0x${(reg?.MAR ?? 0).toString(16).toUpperCase().padStart(4, '0')}`],
                ['MDR', `0x${(reg?.MDR ?? 0).toString(16).toUpperCase().padStart(4, '0')}`],
                ['ACC', reg?.ACC ?? 0],
                ['SP',  `0x${(reg?.SP ?? 0x8000).toString(16).toUpperCase().padStart(4, '0')}`],
              ].map(([name, val]) => (
                <div key={name as string} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '7px 10px',
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minWidth: 36 }}>{name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{val}</span>
                </div>
              ))}
            </div>

            <div className="section-divider" />
            <div className="form-label mb-2">General Purpose Registers</div>
            <div className="register-table">
              {GP.map((val, i) => (
                <div key={i} className={`register-cell ${val !== 0 && sim ? 'changed' : ''}`}>
                  <div className="reg-name">R{i}</div>
                  <div className="reg-value">{`0x${val.toString(16).toUpperCase().padStart(4, '0')}`}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{val}</div>
                </div>
              ))}
            </div>

            <div className="section-divider" />
            <div className="form-label mb-2">Status / Flag Register</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(reg?.SR ?? { zero: false, carry: false, sign: false, overflow: false, parity: false }).map(([flag, val]) => (
                <div key={flag} style={{
                  padding: '3px 8px',
                  background: val ? 'var(--green-bg)' : 'var(--bg-base)',
                  border: `1px solid ${val ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                  borderRadius: 3, fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                  color: val ? 'var(--green)' : 'var(--text-muted)',
                }}>
                  {flag.slice(0, 1).toUpperCase()}{flag.slice(1)}: {val ? '1' : '0'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instruction decode */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Instruction Decode</span>
              <span className="panel-tag">{cfg.isa}</span>
            </div>
          </div>
          <div className="panel-body">
            {!instr ? (
              <div className="alert alert-info">Run simulation to populate instruction data.</div>
            ) : (
              <>
                {/* Current instruction */}
                <div style={{ background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 4, padding: '10px 12px', marginBottom: 12 }}>
                  <div className="form-label mb-1">Current Instruction</div>
                  <div className="text-mono" style={{ fontSize: '0.9rem', color: 'var(--accent)' }}>
                    {instr.opcode}{' '}
                    {[instr.operand1, instr.operand2, instr.operand3].filter(Boolean).join(', ')}
                  </div>
                  {instr.comment && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>; {instr.comment}</div>}
                </div>

                {/* Decoded fields */}
                {decoded && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="form-label mb-2">Decoded Fields ({decoded.type}-type)</div>
                    {Object.entries(decoded.fields).map(([k, v]) => (
                      <div key={k} className="flex justify-between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '0.78rem' }}>
                        <span className="text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem' }}>{k}</span>
                        <span className="text-mono text-primary">{String(v)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between" style={{ padding: '4px 0', fontSize: '0.78rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.68rem' }}>CYCLES</span>
                      <span className="text-mono" style={{ color: 'var(--amber)' }}>{decoded.cycleCount}</span>
                    </div>
                  </div>
                )}

                {/* Pipeline stages */}
                <div className="form-label mb-2">5-Stage Pipeline</div>
                <div className="pipeline-stages">
                  {(['IF', 'ID', 'EX', 'MEM', 'WB'] as const).map(stage => {
                    const coreStage = core?.currentStage;
                    const isActive = stage === coreStage || (sim?.status === 'COMPLETED' && stage === 'WB');
                    return (
                      <div key={stage} className={`pipeline-stage ${isActive ? 'active' : ''}`}>
                        <div className="stage-name">{stage}</div>
                        {isActive && <div className="stage-instr">{instr.opcode}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Control signals */}
                {controlSig && (
                  <div style={{ marginTop: 12 }}>
                    <div className="form-label mb-2">Control Signals</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(controlSig).map(([sig, val]) => (
                        <span key={sig} style={{
                          padding: '2px 7px', borderRadius: 3, fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                          background: val ? 'var(--accent-glow)' : 'var(--bg-base)',
                          border: `1px solid ${val ? 'rgba(0,180,216,0.3)' : 'var(--border)'}`,
                          color: val ? 'var(--accent)' : 'var(--text-muted)',
                        }}>
                          {sig}={String(val)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Control Unit + Micro-ops */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Control Unit</span>
            </div>
            <div className="toggle-group" style={{ width: 'fit-content' }}>
              <button className={`toggle-option ${controlType === 'Hardwired' ? 'active' : ''}`} onClick={() => setControlType('Hardwired')} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Hardwired</button>
              <button className={`toggle-option ${controlType === 'Microprogrammed' ? 'active' : ''}`} onClick={() => setControlType('Microprogrammed')} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Micro</button>
            </div>
          </div>
          <div className="panel-body">
            <div style={{ marginBottom: 10, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {controlType === 'Hardwired'
                ? '→ Combinational logic directly generates control signals from opcode bits. Faster but less flexible.'
                : '→ Microprogram ROM is indexed by opcode. Each micro-instruction generates one set of control signals.'}
            </div>

            {microOps.length > 0 && (
              <div className="flex flex-col gap-1">
                {microOps.map((op, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    background: i === 0 || i === 1 ? 'var(--blue-bg)' : i === 2 || i === 3 ? 'var(--accent-glow)' : 'var(--bg-base)',
                    border: `1px solid ${i < 2 ? 'rgba(96,165,250,0.15)' : 'var(--border)'}`,
                    borderRadius: 3, padding: '5px 8px',
                  }}>
                    <span className="text-mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)', minWidth: 20 }}>{String(op.step).padStart(2, '0')}</span>
                    <div>
                      <div className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--amber)' }}>{op.signal}</div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{op.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!instr && (
              <div className="alert alert-info" style={{ fontSize: '0.75rem' }}>
                Run simulation to see micro-operation sequence.
              </div>
            )}

            {/* RISC vs CISC info */}
            <div className="section-divider" />
            <div className="form-label mb-2">ISA Characteristics ({cfg.isa})</div>
            {cfg.isa === 'RISC' ? (
              <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Fixed 4-byte instruction format</li>
                <li>Load/Store architecture (no mem-reg ops)</li>
                <li>Large register file (R0-R7)</li>
                <li>1 cycle for most operations</li>
                <li>Pipeline-friendly design</li>
              </ul>
            ) : (
              <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
                <li>Variable instruction length</li>
                <li>Memory-register operations allowed</li>
                <li>Complex addressing modes</li>
                <li>More work per instruction</li>
                <li>More complex decode logic</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Instruction stream */}
      {sim && (
        <div className="panel mt-4">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Complete Instruction Stream</span>
              <span className="panel-tag">{sim.instructions.length} instrs</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="instruction-stream">
              {sim.instructions.map((instr, i) => (
                <div className="instr-line" key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="instr-addr">0x{instr.address.toString(16).toUpperCase()}</span>
                  <span className="instr-op">{instr.opcode}</span>
                  <span className="instr-args">
                    {[instr.operand1, instr.operand2, instr.operand3].filter(Boolean).join(', ')}
                    {instr.memAddress ? `, [0x${instr.memAddress.toString(16)}]` : ''}
                  </span>
                  <span className="instr-comment">{instr.comment && '; ' + instr.comment}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{instr.cycles}cy</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

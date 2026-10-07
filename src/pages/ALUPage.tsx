import { useState } from 'react';
import { executeALU, boothMultiply, arrayMultiply, toIEEE754, ieee754Op, toBinary } from '../simulation/alu';
import type { ALUOperation } from '../types';

const OPERATIONS: ALUOperation[] = ['ADD', 'SUB', 'MUL', 'DIV', 'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'CMP'];

type Tab = 'alu' | 'booth' | 'array' | 'ieee754';

export default function ALUPage() {
  const [tab, setTab] = useState<Tab>('alu');

  // ALU Lab state
  const [opA, setOpA] = useState('12');
  const [opB, setOpB] = useState('5');
  const [op, setOp] = useState<ALUOperation>('ADD');
  const [aluResult, setAluResult] = useState<ReturnType<typeof executeALU> | null>(null);
  const [aluError, setAluError] = useState('');

  // Booth state
  const [boothA, setBoothA] = useState('7');
  const [boothB, setBoothB] = useState('5');
  const [boothResult, setBoothResult] = useState<ReturnType<typeof boothMultiply> | null>(null);

  // Array multiplier state
  const [arrA, setArrA] = useState('6');
  const [arrB, setArrB] = useState('5');
  const [arrResult, setArrResult] = useState<ReturnType<typeof arrayMultiply> | null>(null);

  // IEEE 754 state
  const [fp754, setFp754] = useState('3.14');
  const [fpB, setFpB] = useState('2.0');
  const [fpOp, setFpOp] = useState<'ADD' | 'SUB' | 'MUL' | 'DIV'>('ADD');
  const [fpResult, setFpResult] = useState<ReturnType<typeof ieee754Op> | null>(null);
  const [fpRep, setFpRep] = useState<ReturnType<typeof toIEEE754> | null>(null);

  function runALU() {
    try {
      setAluError('');
      const a = parseInt(opA, 10);
      const b = parseInt(opB, 10);
      if (isNaN(a) || isNaN(b)) { setAluError('Invalid integer operands'); return; }
      setAluResult(executeALU(op, a, b));
    } catch (e) {
      setAluError((e as Error).message);
    }
  }

  function runBooth() {
    const a = parseInt(boothA, 10);
    const b = parseInt(boothB, 10);
    if (isNaN(a) || isNaN(b)) return;
    setBoothResult(boothMultiply(a, b));
  }

  function runArray() {
    const a = parseInt(arrA, 10);
    const b = parseInt(arrB, 10);
    if (isNaN(a) || isNaN(b)) return;
    setArrResult(arrayMultiply(Math.abs(a), Math.abs(b), 8));
  }

  function runFP() {
    try {
      const a = parseFloat(fp754);
      const b = parseFloat(fpB);
      setFpRep(toIEEE754(a));
      setFpResult(ieee754Op(a, b, fpOp));
    } catch (e) {
      // ignore
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">ALU & Arithmetic</h1>
        <p className="page-subtitle">Arithmetic Logic Unit · Booth Algorithm · Array Multiplier · IEEE 754</p>
      </div>

      <div className="tabs">
        {([['alu', 'ALU Lab'], ['booth', 'Booth Multiplication'], ['array', 'Array Multiplier'], ['ieee754', 'IEEE 754 / FP']] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ALU Lab */}
      {tab === 'alu' && (
        <div className="grid grid-2 gap-4">
          <div className="panel">
            <div className="panel-header"><span>ALU Input</span><span className="panel-tag">INTEGER</span></div>
            <div className="panel-body">
              <div className="grid grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Operand A</label>
                  <input type="number" className="form-control form-control-mono" value={opA} onChange={e => setOpA(e.target.value)} />
                  <div className="text-xs text-muted mt-1">{toBinary(parseInt(opA) || 0, 16)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Operand B {op === 'NOT' && '(unused)'}</label>
                  <input type="number" className="form-control form-control-mono" value={opB}
                    onChange={e => setOpB(e.target.value)} disabled={op === 'NOT'} />
                  <div className="text-xs text-muted mt-1">{toBinary(parseInt(opB) || 0, 16)}</div>
                </div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Operation</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {OPERATIONS.map(o => (
                    <button
                      key={o}
                      className={`btn btn-sm ${op === o ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setOp(o)}
                    >{o}</button>
                  ))}
                </div>
              </div>
              {aluError && <div className="alert alert-error mb-3">{aluError}</div>}
              <button className="btn btn-primary w-full" onClick={runALU}>Execute ALU</button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span>ALU Result</span></div>
            <div className="panel-body">
              {!aluResult ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                  Configure operands and click Execute
                </div>
              ) : (
                <>
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 5, padding: 14, marginBottom: 12 }}>
                    <div className="form-label mb-1">Result</div>
                    <div className="text-mono" style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>{aluResult.result}</div>
                    <div className="text-mono text-xs text-muted">{aluResult.binaryResult}</div>
                  </div>

                  <div className="grid grid-2 gap-2 mb-3">
                    {[
                      ['Input A', aluResult.inputA, aluResult.binaryA],
                      ['Input B', aluResult.inputB, aluResult.binaryB],
                    ].map(([l, d, b]) => (
                      <div key={l as string} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 10px' }}>
                        <div className="form-label">{l}</div>
                        <div className="text-mono" style={{ color: 'var(--text-primary)' }}>{d}</div>
                        <div className="text-mono text-xs text-muted">{b}</div>
                      </div>
                    ))}
                  </div>

                  {/* Flags */}
                  <div className="form-label mb-2">Flags</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {Object.entries(aluResult.flags).map(([f, v]) => (
                      <div key={f} style={{
                        padding: '4px 10px', borderRadius: 3, fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                        background: v ? 'var(--green-bg)' : 'var(--bg-base)',
                        border: `1px solid ${v ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                        color: v ? 'var(--green)' : 'var(--text-muted)',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '0.6rem' }}>{f}</div>
                        <div style={{ fontWeight: 700 }}>{v ? '1' : '0'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Steps */}
                  <div className="form-label mb-2">Execution Steps</div>
                  {aluResult.steps.map(step => (
                    <div key={step.stepNumber} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="text-muted" style={{ marginRight: 8 }}>Step {step.stepNumber}:</span>
                      {step.description}
                    </div>
                  ))}
                  <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Execution latency: <span className="text-mono" style={{ color: 'var(--amber)' }}>{aluResult.cycles} cycle{aluResult.cycles > 1 ? 's' : ''}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booth Multiplication */}
      {tab === 'booth' && (
        <div className="grid grid-2 gap-4">
          <div className="panel">
            <div className="panel-header"><span>Booth Algorithm</span><span className="panel-tag">SIGNED MUL</span></div>
            <div className="panel-body">
              <div className="alert alert-info mb-3" style={{ fontSize: '0.75rem' }}>
                Educational simulation of Booth's multiplication algorithm. Each iteration shown step by step. Not just A×B displayed.
              </div>
              <div className="grid grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Multiplier (M)</label>
                  <input type="number" className="form-control form-control-mono" value={boothA} onChange={e => setBoothA(e.target.value)} />
                  <div className="text-xs text-muted mt-1">{toBinary(parseInt(boothA) || 0, 8)}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Multiplicand (Q)</label>
                  <input type="number" className="form-control form-control-mono" value={boothB} onChange={e => setBoothB(e.target.value)} />
                  <div className="text-xs text-muted mt-1">{toBinary(parseInt(boothB) || 0, 8)}</div>
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={runBooth}>Run Booth Algorithm</button>

              {boothResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 5, padding: 12, textAlign: 'center' }}>
                    <div className="form-label">Final Result</div>
                    <div className="text-mono" style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>
                      {boothResult.multiplier} × {boothResult.multiplicand} = {boothResult.result}
                    </div>
                    <div className="text-mono text-xs text-muted">{toBinary(boothResult.result, 16)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span>Iteration Steps</span></div>
            <div className="panel-body">
              {!boothResult ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>Configure operands and run</div>
              ) : (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>A (Binary)</th>
                        <th>Q (Binary)</th>
                        <th>Q₋₁</th>
                        <th>Operation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ color: 'var(--text-muted)' }}>Init</td>
                        <td>{toBinary(0, 8)}</td>
                        <td>{toBinary(boothResult.multiplier, 8)}</td>
                        <td>0</td>
                        <td style={{ color: 'var(--text-muted)' }}>Initialize</td>
                      </tr>
                      {boothResult.steps.map(step => (
                        <tr key={step.iteration}>
                          <td style={{ color: 'var(--accent)' }}>{step.iteration}</td>
                          <td style={{ color: step.operation.includes('−') ? 'var(--red)' : step.operation.includes('+') ? 'var(--green)' : 'inherit' }}>
                            {step.A_binary}
                          </td>
                          <td>{step.Q_binary}</td>
                          <td style={{ color: step.Q_minus1 ? 'var(--green)' : 'var(--text-muted)' }}>{step.Q_minus1}</td>
                          <td style={{ color: step.operation === 'No operation' ? 'var(--text-muted)' : 'var(--amber)' }}>{step.operation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Array Multiplier */}
      {tab === 'array' && (
        <div className="grid grid-2 gap-4">
          <div className="panel">
            <div className="panel-header"><span>Array Multiplier</span><span className="panel-tag">PARTIAL PRODUCTS</span></div>
            <div className="panel-body">
              <div className="alert alert-info mb-3" style={{ fontSize: '0.75rem' }}>
                Generates partial products for each bit of the multiplier, then sums them. Uses unsigned 8-bit inputs.
              </div>
              <div className="grid grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Multiplicand A</label>
                  <input type="number" min="0" max="255" className="form-control form-control-mono" value={arrA} onChange={e => setArrA(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Multiplier B</label>
                  <input type="number" min="0" max="255" className="form-control form-control-mono" value={arrB} onChange={e => setArrB(e.target.value)} />
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={runArray}>Compute Array Multiplication</button>
              {arrResult && (
                <div style={{ marginTop: 16, background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 5, padding: 12, textAlign: 'center' }}>
                  <div className="form-label">Result</div>
                  <div className="text-mono" style={{ fontSize: '1.4rem', color: 'var(--accent)' }}>
                    {arrResult.multiplicand} × {arrResult.multiplier} = {arrResult.result}
                  </div>
                  <div className="text-mono text-xs text-muted">{arrResult.binaryResult}</div>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span>Partial Products</span></div>
            <div className="panel-body">
              {!arrResult ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>Enter operands and compute</div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: 8, marginBottom: 4 }}>
                    <span className="form-label">Bit</span>
                    <span className="form-label">Partial Product (shifted)</span>
                    <span className="form-label">Value</span>
                  </div>
                  {arrResult.partialProducts.map((pp, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '60px 1fr 80px', gap: 8,
                      background: arrResult.partialValues[i] !== 0 ? 'var(--bg-elevated)' : 'var(--bg-base)',
                      border: `1px solid ${arrResult.partialValues[i] !== 0 ? 'var(--border-accent)' : 'var(--border)'}`,
                      borderRadius: 3, padding: '5px 8px',
                    }}>
                      <span className="text-mono text-xs" style={{ color: ((parseInt(arrB) >> i) & 1) ? 'var(--green)' : 'var(--text-muted)' }}>
                        b{i}={((parseInt(arrB) >> i) & 1)}
                      </span>
                      <span className="text-mono text-xs" style={{ color: 'var(--blue)', letterSpacing: '0.05em' }}>
                        {pp.slice(0, 16)}…
                      </span>
                      <span className="text-mono text-xs" style={{ color: 'var(--accent)', textAlign: 'right' }}>
                        {arrResult.partialValues[i]}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, borderTop: '2px solid var(--accent)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">Sum of partial products</span>
                    <span className="text-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{arrResult.result}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IEEE 754 */}
      {tab === 'ieee754' && (
        <div className="grid grid-2 gap-4">
          <div className="panel">
            <div className="panel-header"><span>IEEE 754 Representation</span><span className="panel-tag">SINGLE PRECISION</span></div>
            <div className="panel-body">
              <div className="form-group mb-3">
                <label className="form-label">Decimal Value</label>
                <input type="number" step="any" className="form-control form-control-mono" value={fp754} onChange={e => setFp754(e.target.value)} />
              </div>
              <button className="btn btn-secondary w-full mb-3" onClick={() => setFpRep(toIEEE754(parseFloat(fp754)))}>
                Inspect IEEE 754
              </button>
              {fpRep && (
                <div style={{ marginTop: 8 }}>
                  {/* Bit representation */}
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 5, padding: 10, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', gap: 2, fontSize: '0.75rem', marginBottom: 4 }}>
                      <span style={{ padding: '2px 6px', background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3 }}>
                        {fpRep.signBit}
                      </span>
                      <span style={{ padding: '2px 6px', background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 3 }}>
                        {fpRep.exponentBits}
                      </span>
                      <span style={{ padding: '2px 6px', background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 3, letterSpacing: '0.08em' }}>
                        {fpRep.mantissaBits.slice(0, 16)}…
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--red)' }}>Sign(1)</span>
                      <span style={{ color: 'var(--amber)' }}>Exponent(8)</span>
                      <span style={{ color: 'var(--blue)' }}>Mantissa(23)</span>
                    </div>
                  </div>

                  {[
                    ['Decimal', fpRep.decimal],
                    ['Sign', fpRep.sign === 0 ? '0 (positive)' : '1 (negative)'],
                    ['Biased Exponent', fpRep.biasedExponent + ` (= ${fpRep.exponent} + 127)`],
                    ['True Exponent', fpRep.exponent],
                    ['Mantissa (int)', fpRep.mantissa],
                  ].map(([l, v]) => (
                    <div key={l as string} className="flex justify-between" style={{ borderBottom: '1px solid var(--border)', padding: '5px 0', fontSize: '0.78rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.68rem' }}>{l}</span>
                      <span className="text-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><span>FP Arithmetic</span></div>
            <div className="panel-body">
              <div className="grid grid-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Operand A</label>
                  <input type="number" step="any" className="form-control form-control-mono" value={fp754} onChange={e => setFp754(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Operand B</label>
                  <input type="number" step="any" className="form-control form-control-mono" value={fpB} onChange={e => setFpB(e.target.value)} />
                </div>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Operation</label>
                <div className="toggle-group">
                  {(['ADD', 'SUB', 'MUL', 'DIV'] as const).map(o => (
                    <button key={o} className={`toggle-option ${fpOp === o ? 'active' : ''}`} onClick={() => setFpOp(o)}>{o}</button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={runFP}>Compute Floating Point</button>

              {fpResult && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ background: 'var(--bg-base)', border: '1px solid var(--accent)', borderRadius: 5, padding: 12, marginBottom: 12, textAlign: 'center' }}>
                    <div className="form-label">Result</div>
                    <div className="text-mono" style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{fpResult.result.toPrecision(7)}</div>
                    <div className="text-mono text-xs text-muted">{fpResult.repResult.signBit} {fpResult.repResult.exponentBits} {fpResult.repResult.mantissaBits.slice(0, 10)}…</div>
                  </div>

                  <div className="form-label mb-2">Computation Steps</div>
                  {fpResult.steps.map((step, i) => (
                    <div key={i} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className="text-muted" style={{ marginRight: 8 }}>{i + 1}.</span>
                      {step}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

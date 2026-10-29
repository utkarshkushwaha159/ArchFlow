import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { DeliveryOrder, Priority } from '../types';
import { generateInstructions } from '../simulation/workloads';

const EMPTY_ORDER: Omit<DeliveryOrder, 'id' | 'status'> = {
  customer: '', pickup: '', destination: '',
  weight: 1, quantity: 1, price: 100, distance: 5,
  priority: 'Normal', deliveryType: 'Standard',
};

function PriorityBadge({ p }: { p: Priority }) {
  const cls = p === 'Urgent' ? 'badge-urgent' : p === 'High' ? 'badge-high' : 'badge-normal';
  return <span className={`badge ${cls}`}>{p}</span>;
}

export default function WorkloadsPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { state, dispatch, runSim } = useSimulation();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrder, setNewOrder] = useState(EMPTY_ORDER);

  const activeWorkload = state.activeWorkload;
  const orders = activeWorkload.orders;
  const cfg = state.currentConfig;
  const isRISC = cfg.isa === 'RISC';

  // Always keep an order selected so the screen is never blank!
  const currentOrder = orders.find(o => o.id === selectedOrderId) ?? orders[0] ?? null;
  const currentOrderIndex = currentOrder ? orders.findIndex(o => o.id === currentOrder.id) : 0;

  const instructions = currentOrder
    ? generateInstructions(currentOrder, isRISC)
    : [];

  // Workload summary calculations
  const totalValue = orders.reduce((sum, o) => sum + (o.price * o.quantity), 0);
  const avgDistance = orders.length > 0 ? (orders.reduce((sum, o) => sum + o.distance, 0) / orders.length).toFixed(1) : '0';
  const urgentCount = orders.filter(o => o.priority === 'Urgent').length;

  // Order total with shipping fee
  const calculatedTotal = currentOrder
    ? (currentOrder.price * currentOrder.quantity) + (currentOrder.distance * 15) + (currentOrder.weight * 5)
    : 0;

  function addOrder() {
    if (!newOrder.customer.trim()) return;
    const id = `AF-${1005 + orders.length}`;
    const order: DeliveryOrder = { ...newOrder, id, status: 'Pending' };
    dispatch({ type: 'ADD_ORDER', order });
    setShowAddForm(false);
    setNewOrder(EMPTY_ORDER);
    setSelectedOrderId(id);
  }

  function handleSelectWorkload(workloadId: string) {
    const found = state.savedWorkloads.find(w => w.id === workloadId);
    if (found) {
      dispatch({ type: 'SET_WORKLOAD', workload: found });
      setSelectedOrderId(null);
    }
  }

  return (
    <div className="single-screen-page workloads-page">

      {/* ── 1. Page Header Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[var(--border)] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)]" style={{ margin: 0 }}>
              Delivery Workload Batches
            </h1>
            <span className="panel-tag" style={{ color: 'var(--accent)' }}>
              {orders.length} Batch Orders
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]" style={{ margin: '2px 0 0' }}>
            Translate real-world logistics parameters into memory-mapped {isRISC ? 'RISC' : 'CISC'} instruction streams.
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Close Form' : '+ Add Order'}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              runSim();
              if (onNavigate) onNavigate('lab');
            }}
            disabled={state.isRunning}
          >
            {state.isRunning ? '⏳ Running...' : '▶ Start Simulation'}
          </button>
          {onNavigate && (
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('lab')}>
              Continue to Lab →
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Batch Profile & Live Metrics Strip ── */}
      <div className="workloads-top-card">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Batch Profile:
          </span>
          <select
            className="form-control text-xs"
            style={{ width: 'auto', minWidth: 260, padding: '5px 10px', fontWeight: 600 }}
            value={activeWorkload.id}
            onChange={e => handleSelectWorkload(e.target.value)}
          >
            {state.savedWorkloads.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.orders.length} orders)</option>
            ))}
          </select>
        </div>

        <div className="workloads-metric-strip">
          <div className="workloads-metric-pill">
            <span className="text-muted">TOTAL VALUE:</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>₹{totalValue.toLocaleString()}</span>
          </div>
          <div className="workloads-metric-pill">
            <span className="text-muted">AVG DISTANCE:</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{avgDistance} km</span>
          </div>
          <div className="workloads-metric-pill">
            <span className="text-muted">URGENT ORDERS:</span>
            <span style={{ color: urgentCount > 0 ? 'var(--amber)' : 'var(--text-primary)', fontWeight: 700 }}>
              {urgentCount} of {orders.length}
            </span>
          </div>
          <div className="workloads-metric-pill">
            <span className="text-muted">TARGET ISA:</span>
            <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{cfg.isa} ({isRISC ? 'Load/Store' : 'Mem-Reg'})</span>
          </div>
        </div>
      </div>

      {/* ── 3. Main Split View (No Blank Space) ── */}
      <div className="workloads-split-grid">

        {/* ── LEFT COLUMN: Orders Roster + RAM Memory Map ── */}
        <div className="workload-col">

          {/* Card 1: Batch Orders Table */}
          <div className="panel flex flex-col" style={{ flex: '1 1 50%', minHeight: 0, overflow: 'hidden' }}>
            <div className="panel-header py-1.5 px-3 shrink-0">
              <div className="panel-title-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Orders in Selected Batch
                </span>
                <span className="panel-tag">{orders.length} Orders</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Click any row to inspect</span>
            </div>

            {showAddForm ? (
              <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Create New Delivery Order
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem' }}>
                  {[
                    ['Customer Name', 'customer', 'text'],
                    ['Pickup Hub', 'pickup', 'text'],
                    ['Destination Hub', 'destination', 'text'],
                    ['Quantity', 'quantity', 'number'],
                    ['Price (₹)', 'price', 'number'],
                    ['Distance (km)', 'distance', 'number'],
                    ['Weight (kg)', 'weight', 'number'],
                  ].map(([label, field, type]) => (
                    <div className="form-group" key={field}>
                      <label className="form-label" style={{ fontSize: '0.65rem' }}>{label}</label>
                      <input
                        type={type as string}
                        className="form-control text-xs"
                        style={{ padding: '4px 8px' }}
                        value={(newOrder as Record<string, unknown>)[field] as string}
                        onChange={e => setNewOrder(prev => ({
                          ...prev,
                          [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                        }))}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>Priority</label>
                    <select
                      className="form-control text-xs"
                      style={{ padding: '4px 8px' }}
                      value={newOrder.priority}
                      onChange={e => setNewOrder(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    >
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-primary btn-sm" onClick={addOrder}>Save Order to Batch</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Route</th>
                      <th>Dist</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const isSelected = currentOrder?.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'var(--bg-elevated)' : '',
                            borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                          }}
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{order.id}</td>
                          <td style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>{order.customer}</td>
                          <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{order.pickup} → {order.destination}</td>
                          <td>{order.distance} km</td>
                          <td>{order.quantity}</td>
                          <td>₹{order.price}</td>
                          <td><PriorityBadge p={order.priority} /></td>
                          <td>
                            <span className={`badge ${order.status === 'Processed' ? 'badge-success' : 'badge-normal'}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 2: Hardware Data Memory (RAM) Allocation Map — FILLS THE EMPTY SPACE */}
          <div className="panel flex flex-col" style={{ flex: '1 1 50%', minHeight: 0, overflow: 'hidden' }}>
            <div className="panel-header py-1.5 px-3 shrink-0">
              <div className="panel-title-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Hardware RAM Memory Map (0x1000 – 0x103F)
                </span>
                <span className="panel-tag" style={{ color: 'var(--green)' }}>
                  Active Order: {currentOrder?.id ?? 'AF-1001'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Contiguous 24-byte block</span>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table className="ram-map-table">
                <thead>
                  <tr>
                    <th>RAM Address</th>
                    <th>Data Field</th>
                    <th>Hex Value</th>
                    <th>Decimal Value</th>
                    <th>Target CPU Register</th>
                    <th>Bus Directive</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrder && [
                    { addr: '0x1000', field: 'Order Quantity', hex: `0x${currentOrder.quantity.toString(16).toUpperCase().padStart(4, '0')}`, dec: `${currentOrder.quantity} units`, reg: 'R1', op: 'LOAD' },
                    { addr: '0x1004', field: 'Unit Price', hex: `0x${currentOrder.price.toString(16).toUpperCase().padStart(4, '0')}`, dec: `₹${currentOrder.price}`, reg: 'R2', op: 'LOAD' },
                    { addr: '0x1008', field: 'Delivery Distance', hex: `0x${Math.round(currentOrder.distance).toString(16).toUpperCase().padStart(4, '0')}`, dec: `${currentOrder.distance} km`, reg: 'R4', op: 'LOAD' },
                    { addr: '0x100C', field: 'Distance Rate', hex: '0x000F', dec: '₹15 / km', reg: 'R5', op: 'LOAD' },
                    { addr: '0x1010', field: 'Package Weight', hex: `0x${Math.round(currentOrder.weight).toString(16).toUpperCase().padStart(4, '0')}`, dec: `${currentOrder.weight} kg`, reg: 'R0', op: 'LOAD' },
                    { addr: '0x1014', field: 'Calculated Total (WB)', hex: `0x${Math.round(calculatedTotal).toString(16).toUpperCase().padStart(4, '0')}`, dec: `₹${calculatedTotal.toLocaleString()}`, reg: 'R3 (STORE)', op: 'STORE' },
                  ].map((row) => (
                    <tr key={row.addr}>
                      <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{row.addr}</td>
                      <td style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>{row.field}</td>
                      <td style={{ color: 'var(--blue)' }}>{row.hex}</td>
                      <td style={{ color: 'var(--green)' }}>{row.dec}</td>
                      <td style={{ color: 'var(--amber)', fontWeight: 600 }}>{row.reg}</td>
                      <td>
                        <span className={`badge ${row.op === 'LOAD' ? 'badge-normal' : 'badge-high'}`}>
                          {row.op}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '6px 12px', background: 'var(--bg-base)', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Cache Line: Block 0x1000–0x103F (64B cache line tag loaded on miss)</span>
              <span style={{ color: 'var(--green)' }}>● RAM Latency: {cfg.memoryLatency} cycles</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Order Dispatch Profile + Generated Assembly Stream ── */}
        <div className="workload-col">

          {/* Card 1: Selected Order Dispatch Profile */}
          {currentOrder && (
            <div className="panel shrink-0" style={{ padding: 12 }}>
              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-cyan-400">{currentOrder.id}</span>
                  <PriorityBadge p={currentOrder.priority} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentOrder.customer}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Route: <strong>{currentOrder.pickup}</strong> → <strong>{currentOrder.destination}</strong>
                </span>
              </div>

              <div className="order-spec-tiles">
                <div className="order-spec-tile">
                  <div className="order-spec-tile-label">DISTANCE</div>
                  <div className="order-spec-tile-val" style={{ color: 'var(--accent)' }}>{currentOrder.distance} km</div>
                </div>
                <div className="order-spec-tile">
                  <div className="order-spec-tile-label">QUANTITY</div>
                  <div className="order-spec-tile-val" style={{ color: 'var(--green)' }}>{currentOrder.quantity} units</div>
                </div>
                <div className="order-spec-tile">
                  <div className="order-spec-tile-label">UNIT PRICE</div>
                  <div className="order-spec-tile-val" style={{ color: 'var(--amber)' }}>₹{currentOrder.price}</div>
                </div>
                <div className="order-spec-tile">
                  <div className="order-spec-tile-label">PKG WEIGHT</div>
                  <div className="order-spec-tile-val" style={{ color: 'var(--blue)' }}>{currentOrder.weight} kg</div>
                </div>
              </div>

              {/* Hardware Scheduling Bar */}
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.68rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <div>
                  <span className="text-muted">SCHEDULED CORE: </span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    CPU CORE {currentOrderIndex % cfg.numCores}
                  </span>
                  <span className="text-muted"> (Thread ID {currentOrderIndex % cfg.numCores})</span>
                </div>
                <div>
                  <span className="text-muted">TOTAL ESTIMATE: </span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>₹{calculatedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Generated Assembly Instruction Stream — FILLS THE EMPTY SPACE */}
          <div className="panel flex flex-col" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div className="panel-header py-1.5 px-3 shrink-0">
              <div className="panel-title-group">
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Generated Instruction Stream
                </span>
                <span className="panel-tag" style={{ color: 'var(--amber)' }}>{cfg.isa} ISA</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {instructions.length} CPU Instructions Generated
              </span>
            </div>

            {/* Full-Height Assembly Stream */}
            <div className="instruction-stream" style={{ flex: 1, minHeight: 0, maxHeight: 'none', overflowY: 'auto', padding: '10px 14px' }}>
              {instructions.map((ins, i) => (
                <div className="instr-line" key={i}>
                  <span className="instr-addr">0x{ins.address.toString(16).toUpperCase().padStart(4, '0')}</span>
                  <span className="instr-op">{ins.opcode}</span>
                  <span className="instr-args">
                    {[ins.operand1, ins.operand2, ins.operand3].filter(Boolean).join(', ')}
                    {ins.immediate !== undefined ? `, #${ins.immediate}` : ''}
                    {ins.memAddress ? `, [0x${ins.memAddress.toString(16).toUpperCase()}]` : ''}
                  </span>
                  {ins.comment && <span className="instr-comment">; {ins.comment}</span>}
                </div>
              ))}
            </div>

            {/* Bottom Hardware Execution Pipeline / RTL Flow */}
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <div>
                <span style={{ color: 'var(--amber)', fontWeight: 700 }}>ALU Dataflow: </span>
                <span>R1(Qty) × R2(Price) → R3 | R4(Dist) × R5(Rate) → R6 | R3 += R6</span>
              </div>
              <span className="panel-tag" style={{ color: 'var(--green)' }}>Writeback: M[0x1014] ← R3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { DeliveryOrder, Priority, DeliveryType } from '../types';
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

export default function WorkloadsPage() {
  const { state, dispatch, runSim } = useSimulation();
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrder, setNewOrder] = useState(EMPTY_ORDER);

  const orders = state.activeWorkload.orders;
  const isRISC = state.currentConfig.isa === 'RISC';

  const instructions = selectedOrder
    ? generateInstructions(selectedOrder, isRISC)
    : null;

  function addOrder() {
    const id = `AF-${1005 + orders.length}`;
    const order: DeliveryOrder = { ...newOrder, id, status: 'Pending' };
    dispatch({ type: 'ADD_ORDER', order });
    setShowAddForm(false);
    setNewOrder(EMPTY_ORDER);
  }

  function processWorkload() {
    runSim();
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Delivery Workloads</h1>
            <p className="page-subtitle">Create delivery orders · Convert to instruction streams · Process through architecture</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowAddForm(true)}>+ Add Order</button>
            <button className="btn btn-primary" onClick={processWorkload} disabled={state.isRunning}>
              {state.isRunning ? '⏳ Processing...' : '▶ Process Workload'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Orders list */}
        <div>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <span>Delivery Orders</span>
                <span className="panel-tag">{orders.length} orders</span>
              </div>
              <span className="text-xs text-muted">{state.activeWorkload.name}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Dist</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr
                      key={order.id}
                      style={{ cursor: 'pointer', background: selectedOrder?.id === order.id ? 'var(--bg-elevated)' : '' }}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td style={{ color: 'var(--accent)' }}>{order.id}</td>
                      <td style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-primary)' }}>{order.customer}</td>
                      <td>{order.distance} km</td>
                      <td>{order.quantity}</td>
                      <td>₹{order.price}</td>
                      <td><PriorityBadge p={order.priority} /></td>
                      <td>
                        <span className={`badge ${order.status === 'Processed' ? 'badge-success' : order.status === 'Processing' ? 'badge-accent' : 'badge-normal'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Order Form */}
          {showAddForm && (
            <div className="panel mt-4">
              <div className="panel-header">
                <span>New Delivery Order</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>✕</button>
              </div>
              <div className="panel-body">
                <div className="grid grid-2 gap-3">
                  {[
                    ['Customer', 'customer', 'text'],
                    ['Pickup Location', 'pickup', 'text'],
                    ['Destination', 'destination', 'text'],
                    ['Quantity', 'quantity', 'number'],
                    ['Price (₹)', 'price', 'number'],
                    ['Distance (km)', 'distance', 'number'],
                    ['Weight (kg)', 'weight', 'number'],
                  ].map(([label, field, type]) => (
                    <div className="form-group" key={field}>
                      <label className="form-label">{label}</label>
                      <input
                        type={type as string}
                        className="form-control"
                        value={(newOrder as Record<string, unknown>)[field] as string}
                        onChange={e => setNewOrder(prev => ({
                          ...prev,
                          [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                        }))}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-control"
                      value={newOrder.priority}
                      onChange={e => setNewOrder(prev => ({ ...prev, priority: e.target.value as Priority }))}
                    >
                      <option>Normal</option>
                      <option>High</option>
                      <option>Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Type</label>
                    <select
                      className="form-control"
                      value={newOrder.deliveryType}
                      onChange={e => setNewOrder(prev => ({ ...prev, deliveryType: e.target.value as DeliveryType }))}
                    >
                      <option>Standard</option>
                      <option>Express</option>
                      <option>Same-Day</option>
                      <option>Fragile</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="btn btn-primary" onClick={addOrder}>Add Order</button>
                  <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order detail + Instruction Stream */}
        <div className="flex flex-col gap-4">
          {selectedOrder ? (
            <>
              {/* Order Detail */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{selectedOrder.id}</span>
                    <PriorityBadge p={selectedOrder.priority} />
                  </div>
                  <span className="text-xs text-muted">{selectedOrder.deliveryType}</span>
                </div>
                <div className="panel-body">
                  <div className="grid grid-2 gap-3">
                    {[
                      ['Customer',     selectedOrder.customer],
                      ['Pickup',       selectedOrder.pickup],
                      ['Destination',  selectedOrder.destination],
                      ['Distance',     `${selectedOrder.distance} km`],
                      ['Quantity',     selectedOrder.quantity],
                      ['Unit Price',   `₹${selectedOrder.price}`],
                      ['Weight',       `${selectedOrder.weight} kg`],
                      ['Status',       selectedOrder.status],
                    ].map(([l, v]) => (
                      <div key={l as string} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div className="form-label">{l}</div>
                        <div className="text-mono" style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instruction Stream */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <span>Instruction Stream</span>
                    <span className="panel-tag">{state.currentConfig.isa}</span>
                  </div>
                  <span className="text-xs text-muted">{instructions?.length} instructions</span>
                </div>
                <div className="panel-body">
                  <div className="alert alert-info mb-3" style={{ fontSize: '0.75rem' }}>
                    Delivery data converted to {isRISC ? 'RISC (load/store)' : 'CISC (memory-register)'} instruction format.
                    Addresses and operands shown in hex.
                  </div>
                  <div className="instruction-stream">
                    {instructions?.map((instr, i) => (
                      <div className="instr-line" key={i}>
                        <span className="instr-addr">0x{instr.address.toString(16).toUpperCase()}</span>
                        <span className="instr-op">{instr.opcode}</span>
                        <span className="instr-args">
                          {[instr.operand1, instr.operand2, instr.operand3]
                            .filter(Boolean).join(', ')}
                          {instr.memAddress ? `, [0x${instr.memAddress.toString(16).toUpperCase()}]` : ''}
                        </span>
                        {instr.comment && (
                          <span className="instr-comment">; {instr.comment}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-3" style={{ fontSize: '0.7rem' }}>
                    <span><span style={{ color: 'var(--text-muted)' }}>■</span> Address</span>
                    <span><span style={{ color: 'var(--amber)' }}>■</span> Opcode</span>
                    <span><span style={{ color: 'var(--blue)' }}>■</span> Operands</span>
                    <span><span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>■</span> Comment</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>←</div>
                <div style={{ fontSize: '0.85rem' }}>Select an order to see its instruction stream</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

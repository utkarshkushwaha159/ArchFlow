// ====================================================
// Interconnect — Bus, Ring, Mesh, Point-to-Point
// Packet routing, hop counting, congestion tracking
// ====================================================

import type { InterconnectType, Packet, InterconnectMetrics } from '../types';

let _packetId = 0;
function newPacketId() { return `pkt-${++_packetId}`; }

// -------------------------------------------------------
// Topology hop calculations
// -------------------------------------------------------

/** Bus: all nodes share a bus, 1 hop */
function busHops(_src: number, _dst: number): number { return 1; }

/** Ring: hop count = min clockwise / counter-clockwise distance */
function ringHops(src: number, dst: number, numNodes: number): number {
  const cw  = (dst - src + numNodes) % numNodes;
  const ccw = (src - dst + numNodes) % numNodes;
  return Math.min(cw, ccw);
}

/** Mesh: XY routing hop count (rows × cols assumed sqrt(numNodes)) */
function meshHops(src: number, dst: number, numNodes: number): number {
  const cols = Math.ceil(Math.sqrt(numNodes));
  const srcX = src % cols, srcY = Math.floor(src / cols);
  const dstX = dst % cols, dstY = Math.floor(dst / cols);
  return Math.abs(dstX - srcX) + Math.abs(dstY - srcY);
}

/** Point-to-point: direct link, 1 hop if connected, else 2 */
function p2pHops(src: number, dst: number, numNodes: number): number {
  // Assume fully connected for small core counts
  return numNodes <= 4 ? 1 : ringHops(src, dst, numNodes);
}

export function computeHops(
  topology: InterconnectType,
  src: number,
  dst: number,
  numNodes: number,
): number {
  if (src === dst) return 0;
  switch (topology) {
    case 'Bus':           return busHops(src, dst);
    case 'Ring':          return ringHops(src, dst, numNodes);
    case 'Mesh':          return meshHops(src, dst, numNodes);
    case 'PointToPoint':  return p2pHops(src, dst, numNodes);
  }
}

/** Base latency per hop in cycles */
const LATENCY_PER_HOP: Record<InterconnectType, number> = {
  Bus:          5,
  Ring:         3,
  Mesh:         2,
  PointToPoint: 1,
};

// -------------------------------------------------------
// Packet creation
// -------------------------------------------------------
export function createPacket(
  src: number,
  dst: number,
  type: Packet['type'],
  address: number,
  data: number | undefined,
  cycle: number,
  topology: InterconnectType,
  numNodes: number,
): Packet {
  const hops    = computeHops(topology, src, dst, numNodes);
  const latency = hops * LATENCY_PER_HOP[topology] + 1;
  return {
    id: newPacketId(),
    sourceCore: src,
    destCore:   dst,
    type,
    address,
    data,
    cycle,
    hops,
    latency,
  };
}

// -------------------------------------------------------
// Aggregate metrics
// -------------------------------------------------------
export function aggregateInterconnectMetrics(packets: Packet[]): InterconnectMetrics {
  if (packets.length === 0) {
    return { totalPackets: 0, totalHops: 0, averageLatency: 0, congestionEvents: 0, bufferOccupancy: 0 };
  }
  const totalHops    = packets.reduce((s, p) => s + p.hops, 0);
  const totalLatency = packets.reduce((s, p) => s + p.latency, 0);
  const congestion   = packets.filter(p => p.hops > 2).length;
  return {
    totalPackets:    packets.length,
    totalHops,
    averageLatency:  totalLatency / packets.length,
    congestionEvents: congestion,
    bufferOccupancy: Math.min(1, packets.length / 100),
  };
}

// -------------------------------------------------------
// Mesh topology coordinate helpers (for visualization)
// -------------------------------------------------------
export function meshCoordinates(
  nodeId: number,
  numNodes: number,
): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(numNodes));
  return { x: nodeId % cols, y: Math.floor(nodeId / cols) };
}

export function meshPath(
  src: number,
  dst: number,
  numNodes: number,
): { x: number; y: number }[] {
  const cols = Math.ceil(Math.sqrt(numNodes));
  const srcX = src % cols, srcY = Math.floor(src / cols);
  const dstX = dst % cols, dstY = Math.floor(dst / cols);
  const path: { x: number; y: number }[] = [{ x: srcX, y: srcY }];

  let cx = srcX, cy = srcY;
  // XY routing: move in X first, then Y
  while (cx !== dstX) {
    cx += cx < dstX ? 1 : -1;
    path.push({ x: cx, y: cy });
  }
  while (cy !== dstY) {
    cy += cy < dstY ? 1 : -1;
    path.push({ x: cx, y: cy });
  }
  return path;
}

// -------------------------------------------------------
// Synchronization (LL-SC and Barrier)
// -------------------------------------------------------

export interface LLSCState {
  address: number;
  reservingCore: number;
  reserved: boolean;
  cycle: number;
}

export interface BarrierState {
  id: string;
  totalCores: number;
  arrivedCores: number[];
  waitingCores: number[];
  released: boolean;
  cycle: number;
}

export function createBarrier(totalCores: number, cycle: number): BarrierState {
  return {
    id: `barrier-${cycle}`,
    totalCores,
    arrivedCores: [],
    waitingCores: [],
    released: false,
    cycle,
  };
}

export function barrierArrive(barrier: BarrierState, coreId: number): BarrierState {
  if (barrier.arrivedCores.includes(coreId)) return barrier;
  const arrived = [...barrier.arrivedCores, coreId];
  const waiting = arrived.length < barrier.totalCores ? [...barrier.waitingCores, coreId] : [];
  const released = arrived.length >= barrier.totalCores;
  return { ...barrier, arrivedCores: arrived, waitingCores: waiting, released };
}

export function loadLinked(address: number, coreId: number, cycle: number): LLSCState {
  return { address, reservingCore: coreId, reserved: true, cycle };
}

export function storeConditional(
  state: LLSCState | null,
  address: number,
  coreId: number,
  _value: number,
): { success: boolean; reason: string } {
  if (!state || !state.reserved) {
    return { success: false, reason: 'No load-linked reservation' };
  }
  if (state.address !== address) {
    return { success: false, reason: 'Address mismatch' };
  }
  if (state.reservingCore !== coreId) {
    return { success: false, reason: 'Different core holds reservation' };
  }
  return { success: true, reason: 'Store conditional succeeded' };
}

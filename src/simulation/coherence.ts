// ====================================================
// Cache Coherence — VI, MSI, MESI, Dragon protocols
// Snooping and Directory-based mechanisms
// ====================================================

import type {
  Cache, CacheState, CoherenceEvent, CoherenceMetrics,
  CoherenceProtocol, CoherenceMechanism, DirectoryEntry,
} from '../types';

// -------------------------------------------------------
// MESI State machine
// -------------------------------------------------------

type CoherenceOp = 'PROC_READ' | 'PROC_WRITE' | 'BUS_READ' | 'BUS_WRITE' | 'BUS_INVALIDATE' | 'BUS_UPGRADE';

interface StateTransition {
  nextState: CacheState;
  busAction: string | null;
}

// MESI transition table
const MESI_TRANSITIONS: Record<CacheState, Partial<Record<CoherenceOp, StateTransition>>> = {
  'M': {
    PROC_READ:      { nextState: 'M', busAction: null },
    PROC_WRITE:     { nextState: 'M', busAction: null },
    BUS_READ:       { nextState: 'S', busAction: 'FLUSH' },
    BUS_WRITE:      { nextState: 'I', busAction: 'FLUSH' },
    BUS_INVALIDATE: { nextState: 'I', busAction: 'FLUSH' },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'E': {
    PROC_READ:      { nextState: 'E', busAction: null },
    PROC_WRITE:     { nextState: 'M', busAction: null },
    BUS_READ:       { nextState: 'S', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'S': {
    PROC_READ:      { nextState: 'S', busAction: null },
    PROC_WRITE:     { nextState: 'M', busAction: 'BUS_INVALIDATE' },
    BUS_READ:       { nextState: 'S', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'I': {
    PROC_READ:      { nextState: 'E', busAction: 'BUS_READ' },
    PROC_WRITE:     { nextState: 'M', busAction: 'BUS_WRITE' },
    BUS_READ:       { nextState: 'I', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'V': {  // Valid (VI protocol)
    PROC_READ:      { nextState: 'V', busAction: null },
    PROC_WRITE:     { nextState: 'V', busAction: 'BUS_INVALIDATE' },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_READ:       { nextState: 'I', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
};

// MSI transition table
const MSI_TRANSITIONS: Record<CacheState, Partial<Record<CoherenceOp, StateTransition>>> = {
  'M': {
    PROC_READ:      { nextState: 'M', busAction: null },
    PROC_WRITE:     { nextState: 'M', busAction: null },
    BUS_READ:       { nextState: 'S', busAction: 'FLUSH' },
    BUS_WRITE:      { nextState: 'I', busAction: 'FLUSH' },
    BUS_INVALIDATE: { nextState: 'I', busAction: 'FLUSH' },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'S': {
    PROC_READ:      { nextState: 'S', busAction: null },
    PROC_WRITE:     { nextState: 'M', busAction: 'BUS_INVALIDATE' },
    BUS_READ:       { nextState: 'S', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'I': {
    PROC_READ:      { nextState: 'S', busAction: 'BUS_READ' },
    PROC_WRITE:     { nextState: 'M', busAction: 'BUS_WRITE' },
    BUS_READ:       { nextState: 'I', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'E': { // MSI doesn't have E, but map to S
    PROC_READ:  { nextState: 'S', busAction: null },
    PROC_WRITE: { nextState: 'M', busAction: null },
    BUS_READ:       { nextState: 'S', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
  'V': {
    PROC_READ:      { nextState: 'S', busAction: 'BUS_READ' },
    PROC_WRITE:     { nextState: 'M', busAction: 'BUS_WRITE' },
    BUS_READ:       { nextState: 'I', busAction: null },
    BUS_WRITE:      { nextState: 'I', busAction: null },
    BUS_INVALIDATE: { nextState: 'I', busAction: null },
    BUS_UPGRADE:    { nextState: 'I', busAction: null },
  },
};

function getTable(protocol: CoherenceProtocol) {
  if (protocol === 'MESI' || protocol === 'Dragon') return MESI_TRANSITIONS;
  if (protocol === 'MSI') return MSI_TRANSITIONS;
  // VI
  return MESI_TRANSITIONS;
}

// -------------------------------------------------------
// Process a processor request and produce coherence events
// -------------------------------------------------------
export interface CoherenceResult {
  events: CoherenceEvent[];
  metrics: Partial<CoherenceMetrics>;
  statesBefore: Map<number, CacheState>;
  statesAfter: Map<number, CacheState>;
}

export function processCoherenceRequest(
  caches: Cache[],
  requestingCoreId: number,
  address: number,
  isWrite: boolean,
  cycle: number,
  protocol: CoherenceProtocol,
  mechanism: CoherenceMechanism,
  directory?: Map<number, DirectoryEntry>,
): CoherenceResult {
  const events: CoherenceEvent[] = [];
  const metrics: Partial<CoherenceMetrics> = { busTransactions: 0, invalidations: 0, stateTransitions: 0 };
  const statesBefore = new Map<number, CacheState>();
  const statesAfter  = new Map<number, CacheState>();
  const table = getTable(protocol);
  const lineIdx = address % (caches[0]?.config.size ?? 4);

  // Record current states
  for (const c of caches) {
    const line = c.lines[lineIdx];
    if (line) statesBefore.set(c.config.coreId, line.state);
  }

  const op: CoherenceOp = isWrite ? 'PROC_WRITE' : 'PROC_READ';

  // --- Snooping mechanism ---
  if (mechanism === 'Snooping') {
    // Requester's own cache
    const reqCache = caches.find(c => c.config.coreId === requestingCoreId);
    if (!reqCache) return { events, metrics, statesBefore, statesAfter };

    const reqLine  = reqCache.lines[lineIdx];
    const fromState: CacheState = reqLine?.state ?? 'I';
    const transition = table[fromState]?.[op];

    if (transition?.busAction) {
      metrics.busTransactions = (metrics.busTransactions ?? 0) + 1;
      const busOp = transition.busAction as CoherenceOp;

      // Snoop all other caches
      for (const c of caches) {
        if (c.config.coreId === requestingCoreId) continue;
        const otherLine = c.lines[lineIdx];
        if (!otherLine) continue;
        const otherFrom = otherLine.state;
        const snoopTrans = table[otherFrom]?.[busOp === 'BUS_INVALIDATE' ? 'BUS_INVALIDATE' : 'BUS_READ'];

        if (snoopTrans && snoopTrans.nextState !== otherFrom) {
          const prevState = otherLine.state;
          otherLine.state = snoopTrans.nextState;
          metrics.stateTransitions = (metrics.stateTransitions ?? 0) + 1;
          if (snoopTrans.nextState === 'I') metrics.invalidations = (metrics.invalidations ?? 0) + 1;

          events.push({
            cycle,
            coreId: c.config.coreId,
            address,
            type: busOp === 'BUS_INVALIDATE' ? 'INVALIDATE' : 'FETCH',
            fromState: prevState,
            toState: snoopTrans.nextState,
            protocol,
            broadcast: true,
          });
        }
      }
    }

    // Update requester's state
    if (transition && reqLine) {
      const fromSt = reqLine.state;
      reqLine.state = transition.nextState;
      if (fromSt !== transition.nextState) {
        metrics.stateTransitions = (metrics.stateTransitions ?? 0) + 1;
        events.push({
          cycle,
          coreId: requestingCoreId,
          address,
          type: isWrite ? 'WRITE' : 'READ',
          fromState: fromSt,
          toState: transition.nextState,
          protocol,
          broadcast: false,
        });
      }
    }

  } else {
    // --- Directory-based mechanism ---
    if (!directory) return { events, metrics, statesBefore, statesAfter };
    let entry = directory.get(address);
    if (!entry) {
      entry = { address, state: 'UNCACHED', owner: -1, sharers: [] };
      directory.set(address, entry);
    }

    const reqCache = caches.find(c => c.config.coreId === requestingCoreId);
    const reqLine  = reqCache?.lines[lineIdx];

    if (!isWrite) {
      // Read miss
      if (entry.state === 'MODIFIED') {
        // Intervention: owner must flush
        const ownerCache = caches.find(c => c.config.coreId === entry!.owner);
        const ownerLine  = ownerCache?.lines[lineIdx];
        if (ownerLine) {
          events.push({ cycle, coreId: entry.owner, address, type: 'FETCH', fromState: 'M', toState: 'S', protocol, broadcast: false });
          ownerLine.state = 'S';
          metrics.stateTransitions = (metrics.stateTransitions ?? 0) + 1;
        }
        entry.state   = 'SHARED';
        entry.sharers = [entry.owner, requestingCoreId];
        entry.owner   = -1;
      } else {
        if (!entry.sharers.includes(requestingCoreId)) entry.sharers.push(requestingCoreId);
        entry.state = 'SHARED';
      }
      if (reqLine) reqLine.state = 'S';

    } else {
      // Write miss/upgrade
      // Invalidate all sharers
      for (const sid of entry.sharers) {
        if (sid === requestingCoreId) continue;
        const sc = caches.find(c => c.config.coreId === sid);
        const sl = sc?.lines[lineIdx];
        if (sl) {
          events.push({ cycle, coreId: sid, address, type: 'INVALIDATE', fromState: sl.state, toState: 'I', protocol, broadcast: false });
          sl.state = 'I';
          metrics.invalidations = (metrics.invalidations ?? 0) + 1;
          metrics.stateTransitions = (metrics.stateTransitions ?? 0) + 1;
        }
      }
      entry.state   = 'MODIFIED';
      entry.owner   = requestingCoreId;
      entry.sharers = [];
      if (reqLine) reqLine.state = 'M';
      metrics.busTransactions = (metrics.busTransactions ?? 0) + 1;
    }

    events.push({
      cycle, coreId: requestingCoreId, address,
      type: isWrite ? 'WRITE' : 'READ',
      fromState: reqLine?.state ?? 'I',
      toState: isWrite ? 'M' : 'S',
      protocol, broadcast: false,
    });
  }

  // Record final states
  for (const c of caches) {
    const line = c.lines[lineIdx];
    if (line) statesAfter.set(c.config.coreId, line.state);
  }

  return { events, metrics, statesBefore, statesAfter };
}

// -------------------------------------------------------
// Dragon Protocol (Update-based)
// -------------------------------------------------------
export function dragonProtocol(
  caches: Cache[],
  requestingCoreId: number,
  address: number,
  isWrite: boolean,
  newData: number,
  cycle: number,
): CoherenceResult {
  const events: CoherenceEvent[] = [];
  const metrics: Partial<CoherenceMetrics> = { busTransactions: 0, updates: 0, stateTransitions: 0 };
  const statesBefore = new Map<number, CacheState>();
  const statesAfter  = new Map<number, CacheState>();
  const lineIdx = address % (caches[0]?.config.size ?? 4);

  for (const c of caches) {
    const l = c.lines[lineIdx];
    if (l) statesBefore.set(c.config.coreId, l.state);
  }

  if (isWrite) {
    // Dragon UPDATE: broadcast new value to all sharers
    metrics.busTransactions = 1;
    for (const c of caches) {
      const l = c.lines[lineIdx];
      if (!l?.valid) continue;
      const from = l.state;
      if (c.config.coreId !== requestingCoreId) {
        l.data[0] = newData;  // update data
        metrics.updates = (metrics.updates ?? 0) + 1;
        events.push({
          cycle, coreId: c.config.coreId, address,
          type: 'UPDATE', fromState: from, toState: 'S', protocol: 'Dragon', broadcast: true,
        });
        l.state = 'S';
      } else {
        events.push({
          cycle, coreId: c.config.coreId, address,
          type: 'WRITE', fromState: from, toState: 'M', protocol: 'Dragon', broadcast: false,
        });
        l.state = 'M';
        l.data[0] = newData;
      }
    }
  }

  for (const c of caches) {
    const l = c.lines[lineIdx];
    if (l) statesAfter.set(c.config.coreId, l.state);
  }

  return { events, metrics, statesBefore, statesAfter };
}

// State labels
export function stateLabel(state: CacheState): string {
  const map: Record<CacheState, string> = {
    M: 'Modified',
    E: 'Exclusive',
    S: 'Shared',
    I: 'Invalid',
    V: 'Valid',
  };
  return map[state] ?? state;
}

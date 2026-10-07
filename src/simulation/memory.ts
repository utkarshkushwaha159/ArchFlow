// ====================================================
// Memory Hierarchy — Registers, L1/L2 Cache, Main Memory
// ====================================================

import type {
  Cache, CacheConfig, CacheLine, CacheState,
  MainMemory, MemoryAccess, MissType, CoherenceProtocol
} from '../types';

// -------------------------------------------------------
// Cache Construction
// -------------------------------------------------------
export function createCache(config: CacheConfig): Cache {
  const lines: CacheLine[] = Array.from({ length: config.size }, () => ({
    tag: -1,
    data: new Array(config.lineSize).fill(0),
    valid: false,
    dirty: false,
    state: 'I' as CacheState,
    lastAccess: 0,
    accessCount: 0,
  }));

  return { config, lines, hits: 0, misses: 0, evictions: 0 };
}

export function createMainMemory(size = 4096, latency = 100): MainMemory {
  return {
    size,
    data: new Map<number, number>(),
    accesses: 0,
    latency,
  };
}

// -------------------------------------------------------
// Address decomposition
// -------------------------------------------------------
function getTag(address: number, cacheSize: number): number {
  return Math.floor(address / cacheSize);
}

function getIndex(address: number, cacheSize: number): number {
  return address % cacheSize;
}

// -------------------------------------------------------
// Cache Access
// -------------------------------------------------------
export interface CacheAccessResult {
  hit: boolean;
  line: number;         // index of line touched
  evicted: boolean;
  evictedDirty: boolean;
  missType: MissType;
  data: number;
  latency: number;
}

export function cacheAccess(
  cache: Cache,
  address: number,
  isWrite: boolean,
  data: number,
  cycle: number,
  protocol: CoherenceProtocol = 'MESI'
): CacheAccessResult {
  const index = getIndex(address, cache.config.size);
  const tag   = getTag(address, cache.config.size);
  const line  = cache.lines[index];

  if (line.valid && line.tag === tag) {
    // Cache HIT
    cache.hits++;
    line.lastAccess   = cycle;
    line.accessCount++;

    if (isWrite) {
      line.dirty = true;
      line.data[0] = data;
      // MESI: on write hit → Modified
      if (protocol === 'MESI' || protocol === 'MSI') {
        line.state = 'M';
      }
    } else {
      // MESI read hit, keep state
    }

    return { hit: true, line: index, evicted: false, evictedDirty: false, missType: 'None', data: line.data[0], latency: cache.config.level === 'L1' ? 4 : 12 };
  }

  // Cache MISS
  cache.misses++;
  const wasValid = line.valid;
  const wasDirty = line.dirty;

  const missType: MissType = !wasValid ? 'Compulsory'
    : line.tag !== -1 ? 'Conflict'
    : 'Capacity';

  if (wasValid) cache.evictions++;

  // Install new line
  line.tag  = tag;
  line.valid = true;
  line.dirty = isWrite;
  line.data  = new Array(cache.config.lineSize).fill(0);
  line.data[0] = isWrite ? data : (address * 7 + 13) & 0xFFFF; // simulate fetched data
  line.lastAccess   = cycle;
  line.accessCount  = 1;

  // Initial coherence state after miss
  if (protocol === 'MESI') {
    line.state = isWrite ? 'M' : 'E'; // assume exclusive on first load
  } else if (protocol === 'MSI') {
    line.state = isWrite ? 'M' : 'S';
  } else if (protocol === 'VI') {
    line.state = isWrite ? 'M' : 'V';
  } else {
    line.state = isWrite ? 'M' : 'S';
  }

  return {
    hit: false,
    line: index,
    evicted: wasValid,
    evictedDirty: wasDirty,
    missType,
    data: line.data[0],
    latency: cache.config.level === 'L1' ? 4 + 12 : 12 + 100,
  };
}

// -------------------------------------------------------
// Main Memory read/write
// -------------------------------------------------------
export function memoryRead(mem: MainMemory, address: number): number {
  mem.accesses++;
  return mem.data.get(address) ?? ((address * 7 + 13) & 0xFFFF);
}

export function memoryWrite(mem: MainMemory, address: number, value: number): void {
  mem.accesses++;
  mem.data.set(address, value);
}

// -------------------------------------------------------
// Full Memory Hierarchy Access (with L1, optional L2, and Main Memory)
// -------------------------------------------------------
export function hierarchyAccess(
  l1: Cache,
  l2: Cache | null,
  mem: MainMemory,
  address: number,
  isWrite: boolean,
  data: number,
  cycle: number,
  coreId: number,
  protocol: CoherenceProtocol = 'MESI'
): MemoryAccess {
  const l1Result = cacheAccess(l1, address, isWrite, data, cycle, protocol);

  if (l1Result.hit) {
    return {
      cycle,
      coreId,
      address,
      isWrite,
      l1Result: 'HIT',
      data: l1Result.data,
      latency: l1Result.latency,
      missType: 'None',
    };
  }

  if (l2) {
    const l2Result = cacheAccess(l2, address, isWrite, data, cycle, protocol);
    if (l2Result.hit) {
      // Fill L1 from L2
      cacheAccess(l1, address, false, l2Result.data, cycle, protocol);
      return {
        cycle, coreId, address, isWrite,
        l1Result: 'MISS', l2Result: 'HIT',
        data: l2Result.data,
        latency: l1Result.latency + l2Result.latency,
        missType: l1Result.missType,
      };
    }
    // Both miss → go to main memory
    const memData = isWrite ? data : memoryRead(mem, address);
    if (isWrite) memoryWrite(mem, address, data);
    // Fill L2 and L1
    cacheAccess(l2, address, false, memData, cycle, protocol);
    cacheAccess(l1, address, false, memData, cycle, protocol);
    return {
      cycle, coreId, address, isWrite,
      l1Result: 'MISS', l2Result: 'MISS', memResult: 'HIT',
      data: memData,
      latency: l1Result.latency + l2Result.latency + mem.latency,
      missType: l1Result.missType,
    };
  }

  // No L2 — go directly to memory
  const memData = isWrite ? data : memoryRead(mem, address);
  if (isWrite) memoryWrite(mem, address, data);
  cacheAccess(l1, address, false, memData, cycle, protocol);
  return {
    cycle, coreId, address, isWrite,
    l1Result: 'MISS', memResult: 'HIT',
    data: memData,
    latency: l1Result.latency + mem.latency,
    missType: l1Result.missType,
  };
}

// -------------------------------------------------------
// Cache hit rate helper
// -------------------------------------------------------
export function cacheHitRate(cache: Cache): number {
  const total = cache.hits + cache.misses;
  return total === 0 ? 0 : cache.hits / total;
}

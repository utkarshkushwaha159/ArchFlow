// ====================================================
// SimulationEngine — Central orchestrator
// Ties together: workloads, processor, ALU, memory,
// cache, coherence, pipeline, interconnect, metrics
// ====================================================

import type {
  SimulationConfig, SimulationState, SimulationMetrics,
  SimulationStatus, CPUCore, Cache, RegisterFile,
  Instruction, PipelineStageId,
  EventComponent, Workload, DirectoryEntry
} from '../types';

import { generateWorkloadInstructions } from './workloads';
import { createCache, createMainMemory, hierarchyAccess } from './memory';
import { processCoherenceRequest, dragonProtocol } from './coherence';
import { createPipelineState, advancePipeline } from './pipeline';
import { createPacket } from './interconnect';
import { executeALU } from './alu';
import { getMicroOps, getControlSignals } from './controlUnit';

// -------------------------------------------------------
// Default metrics
// -------------------------------------------------------
function defaultMetrics(): SimulationMetrics {
  return {
    totalInstructions: 0, totalCycles: 0, cpi: 0, aluOperations: 0,
    memoryAccesses: 0, l1Hits: 0, l1Misses: 0, l2Hits: 0, l2Misses: 0,
    cacheHitRate: 0, coherenceMessages: 0, invalidations: 0,
    busTransactions: 0, pipelineStalls: 0, hazards: 0, syncEvents: 0,
    interconnectHops: 0, processorUtilization: 0, parallelSpeedup: 1,
    singleCoreBaseline: 0,
  };
}

// -------------------------------------------------------
// Initial register file
// -------------------------------------------------------
function defaultRegisters(): RegisterFile {
  return {
    PC: 0x0040, IR: 'NOP', MAR: 0, MDR: 0, ACC: 0, SP: 0x8000,
    SR: { zero: false, carry: false, sign: false, overflow: false, parity: false },
    GP: new Array(8).fill(0),
  };
}

// -------------------------------------------------------
// Build a CPU core
// -------------------------------------------------------
function buildCore(id: number): CPUCore {
  return {
    id,
    status: 'IDLE',
    registers: defaultRegisters(),
    pipeline: createPipelineState(),
    currentInstruction: null,
    currentStage: null,
    executedInstructions: 0,
    cycles: 0,
    cacheId: `l1-${id}`,
  };
}

// -------------------------------------------------------
// Create initial simulation state from config + workload
// -------------------------------------------------------
export function createInitialState(config: SimulationConfig, workload: Workload): SimulationState {
  const cores: CPUCore[] = Array.from({ length: config.numCores }, (_, i) => buildCore(i));

  // Create per-core L1 caches
  const caches: Cache[] = cores.map(c => createCache({
    size: config.l1Size,
    lineSize: 4,
    associativity: 1,
    level: 'L1',
    coreId: c.id,
  }));

  // Shared L2 cache (if configured)
  if (config.cacheConfig === 'L1+L2') {
    caches.push(createCache({
      size: config.l2Size,
      lineSize: 4,
      associativity: 4,
      level: 'L2',
      coreId: -1,
    }));
  }

  const memory = createMainMemory(4096, config.memoryLatency);
  const instructions = generateWorkloadInstructions(workload, config.isa === 'RISC');

  return {
    status: 'READY',
    config,
    workload,
    cores,
    caches,
    memory,
    coherenceEvents: [],
    directory: new Map<number, DirectoryEntry>(),
    packets: [],
    metrics: defaultMetrics(),
    executionLog: [],
    currentCycle: 0,
    instructions,
    errorMessage: undefined,
  };
}

// -------------------------------------------------------
// Run the full simulation synchronously (for comparison)
// Returns final state with all metrics computed
// -------------------------------------------------------
export function runSimulation(config: SimulationConfig, workload: Workload): SimulationState {
  const state = createInitialState(config, workload);
  let { cores, caches, memory, instructions, directory, packets, executionLog, metrics, coherenceEvents } = state;

  const l2Cache = caches.find(c => c.config.level === 'L2') ?? null;
  const numCores = config.numCores;

  // Divide instructions across cores
  const coreInstrs: Instruction[][] = Array.from({ length: numCores }, () => []);
  instructions.forEach((instr, idx) => {
    coreInstrs[idx % numCores].push(instr);
  });

  // Track events
  let cycle = 0;
  const maxCycles = instructions.length * 20 + 100; // safety cap

  // Preset workload data into memory
  const ordersFlat = workload.orders;
  for (let i = 0; i < ordersFlat.length; i++) {
    const o = ordersFlat[i];
    const base = 0x1000 + i * 0x40;
    memory.data.set(base,      o.quantity);
    memory.data.set(base + 4,  Math.round(o.price));
    memory.data.set(base + 8,  Math.round(o.distance));
    memory.data.set(base + 12, 15);  // rate
    memory.data.set(base + 16, Math.round(o.weight));
  }

  // Track per-core instruction pointers
  const corePC: number[] = new Array(numCores).fill(0);
  const coreDone: boolean[] = new Array(numCores).fill(false);

  while (cycle < maxCycles) {
    cycle++;
    let anyActive = false;

    for (let coreId = 0; coreId < numCores; coreId++) {
      const core = cores[coreId];
      const instrIdx = corePC[coreId];
      const instrList = coreInstrs[coreId];

      if (coreDone[coreId]) continue;
      if (instrIdx >= instrList.length) {
        coreDone[coreId] = true;
        core.status = 'COMPLETED';
        continue;
      }

      anyActive = true;
      core.status = 'RUNNING';
      const instr = instrList[instrIdx];
      const l1Cache = caches[coreId];

      // Simulate instruction execution
      let instrCycles = instr.cycles;
      let event: EventComponent = 'FETCH';
      let eventDesc = `FETCH ${instr.opcode}`;
      let result = '';

      // Update registers
      core.registers.PC = instr.address;
      core.registers.IR = `${instr.opcode} ${[instr.operand1, instr.operand2, instr.operand3].filter(Boolean).join(',')}`;

      // Pipeline advancement
      if (config.pipelineEnabled) {
        const pipeResult = advancePipeline(core.pipeline, instr, true);
        core.pipeline = pipeResult.newState;
        if (pipeResult.stalled) {
          metrics.pipelineStalls++;
          metrics.hazards++;
          instrCycles += 2;
        }
      }

      // Control signals
      const ctrlSig = getControlSignals(instr.opcode);

      // Execute the instruction
      switch (instr.opcode) {
        case 'LOAD': {
          const addr = instr.memAddress ?? (0x1000 + coreId * 0x40);
          const accessResult = hierarchyAccess(l1Cache, l2Cache, memory, addr, false, 0, cycle, coreId, config.coherenceProtocol);
          metrics.memoryAccesses++;
          if (accessResult.l1Result === 'HIT') {
            metrics.l1Hits++;
            event = 'CACHE'; eventDesc = 'LOAD L1 HIT'; result = `data=0x${(accessResult.data ?? 0).toString(16)}`;
          } else if (accessResult.l2Result === 'HIT') {
            metrics.l1Misses++; metrics.l2Hits++;
            instrCycles += 12;
            event = 'CACHE'; eventDesc = 'LOAD L2 HIT'; result = `miss penalty +12cy`;
          } else {
            metrics.l1Misses++; metrics.l2Misses++;
            instrCycles += config.memoryLatency;
            event = 'MEMORY'; eventDesc = 'LOAD MEM'; result = `miss penalty +${config.memoryLatency}cy`;
          }

          // Coherence
          if (config.coherenceProtocol === 'Dragon') {
            const cohResult = dragonProtocol(caches.filter(c => c.config.level === 'L1'), coreId, addr, false, 0, cycle);
            coherenceEvents.push(...cohResult.events);
            metrics.coherenceMessages += cohResult.events.length;
          } else {
            const cohResult = processCoherenceRequest(
              caches.filter(c => c.config.level === 'L1'), coreId, addr, false, cycle,
              config.coherenceProtocol, config.coherenceMechanism, directory
            );
            coherenceEvents.push(...cohResult.events);
            metrics.coherenceMessages += cohResult.events.length;
            metrics.invalidations   += cohResult.metrics.invalidations ?? 0;
            metrics.busTransactions += cohResult.metrics.busTransactions ?? 0;
          }

          // Interconnect packet for coherence message
          if (numCores > 1 && metrics.busTransactions > 0) {
            const pkt = createPacket(coreId, (coreId + 1) % numCores, 'READ', addr, undefined, cycle, config.interconnect, numCores);
            packets.push(pkt);
            metrics.interconnectHops += pkt.hops;
          }

          // Write result to register
          if (instr.operand1) {
            const regIdx = parseInt(instr.operand1.replace('R', ''), 10);
            if (regIdx >= 0 && regIdx < 8) {
              core.registers.GP[regIdx] = accessResult.data ?? 0;
            }
          }
          break;
        }

        case 'STORE': {
          const addr = instr.memAddress ?? 0x2000;
          const regIdx = parseInt((instr.operand1 ?? 'R0').replace('R', ''), 10);
          const storeData = core.registers.GP[regIdx] ?? 0;

          const accessResult = hierarchyAccess(l1Cache, l2Cache, memory, addr, true, storeData, cycle, coreId, config.coherenceProtocol);
          metrics.memoryAccesses++;

          if (accessResult.l1Result === 'HIT') metrics.l1Hits++;
          else { metrics.l1Misses++; instrCycles += 4; }

          event = 'MEMORY'; eventDesc = 'STORE'; result = `val=${storeData}`;
          break;
        }

        case 'ADD': case 'SUB': case 'MUL': case 'DIV':
        case 'AND': case 'OR':  case 'XOR': case 'NOT':
        case 'SHL': case 'SHR': case 'CMP': {
          const ri1 = parseInt((instr.operand2 ?? 'R0').replace('R', ''), 10);
          const ri2 = parseInt((instr.operand3 ?? 'R0').replace('R', ''), 10);
          const a = core.registers.GP[ri1] ?? 0;
          const b = instr.operand3 ? (core.registers.GP[ri2] ?? 0) : (instr.immediate ?? 0);

          try {
            const aluResult = executeALU(instr.opcode as import('../types').ALUOperation, a, b);
            const rd = parseInt((instr.operand1 ?? 'R0').replace('R', ''), 10);
            core.registers.GP[rd] = aluResult.result;
            core.registers.SR = aluResult.flags;
            metrics.aluOperations++;
            instrCycles = aluResult.cycles;
            event = 'ALU'; eventDesc = `${instr.opcode} ${a} ${instr.operand3 ? ',' + b : ''}`;
            result = `${aluResult.result} flags:${aluResult.flags.zero?'Z':''}${aluResult.flags.carry?'C':''}`;
          } catch (e) {
            event = 'ALU'; eventDesc = `${instr.opcode} ERROR`; result = (e as Error).message;
          }
          break;
        }

        case 'MOV': {
          const rd = parseInt((instr.operand1 ?? 'R0').replace('R', ''), 10);
          core.registers.GP[rd] = instr.immediate ?? 0;
          event = 'FETCH'; eventDesc = 'MOV'; result = `${instr.operand1} ← ${instr.immediate}`;
          break;
        }

        case 'UPDATE_STATUS': {
          event = 'CONTROL'; eventDesc = 'UPDATE_STATUS PROCESSED';
          result = 'Order marked PROCESSED';
          break;
        }

        case 'HALT': {
          coreDone[coreId] = true;
          core.status = 'COMPLETED';
          event = 'CONTROL'; eventDesc = 'HALT'; result = 'Core halted';
          break;
        }

        default: {
          event = 'CONTROL'; eventDesc = instr.opcode; result = 'OK';
        }
      }

      // Get micro-ops for logging
      const microOps = getMicroOps(instr, config.controlUnitType);

      // Log the event
      executionLog.push({
        id: `ev-${cycle}-${coreId}-${instrIdx}`,
        cycle,
        coreId,
        stage: (config.pipelineEnabled ? 'EX' : null) as PipelineStageId | null,
        instruction: core.registers.IR,
        component: event,
        event: eventDesc,
        result,
        metadata: {
          microOps: microOps.slice(0, 3),
          ctrlSignals: ctrlSig,
          address: instr.memAddress,
        },
      });

      core.executedInstructions++;
      core.cycles += instrCycles;
      metrics.totalInstructions++;
      cycle += instrCycles - 1;

      corePC[coreId]++;
    }

    if (!anyActive || coreDone.every(Boolean)) break;
  }

  // --- Compute final metrics ---
  metrics.totalCycles = cycle;
  metrics.cpi = metrics.totalInstructions > 0
    ? metrics.totalCycles / metrics.totalInstructions
    : 0;

  const l1Caches = caches.filter(c => c.config.level === 'L1');
  const totalL1Hits   = l1Caches.reduce((s, c) => s + c.hits, 0);
  const totalL1Misses = l1Caches.reduce((s, c) => s + c.misses, 0);
  metrics.l1Hits   = totalL1Hits;
  metrics.l1Misses = totalL1Misses;
  const l2 = caches.find(c => c.config.level === 'L2');
  metrics.l2Hits   = l2?.hits ?? 0;
  metrics.l2Misses = l2?.misses ?? 0;
  metrics.cacheHitRate = (totalL1Hits + (l2?.hits ?? 0)) /
    Math.max(1, totalL1Hits + totalL1Misses + (l2?.hits ?? 0) + (l2?.misses ?? 0));

  metrics.processorUtilization = Math.min(1,
    metrics.totalInstructions / Math.max(1, metrics.totalCycles * numCores));

  // Speedup vs single-core baseline
  const singleCoreEstimate = instructions.length * 3 * (config.pipelineEnabled ? 1.2 : 2.5);
  metrics.singleCoreBaseline = singleCoreEstimate;
  metrics.parallelSpeedup = numCores > 1
    ? Math.min(numCores, singleCoreEstimate / Math.max(1, cycle))
    : 1;

  // Mark all orders processed
  const processedWorkload = {
    ...workload,
    orders: workload.orders.map(o => ({ ...o, status: 'Processed' as const })),
  };

  return {
    ...state,
    status: 'COMPLETED' as SimulationStatus,
    cores,
    caches,
    memory,
    coherenceEvents,
    directory,
    packets,
    metrics,
    executionLog,
    currentCycle: cycle,
    instructions,
    workload: processedWorkload,
  };
}

// -------------------------------------------------------
// Compare two architecture configurations
// -------------------------------------------------------
export function compareArchitectures(
  configA: SimulationConfig,
  configB: SimulationConfig,
  workload: Workload,
): { stateA: SimulationState; stateB: SimulationState; observation: string } {
  const stateA = runSimulation(configA, workload);
  const stateB = runSimulation(configB, workload);

  const mA = stateA.metrics;
  const mB = stateB.metrics;

  const observations: string[] = [];

  if (mA.totalCycles < mB.totalCycles) {
    const pct = (((mB.totalCycles - mA.totalCycles) / mB.totalCycles) * 100).toFixed(1);
    observations.push(`Architecture A (${configA.name}) completed the workload in ${pct}% fewer cycles than Architecture B (${configB.name}).`);
  } else {
    const pct = (((mA.totalCycles - mB.totalCycles) / mA.totalCycles) * 100).toFixed(1);
    observations.push(`Architecture B (${configB.name}) completed the workload in ${pct}% fewer cycles than Architecture A (${configA.name}).`);
  }

  if (mA.cacheHitRate > mB.cacheHitRate) {
    observations.push(`Architecture A achieved higher cache efficiency (${(mA.cacheHitRate * 100).toFixed(1)}% vs ${(mB.cacheHitRate * 100).toFixed(1)}%) due to ${configA.cacheConfig} cache configuration.`);
  } else if (mB.cacheHitRate > mA.cacheHitRate) {
    observations.push(`Architecture B achieved higher cache efficiency (${(mB.cacheHitRate * 100).toFixed(1)}% vs ${(mA.cacheHitRate * 100).toFixed(1)}%).`);
  }

  if (mA.coherenceMessages < mB.coherenceMessages) {
    observations.push(`Architecture A generated fewer coherence messages (${mA.coherenceMessages} vs ${mB.coherenceMessages}), suggesting lower coherence overhead with ${configA.coherenceProtocol} + ${configA.coherenceMechanism}.`);
  }

  if (mA.parallelSpeedup > mB.parallelSpeedup) {
    observations.push(`Architecture A achieved better parallel speedup (${mA.parallelSpeedup.toFixed(2)}x vs ${mB.parallelSpeedup.toFixed(2)}x) with ${configA.numCores} cores.`);
  }

  if (configA.pipelineEnabled && !configB.pipelineEnabled) {
    const savings = mB.totalCycles - mA.totalCycles;
    if (savings > 0) observations.push(`Pipelining in Architecture A saved ${savings} cycles.`);
  }

  return {
    stateA,
    stateB,
    observation: observations.join(' '),
  };
}

// -------------------------------------------------------
// Default architecture profiles
// -------------------------------------------------------
export const DEFAULT_CONFIG: SimulationConfig = {
  name: 'ArchFlow-4C-MESI',
  isa: 'RISC',
  numCores: 4,
  pipelineEnabled: true,
  cacheConfig: 'L1+L2',
  coherenceProtocol: 'MESI',
  coherenceMechanism: 'Snooping',
  interconnect: 'Mesh',
  memoryConsistency: 'Sequential',
  syncPrimitive: 'Barrier',
  controlUnitType: 'Hardwired',
  l1Size: 8,
  l2Size: 32,
  memoryLatency: 100,
  l1Latency: 4,
  l2Latency: 12,
  flynnsClass: 'MIMD',
};

export const COMPARISON_CONFIG: SimulationConfig = {
  name: 'ArchFlow-2C-MSI',
  isa: 'CISC',
  numCores: 2,
  pipelineEnabled: false,
  cacheConfig: 'L1',
  coherenceProtocol: 'MSI',
  coherenceMechanism: 'Snooping',
  interconnect: 'Bus',
  memoryConsistency: 'Relaxed',
  syncPrimitive: 'LL-SC',
  controlUnitType: 'Microprogrammed',
  l1Size: 4,
  l2Size: 16,
  memoryLatency: 150,
  l1Latency: 6,
  l2Latency: 20,
  flynnsClass: 'MIMD',
};

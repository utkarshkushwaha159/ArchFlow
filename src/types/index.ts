// ====================================================
// ArchFlow - Core Type Definitions
// Computer Architecture for Intelligent Delivery Processing
// ====================================================

// --- Delivery Workload Types ---

export type Priority = 'Normal' | 'High' | 'Urgent';
export type DeliveryType = 'Standard' | 'Express' | 'Same-Day' | 'Fragile';
export type OrderStatus = 'Pending' | 'Processing' | 'Processed' | 'Failed';

export interface DeliveryOrder {
  id: string;
  customer: string;
  pickup: string;
  destination: string;
  weight: number;        // kg
  quantity: number;
  price: number;         // ₹
  distance: number;      // km
  priority: Priority;
  deliveryType: DeliveryType;
  status: OrderStatus;
}

export interface Workload {
  id: string;
  name: string;
  orders: DeliveryOrder[];
  createdAt: number;
}

// --- Instruction Types ---

export type Opcode =
  | 'LOAD' | 'STORE' | 'MOV'
  | 'ADD' | 'SUB' | 'MUL' | 'DIV'
  | 'AND' | 'OR' | 'XOR' | 'NOT' | 'SHL' | 'SHR'
  | 'CMP' | 'JMP' | 'JZ' | 'JNZ' | 'JGT' | 'JLT'
  | 'PUSH' | 'POP' | 'CALL' | 'RET'
  | 'NOP' | 'HALT' | 'UPDATE_STATUS';

export type AddressingMode = 'REGISTER' | 'IMMEDIATE' | 'DIRECT' | 'INDIRECT' | 'INDEXED';

export interface Instruction {
  address: number;
  opcode: Opcode;
  operand1?: string;   // e.g. "R1"
  operand2?: string;   // e.g. "R2" or immediate value
  operand3?: string;   // e.g. "R3"
  immediate?: number;
  memAddress?: number;
  addressingMode: AddressingMode;
  cycles: number;      // clock cycles for this instruction
  bytes: number;       // instruction size in bytes
  label?: string;      // optional symbolic label
  comment?: string;    // human-readable comment
}

// --- Registers ---

export interface RegisterFile {
  PC: number;          // Program Counter
  IR: string;          // Instruction Register (decoded string)
  MAR: number;         // Memory Address Register
  MDR: number;         // Memory Data Register
  ACC: number;         // Accumulator
  SP: number;          // Stack Pointer
  SR: StatusRegister;  // Status/Flag Register
  GP: number[];        // General Purpose R0-R7
}

export interface StatusRegister {
  zero: boolean;
  carry: boolean;
  sign: boolean;
  overflow: boolean;
  parity: boolean;
}

// --- Pipeline Types ---

export type PipelineStageId = 'IF' | 'ID' | 'EX' | 'MEM' | 'WB';

export interface PipelineSlot {
  stage: PipelineStageId;
  instruction: Instruction | null;
  isBubble: boolean;
  isStalled: boolean;
  stallReason?: string;
}

export type HazardType = 'DATA' | 'CONTROL' | 'STRUCTURAL' | 'NONE';

export interface PipelineHazard {
  type: HazardType;
  instruction: string;
  cycle: number;
  description: string;
}

export interface PipelineState {
  slots: PipelineSlot[];
  cycle: number;
  hazards: PipelineHazard[];
  stallCount: number;
  bubbleCount: number;
}

// --- CPU Core ---

export type CoreStatus = 'IDLE' | 'RUNNING' | 'STALLED' | 'WAITING' | 'COMPLETED';

export interface CPUCore {
  id: number;
  status: CoreStatus;
  registers: RegisterFile;
  pipeline: PipelineState;
  currentInstruction: Instruction | null;
  currentStage: PipelineStageId | null;
  executedInstructions: number;
  cycles: number;
  assignedOrderId?: string;
  cacheId: string;  // which cache this core uses
}

// --- Cache Types ---

export type CacheState = 'M' | 'E' | 'S' | 'I' | 'V';  // MESI + Valid/Invalid

export interface CacheLine {
  tag: number;
  data: number[];  // data words
  valid: boolean;
  dirty: boolean;
  state: CacheState;
  lastAccess: number;   // cycle of last access
  accessCount: number;
}

export interface CacheConfig {
  size: number;        // number of lines
  lineSize: number;    // words per line
  associativity: number; // 1=direct, N=N-way
  level: 'L1' | 'L2';
  coreId: number;      // -1 = shared
}

export interface Cache {
  config: CacheConfig;
  lines: CacheLine[];
  hits: number;
  misses: number;
  evictions: number;
}

export type MissType = 'Compulsory' | 'Capacity' | 'Conflict' | 'None';

export interface MemoryAccess {
  cycle: number;
  coreId: number;
  address: number;
  isWrite: boolean;
  l1Result: 'HIT' | 'MISS';
  l2Result?: 'HIT' | 'MISS';
  memResult?: 'HIT';
  missType?: MissType;
  data?: number;
  latency: number;
}

// --- Memory ---

export interface MainMemory {
  size: number;        // number of words
  data: Map<number, number>;
  accesses: number;
  latency: number;     // cycles
}

// --- Cache Coherence ---

export type CoherenceProtocol = 'VI' | 'MSI' | 'MESI' | 'Dragon';
export type CoherenceMechanism = 'Snooping' | 'Directory';

export interface CoherenceEvent {
  cycle: number;
  coreId: number;
  address: number;
  type: 'READ' | 'WRITE' | 'INVALIDATE' | 'UPDATE' | 'FETCH' | 'UPGRADE';
  fromState: CacheState;
  toState: CacheState;
  protocol: CoherenceProtocol;
  broadcast: boolean;
}

export interface DirectoryEntry {
  address: number;
  state: 'UNCACHED' | 'SHARED' | 'MODIFIED' | 'EXCLUSIVE';
  owner: number;       // core ID, -1 if none
  sharers: number[];   // core IDs
}

export interface CoherenceMetrics {
  totalMessages: number;
  invalidations: number;
  updates: number;
  busTransactions: number;
  stateTransitions: number;
  interventions: number;
}

// --- Interconnect ---

export type InterconnectType = 'Bus' | 'Ring' | 'Mesh' | 'PointToPoint';

export interface Packet {
  id: string;
  sourceCore: number;
  destCore: number;
  type: 'READ' | 'WRITE' | 'INVALIDATE' | 'DATA' | 'ACK';
  address: number;
  data?: number;
  cycle: number;
  hops: number;
  latency: number;
}

export interface InterconnectMetrics {
  totalPackets: number;
  totalHops: number;
  averageLatency: number;
  congestionEvents: number;
  bufferOccupancy: number;
}

// --- Simulation Configuration ---

export type ISAType = 'RISC' | 'CISC';
export type MemoryConsistency = 'Sequential' | 'Relaxed';
export type SyncPrimitive = 'LL-SC' | 'Barrier' | 'Both';
export type ControlUnitType = 'Hardwired' | 'Microprogrammed';
export type NumCores = 1 | 2 | 4 | 8;
export type CacheConfig2 = 'L1' | 'L1+L2';
export type FlynnsClass = 'SISD' | 'SIMD' | 'MISD' | 'MIMD';

export interface SimulationConfig {
  name: string;
  isa: ISAType;
  numCores: NumCores;
  pipelineEnabled: boolean;
  cacheConfig: CacheConfig2;
  coherenceProtocol: CoherenceProtocol;
  coherenceMechanism: CoherenceMechanism;
  interconnect: InterconnectType;
  memoryConsistency: MemoryConsistency;
  syncPrimitive: SyncPrimitive;
  controlUnitType: ControlUnitType;
  l1Size: number;    // cache lines
  l2Size: number;    // cache lines
  memoryLatency: number;  // cycles
  l1Latency: number;
  l2Latency: number;
  flynnsClass: FlynnsClass;
}

// --- Simulation State ---

export type SimulationStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export interface SimulationMetrics {
  totalInstructions: number;
  totalCycles: number;
  cpi: number;
  aluOperations: number;
  memoryAccesses: number;
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  cacheHitRate: number;
  coherenceMessages: number;
  invalidations: number;
  busTransactions: number;
  pipelineStalls: number;
  hazards: number;
  syncEvents: number;
  interconnectHops: number;
  processorUtilization: number;   // 0-1
  parallelSpeedup: number;
  singleCoreBaseline: number;     // cycles if single-core
}

export interface SimulationState {
  status: SimulationStatus;
  config: SimulationConfig;
  workload: Workload | null;
  cores: CPUCore[];
  caches: Cache[];
  memory: MainMemory;
  coherenceEvents: CoherenceEvent[];
  directory: Map<number, DirectoryEntry>;
  packets: Packet[];
  metrics: SimulationMetrics;
  executionLog: ExecutionEvent[];
  currentCycle: number;
  instructions: Instruction[];
  errorMessage?: string;
}

// --- Execution Trace ---

export type EventComponent = 'FETCH' | 'DECODE' | 'ALU' | 'CACHE' | 'MEMORY' | 'COHERENCE' | 'INTERCONNECT' | 'CONTROL' | 'SYNC' | 'PIPELINE';

export interface ExecutionEvent {
  id: string;
  cycle: number;
  coreId: number;
  stage: PipelineStageId | null;
  instruction: string;
  component: EventComponent;
  event: string;
  result: string;
  metadata?: Record<string, unknown>;
}

// --- Architecture Profile (saved) ---

export interface ArchitectureProfile {
  id: string;
  name: string;
  config: SimulationConfig;
  lastRun?: number;
  lastMetrics?: SimulationMetrics;
  createdAt: number;
}

// --- Experiment ---

export interface Experiment {
  id: string;
  name: string;
  description: string;
  configA: SimulationConfig;
  configB: SimulationConfig;
  workloadId: string;
  results?: ExperimentResult;
  ran: boolean;
}

export interface ExperimentResult {
  metricsA: SimulationMetrics;
  metricsB: SimulationMetrics;
  configA: SimulationConfig;
  configB: SimulationConfig;
  observation: string;
  ranAt: number;
}

// --- ALU Types ---

export type ALUOperation = 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'AND' | 'OR' | 'XOR' | 'NOT' | 'SHL' | 'SHR' | 'CMP';

export interface ALUResult {
  operation: ALUOperation;
  inputA: number;
  inputB: number;
  result: number;
  binaryA: string;
  binaryB: string;
  binaryResult: string;
  flags: StatusRegister;
  steps: ALUStep[];
  cycles: number;
}

export interface ALUStep {
  stepNumber: number;
  description: string;
  partialResult?: number;
  binaryRepresentation?: string;
  metadata?: Record<string, unknown>;
}

// Booth Algorithm specific
export interface BoothStep {
  iteration: number;
  A: number;
  Q: number;
  Q_minus1: number;
  operation: string;
  A_binary: string;
  Q_binary: string;
}

// --- IEEE 754 ---

export interface IEEE754Representation {
  decimal: number;
  binary: string;
  sign: number;
  exponent: number;
  mantissa: number;
  signBit: string;
  exponentBits: string;
  mantissaBits: string;
  biasedExponent: number;
}

// --- NUMA / Scalable Shared Memory ---

export interface NUMANode {
  id: number;
  cpuIds: number[];
  localMemorySize: number;
  localAccesses: number;
  remoteAccesses: number;
  remoteAccessPenalty: number;
}

// --- Micro-operations ---

export interface MicroOperation {
  step: number;
  signal: string;
  description: string;
  fromReg?: string;
  toReg?: string;
  operation?: string;
  address?: number;
}

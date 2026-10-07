// ====================================================
// Pipeline — 5-stage IF/ID/EX/MEM/WB simulation
// Hazard detection, stalls, forwarding
// ====================================================

import type {
  Instruction, PipelineState, PipelineStageId, PipelineSlot, HazardType, PipelineHazard
} from '../types';

export function createPipelineState(): PipelineState {
  return {
    slots: [
      { stage: 'IF',  instruction: null, isBubble: true,  isStalled: false },
      { stage: 'ID',  instruction: null, isBubble: true,  isStalled: false },
      { stage: 'EX',  instruction: null, isBubble: true,  isStalled: false },
      { stage: 'MEM', instruction: null, isBubble: true,  isStalled: false },
      { stage: 'WB',  instruction: null, isBubble: true,  isStalled: false },
    ],
    cycle: 0,
    hazards: [],
    stallCount: 0,
    bubbleCount: 0,
  };
}

const STAGES: PipelineStageId[] = ['IF', 'ID', 'EX', 'MEM', 'WB'];

// -------------------------------------------------------
// Hazard Detection
// -------------------------------------------------------

function detectHazards(slots: PipelineSlot[]): PipelineHazard[] {
  const hazards: PipelineHazard[] = [];
  const idSlot  = slots.find(s => s.stage === 'ID');
  const exSlot  = slots.find(s => s.stage === 'EX');
  const memSlot = slots.find(s => s.stage === 'MEM');

  if (!idSlot?.instruction) return hazards;

  const idInstr  = idSlot.instruction;
  const exInstr  = exSlot?.instruction;
  const memInstr = memSlot?.instruction;

  // RAW data hazard: ID needs a register that EX/MEM is writing
  const idReads = [idInstr.operand2, idInstr.operand3].filter(Boolean) as string[];
  const exWrites  = exInstr?.operand1  ? [exInstr.operand1]  : [];
  const memWrites = memInstr?.operand1 ? [memInstr.operand1] : [];

  for (const reg of idReads) {
    if (exWrites.includes(reg)) {
      hazards.push({
        type: 'DATA' as HazardType,
        instruction: `${idInstr.opcode} reads ${reg} (EX writes it)`,
        cycle: -1,
        description: `RAW hazard: ID stage reads ${reg}, EX stage writes ${reg}`,
      });
    }
    if (memWrites.includes(reg)) {
      hazards.push({
        type: 'DATA' as HazardType,
        instruction: `${idInstr.opcode} reads ${reg} (MEM writes it)`,
        cycle: -1,
        description: `RAW hazard: ID stage reads ${reg}, MEM stage writes ${reg}`,
      });
    }
  }

  // Structural hazard: two instructions in MEM stage requiring memory
  if (
    exInstr?.opcode === 'LOAD'  || exInstr?.opcode === 'STORE' ||
    memInstr?.opcode === 'LOAD' || memInstr?.opcode === 'STORE'
  ) {
    if (
      (exInstr?.opcode === 'LOAD' || exInstr?.opcode === 'STORE') &&
      (memInstr?.opcode === 'LOAD' || memInstr?.opcode === 'STORE')
    ) {
      hazards.push({
        type: 'STRUCTURAL' as HazardType,
        instruction: `${exInstr.opcode} and ${memInstr.opcode}`,
        cycle: -1,
        description: 'Structural hazard: two memory operations contend for memory bus',
      });
    }
  }

  // Control hazard: branch/jump in pipeline
  if (
    idInstr?.opcode === 'JMP' || idInstr?.opcode === 'JZ' ||
    idInstr?.opcode === 'JNZ' || idInstr?.opcode === 'JGT' || idInstr?.opcode === 'JLT'
  ) {
    hazards.push({
      type: 'CONTROL' as HazardType,
      instruction: idInstr.opcode,
      cycle: -1,
      description: 'Control hazard: branch instruction causes pipeline flush',
    });
  }

  return hazards;
}

// -------------------------------------------------------
// Advance pipeline by one cycle
// -------------------------------------------------------
export interface PipelineAdvanceResult {
  newState: PipelineState;
  stalled: boolean;
  hazard?: PipelineHazard;
  completedInstruction?: Instruction;
}

export function advancePipeline(
  state: PipelineState,
  nextInstruction: Instruction | null,
  pipelineEnabled: boolean,
): PipelineAdvanceResult {
  if (!pipelineEnabled) {
    // Non-pipelined: one instruction at a time
    const newState = { ...state, cycle: state.cycle + 1 };
    return { newState, stalled: false, completedInstruction: nextInstruction ?? undefined };
  }

  const slots = state.slots.map(s => ({ ...s }));
  const hazards = detectHazards(slots);
  const hasHazard = hazards.length > 0;

  let completedInstruction: Instruction | undefined;
  let stallCycles = 0;

  if (hasHazard) {
    // Insert bubble: stall IF and ID, propagate EX→MEM→WB
    completedInstruction = slots[STAGES.indexOf('WB')].instruction ?? undefined;

    // Shift EX→MEM→WB
    slots[STAGES.indexOf('WB')]  = { ...slots[STAGES.indexOf('MEM')],  stage: 'WB'  };
    slots[STAGES.indexOf('MEM')] = { ...slots[STAGES.indexOf('EX')],   stage: 'MEM' };

    // Insert bubble in EX
    slots[STAGES.indexOf('EX')]  = { stage: 'EX', instruction: null, isBubble: true, isStalled: false };

    // IF and ID stall
    slots[STAGES.indexOf('ID')].isStalled = true;
    slots[STAGES.indexOf('IF')].isStalled = true;
    stallCycles = 1;
  } else {
    // Normal advance: shift all stages
    completedInstruction = slots[STAGES.indexOf('WB')].instruction ?? undefined;

    for (let i = STAGES.length - 1; i > 0; i--) {
      slots[i] = { ...slots[i - 1], stage: STAGES[i] };
    }

    // Fetch new instruction
    slots[0] = {
      stage: 'IF',
      instruction: nextInstruction,
      isBubble: !nextInstruction,
      isStalled: false,
    };
  }

  const newHazards = detectHazards(slots);
  const allHazards = [...state.hazards, ...newHazards.map(h => ({ ...h, cycle: state.cycle + 1 }))];

  const newState: PipelineState = {
    slots,
    cycle: state.cycle + 1,
    hazards: allHazards.slice(-50), // keep last 50
    stallCount: state.stallCount + stallCycles,
    bubbleCount: state.bubbleCount + (hasHazard ? 1 : 0),
  };

  return {
    newState,
    stalled: hasHazard,
    hazard: hazards[0],
    completedInstruction,
  };
}

// -------------------------------------------------------
// Pipeline timeline for visualization (all instructions)
// -------------------------------------------------------
export interface PipelineTimelineEntry {
  instructionIndex: number;
  instructionStr: string;
  stages: { cycle: number; stage: PipelineStageId; isBubble: boolean }[];
}

export function buildPipelineTimeline(
  instructions: Instruction[],
  hazards: PipelineHazard[],
  pipelineEnabled: boolean,
): PipelineTimelineEntry[] {
  const timeline: PipelineTimelineEntry[] = [];
  const stageNames: PipelineStageId[] = ['IF', 'ID', 'EX', 'MEM', 'WB'];
  let extraStalls = 0;

  for (let i = 0; i < Math.min(instructions.length, 12); i++) {
    const instr = instructions[i];
    const startCycle = pipelineEnabled ? i + 1 + extraStalls : i * 5 + 1;
    const stages = stageNames.map((stage, j) => ({
      cycle: startCycle + j,
      stage,
      isBubble: false,
    }));

    // If a hazard affects this instruction, add stall
    const hasHazard = hazards.some(h => h.instruction.includes(instr.opcode));
    if (hasHazard && pipelineEnabled) extraStalls++;

    timeline.push({
      instructionIndex: i,
      instructionStr: `${instr.opcode} ${[instr.operand1, instr.operand2, instr.operand3].filter(Boolean).join(', ')}${instr.comment ? ' ; ' + instr.comment : ''}`,
      stages,
    });
  }
  return timeline;
}

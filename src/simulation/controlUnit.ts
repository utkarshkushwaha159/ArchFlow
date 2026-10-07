// ====================================================
// Control Unit — Instruction decoding, micro-operations
// Hardwired and Microprogrammed control
// ====================================================

import type { Instruction, MicroOperation, Opcode } from '../types';

// -------------------------------------------------------
// Micro-operation sequences per opcode
// -------------------------------------------------------

const FETCH_OPS: MicroOperation[] = [
  { step: 1, signal: 'MAR ← PC',         description: 'Transfer Program Counter to Memory Address Register', fromReg: 'PC',  toReg: 'MAR' },
  { step: 2, signal: 'MDR ← M[MAR]',     description: 'Read memory at MAR into Memory Data Register',        fromReg: 'MAR', toReg: 'MDR', operation: 'READ' },
  { step: 3, signal: 'IR  ← MDR',         description: 'Transfer MDR to Instruction Register',               fromReg: 'MDR', toReg: 'IR'  },
  { step: 4, signal: 'PC  ← PC + 1',      description: 'Increment Program Counter',                          fromReg: 'PC',  toReg: 'PC', operation: 'ADD' },
];

const DECODE_OPS: MicroOperation[] = [
  { step: 5, signal: 'Decode IR',          description: 'Control unit decodes instruction in IR',             fromReg: 'IR' },
  { step: 6, signal: 'Generate signals',   description: 'Emit control signals to functional units' },
];

function getExecuteOps(instr: Instruction): MicroOperation[] {
  const ops: MicroOperation[] = [];
  switch (instr.opcode) {
    case 'LOAD':
      ops.push(
        { step: 7, signal: 'MAR ← EA',     description: 'Load effective address into MAR',     fromReg: 'PC',  toReg: 'MAR' },
        { step: 8, signal: 'MDR ← M[MAR]', description: 'Fetch data from memory/cache',         fromReg: 'MAR', toReg: 'MDR', operation: 'READ' },
        { step: 9, signal: `${instr.operand1} ← MDR`, description: `Write MDR to ${instr.operand1}`, fromReg: 'MDR', toReg: instr.operand1 ?? 'R0' },
      );
      break;
    case 'STORE':
      ops.push(
        { step: 7, signal: 'MAR ← EA',     description: 'Load effective address into MAR' },
        { step: 8, signal: 'MDR ← R',      description: `Load ${instr.operand1} into MDR`,      fromReg: instr.operand1 ?? 'R0', toReg: 'MDR' },
        { step: 9, signal: 'M[MAR] ← MDR', description: 'Write MDR to memory',                  fromReg: 'MDR', operation: 'WRITE' },
      );
      break;
    case 'ADD':
    case 'SUB':
    case 'MUL':
    case 'DIV':
    case 'AND':
    case 'OR':
    case 'XOR':
      ops.push(
        { step: 7, signal: `A ← ${instr.operand2}`, description: `Load ${instr.operand2} into ALU A`, fromReg: instr.operand2 ?? 'R1', toReg: 'ACC' },
        { step: 8, signal: `B ← ${instr.operand3 ?? instr.operand2}`, description: `Load ${instr.operand3 ?? 'immediate'} into ALU B` },
        { step: 9, signal: `ALU ${instr.opcode}`,    description: `ALU performs ${instr.opcode} operation`, operation: instr.opcode },
        { step: 10, signal: `${instr.operand1} ← ALU result`, description: `Write result to ${instr.operand1}`, toReg: instr.operand1 ?? 'R0' },
      );
      break;
    case 'MOV':
      ops.push(
        { step: 7, signal: `${instr.operand1} ← ${instr.operand2 ?? instr.immediate}`, description: `Move value to ${instr.operand1}`, toReg: instr.operand1 ?? 'R0' },
      );
      break;
    case 'JMP':
    case 'JZ':
    case 'JNZ':
      ops.push(
        { step: 7, signal: 'Check flags',   description: 'Evaluate branch condition from Status Register', fromReg: 'SR' },
        { step: 8, signal: 'PC ← target',   description: 'Load branch target into Program Counter',        toReg: 'PC' },
      );
      break;
    case 'HALT':
      ops.push(
        { step: 7, signal: 'HALT',           description: 'Stop processor clock', operation: 'HALT' },
      );
      break;
    default:
      ops.push(
        { step: 7, signal: `Execute ${instr.opcode}`, description: `Execute ${instr.opcode} operation` },
      );
  }
  return ops;
}

// -------------------------------------------------------
// Full micro-op sequence for one instruction
// -------------------------------------------------------
export function getMicroOps(
  instr: Instruction,
  controlType: 'Hardwired' | 'Microprogrammed'
): MicroOperation[] {
  const fetchOps   = FETCH_OPS.map(o => ({ ...o, source: controlType }));
  const decodeOps  = DECODE_OPS.map(o => ({ ...o, source: controlType }));
  const executeOps = getExecuteOps(instr);

  if (controlType === 'Microprogrammed') {
    // Microprogrammed: wrap in microprogram ROM entries
    return [
      { step: 0, signal: 'Fetch microinstruction', description: '→ ROM lookup for current opcode' },
      ...fetchOps,
      ...decodeOps,
      ...executeOps,
      { step: 99, signal: 'Return to FETCH micro-state', description: 'Go to start of fetch sequence' },
    ];
  }

  return [...fetchOps, ...decodeOps, ...executeOps];
}

// -------------------------------------------------------
// Instruction format decoding (RISC vs CISC)
// -------------------------------------------------------
export interface DecodedInstruction {
  opcode: Opcode;
  type: 'R' | 'I' | 'J' | 'MEM' | 'CTRL';
  fields: Record<string, string | number>;
  cycleCount: number;
  description: string;
}

export function decodeInstruction(instr: Instruction, isRISC: boolean): DecodedInstruction {
  const { opcode } = instr;

  if (isRISC) {
    // RISC: all instructions 4 bytes, simple
    if (['ADD', 'SUB', 'MUL', 'DIV', 'AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'CMP'].includes(opcode)) {
      return {
        opcode,
        type: 'R',
        fields: {
          opcode: opcode,
          rd: instr.operand1 ?? '--',
          rs1: instr.operand2 ?? '--',
          rs2: instr.operand3 ?? '--',
          func: opcode,
        },
        cycleCount: instr.cycles,
        description: `RISC R-type: ${opcode} ${instr.operand1}, ${instr.operand2}, ${instr.operand3}`,
      };
    }
    if (opcode === 'LOAD' || opcode === 'STORE') {
      return {
        opcode,
        type: 'MEM',
        fields: {
          opcode,
          rd: instr.operand1 ?? '--',
          base: instr.operand2 ?? 'R0',
          offset: instr.memAddress ?? 0,
        },
        cycleCount: instr.cycles,
        description: `RISC MEM: ${opcode} ${instr.operand1}, [${(instr.memAddress ?? 0).toString(16).toUpperCase()}]`,
      };
    }
    return {
      opcode,
      type: 'CTRL',
      fields: { opcode },
      cycleCount: instr.cycles,
      description: `RISC CTRL: ${opcode}`,
    };
  } else {
    // CISC: instructions can be complex, memory operands allowed
    return {
      opcode,
      type: opcode === 'LOAD' || opcode === 'STORE' || opcode === 'MUL' ? 'MEM' : 'R',
      fields: {
        opcode,
        operand1: instr.operand1 ?? '--',
        operand2: instr.operand2 ?? (instr.memAddress ? `[${instr.memAddress.toString(16)}]` : '--'),
        bytes: instr.bytes,
      },
      cycleCount: instr.cycles + (opcode === 'MUL' ? 2 : 0),
      description: `CISC complex op: ${opcode} (variable bytes, complex decode)`,
    };
  }
}

// -------------------------------------------------------
// Control signals (simplified hardwired truth table)
// -------------------------------------------------------
export interface ControlSignals {
  regDst: boolean;
  aluSrc: boolean;
  memToReg: boolean;
  regWrite: boolean;
  memRead: boolean;
  memWrite: boolean;
  branch: boolean;
  aluOp: number;  // 2-bit ALU control code
}

export function getControlSignals(opcode: Opcode): ControlSignals {
  const base: ControlSignals = {
    regDst: false, aluSrc: false, memToReg: false,
    regWrite: false, memRead: false, memWrite: false,
    branch: false, aluOp: 0,
  };
  switch (opcode) {
    case 'ADD': case 'SUB': case 'MUL': case 'DIV':
    case 'AND': case 'OR':  case 'XOR': case 'NOT':
      return { ...base, regDst: true, regWrite: true, aluOp: 2 };
    case 'LOAD':
      return { ...base, aluSrc: true, memToReg: true, regWrite: true, memRead: true, aluOp: 0 };
    case 'STORE':
      return { ...base, aluSrc: true, memWrite: true, aluOp: 0 };
    case 'JMP': case 'JZ': case 'JNZ':
      return { ...base, branch: true, aluOp: 1 };
    default:
      return base;
  }
}

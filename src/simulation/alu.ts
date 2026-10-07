// ====================================================
// ALU — Arithmetic Logic Unit simulation
// Implements: ADD, SUB, MUL, DIV, AND, OR, XOR, NOT,
//             SHL, SHR, CMP, Booth Multiplication,
//             Array Multiplier, IEEE 754 ops
// ====================================================

import type { ALUOperation, ALUResult, ALUStep, BoothStep, IEEE754Representation, StatusRegister } from '../types';

// Helper: clamp to 32-bit signed
function s32(n: number): number {
  return n | 0;
}

function toBinary(n: number, bits = 8): string {
  if (n < 0) {
    // Two's complement
    const unsigned = (n >>> 0).toString(2);
    return unsigned.padStart(bits, '1').slice(-bits);
  }
  return (n >>> 0).toString(2).padStart(bits, '0').slice(-bits);
}

function computeFlags(result: number, a: number, b: number, op: ALUOperation): StatusRegister {
  const r32 = s32(result);
  const overflow = op === 'ADD'
    ? (a > 0 && b > 0 && r32 < 0) || (a < 0 && b < 0 && r32 > 0)
    : op === 'SUB'
    ? (a > 0 && b < 0 && r32 < 0) || (a < 0 && b > 0 && r32 > 0)
    : false;

  return {
    zero:     r32 === 0,
    carry:    (result >>> 0) !== (r32 >>> 0),
    sign:     r32 < 0,
    overflow,
    parity:   (result & 1) === 0,
  };
}

// -------------------------------------------------------
// Main ALU computation
// -------------------------------------------------------
export function executeALU(op: ALUOperation, a: number, b: number): ALUResult {
  let result = 0;
  const steps: ALUStep[] = [];
  let cycles = 1;

  switch (op) {
    case 'ADD': {
      result = s32(a + b);
      steps.push({ stepNumber: 1, description: `Binary ADD: ${toBinary(a)} + ${toBinary(b)}`, binaryRepresentation: toBinary(result) });
      break;
    }
    case 'SUB': {
      const bComp = s32(~b + 1);
      result = s32(a + bComp);
      steps.push(
        { stepNumber: 1, description: `Two's complement of B: ~${toBinary(b)} + 1 = ${toBinary(bComp)}` },
        { stepNumber: 2, description: `ADD A + (~B+1): ${toBinary(a)} + ${toBinary(bComp)} = ${toBinary(result)}` },
      );
      break;
    }
    case 'AND': {
      result = s32(a & b);
      steps.push({ stepNumber: 1, description: `Bitwise AND: ${toBinary(a)} & ${toBinary(b)} = ${toBinary(result)}` });
      break;
    }
    case 'OR': {
      result = s32(a | b);
      steps.push({ stepNumber: 1, description: `Bitwise OR: ${toBinary(a)} | ${toBinary(b)} = ${toBinary(result)}` });
      break;
    }
    case 'XOR': {
      result = s32(a ^ b);
      steps.push({ stepNumber: 1, description: `Bitwise XOR: ${toBinary(a)} ^ ${toBinary(b)} = ${toBinary(result)}` });
      break;
    }
    case 'NOT': {
      result = s32(~a);
      steps.push({ stepNumber: 1, description: `Bitwise NOT: ~${toBinary(a)} = ${toBinary(result)}` });
      break;
    }
    case 'SHL': {
      result = s32(a << (b & 31));
      steps.push({ stepNumber: 1, description: `Shift Left ${b & 31} bits: ${toBinary(a)} → ${toBinary(result)}` });
      break;
    }
    case 'SHR': {
      result = s32(a >> (b & 31));
      steps.push({ stepNumber: 1, description: `Arithmetic Shift Right ${b & 31} bits: ${toBinary(a)} → ${toBinary(result)}` });
      break;
    }
    case 'CMP': {
      result = s32(a - b);
      steps.push(
        { stepNumber: 1, description: `Compare A vs B: ${a} vs ${b}` },
        { stepNumber: 2, description: `Result = A - B = ${result} (flags set, result discarded)` },
      );
      break;
    }
    case 'MUL': {
      // Use Booth algorithm internally, returns final product
      const boothRes = boothMultiply(a, b);
      result = boothRes.result;
      cycles = 3;
      steps.push(
        { stepNumber: 1, description: `Booth multiplication: ${a} × ${b}`, metadata: { boothSteps: boothRes.steps } },
        { stepNumber: 2, description: `Product: ${result} (${toBinary(result)})` },
      );
      break;
    }
    case 'DIV': {
      if (b === 0) throw new Error('Division by zero');
      result = s32(Math.trunc(a / b));
      cycles = 5;
      steps.push(
        { stepNumber: 1, description: `Integer division: ${a} ÷ ${b}` },
        { stepNumber: 2, description: `Quotient: ${result}, Remainder: ${s32(a % b)}` },
      );
      break;
    }
  }

  const flags = computeFlags(result, a, b, op);

  return {
    operation: op,
    inputA: a,
    inputB: b,
    result,
    binaryA:      toBinary(a, 16),
    binaryB:      toBinary(b, 16),
    binaryResult: toBinary(result, 16),
    flags,
    steps,
    cycles,
  };
}

// -------------------------------------------------------
// Booth Algorithm (Signed Multiplication)
// -------------------------------------------------------
export interface BoothResult {
  result: number;
  steps: BoothStep[];
  multiplier: number;
  multiplicand: number;
}

export function boothMultiply(multiplier: number, multiplicand: number, bits = 8): BoothResult {
  const n = bits;
  let A = 0;
  let Q = multiplier & ((1 << n) - 1);  // n-bit
  let Q_1 = 0;
  const M = multiplicand;
  const steps: BoothStep[] = [];

  for (let i = 0; i < n; i++) {
    const q0 = Q & 1;
    let operation = 'No operation';

    if (q0 === 1 && Q_1 === 0) {
      // A = A - M
      A = s32(A - M);
      operation = 'A = A − M';
    } else if (q0 === 0 && Q_1 === 1) {
      // A = A + M
      A = s32(A + M);
      operation = 'A = A + M';
    }

    steps.push({
      iteration: i + 1,
      A,
      Q,
      Q_minus1: Q_1,
      operation,
      A_binary: toBinary(A, n),
      Q_binary: toBinary(Q, n),
    });

    // Arithmetic right shift of {A, Q, Q_1}
    const newQ_1 = Q & 1;
    Q = ((A & 1) << (n - 1)) | ((Q >>> 1) & ((1 << (n - 1)) - 1));
    A = s32(A) >> 1;
    Q_1 = newQ_1;
  }

  const result = (A << n) | (Q & ((1 << n) - 1));
  return { result: s32(result), steps, multiplier, multiplicand };
}

// -------------------------------------------------------
// Array Multiplier (Partial Products)
// -------------------------------------------------------
export interface ArrayMultiplierResult {
  multiplicand: number;
  multiplier: number;
  bits: number;
  partialProducts: string[];
  partialValues: number[];
  result: number;
  binaryResult: string;
}

export function arrayMultiply(a: number, b: number, bits = 8): ArrayMultiplierResult {
  const partialProducts: string[] = [];
  const partialValues: number[] = [];
  const aBin = (a >>> 0).toString(2).padStart(bits, '0').slice(-bits);

  for (let i = 0; i < bits; i++) {
    const bBit = (b >> i) & 1;
    const partial = bBit ? (a << i) : 0;
    partialValues.push(partial);
    const shiftedBin = bBit
      ? aBin.split('').map(bit => parseInt(bit) & bBit).join('') + '0'.repeat(i)
      : '0'.repeat(bits + i);
    partialProducts.push(shiftedBin.padStart(bits * 2, '0').slice(-(bits * 2)));
  }

  const result = partialValues.reduce((acc, v) => s32(acc + v), 0);
  return {
    multiplicand: a,
    multiplier: b,
    bits,
    partialProducts,
    partialValues,
    result,
    binaryResult: toBinary(result, bits * 2),
  };
}

// -------------------------------------------------------
// IEEE 754 Single Precision
// -------------------------------------------------------
export function toIEEE754(decimal: number): IEEE754Representation {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, decimal, false);
  const bits = new DataView(buf).getUint32(0, false);

  const signBit       = (bits >>> 31) & 1;
  const exponentBits  = (bits >>> 23) & 0xFF;
  const mantissaBits  = bits & 0x7FFFFF;

  const signStr     = signBit.toString();
  const expStr      = exponentBits.toString(2).padStart(8, '0');
  const mantissaStr = mantissaBits.toString(2).padStart(23, '0');

  return {
    decimal,
    binary: signStr + expStr + mantissaStr,
    sign: signBit,
    exponent: exponentBits - 127,
    mantissa: mantissaBits,
    signBit: signStr,
    exponentBits: expStr,
    mantissaBits: mantissaStr,
    biasedExponent: exponentBits,
  };
}

export function ieee754Op(
  a: number, b: number,
  op: 'ADD' | 'SUB' | 'MUL' | 'DIV'
): { result: number; repA: IEEE754Representation; repB: IEEE754Representation; repResult: IEEE754Representation; steps: string[] } {
  let result: number;
  const steps: string[] = [];
  const repA = toIEEE754(a);
  const repB = toIEEE754(b);

  switch (op) {
    case 'ADD':
      steps.push(`Align exponents: A exp=${repA.exponent}, B exp=${repB.exponent}`);
      steps.push(`Add mantissas with alignment shift`);
      result = a + b;
      break;
    case 'SUB':
      steps.push(`Align exponents: A exp=${repA.exponent}, B exp=${repB.exponent}`);
      steps.push(`Subtract mantissas`);
      result = a - b;
      break;
    case 'MUL':
      steps.push(`Multiply mantissas: 1.${repA.mantissaBits} × 1.${repB.mantissaBits}`);
      steps.push(`Add exponents: ${repA.exponent} + ${repB.exponent} = ${repA.exponent + repB.exponent}`);
      steps.push(`Normalize result`);
      result = a * b;
      break;
    case 'DIV':
      if (b === 0) throw new Error('Division by zero');
      steps.push(`Divide mantissas`);
      steps.push(`Subtract exponents: ${repA.exponent} - ${repB.exponent} = ${repA.exponent - repB.exponent}`);
      steps.push(`Normalize result`);
      result = a / b;
      break;
  }
  steps.push(`Normalize and round to IEEE 754`);
  return { result, repA, repB, repResult: toIEEE754(result), steps };
}

export { toBinary };

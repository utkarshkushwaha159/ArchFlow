// ====================================================
// WorkloadManager — converts delivery orders to instructions
// ====================================================

import type {
  DeliveryOrder, Workload, Instruction, Opcode
} from '../types';

const RATE_PER_KM = 15;       // ₹ per km
const WEIGHT_CHARGE = 5;      // ₹ per kg
let _instrAddress = 0x0040;
let _memBase     = 0x1000;

function nextAddr(): number { return (_instrAddress += 4); }
function memAddr(): number  { return (_memBase     += 4); }

function instr(
  opcode: Opcode,
  op1?: string, op2?: string, op3?: string,
  imm?: number, memAddr?: number,
  comment?: string,
  cycles = 1
): Instruction {
  const addr = nextAddr();
  return {
    address: addr,
    opcode,
    operand1: op1,
    operand2: op2,
    operand3: op3,
    immediate: imm,
    memAddress: memAddr,
    addressingMode: memAddr ? 'DIRECT' : imm !== undefined ? 'IMMEDIATE' : 'REGISTER',
    cycles,
    bytes: 4,
    comment,
  };
}

/** Generate a realistic instruction stream for one delivery order */
export function generateInstructions(order: DeliveryOrder, isRISC = true): Instruction[] {
  _instrAddress = 0x003C;  // reset per order
  _memBase      = 0x0FFC;

  const qtyAddr    = memAddr();
  const priceAddr  = memAddr();
  const distAddr   = memAddr();
  const rateAddr   = memAddr();
  const weightAddr = memAddr();
  const totalAddr  = memAddr();
  const instrList: Instruction[] = [];

  if (isRISC) {
    // RISC: load/store architecture, simple fixed-format instructions
    instrList.push(
      instr('LOAD',  'R1', undefined, undefined, undefined, qtyAddr,    `Load quantity=${order.quantity}`),
      instr('LOAD',  'R2', undefined, undefined, undefined, priceAddr,  `Load price=${order.price}`),
      instr('MUL',   'R3', 'R1',     'R2',       undefined, undefined,  'R3 = quantity * price',         3),
      instr('LOAD',  'R4', undefined, undefined, undefined, distAddr,   `Load distance=${order.distance}`),
      instr('LOAD',  'R5', undefined, undefined, undefined, rateAddr,   `Load rate=${RATE_PER_KM}`),
      instr('MUL',   'R6', 'R4',     'R5',       undefined, undefined,  'R6 = distance * rate',          3),
      instr('LOAD',  'R0', undefined, undefined, undefined, weightAddr, `Load weight=${order.weight}`),
      instr('MOV',   'R7', undefined, undefined, WEIGHT_CHARGE,  undefined, `Weight charge rate=${WEIGHT_CHARGE}`),
      instr('MUL',   'R7', 'R0',     'R7',       undefined, undefined,  'R7 = weight * charge_rate',     3),
      instr('ADD',   'R3', 'R3',     'R6',       undefined, undefined,  'R3 += delivery charge'),
      instr('ADD',   'R3', 'R3',     'R7',       undefined, undefined,  'R3 += weight charge'),
    );

    // Priority surcharge
    if (order.priority === 'High') {
      instrList.push(
        instr('MOV', 'R0', undefined, undefined, 15,  undefined, 'High priority surcharge 15%'),
        instr('MUL', 'R7', 'R3',     'R0',       undefined, undefined,  'R7 = surcharge amount',  3),
        instr('ADD', 'R3', 'R3',     'R7',       undefined, undefined,  'R3 += surcharge'),
      );
    } else if (order.priority === 'Urgent') {
      instrList.push(
        instr('MOV', 'R0', undefined, undefined, 25,  undefined, 'Urgent priority surcharge 25%'),
        instr('MUL', 'R7', 'R3',     'R0',       undefined, undefined,  'R7 = surcharge amount',  3),
        instr('ADD', 'R3', 'R3',     'R7',       undefined, undefined,  'R3 += surcharge'),
      );
    }

    instrList.push(
      instr('STORE',         'R3', undefined, undefined, undefined, totalAddr, 'Store total cost'),
      instr('UPDATE_STATUS', undefined, undefined, undefined, undefined, undefined, 'Mark order PROCESSED'),
      instr('HALT',          undefined, undefined, undefined, undefined, undefined, 'End of order execution'),
    );
  } else {
    // CISC: richer, variable-length-like instructions (memory-to-register ops)
    instrList.push(
      instr('LOAD',  'R1', undefined, undefined, undefined, qtyAddr,    `[CISC] Load M[${qtyAddr.toString(16)}]→R1`),
      instr('MUL',   'R1', undefined, undefined, undefined, priceAddr,  '[CISC] R1 = R1 * M[price] (mem-reg op)', 4),
      instr('ADD',   'R1', undefined, undefined, undefined, distAddr,   '[CISC] R1 += M[distance] * rate',       4),
      instr('STORE',         'R1', undefined, undefined, undefined, totalAddr, '[CISC] M[total]←R1'),
      instr('UPDATE_STATUS', undefined, undefined, undefined, undefined, undefined, 'Mark PROCESSED'),
      instr('HALT'),
    );
  }

  return instrList;
}

/** Generate a full workload from multiple orders */
export function generateWorkloadInstructions(workload: Workload, isRISC = true): Instruction[] {
  const all: Instruction[] = [];
  for (const order of workload.orders) {
    all.push(...generateInstructions(order, isRISC));
  }
  return all;
}

// --- Seed workloads ---

export const SEED_ORDERS: DeliveryOrder[] = [
  {
    id: 'AF-1001', customer: 'Priya Sharma', pickup: 'Andheri', destination: 'Bandra',
    weight: 2.5, quantity: 5,  price: 420,  distance: 8.4,  priority: 'Normal', deliveryType: 'Standard', status: 'Pending',
  },
  {
    id: 'AF-1002', customer: 'Rahul Verma',  pickup: 'Dadar',   destination: 'Thane',
    weight: 5.0, quantity: 12, price: 850,  distance: 18.6, priority: 'High',   deliveryType: 'Express',  status: 'Pending',
  },
  {
    id: 'AF-1003', customer: 'Neha Patil',   pickup: 'Colaba',  destination: 'Goregaon',
    weight: 1.2, quantity: 3,  price: 1200, distance: 6.2,  priority: 'Urgent', deliveryType: 'Same-Day', status: 'Pending',
  },
  {
    id: 'AF-1004', customer: 'Amit Singh',   pickup: 'Kurla',   destination: 'Borivali',
    weight: 8.5, quantity: 20, price: 260,  distance: 24.5, priority: 'Normal', deliveryType: 'Standard', status: 'Pending',
  },
];

export const SEED_WORKLOAD: Workload = {
  id: 'wl-seed',
  name: 'Mumbai Metro Deliveries',
  orders: SEED_ORDERS,
  createdAt: 1700000000000,
};

export const EXPRESS_WORKLOAD: Workload = {
  id: 'wl-express',
  name: 'Express Flash Rush (High Priority)',
  orders: [
    {
      id: 'AF-2001', customer: 'Rohan Gupta', pickup: 'Bandra Kurla Complex', destination: 'Nariman Point',
      weight: 0.8, quantity: 2, price: 1500, distance: 14.2, priority: 'Urgent', deliveryType: 'Same-Day', status: 'Pending',
    },
    {
      id: 'AF-2002', customer: 'Ananya Roy', pickup: 'Lower Parel', destination: 'Powai',
      weight: 1.5, quantity: 4, price: 2200, distance: 19.8, priority: 'Urgent', deliveryType: 'Express', status: 'Pending',
    },
    {
      id: 'AF-2003', customer: 'Vikram Mehta', pickup: 'Andheri East', destination: 'Vashi',
      weight: 3.2, quantity: 6, price: 950, distance: 26.0, priority: 'High', deliveryType: 'Express', status: 'Pending',
    },
  ],
  createdAt: 1700000001000,
};

export const BULK_CARGO_WORKLOAD: Workload = {
  id: 'wl-bulk',
  name: 'Intercity Bulk Cargo Logistics',
  orders: [
    {
      id: 'AF-3001', customer: 'Apex Retailers', pickup: 'Bhiwandi Hub', destination: 'Pune DC',
      weight: 18.5, quantity: 45, price: 180, distance: 145.0, priority: 'Normal', deliveryType: 'Standard', status: 'Pending',
    },
    {
      id: 'AF-3002', customer: 'FreshMart Supplies', pickup: 'Vashi APMC', destination: 'Nashik Central',
      weight: 22.0, quantity: 60, price: 140, distance: 165.5, priority: 'High', deliveryType: 'Express', status: 'Pending',
    },
    {
      id: 'AF-3003', customer: 'TechnoParts Ltd', pickup: 'Taloja MIDC', destination: 'Chakan Industrial',
      weight: 12.0, quantity: 18, price: 650, distance: 120.0, priority: 'Urgent', deliveryType: 'Same-Day', status: 'Pending',
    },
    {
      id: 'AF-3004', customer: 'Zenith Logistics', pickup: 'JNPT Port', destination: 'Panvel Hub',
      weight: 35.0, quantity: 80, price: 95, distance: 28.5, priority: 'Normal', deliveryType: 'Standard', status: 'Pending',
    },
  ],
  createdAt: 1700000002000,
};

export const PRESET_WORKLOADS: Workload[] = [
  SEED_WORKLOAD,
  EXPRESS_WORKLOAD,
  BULK_CARGO_WORKLOAD,
];

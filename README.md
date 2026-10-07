# ArchFlow ⚡
### Computer Architecture for Intelligent Delivery Processing
> **Course:** Computer Architecture and Parallel Processing (`CCSE0304`)  
> **Type:** College Project-Based Learning (PBL) Prototype  
> **Author:** Utkarsh Kushwaha ([@utkarshkushwaha159](https://github.com/utkarshkushwaha159))

---

## 🎯 Project Thesis

> *"Existing delivery platforms optimize the logistics operation. ArchFlow models, implements, and evaluates the computer architecture that processes delivery workloads."*

Delivery systems generate millions of concurrent tasks: fee calculation, distance-rate arithmetic, cache accesses to customer records, multi-core order dispatching, and memory synchronization. **ArchFlow** simulates the computer architecture stack from silicon-level arithmetic up to parallel multiprocessor systems processing these real workloads.

---

## 📚 Curriculum Coverage (CCSE0304 - All 5 Units)

### Unit 1: Computer Fundamentals & Processor Organization
- **RISC vs CISC ISAs:** Load/Store architecture with fixed 4-byte formats vs memory-to-register complex instructions.
- **5-Stage Instruction Pipeline:** Cycle-accurate simulation of `IF` (Fetch), `ID` (Decode), `EX` (Execute), `MEM` (Memory Access), and `WB` (Write-Back).
- **Hazard Detection & Forwarding:** RAW (Read-After-Write) data hazards, control hazards on branch penalties, and structural conflicts.
- **Control Unit Design:** Hardwired combinational logic vs Microprogrammed control memory address sequencers.

### Unit 2: Computer Arithmetic & ALU
- **ALU Operations:** 11 arithmetic and logical operations (`ADD`, `SUB`, `MUL`, `DIV`, `AND`, `OR`, `XOR`, `NOT`, `SHL`, `SHR`, `CMP`).
- **Condition Flags:** `Z` (Zero), `C` (Carry), `S` (Sign/Negative), and `V` (Overflow).
- **Booth's Multiplication Algorithm:** Step-by-step signed 2's complement multiplication with cycle trace of Accumulator ($A$), Multiplier ($Q$), $Q_{-1}$, and Arithmetic Right Shifts (ARS).
- **Array Multiplier:** Combinational partial product bit matrix and carry-save addition simulation.
- **IEEE 754 Floating-Point:** 32-bit single-precision floating-point converter (Sign, 8-bit biased exponent, 23-bit normalized mantissa).

### Unit 3: Memory Organization & Cache
- **Cache Mapping Schemes:** Direct Mapped, 2-Way Set Associative, 4-Way Set Associative, and Fully Associative.
- **Address Breakdown:** Dynamic calculation of Tag bits, Set Index bits, and Block Offset bits.
- **Cache Replacement Policies:** LRU (Least Recently Used) and FIFO.
- **Memory Hierarchy:** L1 Split Cache (1-2 cycles), L2 Unified Cache (8-12 cycles), DRAM Main Memory (100 cycles), and Virtual Memory TLB simulation.
- **Write Policies:** Write-Through with write buffers vs Write-Back with dirty-bit tracking.

### Unit 4: I/O Organization & Multiprocessor Interconnect
- **I/O Transfer Modes:** Programmed I/O polling, Interrupt-Driven I/O with ISR routines, and Direct Memory Access (DMA) burst transfer.
- **Interconnect Topologies:** Shared Bus (bus contention & serialization), Token Ring (hop-count latency), 2D Mesh ($XY$ coordinate routing), and Non-blocking Crossbar Point-to-Point.

### Unit 5: Parallel Processing & Multiprocessors
- **Flynn's Taxonomy:** SISD, SIMD (vector delivery fee processing), MISD, and MIMD.
- **Multi-Core Symmetric Multiprocessing:** 1, 2, 4, and 8 core scalability with dynamic workload partitioning.
- **Cache Coherence Protocols:**
  - `VI` (Valid/Invalid)
  - `MSI` (Modified, Shared, Invalid)
  - `MESI` (Illinois Protocol with Exclusive state)
  - `Dragon` (Update-based snooping protocol with Shared-Modified & Shared-Clean)
- **Synchronization Primitives:** Test-and-Set (TAS), Fetch-and-Add (FAA), and Compare-and-Swap (CAS) for lock-free order claiming.
- **Performance Laws:** Interactive Amdahl's Law and Gustafson's Law calculators comparing theoretical vs simulated speedup curves.

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Custom High-Performance Modern CSS Design System (Dark Industrial Theme)
- **Data Visualization:** Recharts (Interactive bar, area, and speedup charts)
- **Architecture Engines:** Discrete custom simulation engines written in TypeScript (`/src/simulation/`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (>= 18.x)
- npm or pnpm

### Installation
```bash
# Clone the repository
git clone https://github.com/utkarshkushwaha159/ArchFlow.git

# Navigate to project directory
cd ArchFlow

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 📊 Live Prototype Features
1. **Overview Dashboard:** Live KPI metrics, core status meters, and execution progress.
2. **Delivery Workloads:** Disassembly of realistic Mumbai Metro delivery orders into machine-level instructions.
3. **Architecture Lab:** Real-time architectural configuration workbench.
4. **Processor & Pipeline:** Interactive 5-stage pipeline timeline and micro-op decoder.
5. **ALU & Arithmetic:** Interactive Booth stepper and IEEE 754 inspector.
6. **Memory Hierarchy:** Cache set visualizer, address bit calculator, and TLB hit/miss statistics.
7. **Cache & Coherence:** State machine transitions (MSI, MESI, Dragon) with snooping bus traces.
8. **Parallel System:** Interconnect contention and multi-core scaling analysis.
9. **Execution Trace:** Full instruction event log with CSV export.
10. **Architecture Comparison:** Configurable A/B architecture benchmarks with comparative metrics.
11. **Preset Experiments:** 8 pre-configured academic experiments with hypothesis validations.
12. **Curriculum Documentation:** Complete mapping of features to syllabus units.

---

## 📜 License
Educational project developed for **Computer Architecture and Parallel Processing (CCSE0304)**.

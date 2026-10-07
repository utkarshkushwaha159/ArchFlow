export default function DocumentationPage() {
  const sections = [
    {
      id: 'what',
      title: 'What is ArchFlow?',
      content: `ArchFlow is a configurable computer-architecture simulation platform that processes real-world delivery workloads and evaluates how different processor, memory, cache-coherence, and parallel-architecture configurations affect execution performance.

Unlike conventional delivery management systems, ArchFlow uses delivery data as the workload and evaluates the underlying computer architecture that processes it. The delivery system is the application; the architecture is the subject of study.`,
    },
    {
      id: 'problem',
      title: 'Problem Statement',
      content: `Existing delivery platforms optimize logistics operations. ArchFlow models, implements, and evaluates the computer architecture that processes delivery workloads.

The prototype answers: How do processor design choices (ISA, pipeline, core count, cache configuration, coherence protocol, and interconnect topology) affect the execution of real delivery workloads?`,
    },
    {
      id: 'arch',
      title: 'System Architecture',
      content: `ArchFlow is structured as a layered simulation engine:

Simulation Engine → WorkloadManager → InstructionGenerator → ControlUnit → ProcessorManager → ALU → MemoryHierarchy → CacheController → CoherenceManager → ParallelScheduler → Interconnect → MetricsCollector

Each module is independently implemented. The frontend subscribes to simulation state and renders actual computed values — not hardcoded displays.`,
    },
  ];

  const units = [
    {
      unit: 'Unit 1', title: 'Computer Organization & Architecture',
      items: [
        ['General Register Organization', 'R0–R7 + PC/IR/MAR/MDR/ACC/SP/SR', 'Processor Page'],
        ['RISC vs CISC', 'Configurable ISA with different instruction formats', 'Architecture Lab'],
        ['Flynn\'s Classification', 'SISD/SIMD/MISD/MIMD modes', 'Parallel System'],
        ['Memory Hierarchy', 'Registers → L1 → L2 → Main Memory', 'Memory Hierarchy'],
      ],
    },
    {
      unit: 'Unit 2', title: 'ALU & Arithmetic',
      items: [
        ['Integer ALU', 'ADD/SUB/AND/OR/XOR/NOT/SHL/SHR/CMP', 'ALU Lab'],
        ['Booth Multiplication', 'Step-by-step signed multiplication', 'ALU Lab → Booth'],
        ['Array Multiplier', 'Partial products visualization', 'ALU Lab → Array'],
        ['IEEE 754', 'Single-precision FP representation + arithmetic', 'ALU Lab → IEEE754'],
      ],
    },
    {
      unit: 'Unit 3', title: 'Control Unit',
      items: [
        ['Instruction Cycle', 'FETCH → DECODE → EXECUTE → MEMORY → WRITEBACK', 'Processor Page'],
        ['Micro-Operations', 'RTL-level signal sequence per instruction', 'Architecture Lab'],
        ['Hardwired Control', 'Combinational logic control signals', 'Processor / Lab'],
        ['Microprogrammed', 'ROM-indexed micro-instruction sequence', 'Processor / Lab'],
        ['Pipelining', '5-stage IF/ID/EX/MEM/WB with hazard detection', 'Architecture Lab'],
        ['Hazard Detection', 'Data, control, structural hazards + stalls', 'Architecture Lab'],
      ],
    },
    {
      unit: 'Unit 4', title: 'Introduction to Parallel Architectures',
      items: [
        ['MESI Protocol', '4-state invalidate coherence protocol', 'Cache & Coherence'],
        ['MSI / VI', 'Simpler coherence protocols for comparison', 'Cache & Coherence'],
        ['Dragon Protocol', 'Update-based coherence', 'Cache & Coherence'],
        ['Snooping', 'Broadcast-based coherence mechanism', 'Cache & Coherence'],
        ['Directory-based', 'Point-to-point scalable coherence', 'Cache & Coherence'],
        ['Invalidate vs Update', 'Experimental comparison', 'Experiments'],
      ],
    },
    {
      unit: 'Unit 5', title: 'Parallel Systems',
      items: [
        ['Multi-core Execution', '1/2/4/8 core parallel simulation', 'Parallel System'],
        ['Interconnect Topologies', 'Bus / Ring / Mesh / Point-to-Point', 'Architecture Lab'],
        ['XY Routing (Mesh)', 'Hardware interconnect routing', 'Architecture Lab'],
        ['LL-SC Synchronization', 'Load-Linked / Store-Conditional primitives', 'Parallel System'],
        ['Barrier Sync', 'Core synchronization at shared barriers', 'Parallel System'],
        ['NUMA Model', 'Simplified Non-Uniform Memory Access', 'Parallel System'],
        ['SGI Origin / NUMA-Q', 'Educational architecture case studies', 'Parallel System'],
        ['Memory Consistency', 'Sequential vs Relaxed consistency models', 'Architecture Lab'],
      ],
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documentation</h1>
        <p className="page-subtitle">ArchFlow · Computer Architecture for Intelligent Delivery Processing · PBL Reference</p>
      </div>

      {/* Overview */}
      <div className="grid grid-2 gap-4 mb-6">
        {sections.map(s => (
          <div className="panel" key={s.id}>
            <div className="panel-header">
              <span>{s.title}</span>
            </div>
            <div className="panel-body">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {s.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Course coverage */}
      <div className="panel mb-6">
        <div className="panel-header">
          <div className="panel-title-group">
            <span>Course Coverage</span>
            <span className="panel-tag">CCSE0304</span>
          </div>
          <span className="text-xs text-muted">Computer Architecture and Parallel Processing</span>
        </div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          {units.map(u => (
            <div key={u.unit} style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 8 }}>
                <span className="badge badge-accent" style={{ marginRight: 8 }}>{u.unit}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.title}</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Concept</th>
                    <th>Implementation</th>
                    <th>Where Demonstrated</th>
                  </tr>
                </thead>
                <tbody>
                  {u.items.map(([concept, impl, where]) => (
                    <tr key={concept}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{concept}</td>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{impl}</td>
                      <td><span className="badge badge-accent">{where}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation formulas */}
      <div className="panel mb-6">
        <div className="panel-header"><span>Metric Formulas</span></div>
        <div className="panel-body">
          <div className="grid grid-2 gap-4">
            {[
              ['CPI', 'Total Cycles / Total Instructions Executed'],
              ['Cache Hit Rate', '(L1 Hits + L2 Hits) / Total Cache Accesses'],
              ['Parallel Speedup', 'Single-Core Baseline Cycles / Multi-Core Cycles'],
              ['Amdahl Efficiency', 'Speedup / Number of Cores × 100%'],
              ['Processor Utilization', 'Instructions / (Cycles × Core Count)'],
              ['Memory Accesses', 'LOADs + STOREs executed'],
            ].map(([metric, formula]) => (
              <div key={metric} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 4 }}>{metric}</div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formula}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="alert alert-info">
        <div>
          <strong>Educational Simulation Note:</strong> ArchFlow provides educational simulation models of processor, cache, coherence, and parallel architectures. All metrics are computed by the simulation engine from actual workload execution. Some behaviors are simplified for educational clarity (e.g., miss type attribution, NUMA remote access, and Dragon protocol internals). ArchFlow does not claim to be a cycle-accurate hardware emulator.
        </div>
      </div>
    </div>
  );
}

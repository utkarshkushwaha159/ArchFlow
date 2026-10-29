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
        ['General Register Organization', 'R0–R7 + PC/IR/MAR/MDR/ACC/SP/SR', 'Simulation Lab → Processor'],
        ['RISC vs CISC', 'Configurable ISA with different instruction formats', 'Simulation Lab / Workloads'],
        ['Flynn\'s Classification', 'SISD/SIMD/MISD/MIMD modes', 'Simulation Lab → Parallel'],
        ['Memory Hierarchy', 'Registers → L1 → L2 → Main Memory', 'Simulation Lab → Memory'],
      ],
    },
    {
      unit: 'Unit 2', title: 'ALU & Arithmetic',
      items: [
        ['Integer ALU', 'ADD/SUB/AND/OR/XOR/NOT/SHL/SHR/CMP with flags', 'Simulation Lab → ALU'],
        ['Booth Multiplication', 'Step-by-step signed multiplication table', 'Simulation Lab → ALU (Booth)'],
        ['Array Multiplier', 'Partial products visualization', 'Simulation Lab → ALU (Array)'],
        ['IEEE 754', 'Single-precision FP representation + arithmetic', 'Simulation Lab → ALU (IEEE 754)'],
      ],
    },
    {
      unit: 'Unit 3', title: 'Control Unit & Pipelining',
      items: [
        ['Instruction Cycle', 'FETCH → DECODE → EXECUTE → MEMORY → WRITEBACK', 'Simulation Lab (Playback)'],
        ['Micro-Operations', 'RTL-level signal sequence per instruction', 'Simulation Lab → Micro-Ops'],
        ['Hardwired Control', 'Combinational logic control signals', 'Simulation Lab → Processor'],
        ['Microprogrammed', 'ROM-indexed micro-instruction sequence', 'Simulation Lab → Processor'],
        ['Pipelining', '5-stage IF/ID/EX/MEM/WB with hazard detection', 'Simulation Lab → Pipeline'],
        ['Hazard Detection', 'Data, control, structural hazards + stalls', 'Results & Compare → Summary'],
      ],
    },
    {
      unit: 'Unit 4', title: 'Cache Coherence Protocols',
      items: [
        ['MESI Protocol', '4-state invalidate coherence state machine', 'Simulation Lab → Cache'],
        ['MSI / VI', 'Simpler coherence protocols for comparison', 'Simulation Lab → Cache'],
        ['Dragon Protocol', 'Update-based coherence protocol', 'Simulation Lab → Cache'],
        ['Snooping Mechanism', 'Broadcast-based bus coherence', 'Simulation Lab → Cache'],
        ['Directory-based', 'Point-to-point scalable coherence', 'Simulation Lab → Cache'],
        ['Invalidate vs Update', 'Experimental comparison with observation', 'Results & Compare → Experiments'],
      ],
    },
    {
      unit: 'Unit 5', title: 'Parallel Systems & Interconnects',
      items: [
        ['Multi-core Execution', '1/2/4/8 core parallel simulation & speedup', 'Simulation Lab → Parallel'],
        ['Interconnect Topologies', 'Bus / Ring / Mesh / Point-to-Point routing', 'Simulation Lab → Parallel'],
        ['LL-SC Synchronization', 'Load-Linked / Store-Conditional primitives', 'Simulation Lab → Parallel'],
        ['Barrier Sync', 'Core synchronization at shared barriers', 'Simulation Lab → Parallel'],
        ['NUMA Model', 'Non-Uniform Memory Access with local/remote ratio', 'Simulation Lab → Parallel'],
        ['Memory Consistency', 'Sequential vs Relaxed consistency models', 'Results & Compare → Compare'],
      ],
    },
  ];

  return (
    <div className="single-screen-page">
      <div className="page-header shrink-0" style={{ marginBottom: 8, paddingBottom: 6 }}>
        <h1 className="page-title" style={{ fontSize: '1.2rem', margin: 0 }}>Documentation & Syllabus Mapping</h1>
        <p className="page-subtitle" style={{ fontSize: '0.72rem', margin: 0 }}>ArchFlow · Computer Architecture for Intelligent Delivery Processing · PBL Reference</p>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        {/* Overview */}
        <div className="grid grid-2 gap-4 mb-4">
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
        <div className="panel mb-4">
          <div className="panel-header">
            <div className="panel-title-group">
              <span>Course Coverage</span>
              <span className="panel-tag">CCSE0304</span>
            </div>
            <span className="text-xs text-muted">Computer Architecture and Parallel Processing</span>
          </div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            {units.map(u => (
              <div key={u.unit} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 6 }}>
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
        <div className="panel mb-4">
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
        <div className="alert alert-info mb-4">
          <div>
            <strong>Educational Simulation Note:</strong> ArchFlow provides educational simulation models of processor, cache, coherence, and parallel architectures. All metrics are computed by the simulation engine from actual workload execution. Some behaviors are simplified for educational clarity (e.g., miss type attribution, NUMA remote access, and Dragon protocol internals). ArchFlow does not claim to be a cycle-accurate hardware emulator.
          </div>
        </div>
      </div>
    </div>
  );
}

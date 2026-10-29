import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type {
  CoherenceProtocol, InterconnectType, NumCores, ISAType,
  CacheConfig2, CoherenceMechanism, MemoryConsistency,
  SyncPrimitive, ControlUnitType, ExecutionEvent, RegisterFile, StatusRegister
} from '../types';
import { getMicroOps } from '../simulation/controlUnit';
import { buildPipelineTimeline } from '../simulation/pipeline';

// Consolidated Academic Lab Sub-Views
import ProcessorPage from './ProcessorPage';
import ALUPage from './ALUPage';
import CachePage from './CachePage';
import MemoryPage from './MemoryPage';
import ParallelPage from './ParallelPage';

// =============================================================
// Playback speed settings
// =============================================================
type PlaybackSpeed = 'slow' | 'normal' | 'fast';
const SPEED_DELAYS: Record<PlaybackSpeed, number> = {
  slow:   1200,
  normal:  600,
  fast:    200,
};
const SPEED_LABELS: Record<PlaybackSpeed, string> = {
  slow:   'Slow (1.2s)',
  normal: 'Normal (0.6s)',
  fast:   'Fast (0.2s)',
};

type LabMode = 'simulation' | 'processor' | 'alu' | 'cache' | 'memory' | 'parallel';
type TechTab = 'registers' | 'alu' | 'memory' | 'pipeline' | 'trace' | 'metrics';

// =============================================================
// Explain an execution event in beginner-friendly terms
// =============================================================
function explainEvent(ev: ExecutionEvent): { title: string; body: string; detail: string; nextStep: string } {
  const { component, event, instruction, result, coreId, cycle } = ev;

  switch (component) {
    case 'FETCH':
      return {
        title: 'Instruction Fetch (IF)',
        body: `Core ${coreId} is fetching instruction "${instruction}" from memory. The Program Counter (PC) provides the byte address. The instruction bits are loaded into the Instruction Register (IR).`,
        detail: `Cycle: ${cycle} | Core: ${coreId} | IR ← "${instruction}"`,
        nextStep: 'The Instruction Register (IR) contents will be passed to the Control Unit for decoding.',
      };
    case 'DECODE':
      return {
        title: 'Instruction Decode (ID)',
        body: `The Control Unit decodes the opcode and determines operand locations. Register addresses are identified, and control signals are generated for the ALU and data paths.`,
        detail: `Opcode decoded: ${instruction.split(' ')[0]} | Register operands routed`,
        nextStep: 'Execution units (ALU or Memory Address Generator) will be activated next cycle.',
      };
    case 'ALU': {
      const isDiv = event.includes('DIV');
      return {
        title: `ALU Execution (EX) — ${event.split(' ')[0]}`,
        body: `The Arithmetic Logic Unit is computing: ${event.split(' ')[0]}. ${
          isDiv ? 'Division uses iterative subtract-and-shift operations taking multiple clock cycles. ' : ''
        }Operands are processed through combinational logic and status flags (Zero, Carry, Sign) update accordingly.`,
        detail: `Operation: ${event} | Calculated Output: ${result}`,
        nextStep: 'The computed output is prepared for write-back into the destination register.',
      };
    }
    case 'CACHE':
      if (event.includes('HIT')) {
        return {
          title: 'Cache Hit — Fast Data Access',
          body: `The required delivery data was present in Core ${coreId}'s L1 cache line! Access latency is minimal (typically 1–4 cycles). No stall is required to fetch from main memory.`,
          detail: `${event} | Result: ${result} | Latency: 4 cycles`,
          nextStep: 'The data is immediately available to the register file or ALU.',
        };
      }
      return {
        title: 'Cache Miss — Main Memory Request',
        body: `The required address was not present in L1 cache. The cache controller initiates a fetch from lower-level memory, introducing latency cycles.`,
        detail: `${event} | Penalty: ~50 memory cycles`,
        nextStep: 'The memory controller loads the block and updates the cache line tags.',
      };
    case 'MEMORY':
      return {
        title: `Main Memory ${event.includes('STORE') ? 'Write (STORE)' : 'Read (LOAD)'}`,
        body: `A main memory transaction is in progress. ${
          event.includes('STORE')
            ? 'Data from the source register is written to the specified memory location.'
            : 'Data is being read from high-latency main memory into the Memory Data Register (MDR).'
        }`,
        detail: `${event} | ${result} | Cycle: ${cycle}`,
        nextStep: 'Cache line validity bits and coherence directory states are updated.',
      };
    case 'COHERENCE':
      return {
        title: 'Cache Coherence Broadcast',
        body: `A multiprocessor coherence message is broadcast across the interconnect. Because multiple cores process orders concurrently, coherence protocols (MESI/MSI) prevent stale cached data by invalidating or updating sibling caches.`,
        detail: `${event} | Initiated by Core ${coreId}`,
        nextStep: 'Sibling cores transition cache line states (e.g. Shared → Invalid).',
      };
    case 'CONTROL':
      return {
        title: 'Control Unit Directive',
        body: `The Control Unit is executing: "${instruction}". ${
          instruction.includes('HALT')
            ? 'HALT signals that this core has completed all its assigned delivery instructions.'
            : instruction.includes('UPDATE')
            ? 'UPDATE_STATUS updates delivery record status to PROCESSED in data memory.'
            : 'Program flow or branch status is evaluated.'
        }`,
        detail: `${event} | ${result}`,
        nextStep: instruction.includes('HALT') ? 'Core transitions to IDLE or COMPLETED.' : 'Next instruction sequence continues.',
      };
    default:
      return {
        title: `${component} Operation`,
        body: `The processor is executing: ${event}. This is part of the ${component} stage of execution.`,
        detail: `${event} | ${result} | Cycle: ${cycle}`,
        nextStep: 'Execution advances to the subsequent instruction pipeline stage.',
      };
  }
}

// =============================================================
// CSV Export Helper
// =============================================================
function downloadTraceCSV(log: ExecutionEvent[]) {
  const headers = ['Cycle', 'Core', 'Component', 'Instruction', 'Event', 'Result', 'Stage'];
  const rows = log.map(e => [e.cycle, e.coreId, e.component, `"${e.instruction}"`, `"${e.event}"`, `"${e.result || ''}"`, e.stage || '']);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'archflow-execution-trace.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================================
// ConfigRow helper
// =============================================================
function ConfigRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
      <div className="flex justify-between items-center mb-1">
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
          {desc && <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// =============================================================
// MAIN COMPONENT
// =============================================================
export default function SimulationLabPage() {
  const { state, updateConfig, runSim } = useSimulation();
  const cfg = state.currentConfig;
  const sim = state.simulation;

  // --- Specialist Sub-view Navigation ---
  const [labMode, setLabMode] = useState<LabMode>('simulation');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);

  // --- Architecture Configuration Slide-Out Drawer ---
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showAdvancedInDrawer, setShowAdvancedInDrawer] = useState(false);

  // --- Bottom Technical Details Drawer ---
  const [techDrawerExpanded, setTechDrawerExpanded] = useState(false);
  const [activeTechTab, setActiveTechTab] = useState<TechTab>('registers');
  const [traceFilter, setTraceFilter] = useState<string>('ALL');

  // --- Playback State ---
  const [playbackIdx, setPlaybackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>('slow');
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const events = sim?.executionLog ?? [];
  const currentEvent = events[playbackIdx] ?? null;

  // Metadata extraction for hardware state
  const meta = currentEvent?.metadata as {
    registers?: RegisterFile;
    changedReg?: number | null;
    aluInfo?: { op: string; a: number; b: number; result: number; flags?: StatusRegister } | null;
    memInfo?: { addr: number; isWrite: boolean; data?: number; hit: 'HIT' | 'MISS' } | null;
  } | undefined;

  const regs = meta?.registers;
  const changedReg = meta?.changedReg;
  const alu = meta?.aluInfo;
  const mem = meta?.memInfo;

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // --- Playback interval management ---
  const stopPlayback = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startSlowMotion = useCallback((totalEvents: number, fromIdx = 0) => {
    if (totalEvents === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPlaybackIdx(fromIdx);
    setIsPlaying(true);
    setHasStartedPlayback(true);
    intervalRef.current = setInterval(() => {
      setPlaybackIdx(prev => {
        const next = prev + 1;
        if (next >= totalEvents) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, SPEED_DELAYS[speed]);
  }, [speed]);

  const resumePlayback = useCallback(() => {
    if (events.length === 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(true);
    setHasStartedPlayback(true);
    intervalRef.current = setInterval(() => {
      setPlaybackIdx(prev => {
        const next = prev + 1;
        if (next >= events.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, SPEED_DELAYS[speed]);
  }, [events.length, speed]);

  // --- Auto-start in slow motion when new sim is run ---
  const prevSimRef = useRef(sim);
  useEffect(() => {
    if (sim && sim !== prevSimRef.current) {
      prevSimRef.current = sim;
      startSlowMotion(sim.executionLog.length, 0);
    }
  }, [sim, startSlowMotion]);

  // When speed changes while playing, restart interval at new speed
  useEffect(() => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setPlaybackIdx(prev => {
          const next = prev + 1;
          if (next >= events.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, SPEED_DELAYS[speed]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  function handleRestart() {
    stopPlayback();
    startSlowMotion(events.length, 0);
  }

  function handleSpeedChange(s: PlaybackSpeed) {
    setSpeed(s);
  }

  function handleNextStep() {
    stopPlayback();
    setHasStartedPlayback(true);
    setPlaybackIdx(prev => Math.min(events.length - 1, prev + 1));
  }

  function handlePrevStep() {
    stopPlayback();
    setPlaybackIdx(prev => Math.max(0, prev - 1));
  }

  function handleStartSimulation() {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (!sim || (hasStartedPlayback && playbackIdx >= events.length - 1)) {
      runSim();
    } else {
      resumePlayback();
    }
  }

  // Pipeline timeline
  const pipelineTimeline = sim
    ? buildPipelineTimeline(sim.instructions.slice(0, 8), [], cfg.pipelineEnabled)
    : buildPipelineTimeline([], [], cfg.pipelineEnabled);

  // Micro-ops
  const sampleInstr = currentEvent
    ? sim?.instructions.find(i => i.opcode === currentEvent.instruction.split(' ')[0]) ?? sim?.instructions[0]
    : sim?.instructions[0];
  const microOps = sampleInstr ? getMicroOps(sampleInstr, cfg.controlUnitType) : [];

  // Current event explanation
  const explanation = currentEvent ? explainEvent(currentEvent) : null;

  // Progress percentage
  const progress = events.length > 0 ? (playbackIdx / Math.max(1, events.length - 1)) * 100 : 0;

  // Component colors
  const compColors: Record<string, string> = {
    FETCH: 'var(--blue)', ALU: 'var(--amber)', CACHE: 'var(--green)',
    MEMORY: 'var(--red)', COHERENCE: 'var(--text-secondary)',
    CONTROL: 'var(--text-muted)', DECODE: 'var(--accent)',
  };
  const activeColor = currentEvent ? (compColors[currentEvent.component] ?? 'var(--accent)') : 'var(--border-accent)';

  // Filtered trace
  const filteredTrace = traceFilter === 'ALL'
    ? events
    : events.filter(e => e.component === traceFilter);

  return (
    <div className="single-screen-page sim-lab-page">

      {/* ═══════════════════════════════════════════════════════════════
          1. COMPACT TOP TOOLBAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sim-toolbar">
        {/* Left: Workload & Step Status */}
        <div className="sim-toolbar-group">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Simulation Lab
            </span>
            <span className="badge badge-normal" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
              📦 {state.activeWorkload.name}
            </span>
          </div>

          <span className={`status-pill ${isPlaying ? 'running' : hasStartedPlayback && playbackIdx >= events.length - 1 ? 'completed' : 'ready'}`}>
            <span className="status-dot"></span>
            {isPlaying
              ? `Simulating · Step ${playbackIdx + 1}/${events.length}`
              : hasStartedPlayback && playbackIdx >= events.length - 1
              ? `Completed (${events.length} Steps)`
              : hasStartedPlayback
              ? `Paused (Step ${playbackIdx + 1}/${events.length})`
              : 'Simulation Ready'}
          </span>

          {currentEvent && (
            <span className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Cyc {currentEvent.cycle}
            </span>
          )}
        </div>

        {/* Center: Playback Controls & Speed Selector */}
        <div className="sim-toolbar-group">
          {/* Step Back button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handlePrevStep}
            disabled={playbackIdx <= 0 || !hasStartedPlayback}
            title="Step Back one cycle"
            style={{ padding: '4px 8px' }}
          >
            ⏮ Step
          </button>

          {/* Primary Play / Pause button */}
          <button
            className={`btn btn-sm ${isPlaying ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleStartSimulation}
            disabled={state.isRunning}
            style={{ fontWeight: 700, minWidth: 120, padding: '4px 12px' }}
          >
            {state.isRunning
              ? '⏳ Initializing...'
              : isPlaying
              ? '⏸ Pause'
              : (!sim || (hasStartedPlayback && playbackIdx >= events.length - 1))
              ? '▶ Start Sim'
              : '▶ Resume'}
          </button>

          {/* Step Forward button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleNextStep}
            disabled={events.length === 0 || playbackIdx >= events.length - 1}
            title="Step Forward one cycle"
            style={{ padding: '4px 8px' }}
          >
            ⏭ Step
          </button>

          {/* Restart button */}
          {hasStartedPlayback && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleRestart}
              title="Restart simulation from cycle 0"
              style={{ padding: '4px 8px' }}
            >
              ↺ Reset
            </button>
          )}

          {/* Playback speed pills */}
          <div className="playback-speed-group" style={{ marginLeft: 6 }}>
            {(['slow', 'normal', 'fast'] as PlaybackSpeed[]).map(s => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'speed-btn-active' : ''}`}
                onClick={() => handleSpeedChange(s)}
                title={SPEED_LABELS[s]}
              >
                {s === 'slow' ? '1.2s' : s === 'normal' ? '0.6s' : '0.2s'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Architecture Settings Drawer & Advanced Tools */}
        <div className="sim-toolbar-group">
          {/* Settings Drawer Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConfigDrawer(true)}
            title="Open Architecture Configuration (ISA, Cores, Cache, Protocol)"
            style={{ fontWeight: 600 }}
          >
            ⚙️ Arch Config
          </button>

          {/* Advanced Tools Dropdown / Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              style={{ fontWeight: 600, border: '1px solid var(--border)' }}
            >
              {labMode === 'simulation' ? '🔬 Advanced Tools ▾' : `Tool: ${labMode.toUpperCase()} ▾`}
            </button>

            {showToolsDropdown && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
                  borderRadius: 6, padding: 4, zIndex: 1000, minWidth: 190,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}
              >
                {[
                  { id: 'simulation', label: '▷ Guided Simulation Lab' },
                  { id: 'processor',  label: '⚙️ Processor & Control' },
                  { id: 'alu',        label: '🧮 ALU & Arithmetic' },
                  { id: 'cache',      label: '💾 Cache & Coherence' },
                  { id: 'memory',     label: '🏛️ Memory Hierarchy' },
                  { id: 'parallel',   label: '⚡ Parallel Architecture' },
                ].map(tool => (
                  <button
                    key={tool.id}
                    style={{
                      width: '100%', textAlign: 'left', padding: '6px 10px',
                      background: labMode === tool.id ? 'var(--accent-glow)' : 'transparent',
                      color: labMode === tool.id ? 'var(--accent)' : 'var(--text-primary)',
                      border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.74rem',
                    }}
                    onClick={() => {
                      setLabMode(tool.id as LabMode);
                      setShowToolsDropdown(false);
                    }}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thin execution progress line */}
      {events.length > 0 && (
        <div className="progress-bar shrink-0" style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
          <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.2s linear' }} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SWITCHER FOR SPECIALIST ACADEMIC MODULES
          ═══════════════════════════════════════════════════════════════ */}
      {labMode !== 'simulation' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ marginBottom: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setLabMode('simulation')}>
              ← Back to Guided Simulation
            </button>
          </div>
          {labMode === 'processor' && <ProcessorPage />}
          {labMode === 'alu'       && <ALUPage />}
          {labMode === 'cache'     && <CachePage />}
          {labMode === 'memory'    && <MemoryPage />}
          {labMode === 'parallel'  && <ParallelPage />}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          2. TWO-COLUMN MAIN WORKSPACE (Large, readable, prioritized)
          ═══════════════════════════════════════════════════════════════ */}
      {labMode === 'simulation' && (
        <div className="sim-workspace-grid">

          {/* ── LEFT COLUMN: PROCESSOR SIMULATION ── */}
          <div className="sim-col-proc">

            {/* A. Active Instruction Spotlight Card */}
            <div className="sim-spotlight-card">
              <div className="flex justify-between items-center mb-1.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="panel-tag"
                    style={{
                      background: `${activeColor}22`,
                      color: activeColor,
                      border: `1px solid ${activeColor}55`,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  >
                    {currentEvent?.component ?? 'READY'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Active Instruction Stage:
                  </span>
                  <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>
                    {currentEvent?.stage ?? 'IDLE'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-mono" style={{ fontSize: '0.7rem' }}>
                  <span className="text-muted">Core: <strong style={{ color: activeColor }}>{currentEvent ? `CPU ${currentEvent.coreId}` : 'None'}</strong></span>
                  <span className="text-muted">Cycle: <strong style={{ color: 'var(--text-primary)' }}>{currentEvent?.cycle ?? 0}</strong></span>
                </div>
              </div>

              {/* Instruction Text */}
              <div className="flex justify-between items-center flex-wrap gap-2" style={{ padding: '4px 0' }}>
                <div className="text-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {currentEvent?.instruction ? currentEvent.instruction : (sim ? 'Simulation Initialized' : 'Click "Start Sim" to begin')}
                </div>
                {currentEvent?.result && (
                  <div className="text-mono" style={{ fontSize: '0.85rem', color: 'var(--green)', fontWeight: 700 }}>
                    Result: {currentEvent.result}
                  </div>
                )}
              </div>

              {/* Hardware Quick-Indicator */}
              <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-[var(--border)] text-xs text-mono" style={{ fontSize: '0.68rem' }}>
                {changedReg !== undefined && changedReg !== null && regs ? (
                  <span style={{ color: 'var(--accent)' }}>
                    ● Register <strong>R{changedReg}</strong> updated: <strong>0x{regs.GP[changedReg].toString(16).toUpperCase()}</strong> ({regs.GP[changedReg]})
                  </span>
                ) : alu ? (
                  <span style={{ color: 'var(--amber)' }}>
                    ● ALU Active: <strong>{alu.op}</strong> ({alu.a}, {alu.b}) = <strong>{alu.result}</strong>
                  </span>
                ) : mem ? (
                  <span style={{ color: mem.hit === 'HIT' ? 'var(--green)' : 'var(--red)' }}>
                    ● Memory Bus: <strong>{mem.isWrite ? 'STORE' : 'LOAD'} 0x{mem.addr.toString(16).toUpperCase()}</strong> [{mem.hit}]
                  </span>
                ) : (
                  <span className="text-muted">No hardware write-back conflict in current cycle</span>
                )}
              </div>
            </div>

            {/* B. Large Processor Architecture Visualizer */}
            <div className="sim-fabric-container">
              <div className="panel-header py-1.5 px-3">
                <div className="panel-title-group">
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    CPU Core Processing Fabric
                  </span>
                  <span className="panel-tag">{cfg.numCores} Cores · {cfg.isa}</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Interconnect: {cfg.interconnect}
                </span>
              </div>

              <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                {/* 1. CPU Cores Array */}
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cfg.numCores, 4)}, 1fr)`, gap: 8 }}>
                  {Array.from({ length: cfg.numCores }, (_, i) => {
                    const core = sim?.cores[i];
                    const isCurrentCore = currentEvent?.coreId === i && hasStartedPlayback;
                    const isRunning = core?.status === 'RUNNING';
                    const isCompleted = core?.status === 'COMPLETED';

                    return (
                      <div
                        key={i}
                        style={{
                          background: isCurrentCore ? 'var(--bg-elevated)' : 'var(--bg-base)',
                          border: `1.5px solid ${isCurrentCore ? activeColor : isCompleted ? 'var(--green)' : 'var(--border)'}`,
                          borderRadius: 6,
                          padding: '10px 8px',
                          textAlign: 'center',
                          boxShadow: isCurrentCore ? `0 0 12px ${activeColor}44` : 'none',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <div className="flex justify-between items-center" style={{ marginBottom: 2 }}>
                          <span className="text-mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: isCurrentCore ? activeColor : 'var(--text-primary)' }}>
                            CORE {i}
                          </span>
                          <span style={{ fontSize: '0.58rem', fontWeight: 600, color: isCompleted ? 'var(--green)' : isRunning ? 'var(--amber)' : 'var(--blue)' }}>
                            ● {core?.status ?? 'READY'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                          {cfg.isa} · {cfg.pipelineEnabled ? '5-Stage' : 'Sequential'}
                        </div>

                        <div className="text-mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                          {core ? `${core.executedInstructions} instrs` : '0 instrs'}
                        </div>

                        {isCurrentCore && (
                          <div style={{ fontSize: '0.62rem', color: activeColor, marginTop: 4, fontWeight: 700 }}>
                            ▶ {currentEvent?.component}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Cache Hierarchy (L1 Private + L2 Shared) */}
                <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px' }}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)' }}>
                      Cache Hierarchy ({cfg.coherenceProtocol} Protocol · {cfg.coherenceMechanism})
                    </span>
                    <span className="text-mono text-xs text-muted">{cfg.l1Size} lines/core</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cfg.numCores, 4)}, 1fr)`, gap: 6 }}>
                    {Array.from({ length: cfg.numCores }, (_, i) => {
                      const l1 = sim?.caches[i];
                      const isActiveL1 = currentEvent?.coreId === i && hasStartedPlayback && (currentEvent.component === 'CACHE' || currentEvent.component === 'MEMORY');
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '4px 6px',
                            background: isActiveL1 ? 'rgba(34,197,94,0.1)' : 'var(--bg-panel)',
                            border: `1px solid ${isActiveL1 ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius: 4,
                            fontSize: '0.64rem',
                            fontFamily: 'var(--font-mono)',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: isActiveL1 ? 'var(--green)' : 'var(--text-muted)' }}>L1 C{i}</span>
                          <span style={{ fontWeight: 600 }}>{l1 ? `${l1.hits}H/${l1.misses}M` : '0H/0M'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {cfg.cacheConfig === 'L1+L2' && (
                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-[var(--border)] text-mono" style={{ fontSize: '0.68rem' }}>
                      <span style={{ color: 'var(--blue)' }}>L2 Shared Cache ({cfg.l2Size} lines · 12cy latency)</span>
                      <span className="text-muted">Multi-core unified cache</span>
                    </div>
                  )}
                </div>

                {/* 3. Main Memory Bus */}
                <div
                  style={{
                    background: hasStartedPlayback && currentEvent?.component === 'MEMORY' ? 'rgba(239,68,68,0.12)' : 'var(--bg-base)',
                    border: `1px solid ${hasStartedPlayback && currentEvent?.component === 'MEMORY' ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 5,
                    padding: '6px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--red)' }}>Main Memory (RAM)</span>
                    <span className="text-mono" style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>0x0000 – 0xFFFF</span>
                  </div>
                  <div className="text-mono" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                    {sim ? `${sim.memory.accesses} bus transactions` : 'Bus Idle'} · {cfg.memoryLatency}cy Latency
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: UNDERSTANDING THE SIMULATION ── */}
          <div className="sim-col-expl">
            <div
              className="panel whatsnow-panel"
              style={{
                borderColor: activeColor,
                borderWidth: 1.5,
                borderStyle: 'solid',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="panel-header py-2 px-3" style={{ borderColor: `${activeColor}44`, background: 'var(--bg-surface)' }}>
                <div className="panel-title-group">
                  <div className="event-indicator" style={{ background: activeColor }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>What Is Happening Now?</span>
                </div>
                <span className="panel-tag" style={{ color: activeColor, background: `${activeColor}18`, borderColor: `${activeColor}44` }}>
                  {currentEvent?.component ?? 'IDLE'}
                </span>
              </div>

              <div className="panel-body" style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="whatsnow-title" style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                    {explanation?.title ?? 'Ready to Observe Execution'}
                  </div>

                  <p className="whatsnow-body" style={{ fontSize: '0.78rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {explanation?.body ?? 'Click "Start Sim" above to execute the delivery workload through the simulated computer architecture in slow motion.'}
                  </p>

                  {/* Input / Output Card */}
                  {currentEvent && (
                    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
                      <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
                        Hardware Signals & Signals
                      </div>
                      <div className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Event:</strong> {currentEvent.event}</div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Output:</strong> <span style={{ color: 'var(--green)' }}>{currentEvent.result || 'Pending'}</span></div>
                        <div><strong style={{ color: 'var(--text-primary)' }}>Pipeline Stage:</strong> {currentEvent.stage || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {/* Next Step Box */}
                  <div className="alert alert-info" style={{ fontSize: '0.74rem', padding: '8px 12px', margin: 0 }}>
                    <strong>Next Step:</strong> {explanation?.nextStep ?? 'The processor begins fetching the initial delivery batch instruction.'}
                  </div>
                </div>

                {/* Technical details toggle */}
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button
                    className="btn btn-ghost btn-sm w-full"
                    style={{ fontSize: '0.7rem', color: 'var(--accent)' }}
                    onClick={() => {
                      setTechDrawerExpanded(true);
                      setActiveTechTab('trace');
                    }}
                  >
                    View in Full Execution Trace →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          3. BOTTOM AREA: EXPANDABLE "TECHNICAL DETAILS" DRAWER
          ═══════════════════════════════════════════════════════════════ */}
      <div className={`sim-tech-drawer ${techDrawerExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Drawer Header (Clickable to toggle expand/collapse) */}
        <div className="sim-tech-header" onClick={() => setTechDrawerExpanded(!techDrawerExpanded)}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              🛠️ Technical Details & Hardware State
            </span>
            <span className="panel-tag" style={{ fontSize: '0.62rem' }}>
              {techDrawerExpanded ? 'Expanded' : 'Click to Expand'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Registers · ALU · Memory · Pipeline · Trace · Metrics
            </span>
            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700 }}>
              {techDrawerExpanded ? '▼' : '▲'}
            </span>
          </div>
        </div>

        {/* Internal Tabs when expanded */}
        {techDrawerExpanded && (
          <>
            <div className="sim-tech-tabs">
              {[
                { id: 'registers', label: 'Registers (R0–R7)' },
                { id: 'alu',       label: 'ALU Hardware' },
                { id: 'memory',    label: 'Memory / Cache Bus' },
                { id: 'pipeline',  label: 'Pipeline Timeline' },
                { id: 'trace',     label: `Execution Trace (${events.length})` },
                { id: 'metrics',   label: 'Detailed Metrics' },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`tab ${activeTechTab === tab.id ? 'active' : ''}`}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => setActiveTechTab(tab.id as TechTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="sim-tech-body">
              {/* Tab 1: Registers */}
              {activeTechTab === 'registers' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      GENERAL-PURPOSE REGISTERS (R0–R7) · PROGRAM COUNTER & STATUS FLAGS
                    </span>
                    {changedReg !== undefined && changedReg !== null && (
                      <span className="badge badge-accent" style={{ fontSize: '0.64rem' }}>
                        R{changedReg} UPDATED IN CYCLE {currentEvent?.cycle}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                    {Array.from({ length: 8 }, (_, r) => {
                      const val = regs ? regs.GP[r] : 0;
                      const isChanged = changedReg === r;
                      return (
                        <div
                          key={r}
                          style={{
                            background: isChanged ? 'rgba(0,180,216,0.15)' : 'var(--bg-base)',
                            border: `1.5px solid ${isChanged ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 4,
                            padding: '6px 4px',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '0.62rem', color: isChanged ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 700 }}>
                            R{r}
                          </div>
                          <div className="text-mono" style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {val}
                          </div>
                          <div className="text-mono" style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                            0x{val.toString(16).toUpperCase().padStart(4, '0')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Special Registers PC, IR, and Flags */}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[var(--border)] flex-wrap text-mono text-xs">
                    <div><span className="text-muted">PC: </span><strong style={{ color: 'var(--blue)' }}>0x{regs?.PC.toString(16).toUpperCase() ?? '0040'}</strong></div>
                    <div><span className="text-muted">IR: </span><strong style={{ color: 'var(--amber)' }}>"{regs?.IR ?? currentEvent?.instruction ?? '—'}"</strong></div>
                    <div className="flex items-center gap-1.5" style={{ marginLeft: 'auto' }}>
                      <span className="text-muted">Flags:</span>
                      <span className={`badge ${regs?.SR.zero ? 'badge-high' : 'badge-normal'}`}>Z:{regs?.SR.zero ? '1' : '0'}</span>
                      <span className={`badge ${regs?.SR.carry ? 'badge-high' : 'badge-normal'}`}>C:{regs?.SR.carry ? '1' : '0'}</span>
                      <span className={`badge ${regs?.SR.sign ? 'badge-high' : 'badge-normal'}`}>S:{regs?.SR.sign ? '1' : '0'}</span>
                      <span className={`badge ${regs?.SR.overflow ? 'badge-urgent' : 'badge-normal'}`}>V:{regs?.SR.overflow ? '1' : '0'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: ALU Hardware State */}
              {activeTechTab === 'alu' && (
                <div>
                  {alu ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">OPERATION</div>
                        <div className="text-mono font-bold" style={{ color: 'var(--amber)', fontSize: '1rem' }}>{alu.op}</div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">INPUT A</div>
                        <div className="text-mono font-bold" style={{ fontSize: '1rem' }}>{alu.a}</div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">INPUT B</div>
                        <div className="text-mono font-bold" style={{ fontSize: '1rem' }}>{alu.b}</div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">ALU OUTPUT</div>
                        <div className="text-mono font-bold" style={{ color: 'var(--green)', fontSize: '1rem' }}>{alu.result}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      ALU hardware idle during {currentEvent?.component ?? 'FETCH'} stage
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Memory / Cache Bus */}
              {activeTechTab === 'memory' && (
                <div>
                  {mem ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">ACCESS TYPE</div>
                        <div className="text-mono font-bold" style={{ color: mem.isWrite ? 'var(--amber)' : 'var(--blue)', fontSize: '0.95rem' }}>
                          {mem.isWrite ? 'STORE (Write)' : 'LOAD (Read)'}
                        </div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">TARGET ADDRESS</div>
                        <div className="text-mono font-bold" style={{ fontSize: '0.95rem' }}>0x{mem.addr.toString(16).toUpperCase()}</div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">DATA WORD</div>
                        <div className="text-mono font-bold" style={{ fontSize: '0.95rem' }}>{mem.data ?? 0}</div>
                      </div>
                      <div className="panel" style={{ padding: '8px 12px', background: 'var(--bg-base)' }}>
                        <div className="text-muted text-xs">CACHE RESULT</div>
                        <div className="text-mono font-bold" style={{ color: mem.hit === 'HIT' ? 'var(--green)' : 'var(--red)', fontSize: '0.95rem' }}>
                          {mem.hit}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      No active memory bus transaction in current cycle
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Pipeline Timeline */}
              {activeTechTab === 'pipeline' && (
                <div>
                  {!cfg.pipelineEnabled ? (
                    <div className="alert alert-warning" style={{ fontSize: '0.75rem' }}>
                      Pipeline is currently disabled in architecture settings. Instructions execute sequentially.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(12, 34px)', gap: 2, marginBottom: 4 }}>
                        <div />
                        {Array.from({ length: 12 }, (_, i) => (
                          <div key={i} style={{ textAlign: 'center', fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            C{i + 1}
                          </div>
                        ))}
                      </div>
                      {pipelineTimeline.map((entry, ri) => (
                        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '140px repeat(12, 34px)', gap: 2, marginBottom: 2 }}>
                          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.instructionStr.split(';')[0].trim()}
                          </div>
                          {entry.stages.map((s, ci) => {
                            const stageColors: Record<string, string> = {
                              IF: 'var(--blue)', ID: 'var(--accent)', EX: 'var(--amber)',
                              MEM: 'var(--green)', WB: 'var(--text-secondary)',
                            };
                            return (
                              <div key={ci} style={{
                                height: 20,
                                background: `${stageColors[s.stage]}22`,
                                border: `1px solid ${stageColors[s.stage]}44`,
                                borderRadius: 2,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: stageColors[s.stage],
                              }}>
                                {s.stage}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {microOps.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            CONTROL UNIT MICRO-OPERATIONS ({cfg.controlUnitType}):
                          </span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {microOps.map((m, idx) => (
                              <span key={idx} className="badge badge-outline" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }} title={m.description}>
                                S{m.step}: {m.signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Execution Trace & CSV Export */}
              {activeTechTab === 'trace' && (
                <div>
                  <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Filter Component:</span>
                      {(['ALL', 'FETCH', 'DECODE', 'ALU', 'CACHE', 'MEMORY', 'COHERENCE'] as const).map(c => (
                        <button
                          key={c}
                          className={`btn btn-sm ${traceFilter === c ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                          onClick={() => setTraceFilter(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => downloadTraceCSV(events)}
                      style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                    >
                      📥 Download CSV
                    </button>
                  </div>

                  <table className="data-table" style={{ fontSize: '0.72rem' }}>
                    <thead>
                      <tr>
                        <th>Cycle</th>
                        <th>Core</th>
                        <th>Component</th>
                        <th>Instruction</th>
                        <th>Event Signature</th>
                        <th>Result</th>
                        <th>Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrace.slice(0, 50).map(ev => {
                        const isCurrent = ev.id === currentEvent?.id;
                        return (
                          <tr
                            key={ev.id}
                            style={{
                              background: isCurrent ? 'var(--accent-glow)' : '',
                              borderLeft: isCurrent ? '3px solid var(--accent)' : '3px solid transparent',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              stopPlayback();
                              const idx = events.findIndex(e => e.id === ev.id);
                              if (idx !== -1) setPlaybackIdx(idx);
                            }}
                          >
                            <td style={{ color: 'var(--accent)', fontWeight: 700 }}>C{ev.cycle}</td>
                            <td>Core {ev.coreId}</td>
                            <td>
                              <span className="panel-tag" style={{ color: compColors[ev.component] ?? 'var(--text-primary)' }}>
                                {ev.component}
                              </span>
                            </td>
                            <td style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{ev.instruction}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{ev.event}</td>
                            <td style={{ color: 'var(--green)' }}>{ev.result || '—'}</td>
                            <td>{ev.stage || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 6: Detailed Metrics */}
              {activeTechTab === 'metrics' && (
                <div>
                  {!sim ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                      Run simulation to calculate architecture performance metrics
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Total Cycles', val: sim.metrics.totalCycles.toLocaleString(), sub: 'Execution time' },
                        { label: 'Instructions', val: sim.metrics.totalInstructions.toLocaleString(), sub: 'Retired count' },
                        { label: 'Average CPI', val: sim.metrics.cpi.toFixed(3), sub: 'Cycles / instr' },
                        { label: 'L1 Cache Hits', val: `${sim.metrics.l1Hits} (${(sim.metrics.cacheHitRate * 100).toFixed(1)}%)`, sub: 'L1 hit rate' },
                        { label: 'Parallel Speedup', val: `${sim.metrics.parallelSpeedup.toFixed(2)}x`, sub: 'vs 1-core baseline' },
                        { label: 'L1 Misses', val: sim.metrics.l1Misses.toLocaleString(), sub: 'RAM fallback' },
                        { label: 'ALU Operations', val: sim.metrics.aluOperations.toLocaleString(), sub: 'Compute units' },
                        { label: 'Pipeline Stalls', val: sim.metrics.pipelineStalls.toLocaleString(), sub: 'Hazard penalties' },
                        { label: 'Coherence Msgs', val: sim.metrics.coherenceMessages.toLocaleString(), sub: 'Invalidate/Update' },
                        { label: 'Memory Accesses', val: sim.memory.accesses.toLocaleString(), sub: 'Bus transactions' },
                      ].map(m => (
                        <div key={m.label} style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.label}</div>
                          <div className="text-mono" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)', margin: '3px 0' }}>{m.val}</div>
                          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{m.sub}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          4. ARCHITECTURE CONFIGURATION SLIDE-OUT DRAWER OVERLAY
          ═══════════════════════════════════════════════════════════════ */}
      {showConfigDrawer && (
        <div className="sim-drawer-backdrop" onClick={() => setShowConfigDrawer(false)}>
          <div className="sim-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--border)]">
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Architecture Configuration
                </h3>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Configure CPU cores, ISA, caches and interconnect
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowConfigDrawer(false)}>
                ✕ Close
              </button>
            </div>

            {/* Profile Name */}
            <div className="form-group mb-3">
              <label className="form-label">Profile Name</label>
              <input
                type="text"
                className="form-control form-control-mono"
                value={cfg.name}
                onChange={e => updateConfig({ name: e.target.value })}
              />
            </div>

            {/* ISA */}
            <ConfigRow label="Instruction Set (ISA)" desc="RISC: load/store · CISC: mem-reg">
              <div className="toggle-group">
                {(['RISC', 'CISC'] as ISAType[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.isa === v ? 'active' : ''}`}
                    onClick={() => updateConfig({ isa: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            {/* CPU Cores */}
            <ConfigRow label="CPU Cores" desc="Parallel execution units">
              <div className="toggle-group">
                {([1, 2, 4, 8] as NumCores[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.numCores === v ? 'active' : ''}`}
                    onClick={() => updateConfig({ numCores: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            {/* Pipeline */}
            <ConfigRow label="5-Stage Pipeline" desc="IF → ID → EX → MEM → WB">
              <div className="toggle-group">
                <button className={`toggle-option ${cfg.pipelineEnabled ? 'active' : ''}`}
                  onClick={() => updateConfig({ pipelineEnabled: true })}>Enabled</button>
                <button className={`toggle-option ${!cfg.pipelineEnabled ? 'active' : ''}`}
                  onClick={() => updateConfig({ pipelineEnabled: false })}>Disabled</button>
              </div>
            </ConfigRow>

            {/* Cache Hierarchy */}
            <ConfigRow label="Cache Hierarchy" desc="L1 private · L2 shared fabric">
              <div className="toggle-group">
                {(['L1', 'L1+L2'] as CacheConfig2[]).map(v => (
                  <button key={v} className={`toggle-option ${cfg.cacheConfig === v ? 'active' : ''}`}
                    onClick={() => updateConfig({ cacheConfig: v })}>{v}</button>
                ))}
              </div>
            </ConfigRow>

            {/* Toggle Advanced Controls inside Drawer */}
            <div className="mt-2 mb-2">
              <button
                className="btn btn-secondary btn-sm w-full"
                onClick={() => setShowAdvancedInDrawer(!showAdvancedInDrawer)}
              >
                {showAdvancedInDrawer ? '▲ Hide Advanced Hardware Fabric' : '▼ Advanced Coherence & Interconnect'}
              </button>
            </div>

            {showAdvancedInDrawer && (
              <div className="advanced-settings">
                <ConfigRow label="Coherence Protocol" desc="Snooping/Directory protocol">
                  <div className="toggle-group">
                    {(['VI', 'MSI', 'MESI', 'Dragon'] as CoherenceProtocol[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.coherenceProtocol === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ coherenceProtocol: v })} style={{ fontSize: '0.7rem' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <ConfigRow label="Coherence Mechanism">
                  <div className="toggle-group">
                    {(['Snooping', 'Directory'] as CoherenceMechanism[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.coherenceMechanism === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ coherenceMechanism: v })} style={{ fontSize: '0.7rem' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <ConfigRow label="Interconnect Topology">
                  <div className="toggle-group">
                    {(['Bus', 'Ring', 'Mesh', 'PointToPoint'] as InterconnectType[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.interconnect === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ interconnect: v })} style={{ fontSize: '0.62rem', padding: '5px 4px' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <ConfigRow label="Memory Consistency">
                  <div className="toggle-group">
                    {(['Sequential', 'Relaxed'] as MemoryConsistency[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.memoryConsistency === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ memoryConsistency: v })} style={{ fontSize: '0.72rem' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <ConfigRow label="Synchronization Primitive">
                  <div className="toggle-group">
                    {(['LL-SC', 'Barrier', 'Both'] as SyncPrimitive[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.syncPrimitive === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ syncPrimitive: v })} style={{ fontSize: '0.72rem' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <ConfigRow label="Control Unit Architecture">
                  <div className="toggle-group">
                    {(['Hardwired', 'Microprogrammed'] as ControlUnitType[]).map(v => (
                      <button key={v} className={`toggle-option ${cfg.controlUnitType === v ? 'active' : ''}`}
                        onClick={() => updateConfig({ controlUnitType: v })} style={{ fontSize: '0.68rem' }}>{v}</button>
                    ))}
                  </div>
                </ConfigRow>

                <div className="grid grid-2 gap-2 mt-2">
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>L1 Lines</label>
                    <input type="number" className="form-control text-xs" value={cfg.l1Size}
                      onChange={e => updateConfig({ l1Size: parseInt(e.target.value) || 4 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>L2 Lines</label>
                    <input type="number" className="form-control text-xs" value={cfg.l2Size}
                      onChange={e => updateConfig({ l2Size: parseInt(e.target.value) || 16 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>RAM Latency (cy)</label>
                    <input type="number" className="form-control text-xs" value={cfg.memoryLatency}
                      onChange={e => updateConfig({ memoryLatency: parseInt(e.target.value) || 50 })} />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[var(--border)]">
              <button
                className="btn btn-primary w-full"
                onClick={() => {
                  setShowConfigDrawer(false);
                  runSim();
                }}
              >
                Apply & Run Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

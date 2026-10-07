// ====================================================
// SimulationContext — Global app state using React Context
// ====================================================

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  SimulationState, SimulationConfig, Workload, DeliveryOrder,
  ArchitectureProfile, Experiment, ExperimentResult
} from '../types';
import {
  runSimulation, compareArchitectures,
  DEFAULT_CONFIG, COMPARISON_CONFIG
} from '../simulation/engine';
import { SEED_WORKLOAD } from '../simulation/workloads';

// -------------------------------------------------------
// App State
// -------------------------------------------------------
interface AppState {
  simulation: SimulationState | null;
  savedProfiles: ArchitectureProfile[];
  experiments: Experiment[];
  savedWorkloads: Workload[];
  currentConfig: SimulationConfig;
  comparisonConfigB: SimulationConfig;
  activeWorkload: Workload;
  isRunning: boolean;
  lastError: string | null;
}

const initialState: AppState = {
  simulation: null,
  savedProfiles: [],
  experiments: PRESET_EXPERIMENTS(),
  savedWorkloads: [SEED_WORKLOAD],
  currentConfig: DEFAULT_CONFIG,
  comparisonConfigB: COMPARISON_CONFIG,
  activeWorkload: SEED_WORKLOAD,
  isRunning: false,
  lastError: null,
};

// -------------------------------------------------------
// Actions
// -------------------------------------------------------
type Action =
  | { type: 'SET_CONFIG'; config: SimulationConfig }
  | { type: 'SET_CONFIG_B'; config: SimulationConfig }
  | { type: 'SET_WORKLOAD'; workload: Workload }
  | { type: 'RUN_SIMULATION' }
  | { type: 'SIMULATION_COMPLETE'; state: SimulationState }
  | { type: 'SIMULATION_ERROR'; message: string }
  | { type: 'RESET_SIMULATION' }
  | { type: 'ADD_ORDER'; order: DeliveryOrder }
  | { type: 'SAVE_PROFILE'; profile: ArchitectureProfile }
  | { type: 'SAVE_EXPERIMENT'; experiment: Experiment }
  | { type: 'RUN_EXPERIMENT'; id: string; result: ExperimentResult }
  | { type: 'UPDATE_WORKLOAD'; orders: DeliveryOrder[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, currentConfig: action.config };
    case 'SET_CONFIG_B':
      return { ...state, comparisonConfigB: action.config };
    case 'SET_WORKLOAD':
      return { ...state, activeWorkload: action.workload };
    case 'UPDATE_WORKLOAD':
      return {
        ...state,
        activeWorkload: { ...state.activeWorkload, orders: action.orders },
      };
    case 'RUN_SIMULATION':
      return { ...state, isRunning: true, lastError: null };
    case 'SIMULATION_COMPLETE':
      return { ...state, isRunning: false, simulation: action.state, lastError: null };
    case 'SIMULATION_ERROR':
      return { ...state, isRunning: false, lastError: action.message };
    case 'RESET_SIMULATION':
      return { ...state, simulation: null, isRunning: false, lastError: null };
    case 'ADD_ORDER':
      return {
        ...state,
        activeWorkload: {
          ...state.activeWorkload,
          orders: [...state.activeWorkload.orders, action.order],
        },
      };
    case 'SAVE_PROFILE':
      return {
        ...state,
        savedProfiles: [
          action.profile,
          ...state.savedProfiles.filter(p => p.id !== action.profile.id),
        ],
      };
    case 'SAVE_EXPERIMENT':
      return {
        ...state,
        experiments: [
          ...state.experiments.filter(e => e.id !== action.experiment.id),
          action.experiment,
        ],
      };
    case 'RUN_EXPERIMENT':
      return {
        ...state,
        experiments: state.experiments.map(e =>
          e.id === action.id ? { ...e, ran: true, results: action.result } : e
        ),
      };
    default:
      return state;
  }
}

// -------------------------------------------------------
// Preset experiments
// -------------------------------------------------------
function PRESET_EXPERIMENTS(): Experiment[] {
  const base = DEFAULT_CONFIG;

  return [
    {
      id: 'exp-01',
      name: 'Effect of Cache Size',
      description: 'Compare L1-only vs L1+L2 cache configuration on the same workload.',
      configA: { ...base, name: 'L1+L2 Config', cacheConfig: 'L1+L2', l1Size: 8 },
      configB: { ...base, name: 'L1-Only Config', cacheConfig: 'L1', l1Size: 4, numCores: 4 },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-02',
      name: 'MESI vs MSI',
      description: 'Compare MESI and MSI coherence protocols on a multi-core workload.',
      configA: { ...base, name: 'MESI Protocol', coherenceProtocol: 'MESI' },
      configB: { ...base, name: 'MSI Protocol', coherenceProtocol: 'MSI' },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-03',
      name: '2 Cores vs 4 Cores',
      description: 'Measure parallel speedup scaling from 2 to 4 cores.',
      configA: { ...base, name: '4-Core Config', numCores: 4 },
      configB: { ...base, name: '2-Core Config', numCores: 2 },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-04',
      name: 'Bus vs Mesh',
      description: 'Compare shared bus and mesh interconnect topologies.',
      configA: { ...base, name: 'Mesh Topology', interconnect: 'Mesh' },
      configB: { ...base, name: 'Bus Topology', interconnect: 'Bus' },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-05',
      name: 'RISC vs CISC',
      description: 'Compare RISC and CISC instruction set architectures.',
      configA: { ...base, name: 'RISC Config', isa: 'RISC' },
      configB: { ...base, name: 'CISC Config', isa: 'CISC' },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-06',
      name: 'Pipeline vs Non-Pipeline',
      description: 'Measure the CPI improvement from 5-stage pipelining.',
      configA: { ...base, name: 'Pipelined', pipelineEnabled: true },
      configB: { ...base, name: 'Non-Pipelined', pipelineEnabled: false },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-07',
      name: 'Snooping vs Directory',
      description: 'Compare snooping and directory-based coherence mechanisms.',
      configA: { ...base, name: 'Snooping', coherenceMechanism: 'Snooping' },
      configB: { ...base, name: 'Directory', coherenceMechanism: 'Directory' },
      workloadId: 'wl-seed',
      ran: false,
    },
    {
      id: 'exp-08',
      name: 'Sequential vs Relaxed Consistency',
      description: 'Observe memory ordering effects on parallel workload execution.',
      configA: { ...base, name: 'Sequential Consistency', memoryConsistency: 'Sequential' },
      configB: { ...base, name: 'Relaxed Consistency', memoryConsistency: 'Relaxed' },
      workloadId: 'wl-seed',
      ran: false,
    },
  ];
}

// -------------------------------------------------------
// Context
// -------------------------------------------------------
interface SimContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  runSim: () => void;
  runComparison: () => { stateA: SimulationState; stateB: SimulationState; observation: string } | null;
  runExperiment: (expId: string) => void;
  updateConfig: (partial: Partial<SimulationConfig>) => void;
  updateConfigB: (partial: Partial<SimulationConfig>) => void;
}

const SimContext = createContext<SimContextValue | null>(null);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const runSim = useCallback(() => {
    dispatch({ type: 'RUN_SIMULATION' });
    try {
      const simState = runSimulation(state.currentConfig, state.activeWorkload);
      dispatch({ type: 'SIMULATION_COMPLETE', state: simState });
    } catch (e) {
      dispatch({ type: 'SIMULATION_ERROR', message: (e as Error).message });
    }
  }, [state.currentConfig, state.activeWorkload]);

  const runComparison = useCallback(() => {
    try {
      return compareArchitectures(state.currentConfig, state.comparisonConfigB, state.activeWorkload);
    } catch (e) {
      dispatch({ type: 'SIMULATION_ERROR', message: (e as Error).message });
      return null;
    }
  }, [state.currentConfig, state.comparisonConfigB, state.activeWorkload]);

  const runExperiment = useCallback((expId: string) => {
    const exp = state.experiments.find(e => e.id === expId);
    if (!exp) return;
    try {
      const { stateA, stateB, observation } = compareArchitectures(exp.configA, exp.configB, state.activeWorkload);
      const result: ExperimentResult = {
        metricsA: stateA.metrics,
        metricsB: stateB.metrics,
        configA: exp.configA,
        configB: exp.configB,
        observation,
        ranAt: Date.now(),
      };
      dispatch({ type: 'RUN_EXPERIMENT', id: expId, result });
    } catch (e) {
      dispatch({ type: 'SIMULATION_ERROR', message: (e as Error).message });
    }
  }, [state.experiments, state.activeWorkload]);

  const updateConfig = useCallback((partial: Partial<SimulationConfig>) => {
    dispatch({ type: 'SET_CONFIG', config: { ...state.currentConfig, ...partial } });
  }, [state.currentConfig]);

  const updateConfigB = useCallback((partial: Partial<SimulationConfig>) => {
    dispatch({ type: 'SET_CONFIG_B', config: { ...state.comparisonConfigB, ...partial } });
  }, [state.comparisonConfigB]);

  return (
    <SimContext.Provider value={{ state, dispatch, runSim, runComparison, runExperiment, updateConfig, updateConfigB }}>
      {children}
    </SimContext.Provider>
  );
}

export function useSimulation() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}

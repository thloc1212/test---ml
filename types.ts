
export enum SimulationPhase {
  INIT = 'INIT',
  PRETRAIN = 'PRETRAIN',
  PATH_LOOP = 'PATH_LOOP',
  FINISHED = 'FINISHED'
}

export enum OptimizationStep {
  GRADIENT = 'GRADIENT',
  PROXIMAL = 'PROXIMAL'
}

export interface WeightData {
  id: number;
  theta: number; // Skip connection weight
  w: number[];   // Weights to hidden layer
  isActive: boolean;
  isClamped: boolean; // New: To visualize when W is limited by M*|theta|
  prevTheta?: number; // To visualize direction of change
}

export interface SimulationState {
  phase: SimulationPhase;
  step: OptimizationStep;
  lambda: number;
  epoch: number;
  features: WeightData[];
  logs: string[];
  detailedLog: string | null; // For step-by-step explanation
}

export interface GeminiAnalysisResponse {
  analysis: string;
}

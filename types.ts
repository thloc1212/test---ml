
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
  isClamped: boolean; // To visualize when W is limited by M*|theta|
  prevTheta: number; 
  prevW: number[];
  // Gradients (simulated for visualization)
  gradTheta: number;
  gradW: number[];
}

// New interface to store the specific numbers used in the calculation display
export interface StepCalculationDetails {
  stepType: OptimizationStep;
  featureId: number;
  // For Gradient
  oldVal?: number;
  grad?: number;
  learningRate?: number;
  newVal?: number;
  // For Proximal
  inputTheta?: number;
  lambda?: number;
  thresholdedTheta?: number;
  inputW?: number;
  limit?: number; // M * |theta|
  clampedW?: number;
}

export interface SimulationState {
  phase: SimulationPhase;
  step: OptimizationStep;
  lambda: number;
  epoch: number;
  features: WeightData[];
  logs: string[];
  detailedLog: string | null;
  calculationDetails: StepCalculationDetails | null;
}

export interface GeminiAnalysisResponse {
  analysis: string;
}

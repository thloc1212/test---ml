
import { WeightData, StepCalculationDetails, OptimizationStep } from "../types";
import { NUM_FEATURES, HIDDEN_SIZE, M_CONSTANT, LEARNING_RATE } from "../constants";

export const initializeWeights = (): WeightData[] => {
  return Array.from({ length: NUM_FEATURES }, (_, i) => {
    const startTheta = 1.0 - (i * 0.4); 
    const startW = Array.from({ length: HIDDEN_SIZE }, () => startTheta * 0.5);
    
    return {
      id: i + 1,
      theta: startTheta, 
      w: startW,
      isActive: true,
      isClamped: false,
      prevTheta: startTheta,
      prevW: startW,
      gradTheta: 0,
      gradW: Array(HIDDEN_SIZE).fill(0)
    };
  });
};

const softThreshold = (x: number, lambda: number): number => {
  if (x > lambda) return x - lambda;
  if (x < -lambda) return x + lambda;
  return 0;
};

// Returns [NewFeatures, CalculationDetails]
export const performGradientStep = (features: WeightData[]): { features: WeightData[], details: StepCalculationDetails } => {
  // Focus detail on Feature 1 for demonstration, or the first active feature
  let detailObj: StepCalculationDetails = {
    stepType: OptimizationStep.GRADIENT,
    featureId: 1,
  };

  const newFeatures = features.map(f => {
    if (!f.isActive) return f;

    // 1. Calculate Simulated Gradients
    // Target values to simulate convergence towards
    let targetTheta = 0;
    if (f.id === 1) targetTheta = 1.8;      // Feature 1 stays strong
    else if (f.id === 2) targetTheta = 0.6; // Feature 2 gets weaker
    else targetTheta = 0.05;                // Feature 3 (noise) goes to 0

    const targetW = targetTheta * 0.5;

    // Gradient = (Current - Target) * NoiseFactor
    const gradTheta = (f.theta - targetTheta); 
    const gradW = f.w.map(w => (w - targetW));

    // 2. Apply Gradient Descent
    const newTheta = f.theta - LEARNING_RATE * gradTheta;
    const newW = f.w.map((w, i) => w - LEARNING_RATE * gradW[i]);

    // Capture details for Feature 1 (or 2 if 1 is dead) for the UI
    if (f.id === 1 || (f.id === 2 && detailObj.featureId !== 1)) {
      detailObj = {
        stepType: OptimizationStep.GRADIENT,
        featureId: f.id,
        oldVal: f.theta,
        grad: gradTheta,
        learningRate: LEARNING_RATE,
        newVal: newTheta
      };
    }

    return {
      ...f,
      prevTheta: f.theta,
      prevW: f.w,
      gradTheta,
      gradW,
      theta: newTheta,
      w: newW,
      isClamped: false 
    };
  });

  return { features: newFeatures, details: detailObj };
};

export const performProximalStep = (features: WeightData[], lambda: number): { features: WeightData[], details: StepCalculationDetails } => {
  let detailObj: StepCalculationDetails = {
    stepType: OptimizationStep.PROXIMAL,
    featureId: 1,
  };

  const newFeatures = features.map(f => {
    const prevTheta = f.theta;
    const prevW = f.w;

    // 1. Soft thresholding on Theta
    // Effective lambda is lambda * learning_rate in PGD
    const threshold = lambda * LEARNING_RATE; 
    let newTheta = softThreshold(f.theta, threshold);

    const isActive = Math.abs(newTheta) > 1e-4;
    if (!isActive) newTheta = 0;

    // 2. Hierarchical Projection for W
    const limit = M_CONSTANT * Math.abs(newTheta);
    
    let isClamped = false;
    const newW = f.w.map(wVal => {
      const absW = Math.abs(wVal);
      if (absW > limit) {
        isClamped = true;
        return Math.sign(wVal) * limit;
      }
      return wVal;
    });

    // Capture details for visualization
    if (f.id === 1 || (f.id === 2 && detailObj.featureId !== 1)) {
      detailObj = {
        stepType: OptimizationStep.PROXIMAL,
        featureId: f.id,
        inputTheta: f.theta,
        lambda: threshold,
        thresholdedTheta: newTheta,
        inputW: f.w[0], // Just show first W weight for example
        limit: limit,
        clampedW: newW[0]
      };
    }

    return {
      ...f,
      prevTheta,
      prevW,
      theta: newTheta,
      w: newW,
      isActive,
      isClamped,
      gradTheta: 0, // Reset gradients for display
      gradW: f.w.map(() => 0)
    };
  });

  return { features: newFeatures, details: detailObj };
};

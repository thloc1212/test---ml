
import { WeightData } from "../types";
import { NUM_FEATURES, HIDDEN_SIZE, M_CONSTANT, LEARNING_RATE } from "../constants";

// Initialize weights with a bias: 
// Feature 1: Strong signal
// Feature 2: Medium signal
// Feature 3: Noise (should be pruned first)
export const initializeWeights = (): WeightData[] => {
  return Array.from({ length: NUM_FEATURES }, (_, i) => {
    // Bias initialization for educational purpose
    const startTheta = 1.0 - (i * 0.4); // 1.0, 0.6, 0.2
    
    return {
      id: i + 1,
      theta: startTheta, 
      w: Array.from({ length: HIDDEN_SIZE }, () => startTheta * 0.5),
      isActive: true,
      isClamped: false,
      prevTheta: startTheta
    };
  });
};

// Soft Thresholding Operator (Proximal operator for L1)
const softThreshold = (x: number, lambda: number): number => {
  if (x > lambda) return x - lambda;
  if (x < -lambda) return x + lambda;
  return 0;
};

// Simulate a Gradient Descent Step
export const performGradientStep = (features: WeightData[]): WeightData[] => {
  return features.map(f => {
    if (!f.isActive) return f;

    // Deterministic Targets for visualization clarity
    // Feature 1 -> Target 1.5 (Strong)
    // Feature 2 -> Target 0.5 (Weak)
    // Feature 3 -> Target 0.0 (Noise)
    let targetTheta = 0;
    if (f.id === 1) targetTheta = 2.0;
    else if (f.id === 2) targetTheta = 0.8;
    else targetTheta = -0.2; // Noise tends to zero or random

    let targetW = targetTheta * 0.5;

    // Gradient update: move towards target
    const newTheta = f.theta - LEARNING_RATE * (f.theta - targetTheta);
    const newW = f.w.map(wVal => wVal - LEARNING_RATE * (wVal - targetW));

    return {
      ...f,
      prevTheta: f.theta,
      theta: newTheta,
      w: newW,
      isClamped: false // Reset clamped status on gradient step
    };
  });
};

// Simulate the Proximal Step (Algorithm 2 in LassoNet paper)
export const performProximalStep = (features: WeightData[], lambda: number): WeightData[] => {
  return features.map(f => {
    const prevTheta = f.theta;

    // 1. Soft thresholding on Theta (Sparsity)
    // theta_new = sign(theta) * max(|theta| - lambda*eta, 0)
    let newTheta = softThreshold(f.theta, lambda * LEARNING_RATE);

    // Check if feature died (Pruning)
    const isActive = Math.abs(newTheta) > 1e-3;
    if (!isActive) newTheta = 0;

    // 2. Hierarchical Projection for W
    // Constraint: |w_k| <= M * |theta|
    const limit = M_CONSTANT * Math.abs(newTheta);
    
    let isClamped = false;
    const newW = f.w.map(wVal => {
      const absW = Math.abs(wVal);
      if (absW > limit) {
        isClamped = true;
        // Project onto the box [-limit, limit] (Preserve sign)
        return Math.sign(wVal) * limit;
      }
      return wVal;
    });

    return {
      ...f,
      prevTheta: prevTheta,
      theta: newTheta,
      w: newW,
      isActive,
      isClamped
    };
  });
};


export const NUM_FEATURES = 3;
export const HIDDEN_SIZE = 5;
export const M_CONSTANT = 2.0; // Hierarchy coefficient (slightly higher to make clamping obvious)
export const MAX_LAMBDA = 2.0;
export const LAMBDA_STEP = 0.2;
export const EPOCHS_PER_LAMBDA = 5; // Fewer epochs to make the path faster to watch
export const LEARNING_RATE = 0.1;

// Visual constants
export const NODE_RADIUS = 24;
export const SVG_WIDTH = 900;
export const SVG_HEIGHT = 500;
export const COLOR_ACTIVE = "#3b82f6"; // Blue-500
export const COLOR_INACTIVE = "#475569"; // Slate-600
export const COLOR_THETA = "#10b981"; // Emerald-500
export const COLOR_WEIGHT = "#a855f7"; // Purple-500
export const COLOR_CLAMPED = "#f59e0b"; // Amber-500 (Warning color for hierarchy constraint)

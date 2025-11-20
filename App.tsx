
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Brain, Info, ChevronRight } from 'lucide-react';
import { 
  SimulationState, 
  SimulationPhase, 
  OptimizationStep, 
} from './types';
import { 
  NUM_FEATURES, 
  MAX_LAMBDA, 
  LAMBDA_STEP, 
  EPOCHS_PER_LAMBDA,
  M_CONSTANT 
} from './constants';
import { 
  initializeWeights, 
  performGradientStep, 
  performProximalStep 
} from './services/simulationLogic';
import { analyzeLassoNetState } from './services/geminiService';

import { NetworkGraph } from './components/NetworkGraph';
import { Controls } from './components/Controls';

const INITIAL_STATE: SimulationState = {
  phase: SimulationPhase.INIT,
  step: OptimizationStep.GRADIENT,
  lambda: 0,
  epoch: 0,
  features: [],
  logs: ["Ready."],
  detailedLog: "Press 'Start' or 'Step' to begin the LassoNet training process."
};

const App: React.FC = () => {
  const [state, setState] = useState<SimulationState>(INITIAL_STATE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000); 
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resetSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isPlaying) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [state.logs, isPlaying]);

  const resetSimulation = () => {
    setState({
      ...INITIAL_STATE,
      features: initializeWeights(),
      logs: ["Initialized 3 features with random weights."],
      detailedLog: "Initialization Phase: Weights are set. X1 is strong, X2 is medium, X3 is weak/noise."
    });
    setIsPlaying(false);
    setAiAnalysis(null);
  };

  const advanceSimulation = useCallback(() => {
    setState(prev => {
      let next = { ...prev };
      let stepLog = "";

      // 1. INIT -> PRETRAIN
      if (prev.phase === SimulationPhase.INIT) {
        next.phase = SimulationPhase.PRETRAIN;
        next.logs = [...prev.logs, ">>> Starting Pretraining (Lambda = 0)"];
        next.detailedLog = "Phase: Pretraining. No sparsity penalty yet. Just fitting the data.";
        return next;
      }

      // 2. STEP LOGIC
      if (prev.step === OptimizationStep.GRADIENT) {
        // Perform Gradient Step
        next.features = performGradientStep(prev.features);
        next.step = OptimizationStep.PROXIMAL;
        stepLog = "Step 1: Gradient Descent. Updating θ and W to minimize loss.";
        // Explain specifically
        const f1 = next.features[0];
        next.detailedLog = `Gradient Step: Weights updated based on data. Feature 1 θ moved to ${f1.theta.toFixed(2)}.`;
      } else {
        // Perform Proximal Step
        next.features = performProximalStep(prev.features, prev.lambda);
        next.step = OptimizationStep.GRADIENT;
        next.epoch += 1;
        
        // Log critical events
        const active = next.features.filter(f => f.isActive).length;
        const clamped = next.features.filter(f => f.isClamped).length;
        
        stepLog = `Step 2: Proximal Update (λ=${prev.lambda.toFixed(2)})`;
        next.detailedLog = `Proximal Step: 1) Applied Soft-Thresholding to θ. 2) Enforced |W| ≤ ${M_CONSTANT}*|θ|. ${clamped} features have W clamped by θ hierarchy.`;

        if (active < prev.features.filter(f => f.isActive).length) {
          next.logs = [...next.logs, `⚠️ Feature pruned at λ=${prev.lambda.toFixed(2)}`];
        }
      }

      // 3. PHASE TRANSITIONS
      if (prev.phase === SimulationPhase.PRETRAIN) {
        if (next.epoch >= 5) { 
          next.phase = SimulationPhase.PATH_LOOP;
          next.epoch = 0;
          next.lambda = LAMBDA_STEP; 
          next.logs = [...next.logs, `>>> Entering Warm-start Path. Increasing λ to ${next.lambda}`];
        }
      } else if (prev.phase === SimulationPhase.PATH_LOOP) {
        if (next.epoch >= EPOCHS_PER_LAMBDA) {
          next.epoch = 0;
          next.lambda = parseFloat((prev.lambda + LAMBDA_STEP).toFixed(2));
          
          if (next.lambda > MAX_LAMBDA) {
            next.phase = SimulationPhase.FINISHED;
            next.logs = [...next.logs, ">>> Training Completed"];
            next.detailedLog = "Final Model obtained. Check which features survived (Active).";
            setIsPlaying(false);
          } else {
            next.logs = [...next.logs, `Increasing Penalty: λ = ${next.lambda}`];
          }
        }
      }

      return { ...next, detailedLog: stepLog }; // Prefer step log for step-by-step clarity
    });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && state.phase !== SimulationPhase.FINISHED) {
      interval = setInterval(advanceSimulation, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, state.phase, speed, advanceSimulation]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeLassoNetState(state);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // Stats
  const activeCount = state.features.filter(f => f.isActive).length;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="text-emerald-400" />
              LassoNet Visualizer
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Step-by-step visualization of Algorithm 2 (Hierarchical Proximal).
            </p>
          </div>
          <div className="text-xs text-slate-500 text-right">
            Features: {NUM_FEATURES} | Hidden: 5 | M: {M_CONSTANT}
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Viz & Controls */}
          <div className="lg:col-span-8 space-y-4">
            <Controls 
              phase={state.phase} 
              isPlaying={isPlaying} 
              onTogglePlay={() => setIsPlaying(!isPlaying)} 
              onStep={advanceSimulation}
              onReset={resetSimulation}
              speed={speed}
              setSpeed={setSpeed}
            />
            
            <NetworkGraph features={state.features} stepName={state.step} />

            {/* Step Explanation Box */}
            <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 shadow-inner min-h-[120px]">
               <div className="flex items-center gap-2 mb-2 uppercase tracking-wider text-xs font-bold text-slate-500">
                 <Activity size={14} /> Current Operation
               </div>
               <h3 className={`text-lg font-semibold mb-1 ${state.step === OptimizationStep.PROXIMAL ? "text-purple-400" : "text-blue-400"}`}>
                 {state.step === OptimizationStep.GRADIENT ? "Step 1: Gradient Update" : "Step 2: Proximal Step"}
               </h3>
               <p className="text-slate-300 leading-relaxed">
                 {state.detailedLog}
               </p>
            </div>
          </div>

          {/* Right Column: Stats & AI */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Active Features</div>
                <div className="text-2xl font-mono font-bold text-white">{activeCount}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Lambda (Penalty)</div>
                <div className="text-2xl font-mono font-bold text-emerald-400">{state.lambda.toFixed(2)}</div>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Epoch</div>
                <div className="text-xl font-mono text-white">{state.epoch} <span className="text-xs text-slate-500">/ {EPOCHS_PER_LAMBDA}</span></div>
              </div>
              <div className="bg-slate-800 p-3 rounded border border-slate-700">
                <div className="text-xs text-slate-400">Phase</div>
                <div className="text-xs font-bold text-blue-400 mt-1">{state.phase}</div>
              </div>
            </div>

            {/* Algorithm Path Visualizer */}
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
              <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase">Warm-Start Path</h3>
              <div className="relative pl-4 border-l-2 border-slate-700 space-y-6">
                <div className="relative">
                  <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${state.phase === SimulationPhase.PRETRAIN ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-slate-600'}`}></span>
                  <div className="text-sm font-medium text-slate-200">Pretrain</div>
                  <div className="text-xs text-slate-500">Optimize dense network (λ=0)</div>
                </div>
                <div className="relative">
                  <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${state.phase === SimulationPhase.PATH_LOOP ? 'bg-purple-500 ring-4 ring-purple-500/20' : 'bg-slate-600'}`}></span>
                  <div className="text-sm font-medium text-slate-200">Increase λ</div>
                  <div className="text-xs text-slate-500">Loop: Gradient &rarr; Proximal</div>
                </div>
                <div className="relative">
                  <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${state.phase === SimulationPhase.FINISHED ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-600'}`}></span>
                  <div className="text-sm font-medium text-slate-200">Result</div>
                  <div className="text-xs text-slate-500">Sparse Feature Subset</div>
                </div>
              </div>
            </div>

            {/* Logs */}
            <div className="bg-black rounded-lg p-3 font-mono text-xs h-32 overflow-y-auto border border-slate-800 shadow-inner">
              {state.logs.map((log, i) => (
                <div key={i} className="mb-1 text-emerald-500/90 border-b border-slate-900/50 pb-1 last:border-0">
                  <span className="text-slate-600 mr-2">{i+1}.</span>{log}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

             {/* AI Analysis */}
             <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 p-4 rounded-lg border border-indigo-500/30">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                    <Brain size={14} /> Gemini Analysis
                  </h3>
                  <button 
                    onClick={handleAiAnalysis}
                    disabled={isAnalyzing}
                    className="text-[10px] uppercase font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Thinking...' : 'Analyze'}
                  </button>
                </div>
                <div className="text-xs text-slate-300 min-h-[40px] leading-relaxed">
                  {aiAnalysis || "Ask Gemini to explain the current sparsity pattern."}
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

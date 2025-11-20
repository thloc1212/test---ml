
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Activity } from 'lucide-react';
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
import { MathPanel } from './components/MathPanel';

const INITIAL_STATE: SimulationState = {
  phase: SimulationPhase.INIT,
  step: OptimizationStep.GRADIENT,
  lambda: 0,
  epoch: 0,
  features: [],
  logs: ["Sẵn sàng."],
  detailedLog: "Nhấn 'Bắt đầu' hoặc 'Bước tiếp' để chạy mô phỏng.",
  calculationDetails: null
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
      logs: ["Đã khởi tạo 3 đặc trưng."],
      detailedLog: "Khởi tạo: Gán trọng số ngẫu nhiên cho mạng.",
      calculationDetails: null
    });
    setIsPlaying(false);
    setAiAnalysis(null);
  };

  const advanceSimulation = useCallback(() => {
    setState(prev => {
      let next = { ...prev };
      let stepLog = "";
      let calcDetails = prev.calculationDetails;

      if (prev.phase === SimulationPhase.INIT) {
        next.phase = SimulationPhase.PRETRAIN;
        next.logs = [...prev.logs, ">>> Pretraining (Lambda = 0)"];
        next.detailedLog = "Giai đoạn Pretrain: Chỉ chạy Gradient Descent thông thường để mạng học ổn định trước khi làm thưa.";
        return next;
      }

      if (prev.step === OptimizationStep.GRADIENT) {
        const result = performGradientStep(prev.features);
        next.features = result.features;
        calcDetails = result.details;
        next.step = OptimizationStep.PROXIMAL;
        stepLog = "Bước 1: Gradient Descent (Cập nhật trọng số)";
        next.detailedLog = `Gradient Descent: Di chuyển θ và W theo hướng đạo hàm để giảm lỗi dự đoán.`;
      } else {
        const result = performProximalStep(prev.features, prev.lambda);
        next.features = result.features;
        calcDetails = result.details;
        next.step = OptimizationStep.GRADIENT;
        next.epoch += 1;
        
        stepLog = `Bước 2: Proximal (λ=${prev.lambda.toFixed(2)})`;
        next.detailedLog = `Proximal Step: Áp dụng Soft-Thresholding để làm thưa θ và Ràng buộc Phân cấp (Clamping) lên W.`;

        const activePrev = prev.features.filter(f => f.isActive).length;
        const activeNext = next.features.filter(f => f.isActive).length;
        if (activeNext < activePrev) {
          next.logs = [...next.logs, `⚠️ Đặc trưng bị loại bỏ tại λ=${prev.lambda.toFixed(2)}`];
        }
      }

      if (prev.phase === SimulationPhase.PRETRAIN) {
        if (next.epoch >= 5) { 
          next.phase = SimulationPhase.PATH_LOOP;
          next.epoch = 0;
          next.lambda = LAMBDA_STEP; 
          next.logs = [...next.logs, `>>> Bắt đầu Path (λ=${next.lambda})`];
        }
      } else if (prev.phase === SimulationPhase.PATH_LOOP) {
        if (next.epoch >= EPOCHS_PER_LAMBDA) {
          next.epoch = 0;
          next.lambda = parseFloat((prev.lambda + LAMBDA_STEP).toFixed(2));
          
          if (next.lambda > MAX_LAMBDA) {
            next.phase = SimulationPhase.FINISHED;
            next.logs = [...next.logs, ">>> Hoàn tất mô phỏng"];
            setIsPlaying(false);
          } else {
            next.logs = [...next.logs, `Tăng λ lên ${next.lambda}`];
          }
        }
      }

      return { ...next, detailedLog: stepLog, calculationDetails: calcDetails };
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

  const activeCount = state.features.filter(f => f.isActive).length;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <header className="border-b border-slate-800 pb-2 flex-shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="text-emerald-400" size={24} />
            Mô phỏng LassoNet
          </h1>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Thuật toán 2: Tối ưu hóa Prox-Linear
        </div>
      </header>

      {/* Main Content - Fixed Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden pt-4">
        
        {/* Left: Visualization & Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* Controls Row */}
          <div className="flex-shrink-0">
            <Controls 
              phase={state.phase} 
              isPlaying={isPlaying} 
              onTogglePlay={() => setIsPlaying(!isPlaying)} 
              onStep={advanceSimulation}
              onReset={resetSimulation}
              speed={speed}
              setSpeed={setSpeed}
            />
          </div>

          {/* Graph */}
          <div className="flex-1 min-h-0">
            <NetworkGraph features={state.features} stepName={state.step} />
          </div>

          {/* Bottom Log */}
          <div className="h-32 flex-shrink-0 flex gap-4">
             {/* Explanation Box */}
             <div className="flex-1 bg-slate-900 p-4 rounded-lg border border-slate-800 overflow-y-auto">
                <div className="flex items-center gap-2 mb-1 uppercase tracking-wider text-[10px] font-bold text-slate-500">
                  <Activity size={12} /> Trạng thái hệ thống
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {state.detailedLog}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-400 font-mono">
                  <div>Epoch: <span className="text-white">{state.epoch}</span></div>
                  <div>Lambda: <span className="text-emerald-400">{state.lambda.toFixed(2)}</span></div>
                  <div>Hoạt động: <span className="text-blue-400">{activeCount}</span></div>
                </div>
             </div>

             {/* Simple Log */}
             <div className="w-64 bg-black rounded-lg p-2 font-mono text-[10px] overflow-y-auto border border-slate-800">
                {state.logs.map((log, i) => (
                  <div key={i} className="mb-1 text-emerald-500/90 border-b border-slate-900/50 pb-1">
                    <span className="text-slate-600 mr-2">{i+1}</span>{log}
                  </div>
                ))}
                <div ref={bottomRef} />
             </div>
          </div>
        </div>

        {/* Right: Math Inspector */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-4">
          <MathPanel details={state.calculationDetails} />
          
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-indigo-300 text-xs flex items-center gap-2">
                Phân tích AI (Gemini)
              </h3>
              <button 
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="text-[10px] uppercase font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded"
              >
                {isAnalyzing ? '...' : 'Hỏi AI'}
              </button>
            </div>
            <div className="text-xs text-slate-400 min-h-[60px] max-h-[100px] overflow-y-auto">
               {aiAnalysis || "Nhấn 'Hỏi AI' để phân tích trạng thái mạng."}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;

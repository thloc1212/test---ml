
import React from 'react';
import { Play, Pause, RotateCcw, SkipForward, FastForward } from 'lucide-react';
import { SimulationPhase } from '../types';

interface ControlsProps {
  phase: SimulationPhase;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  setSpeed: (s: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  phase,
  isPlaying,
  onTogglePlay,
  onStep,
  onReset,
  speed,
  setSpeed
}) => {
  const isFinished = phase === SimulationPhase.FINISHED;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700 shadow-md">
      <button
        onClick={onTogglePlay}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors ${
          isPlaying 
            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        } ${isFinished ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={isFinished}
      >
        {isPlaying ? <><Pause size={18} /> Tạm dừng</> : <><Play size={18} /> {phase === SimulationPhase.INIT ? 'Bắt đầu' : 'Chạy tiếp'}</>}
      </button>

      <button
        onClick={onStep}
        disabled={isPlaying || isFinished}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors"
      >
        <SkipForward size={18} /> Bước tiếp
      </button>

      <button
        onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md transition-colors"
      >
        <RotateCcw size={18} /> Đặt lại
      </button>

      <div className="flex items-center gap-2 ml-auto border-l border-slate-600 pl-4">
        <span className="text-slate-400 text-sm flex items-center gap-1"><FastForward size={16} /> Tốc độ</span>
        <input
          type="range"
          min="200"
          max="2000"
          step="100"
          value={2200 - speed} // Invert logic
          onChange={(e) => setSpeed(2200 - parseInt(e.target.value))}
          disabled={!isPlaying}
          className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
};

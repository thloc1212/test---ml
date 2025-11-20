
import React from 'react';
import { OptimizationStep, StepCalculationDetails } from '../types';
import { M_CONSTANT } from '../constants';

interface MathPanelProps {
  details: StepCalculationDetails | null;
}

export const MathPanel: React.FC<MathPanelProps> = ({ details }) => {
  if (!details) return <div className="h-full flex items-center justify-center text-slate-500 italic">Bắt đầu mô phỏng để xem công thức.</div>;

  const isGradient = details.stepType === OptimizationStep.GRADIENT;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 h-full flex flex-col">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">
        Chi tiết tính toán (Đặc trưng X{details.featureId})
      </h3>

      <div className="flex-1 overflow-y-auto space-y-6">
        
        {/* --- GRADIENT DESCENT VIEW --- */}
        {isGradient && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
              <div className="text-xs font-bold text-blue-400 mb-1">Bước 1: Cập nhật Gradient</div>
              <div className="font-mono text-sm text-slate-200">
                θ<sub>mới</sub> = θ<sub>cũ</sub> - η · ∇L
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 font-mono text-sm">
              <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                 <span className="text-slate-400">θ<sub>cũ</sub></span>
                 <span>{details.oldVal?.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                 <span className="text-slate-400">Đạo hàm (Gradient ∇L)</span>
                 <span className="text-red-400">{details.grad?.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                 <span className="text-slate-400">Hệ số học (Learning Rate η)</span>
                 <span className="text-yellow-400">{details.learningRate}</span>
              </div>
              <div className="border-t border-slate-600 my-2"></div>
              <div className="flex justify-between items-center bg-slate-700 p-2 rounded font-bold">
                 <span className="text-white">θ<sub>mới</sub></span>
                 <span className="text-emerald-400">{details.newVal?.toFixed(4)}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500 mt-2 italic">
              * Công thức tương tự cũng được áp dụng cho các trọng số W để giảm thiểu hàm lỗi.
            </div>
          </div>
        )}

        {/* --- PROXIMAL STEP VIEW --- */}
        {!isGradient && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            
            {/* 1. SPARSITY (SOFT THRESHOLD) */}
            <div>
              <div className="text-xs font-bold text-purple-400 mb-2">2.1. Làm thưa: Soft Thresholding</div>
              <div className="bg-slate-900 p-3 rounded font-mono text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Đầu vào θ:</span>
                  <span className="text-white">{details.inputTheta?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ngưỡng phạt (λη):</span>
                  <span className="text-red-400">{details.lambda?.toFixed(4)}</span>
                </div>
                
                {/* Visual Bar for Thresholding */}
                <div className="relative h-8 bg-slate-800 mt-2 rounded overflow-hidden border border-slate-600">
                   <div className="absolute top-0 bottom-0 w-[2px] bg-white left-1/2 z-10"></div>
                   {/* Threshold Zone */}
                   <div 
                     className="absolute top-0 bottom-0 bg-red-500/20 left-1/2 transform -translate-x-1/2" 
                     style={{ width: `${(details.lambda || 0) * 100}%` /* Approximate scale */ }}
                   ></div>
                   {/* Value Dot */}
                   <div 
                     className="absolute top-1/2 w-3 h-3 rounded-full bg-blue-500 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                     style={{ left: `calc(50% + ${(details.inputTheta || 0) * 20}px)` }}
                   ></div>
                   <div className="absolute bottom-0 right-1 text-[8px] text-slate-500">0</div>
                </div>
                <div className="text-center text-[10px] text-slate-500 italic">Nếu điểm xanh rơi vào vùng đỏ, θ sẽ về 0</div>

                <div className="flex justify-between border-t border-slate-700 pt-2">
                  <span className="text-purple-300 font-bold">Kết quả θ:</span>
                  <span className="text-emerald-400 font-bold">{details.thresholdedTheta?.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* 2. HIERARCHY (CLAMPING) */}
            <div>
              <div className="text-xs font-bold text-amber-400 mb-2">2.2. Ràng buộc phân cấp</div>
              <div className="text-xs text-slate-400 mb-1 font-mono">|W| ≤ M · |θ<sub>mới</sub>|</div>
              
              <div className="bg-slate-900 p-3 rounded font-mono text-xs space-y-2">
                 <div className="flex justify-between">
                    <span className="text-slate-400">W hiện tại:</span>
                    <span className="text-white">{details.inputW?.toFixed(4)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-slate-400">Giới hạn (M·|θ|):</span>
                    <span className="text-amber-400">
                      {M_CONSTANT} * {Math.abs(details.thresholdedTheta || 0).toFixed(3)} = {details.limit?.toFixed(4)}
                    </span>
                 </div>

                 {/* Visual Box Constraint */}
                 <div className="relative h-12 bg-slate-800 mt-2 rounded border border-slate-700 flex items-center justify-center">
                    {/* The Allowed Box */}
                    <div 
                      className="h-full bg-emerald-900/30 border-x-2 border-amber-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (details.limit || 0) * 60)}%` }} 
                    ></div>
                    {/* The Weight Value */}
                    <div 
                       className="absolute h-2 w-2 bg-purple-500 rounded-full transition-all duration-500"
                       style={{ left: `calc(50% + ${(details.inputW || 0) * 30}%)` }}
                    ></div>
                 </div>
                 <div className="text-center text-[10px] text-slate-500 italic">Điểm tím (W) bắt buộc nằm trong khung vàng</div>

                 <div className="flex justify-between border-t border-slate-700 pt-2">
                    <span className="text-amber-300 font-bold">W sau kẹp:</span>
                    <span className="text-white font-bold">{details.clampedW?.toFixed(4)}</span>
                 </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};


import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { WeightData } from '../types';
import { SVG_WIDTH, SVG_HEIGHT, NODE_RADIUS, COLOR_ACTIVE, COLOR_INACTIVE, COLOR_THETA, COLOR_WEIGHT, COLOR_CLAMPED, M_CONSTANT } from '../constants';

interface NetworkGraphProps {
  features: WeightData[];
  stepName: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ features, stepName }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Add arrow marker for paths
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Offset from node
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    const width = SVG_WIDTH;
    const height = SVG_HEIGHT;
    const layerSpacing = width / 3;

    // --- Node Positions ---
    const inputNodes = features.map((f, i) => ({
      id: `input-${f.id}`,
      x: 100,
      y: (height / (features.length + 1)) * (i + 1),
      ...f
    }));

    const hiddenNodes = Array.from({ length: 5 }).map((_, i) => ({
      id: `hidden-${i}`,
      x: 100 + layerSpacing,
      y: (height / 6) * (i + 1),
    }));

    const outputNode = {
      id: 'output',
      x: 100 + layerSpacing * 2,
      y: height / 2
    };

    const g = svg.append("g");

    // --- 1. Skip Connections (Theta) ---
    // Drawn as curved arches from Input to Output
    const thetaLinks = inputNodes.map(node => {
      // Control point for Bezier curve to make it arch over hidden layer
      const cpX = (node.x + outputNode.x) / 2;
      const cpY = node.y - 80; // Arch upwards/downwards depending on position
      
      return {
        source: node,
        target: outputNode,
        control: { x: cpX, y: cpY },
        weight: node.theta,
        active: node.isActive
      };
    });

    const thetaPaths = g.append("g").selectAll("path")
      .data(thetaLinks)
      .enter()
      .append("path")
      .attr("d", d => {
        return `M${d.source.x},${d.source.y} Q${d.control.x},${d.control.y} ${d.target.x},${d.target.y}`;
      })
      .attr("fill", "none")
      .attr("stroke", COLOR_THETA)
      .attr("stroke-width", d => Math.max(1, Math.abs(d.weight) * 10))
      .attr("stroke-opacity", d => d.active ? 0.8 : 0.1)
      .attr("stroke-dasharray", d => d.active ? "none" : "5,5");

    // Theta Labels (Values on the curve)
    g.append("g").selectAll("text")
      .data(thetaLinks)
      .enter()
      .append("text")
      .attr("x", d => d.control.x)
      .attr("y", d => d.control.y + 10)
      .text(d => `θ=${d.weight.toFixed(2)}`)
      .attr("text-anchor", "middle")
      .attr("fill", COLOR_THETA)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("opacity", d => d.active ? 1 : 0.3)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke");

    // --- 2. Hidden Connections (W) ---
    features.forEach((f, i) => {
      const source = inputNodes[i];
      
      // Group for W lines
      const wGroup = g.append("g");

      f.w.forEach((wVal, j) => {
        const target = hiddenNodes[j];
        const isClamped = f.isClamped;
        const limit = M_CONSTANT * Math.abs(f.theta);
        const isMaxed = Math.abs(Math.abs(wVal) - limit) < 0.01 && f.isActive; // Visually check if near limit

        wGroup.append("line")
          .attr("x1", source.x)
          .attr("y1", source.y)
          .attr("x2", target.x)
          .attr("y2", target.y)
          .attr("stroke", isMaxed ? COLOR_CLAMPED : COLOR_WEIGHT)
          .attr("stroke-width", Math.max(1, Math.abs(wVal) * 5))
          .attr("stroke-opacity", f.isActive ? (isMaxed ? 1.0 : 0.4) : 0.05);
      });

      // Add visual constraint box near input node
      if (f.isActive) {
        const limit = M_CONSTANT * Math.abs(f.theta);
        g.append("text")
          .attr("x", source.x + 40)
          .attr("y", source.y + 25)
          .text(`|W| ≤ ${limit.toFixed(2)}`)
          .attr("fill", f.isClamped ? COLOR_CLAMPED : "#64748b")
          .attr("font-size", "10px")
          .attr("font-family", "monospace");
          
        if (f.isClamped) {
           g.append("circle")
            .attr("cx", source.x + 30)
            .attr("cy", source.y + 22)
            .attr("r", 3)
            .attr("fill", COLOR_CLAMPED);
        }
      }
    });

    // --- 3. Hidden to Output ---
    hiddenNodes.forEach(h => {
      g.append("line")
        .attr("x1", h.x)
        .attr("y1", h.y)
        .attr("x2", outputNode.x)
        .attr("y2", outputNode.y)
        .attr("stroke", "#94a3b8")
        .attr("stroke-width", 1)
        .attr("marker-end", "url(#arrowhead)")
        .attr("stroke-opacity", 0.3);
    });

    // --- 4. Nodes ---
    
    // Input Nodes
    const inputs = g.selectAll(".input-node")
      .data(inputNodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    inputs.append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", d => d.isActive ? COLOR_ACTIVE : COLOR_INACTIVE)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    inputs.append("text")
      .text(d => `X${d.id}`)
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .style("font-weight", "bold");

    // Hidden Nodes
    const hiddens = g.selectAll(".hidden-node")
      .data(hiddenNodes)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    hiddens.append("circle")
      .attr("r", 12)
      .attr("fill", "#334155")
      .attr("stroke", "#94a3b8");

    // Output Node
    const output = g.append("g")
      .attr("transform", `translate(${outputNode.x},${outputNode.y})`);

    output.append("circle")
      .attr("r", 30)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3);
      
    output.append("text")
      .text("Y")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("font-size", "18px");

  }, [features, stepName]);

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-xl overflow-hidden border border-slate-700">
      <svg 
        ref={svgRef} 
        width={SVG_WIDTH} 
        height={SVG_HEIGHT} 
        className="w-full h-auto block"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      />
      {/* Overlay Legend */}
      <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur p-3 rounded-md border border-slate-700 text-xs text-slate-300 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span>Skip Weight (θ)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span>Hidden Weight (W)</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-amber-500"></span>
           <span>Clamped (Hierarchy Active)</span>
        </div>
      </div>
    </div>
  );
};

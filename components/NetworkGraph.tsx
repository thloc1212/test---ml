
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
    svg.selectAll("*").remove();

    // --- Definitions ---
    const defs = svg.append("defs");
    
    // Arrow marker
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
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
      x: 80,
      y: (height / (features.length + 1)) * (i + 1),
      ...f
    }));

    const hiddenNodes = Array.from({ length: 5 }).map((_, i) => ({
      id: `hidden-${i}`,
      x: 80 + layerSpacing,
      y: (height / 6) * (i + 1),
    }));

    const outputNode = {
      id: 'output',
      x: width - 80,
      y: height / 2
    };

    const g = svg.append("g");

    // --- 1. Skip Connections (Theta) ---
    const thetaLinks = inputNodes.map(node => {
      const cpX = (node.x + outputNode.x) / 2;
      // Arch away from center to avoid crossing hidden layer messily
      const cpY = node.y < height/2 ? node.y - 100 : node.y + 100;
      
      return {
        source: node,
        target: outputNode,
        control: { x: cpX, y: cpY },
        weight: node.theta,
        active: node.isActive
      };
    });

    // Draw Arcs
    g.append("g").selectAll("path")
      .data(thetaLinks)
      .enter()
      .append("path")
      .attr("d", d => `M${d.source.x},${d.source.y} Q${d.control.x},${d.control.y} ${d.target.x},${d.target.y}`)
      .attr("fill", "none")
      .attr("stroke", COLOR_THETA)
      .attr("stroke-width", d => Math.max(1, Math.abs(d.weight) * 8))
      .attr("stroke-opacity", d => d.active ? 0.6 : 0.1)
      .attr("stroke-dasharray", d => d.active ? "none" : "5,5");

    // Theta Labels (Background Box)
    const thetaLabels = g.append("g").selectAll("g")
      .data(thetaLinks)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.control.x}, ${d.control.y})`);

    thetaLabels.append("rect")
      .attr("x", -25)
      .attr("y", -10)
      .attr("width", 50)
      .attr("height", 20)
      .attr("rx", 4)
      .attr("fill", "#0f172a")
      .attr("stroke", COLOR_THETA)
      .attr("stroke-width", 1)
      .attr("opacity", 0.8);

    thetaLabels.append("text")
      .text(d => d.weight.toFixed(3))
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("fill", COLOR_THETA)
      .attr("font-size", "11px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold");

    // --- 2. Hidden Connections (W) ---
    features.forEach((f, i) => {
      const source = inputNodes[i];
      const wGroup = g.append("g");

      f.w.forEach((wVal, j) => {
        const target = hiddenNodes[j];
        const isActive = f.isActive;
        const limit = M_CONSTANT * Math.abs(f.theta);
        const isMaxed = Math.abs(Math.abs(wVal) - limit) < 0.01 && isActive;

        // Line
        wGroup.append("line")
          .attr("x1", source.x)
          .attr("y1", source.y)
          .attr("x2", target.x)
          .attr("y2", target.y)
          .attr("stroke", isMaxed ? COLOR_CLAMPED : COLOR_WEIGHT)
          .attr("stroke-width", Math.max(0.5, Math.abs(wVal) * 4))
          .attr("stroke-opacity", isActive ? 0.4 : 0.05);

        // Weight Labels (Only show for first feature or significantly large ones to avoid clutter)
        if (isActive && Math.abs(wVal) > 0.1 && (i === 0 || j === 2)) {
             const midX = (source.x + target.x) / 2;
             const midY = (source.y + target.y) / 2;
             
             wGroup.append("text")
                .attr("x", midX)
                .attr("y", midY)
                .text(wVal.toFixed(2))
                .attr("fill", isMaxed ? COLOR_CLAMPED : "#a855f7")
                .attr("font-size", "9px")
                .attr("opacity", 0.8);
        }
      });
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
        .attr("stroke-opacity", 0.2);
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
      .attr("r", 10)
      .attr("fill", "#334155")
      .attr("stroke", "#94a3b8");

    // Output Node
    const output = g.append("g")
      .attr("transform", `translate(${outputNode.x},${outputNode.y})`);

    output.append("circle")
      .attr("r", 25)
      .attr("fill", "#f59e0b")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
      
    output.append("text")
      .text("Y")
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-weight", "bold");

  }, [features, stepName]);

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-xl overflow-hidden border border-slate-700">
      <div className="absolute top-2 left-2 text-xs text-slate-500 z-10">Visualization of Weights</div>
      <svg 
        ref={svgRef} 
        width={SVG_WIDTH} 
        height={SVG_HEIGHT} 
        className="w-full h-auto block"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      />
    </div>
  );
};


import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export const Visualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = 120;
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const n = 64;
    const data = Array.from({ length: n }, () => 0);

    const x = d3.scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, 255])
      .range([height, 0]);

    const bars = svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d, i) => x(String(i)) || 0)
      .attr('y', height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', '#3b82f6')
      .attr('rx', 2);

    let animationId: number;

    const update = () => {
      // Note: Getting real frequency data requires active audio context and analyzer
      // In a real app, we'd pass the analyzer node. Here we simulate for aesthetics if needed
      // or just keep it simple.
      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full h-[120px] bg-black/40 rounded-xl overflow-hidden border border-white/5">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

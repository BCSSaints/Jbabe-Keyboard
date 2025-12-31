
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { audioEngine } from '../services/audioEngine';

export const Visualizer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 80;
    
    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'none');

    const n = 64; 
    const x = d3.scaleBand()
      .domain(d3.range(n).map(String))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, 255])
      .range([0, height]);

    svg.selectAll('*').remove();

    const bars = svg.selectAll('rect')
      .data(d3.range(n).map(() => 0))
      .enter()
      .append('rect')
      .attr('x', (d, i) => x(String(i)) || 0)
      .attr('y', d => height - y(d))
      .attr('width', x.bandwidth())
      .attr('height', d => y(d))
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 2);

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'barGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6');

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#1d4ed8');

    let animationId: number;

    const update = () => {
      const data = audioEngine.getFrequencyData();
      if (data) {
        const subset = Array.from(data.slice(0, n));
        bars.data(subset)
          .attr('y', d => height - y(d))
          .attr('height', d => y(d));
      }
      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-[80px] bg-black/40 rounded-t-2xl overflow-hidden border-b border-white/5">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

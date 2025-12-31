
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
      .padding(0.3);

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
      .attr('fill', 'url(#inkGradient)')
      .attr('rx', 1);

    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', 'inkGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#8b735b'); // Sepia Ink

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#2a241e'); // Deep Charcoal

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
    <div ref={containerRef} className="w-full h-[80px] bg-[#1a1512] rounded-t-lg overflow-hidden border-b-2 border-[#3d3128]">
      <svg ref={svgRef} className="w-full h-full opacity-60" />
    </div>
  );
};

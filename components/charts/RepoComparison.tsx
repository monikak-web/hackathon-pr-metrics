"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function RepoComparison({ data }: { data: PrMetric[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (data.length === 0) {
      svg
        .attr("viewBox", "0 0 600 300")
        .append("text")
        .attr("x", 300)
        .attr("y", 150)
        .attr("text-anchor", "middle")
        .attr("fill", "#a1a1aa")
        .text("No data");
      return;
    }

    const grouped = d3.rollup(
      data,
      (v) => d3.mean(v, (d) => d.duration_ms!)! / (1000 * 60 * 60),
      (d) => d.repo,
    );

    const entries = Array.from(grouped, ([repo, avgHours]) => ({
      repo,
      avgHours,
    })).sort((a, b) => b.avgHours - a.avgHours);

    const margin = { top: 10, right: 20, bottom: 30, left: 140 };
    const barHeight = 30;
    const height = entries.length * barHeight + margin.top + margin.bottom;
    const width = 600 - margin.left - margin.right;

    svg.attr("viewBox", `0 0 600 ${Math.max(height, 120)}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.avgHours)!])
      .nice()
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(entries.map((d) => d.repo))
      .range([0, entries.length * barHeight])
      .padding(0.2);

    g.append("g")
      .attr("transform", `translate(0,${entries.length * barHeight})`)
      .call(d3.axisBottom(x).ticks(5))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.repo)!)
      .attr("width", (d) => x(d.avgHours))
      .attr("height", y.bandwidth())
      .attr("fill", "#0ea5e9")
      .attr("rx", 4);

    // Repo labels
    g.selectAll(".repo-label")
      .data(entries)
      .join("text")
      .attr("x", -8)
      .attr("y", (d) => y(d.repo)! + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", "#71717a")
      .style("font-size", "11px")
      .text((d) => d.repo);

    // Value labels
    g.selectAll(".value-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.avgHours) + 4)
      .attr("y", (d) => y(d.repo)! + y.bandwidth() / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px")
      .text((d) => `${d.avgHours.toFixed(1)}h`);

    // X axis label
    g.append("text")
      .attr("x", width / 2)
      .attr("y", entries.length * barHeight + 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("Avg hours");
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}

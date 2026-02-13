"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric, Priority } from "@/lib/types";

const PRIORITY_ORDER: Priority[] = ["highest", "high", "medium", "low", "lowest"];
const PRIORITY_COLORS: Record<Priority, string> = {
  highest: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  lowest: "#a1a1aa",
};

export function PriorityMergeTime({ data }: { data: PrMetric[] }) {
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

    const margin = { top: 10, right: 40, bottom: 30, left: 120 };
    const barHeight = 40;
    const height =
      PRIORITY_ORDER.length * barHeight + margin.top + margin.bottom;
    const width = 600 - margin.left - margin.right;

    svg.attr("viewBox", `0 0 600 ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const grouped = d3.rollup(
      data,
      (v) => d3.mean(v, (d) => d.duration_ms!)! / (1000 * 60 * 60),
      (d) => d.priority,
    );

    const entries = PRIORITY_ORDER.map((p) => ({
      priority: p,
      avgHours: grouped.get(p) ?? 0,
    }));

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.avgHours)! || 1])
      .nice()
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(entries.map((d) => d.priority))
      .range([0, PRIORITY_ORDER.length * barHeight])
      .padding(0.25);

    g.append("g")
      .attr(
        "transform",
        `translate(0,${PRIORITY_ORDER.length * barHeight})`,
      )
      .call(d3.axisBottom(x).ticks(5))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.priority)!)
      .attr("width", (d) => x(d.avgHours))
      .attr("height", y.bandwidth())
      .attr("fill", (d) => PRIORITY_COLORS[d.priority])
      .attr("rx", 4);

    g.selectAll(".priority-label")
      .data(entries)
      .join("text")
      .attr("x", -8)
      .attr("y", (d) => y(d.priority)! + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", "#71717a")
      .style("font-size", "11px")
      .style("text-transform", "capitalize")
      .text((d) => d.priority);

    g.selectAll(".value-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.avgHours) + 4)
      .attr("y", (d) => y(d.priority)! + y.bandwidth() / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px")
      .text((d) => (d.avgHours > 0 ? `${Math.round(d.avgHours)}h` : ""));

    g.append("text")
      .attr("x", width / 2)
      .attr("y", PRIORITY_ORDER.length * barHeight + 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("Avg hours");
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}
"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric, Priority } from "@/lib/types";

const PRIORITY_ORDER: Priority[] = ["critical", "high", "medium", "low"];
const PRIORITY_COLORS: Record<Priority, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export function PriorityBreakdown({ data }: { data: PrMetric[] }) {
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

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", "0 0 600 300");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const grouped = d3.rollup(
      data,
      (v) => ({
        count: v.length,
        avgHours: d3.mean(v, (d) => d.duration_ms!)! / (1000 * 60 * 60),
      }),
      (d) => d.priority,
    );

    const entries = PRIORITY_ORDER.map((p) => ({
      priority: p,
      count: grouped.get(p)?.count ?? 0,
      avgHours: grouped.get(p)?.avgHours ?? 0,
    }));

    const x = d3
      .scaleBand()
      .domain(entries.map((d) => d.priority))
      .range([0, width])
      .padding(0.3);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.count)! || 1])
      .nice()
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .style("text-transform", "capitalize");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", (d) => x(d.priority)!)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("fill", (d) => PRIORITY_COLORS[d.priority])
      .attr("rx", 4);

    g.selectAll(".bar-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.priority)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .style("font-size", "10px")
      .text((d) =>
        d.count > 0 ? `${d.count} (${Math.round(d.avgHours)}h)` : "",
      );

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -38)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("PRs");
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}
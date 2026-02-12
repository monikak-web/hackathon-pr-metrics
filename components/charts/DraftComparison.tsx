"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function DraftComparison({ data }: { data: PrMetric[] }) {
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

    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", "0 0 600 300");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const grouped = d3.rollup(
      data,
      (v) => ({
        avgHours: d3.mean(v, (d) => d.duration_ms!)! / (1000 * 60 * 60),
        count: v.length,
      }),
      (d) => d.was_draft,
    );

    const entries = [
      {
        label: "Draft",
        ...(grouped.get(true) ?? { avgHours: 0, count: 0 }),
      },
      {
        label: "Non-Draft",
        ...(grouped.get(false) ?? { avgHours: 0, count: 0 }),
      },
    ];

    const x = d3
      .scaleBand()
      .domain(entries.map((d) => d.label))
      .range([0, width])
      .padding(0.4);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.avgHours)! || 1])
      .nice()
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    const colors = ["#6366f1", "#10b981"];

    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", (d) => x(d.label)!)
      .attr("y", (d) => y(d.avgHours))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.avgHours))
      .attr("fill", (_, i) => colors[i])
      .attr("rx", 4);

    // Labels above bars
    g.selectAll(".bar-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.avgHours) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .style("font-size", "11px")
      .text((d) => `${d.avgHours.toFixed(1)}h (${d.count} PRs)`);

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("Avg hours");
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}

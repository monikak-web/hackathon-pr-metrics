"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function DueDateCompliance({ data }: { data: PrMetric[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const withDueDate = data.filter((d) => d.due_date && d.merged_at);

    if (withDueDate.length === 0) {
      svg
        .attr("viewBox", "0 0 600 300")
        .append("text")
        .attr("x", 300)
        .attr("y", 150)
        .attr("text-anchor", "middle")
        .attr("fill", "#a1a1aa")
        .text("No PRs with due dates");
      return;
    }

    let onTime = 0;
    let late = 0;
    for (const d of withDueDate) {
      if (new Date(d.merged_at!) <= new Date(d.due_date!)) {
        onTime++;
      } else {
        late++;
      }
    }

    const entries = [
      { label: "On Time", count: onTime, color: "#22c55e" },
      { label: "Late", count: late, color: "#ef4444" },
    ];

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", "0 0 600 300");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand()
      .domain(entries.map((d) => d.label))
      .range([0, width])
      .padding(0.4);

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
      .style("font-size", "11px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    g.selectAll("rect")
      .data(entries)
      .join("rect")
      .attr("x", (d) => x(d.label)!)
      .attr("y", (d) => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("fill", (d) => d.color)
      .attr("rx", 4);

    const total = onTime + late;
    g.selectAll(".bar-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 6)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .style("font-size", "11px")
      .text(
        (d) => `${d.count} (${((d.count / total) * 100).toFixed(0)}%)`,
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
"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function MergeTimeTrend({ data }: { data: PrMetric[] }) {
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

    svg.attr("viewBox", `0 0 600 300`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parsed = data
      .map((d) => ({
        date: new Date(d.merged_at!),
        hours: d.duration_ms! / (1000 * 60 * 60),
        title: d.title,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const x = d3
      .scaleTime()
      .domain(d3.extent(parsed, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(parsed, (d) => d.hours)!])
      .nice()
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    // Y axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("Hours");

    const line = d3
      .line<(typeof parsed)[0]>()
      .x((d) => x(d.date))
      .y((d) => y(d.hours));

    g.append("path")
      .datum(parsed)
      .attr("fill", "none")
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Tooltip
    const tooltip = d3
      .select(svgRef.current.parentElement!)
      .append("div")
      .attr(
        "class",
        "absolute hidden rounded bg-zinc-800 px-2 py-1 text-xs text-white pointer-events-none",
      );

    g.selectAll("circle")
      .data(parsed)
      .join("circle")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.hours))
      .attr("r", 3)
      .attr("fill", "#6366f1")
      .on("mouseenter", (event, d) => {
        tooltip
          .classed("hidden", false)
          .html(
            `<strong>${d.title}</strong><br/>${d.hours.toFixed(1)}h — ${d.date.toLocaleDateString()}`,
          )
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY - 10}px`);
      })
      .on("mouseleave", () => tooltip.classed("hidden", true));

    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="relative">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}

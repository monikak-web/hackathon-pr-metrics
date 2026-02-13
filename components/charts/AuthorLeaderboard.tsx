"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function AuthorLeaderboard({ data }: { data: PrMetric[] }) {
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

    const msPerDay = 1000 * 60 * 60 * 24;
    const grouped = d3.rollup(
      data,
      (v) => d3.mean(v, (d) => d.duration_ms!)! / msPerDay,
      (d) => d.author,
    );

    const entries = Array.from(grouped, ([author, avgDays]) => ({
      author,
      avgDays,
    })).sort((a, b) => b.avgDays - a.avgDays);

    const margin = { top: 10, right: 40, bottom: 30, left: 120 };
    const barHeight = 28;
    const height = entries.length * barHeight + margin.top + margin.bottom;
    const width = 600 - margin.left - margin.right;

    svg.attr("viewBox", `0 0 600 ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.avgDays)!])
      .nice()
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(entries.map((d) => d.author))
      .range([0, entries.length * barHeight])
      .padding(0.2);

    const color = d3
      .scaleSequential(d3.interpolateRdYlGn)
      .domain([d3.max(entries, (d) => d.avgDays)!, 0]);

    g.append("g")
      .attr(
        "transform",
        `translate(0,${entries.length * barHeight})`,
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
      .attr("y", (d) => y(d.author)!)
      .attr("width", (d) => x(d.avgDays))
      .attr("height", y.bandwidth())
      .attr("fill", (d) => color(d.avgDays))
      .attr("rx", 4);

    g.selectAll(".author-label")
      .data(entries)
      .join("text")
      .attr("x", -8)
      .attr("y", (d) => y(d.author)! + y.bandwidth() / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", "#71717a")
      .style("font-size", "11px")
      .text((d) => d.author);

    g.selectAll(".value-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.avgDays) + 4)
      .attr("y", (d) => y(d.author)! + y.bandwidth() / 2)
      .attr("dominant-baseline", "central")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px")
      .text((d) => `${Math.round(d.avgDays)}d`);

    // X axis label
    g.append("text")
      .attr("x", width / 2)
      .attr("y", entries.length * barHeight + 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "11px")
      .text("Avg days");
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}

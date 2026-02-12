"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

const BUCKETS = [
  { label: "<1h", max: 1 },
  { label: "1-4h", max: 4 },
  { label: "4-8h", max: 8 },
  { label: "8-24h", max: 24 },
  { label: "1-3d", max: 72 },
  { label: "3-7d", max: 168 },
  { label: ">7d", max: Infinity },
];

function getBucket(durationMs: number): string {
  const hours = durationMs / (1000 * 60 * 60);
  for (const b of BUCKETS) {
    if (hours < b.max) return b.label;
  }
  return ">7d";
}

export function DurationDistribution({ data }: { data: PrMetric[] }) {
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

    const counts = new Map<string, number>();
    for (const b of BUCKETS) counts.set(b.label, 0);
    for (const d of data) {
      const bucket = getBucket(d.duration_ms!);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }

    const entries = BUCKETS.map((b) => ({
      label: b.label,
      count: counts.get(b.label)!,
    }));

    const x = d3
      .scaleBand()
      .domain(entries.map((d) => d.label))
      .range([0, width])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(entries, (d) => d.count)!])
      .nice()
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

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
      .attr("fill", "#f59e0b")
      .attr("rx", 3);

    // Count labels on top of bars
    g.selectAll(".count-label")
      .data(entries)
      .join("text")
      .attr("x", (d) => x(d.label)! + x.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px")
      .text((d) => (d.count > 0 ? d.count : ""));

    // Y axis label
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

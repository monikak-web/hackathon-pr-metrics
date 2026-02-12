"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric, ReviewStatus } from "@/lib/types";

const STATUS_ORDER: ReviewStatus[] = [
  "approved",
  "changes_requested",
  "pending",
];
const STATUS_LABELS: Record<ReviewStatus, string> = {
  approved: "Approved",
  changes_requested: "Changes Req.",
  pending: "Pending",
};
const STATUS_COLORS: Record<ReviewStatus, string> = {
  approved: "#22c55e",
  changes_requested: "#f97316",
  pending: "#a1a1aa",
};

export function ReviewStatusOverview({ data }: { data: PrMetric[] }) {
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

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", "0 0 600 300");

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Count statuses for both review types
    const qaCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.qa_review,
    );
    const devCounts = d3.rollup(
      data,
      (v) => v.length,
      (d) => d.dev_review,
    );

    const categories = ["QA Review", "Dev Review"];
    const entries = STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      qa: qaCounts.get(status) ?? 0,
      dev: devCounts.get(status) ?? 0,
    }));

    const x0 = d3
      .scaleBand()
      .domain(entries.map((d) => d.label))
      .range([0, width])
      .padding(0.2);

    const x1 = d3
      .scaleBand()
      .domain(categories)
      .range([0, x0.bandwidth()])
      .padding(0.1);

    const maxCount = d3.max(entries, (d) => Math.max(d.qa, d.dev))! || 1;
    const y = d3
      .scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([height, 0]);

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("fill", "#a1a1aa")
      .style("font-size", "10px");

    g.selectAll(".domain, .tick line").attr("stroke", "#e4e4e7");

    const barColors = ["#8b5cf6", "#06b6d4"];

    // Draw grouped bars
    const groups = g
      .selectAll(".status-group")
      .data(entries)
      .join("g")
      .attr("transform", (d) => `translate(${x0(d.label)},0)`);

    groups
      .selectAll("rect")
      .data((d) => [
        { category: "QA Review", count: d.qa },
        { category: "Dev Review", count: d.dev },
      ])
      .join("rect")
      .attr("x", (d) => x1(d.category)!)
      .attr("y", (d) => y(d.count))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height - y(d.count))
      .attr("fill", (_, i) => barColors[i])
      .attr("rx", 3);

    // Count labels
    groups
      .selectAll(".count-label")
      .data((d) => [
        { category: "QA Review", count: d.qa },
        { category: "Dev Review", count: d.dev },
      ])
      .join("text")
      .attr("x", (d) => x1(d.category)! + x1.bandwidth() / 2)
      .attr("y", (d) => y(d.count) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#71717a")
      .style("font-size", "9px")
      .text((d) => (d.count > 0 ? d.count : ""));

    // Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(${width - 150},${-10})`);

    categories.forEach((cat, i) => {
      const lg = legend
        .append("g")
        .attr("transform", `translate(${i * 90},0)`);
      lg.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("rx", 2)
        .attr("fill", barColors[i]);
      lg.append("text")
        .attr("x", 14)
        .attr("y", 9)
        .attr("fill", "#a1a1aa")
        .style("font-size", "10px")
        .text(cat);
    });
  }, [data]);

  return <svg ref={svgRef} className="w-full" />;
}
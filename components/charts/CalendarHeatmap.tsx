"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

export function CalendarHeatmap({ data }: { data: PrMetric[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (data.length === 0) {
      svg
        .attr("viewBox", "0 0 800 140")
        .append("text")
        .attr("x", 400)
        .attr("y", 70)
        .attr("text-anchor", "middle")
        .attr("fill", "#a1a1aa")
        .text("No data");
      return;
    }

    const cellSize = 13;
    const cellPad = 2;
    const margin = { top: 20, right: 10, bottom: 10, left: 30 };

    // Last 365 days
    const today = new Date();
    const yearAgo = d3.timeDay.offset(today, -364);

    // Count PRs per day
    const dayFormat = d3.timeFormat("%Y-%m-%d");
    const counts = d3.rollup(
      data,
      (v) => v.length,
      (d) => dayFormat(new Date(d.merged_at!)),
    );

    const days = d3.timeDays(yearAgo, d3.timeDay.offset(today, 1));
    const weeks = d3.timeWeeks(d3.timeWeek.floor(yearAgo), d3.timeDay.offset(today, 1));

    const width = weeks.length * (cellSize + cellPad) + margin.left + margin.right;
    const height = 7 * (cellSize + cellPad) + margin.top + margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxCount = d3.max(Array.from(counts.values())) ?? 1;
    const color = d3
      .scaleSequential(d3.interpolateGreens)
      .domain([0, maxCount]);

    // Day labels
    const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
    g.selectAll(".day-label")
      .data(dayLabels)
      .join("text")
      .attr("x", -4)
      .attr("y", (_, i) => i * (cellSize + cellPad) + cellSize / 2)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", "#a1a1aa")
      .style("font-size", "9px")
      .text((d) => d);

    // Tooltip
    const tooltip = d3
      .select(svgRef.current.parentElement!)
      .append("div")
      .attr(
        "class",
        "absolute hidden rounded bg-zinc-800 px-2 py-1 text-xs text-white pointer-events-none",
      );

    g.selectAll("rect")
      .data(days)
      .join("rect")
      .attr("x", (d) => {
        const weekIndex = d3.timeWeek.count(d3.timeWeek.floor(yearAgo), d);
        return weekIndex * (cellSize + cellPad);
      })
      .attr("y", (d) => d.getDay() * (cellSize + cellPad))
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("rx", 2)
      .attr("fill", (d) => {
        const count = counts.get(dayFormat(d)) ?? 0;
        return count === 0 ? "#f4f4f5" : color(count);
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseenter", (event, d) => {
        const count = counts.get(dayFormat(d)) ?? 0;
        tooltip
          .classed("hidden", false)
          .html(
            `<strong>${dayFormat(d)}</strong><br/>${count} PR${count !== 1 ? "s" : ""} merged`,
          )
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY - 10}px`);
      })
      .on("mouseleave", () => tooltip.classed("hidden", true));

    // Month labels
    const months = d3.timeMonths(yearAgo, today);
    g.selectAll(".month-label")
      .data(months)
      .join("text")
      .attr("x", (d) => {
        const weekIndex = d3.timeWeek.count(d3.timeWeek.floor(yearAgo), d);
        return weekIndex * (cellSize + cellPad);
      })
      .attr("y", -6)
      .attr("fill", "#a1a1aa")
      .style("font-size", "9px")
      .text((d) => d3.timeFormat("%b")(d));

    return () => {
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="relative overflow-x-auto">
      <svg ref={svgRef} className="w-full" />
    </div>
  );
}

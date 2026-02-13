"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { PrMetric } from "@/lib/types";

/** Simple linear regression: returns slope and intercept for y = slope * x + intercept */
function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0 };
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

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

    const margin = { top: 20, right: 72, bottom: 40, left: 60 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 600 300`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parsed = data
      .map((d) => ({
        date: new Date(d.merged_at!),
        days: d.duration_ms! / (1000 * 60 * 60 * 24),
        title: d.title,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const x = d3
      .scaleTime()
      .domain(d3.extent(parsed, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yMax = d3.max(parsed, (d) => d.days)!;
    const y = d3
      .scaleLinear()
      .domain([0, yMax])
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
      .text("Days");

    // Median line (horizontal)
    const medianDays = median(parsed.map((d) => d.days));
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", y(medianDays))
      .attr("y2", y(medianDays))
      .attr("stroke", "#4b983d")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "6 4")
      .attr("opacity", 0.9);
    g.append("text")
      .attr("x", width - 4)
      .attr("y", y(medianDays) - 6)
      .attr("text-anchor", "end")
      .attr("fill", "#387f35")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .text(`Median ${medianDays.toFixed(1)}d`);

    // Trend line (linear regression over time order)
    const regressionPoints = parsed.map((d, i) => ({ x: i, y: d.days }));
    const { slope, intercept } = linearRegression(regressionPoints);
    const trendData = parsed.map((d, i) => ({
      date: d.date,
      value: slope * i + intercept,
    }));
    const trendLine = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(Math.max(0, d.value)));
    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", "#ea580c")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "8 4")
      .attr("opacity", 0.95)
      .attr("d", trendLine);
    const trendLabel =
      slope > 0.1 ? "Trend ↗" : slope < -0.1 ? "Trend ↘" : "Trend →";
    const lastTrend = trendData[trendData.length - 1];
    if (lastTrend) {
      g.append("text")
        .attr("x", x(lastTrend.date))
        .attr("y", y(Math.max(0, lastTrend.value)) - 6)
        .attr("text-anchor", "end")
        .attr("dx", -4)
        .attr("fill", "#ea580c")
        .style("font-size", "10px")
        .style("font-weight", "500")
        .text(trendLabel);
    }

    // Main data line
    const line = d3
      .line<(typeof parsed)[0]>()
      .x((d) => x(d.date))
      .y((d) => y(d.days));

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
      .attr("cy", (d) => y(d.days))
      .attr("r", 3)
      .attr("fill", "#6366f1")
      .on("mouseenter", (event, d) => {
        tooltip
          .classed("hidden", false)
          .html(
            `<strong>${d.title}</strong><br/>${d.days.toFixed(1)}d — ${d.date.toLocaleDateString()}`,
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

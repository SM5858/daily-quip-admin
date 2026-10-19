"use client";

import { useState } from "react";

/**
 * Chart colours. Slots 1 and 2 of the reference categorical palette, re-checked
 * against this app's own surfaces with the data-viz validator:
 * light #2a78d6 / #eb6834 on #ffffff, dark #3987e5 / #d95926 on #13151d —
 * all five checks pass in both modes (worst all-pairs CVD ΔE 24.7 / 26.8).
 */
const SERIES = ["var(--series-1)", "var(--series-2)"];

function niceMax(value: number) {
  if (value <= 5) return Math.max(1, value);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/** Column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

type Tip = { x: number; y: number; lines: string[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: `${tip.x}%`, top: `${tip.y}%` }}
    >
      {tip.lines.map((line, index) => (
        <div key={index} className={index === 0 ? "font-semibold" : "text-muted"}>
          {line}
        </div>
      ))}
    </div>
  );
}

function Legend({ labels }: { labels: string[] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
      {labels.map((label, index) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: SERIES[index] }}
            aria-hidden="true"
          />
          {label}
        </span>
      ))}
    </div>
  );
}

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 32 };

function Grid({ max, ticks }: { max: number; ticks: number[] }) {
  const plotH = H - PAD.top - PAD.bottom;
  return (
    <g>
      {ticks.map((tick) => {
        const y = PAD.top + plotH - (tick / max) * plotH;
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--muted)"
            >
              {tick}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Two series side by side over time. One axis — never two scales. */
export function GroupedColumns({
  data,
  labels,
  seriesLabels,
}: {
  data: { key: string; values: [number, number] }[];
  labels: string[];
  seriesLabels: [string, string];
}) {
  const [tip, setTip] = useState<Tip>(null);

  const max = niceMax(
    Math.max(1, ...data.flatMap((row) => row.values))
  );
  const ticks = [0, max / 2, max].map((t) => Math.round(t));
  const plotH = H - PAD.top - PAD.bottom;
  const band = (W - PAD.left - PAD.right) / Math.max(1, data.length);
  const barW = Math.min(24, (band - 10) / 2 - 1); // 2px surface gap inside the pair

  return (
    <div className="relative">
      <Legend labels={seriesLabels} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${seriesLabels[0]} and ${seriesLabels[1]} per day`}
      >
        <Grid max={max} ticks={[...new Set(ticks)]} />
        {data.map((row, index) => {
          const groupX = PAD.left + band * index + band / 2;
          return (
            <g key={row.key}>
              {row.values.map((value, series) => {
                const h = (value / max) * plotH;
                const x = groupX - barW - 1 + series * (barW + 2);
                const y = PAD.top + plotH - h;
                return (
                  <path
                    key={series}
                    d={columnPath(x, y, barW, h)}
                    fill={SERIES[series]}
                    onMouseEnter={() =>
                      setTip({
                        x: ((x + barW / 2) / W) * 100,
                        y: (y / H) * 100,
                        lines: [
                          labels[index],
                          `${seriesLabels[0]}: ${row.values[0]}`,
                          `${seriesLabels[1]}: ${row.values[1]}`,
                        ],
                      })
                    }
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
              <text
                x={groupX}
                y={H - 8}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
              >
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/** One series — no legend box; the card title names it. */
export function Columns({
  data,
  highlight,
}: {
  data: { key: string; label: string; value: number }[];
  highlight?: string;
}) {
  const [tip, setTip] = useState<Tip>(null);

  const max = niceMax(Math.max(1, ...data.map((row) => row.value)));
  const ticks = [...new Set([0, Math.round(max / 2), max])];
  const plotH = H - PAD.top - PAD.bottom;
  const band = (W - PAD.left - PAD.right) / Math.max(1, data.length);
  const barW = Math.min(24, band - 2);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        <Grid max={max} ticks={ticks} />
        {data.map((row, index) => {
          const h = (row.value / max) * plotH;
          const x = PAD.left + band * index + (band - barW) / 2;
          const y = PAD.top + plotH - h;
          return (
            <g key={row.key}>
              <path
                d={columnPath(x, y, barW, h)}
                fill={SERIES[0]}
                opacity={highlight && highlight !== row.key ? 0.55 : 1}
                onMouseEnter={() =>
                  setTip({
                    x: ((x + barW / 2) / W) * 100,
                    y: (y / H) * 100,
                    lines: [row.label, `${row.value}`],
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
              {index % Math.ceil(data.length / 12) === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {row.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

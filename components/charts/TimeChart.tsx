"use client";

import { useEffect, useRef, useState } from "react";

export type Row = { label: string; value: string; color?: string };
export type Datum = {
  x: string; // short axis label
  title: string; // tooltip heading
  subtitle?: string;
  values: (number | null)[]; // one number per series
  rows: Row[]; // tooltip lines
  color?: string; // overrides the series color (bar charts, e.g. red for a failed run)
};
export type LegendItem = { name: string; color: string; dashed?: boolean };

type Props = {
  kind: "bar" | "stack" | "line";
  data: Datum[];
  colors: string[]; // one color per series
  slots?: number; // total columns; data is right-aligned (newest on the right)
  height?: number;
  unit?: string; // small label above the y axis
  yFormat: (n: number) => string;
  integer?: boolean; // y axis ticks are whole numbers
  avg?: { value: number; label: string } | null;
  legend?: LegendItem[];
  ariaLabel: string;
  empty?: string;
};

const M = { l: 48, r: 12, t: 24, b: 26 };

function niceScale(max: number, integer?: boolean) {
  const ticks = 4;
  if (!(max > 0)) return { max: integer ? ticks : 1, step: integer ? 1 : 0.25 };
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  let step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(1, Math.ceil(step));
  return { max: Math.ceil(max / step) * step, step };
}

function topRounded(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export default function TimeChart({ kind, data, colors, slots, height = 190, unit, yFormat, integer, avg, legend, ariaLabel, empty }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  if (data.length === 0) return <p className="chart-empty">{empty ?? "Nothing to show yet."}</p>;

  const total = Math.max(slots ?? data.length, data.length);
  const offset = total - data.length;
  const plotW = width - M.l - M.r;
  const plotH = height - M.t - M.b;
  const step = plotW / total;
  const gap = step > 18 ? 4 : step > 9 ? 3 : 2;
  const barW = Math.min(30, Math.max(2, step - gap));

  const sums = data.map((d) => (kind === "stack" ? d.values.reduce<number>((a, v) => a + (v ?? 0), 0) : Math.max(...d.values.map((v) => v ?? 0), 0)));
  const rawMax = Math.max(...sums, avg?.value ?? 0, 0);
  const sc = niceScale(rawMax * 1.04, integer);
  const yOf = (v: number) => M.t + plotH - (v / sc.max) * plotH;
  const cx = (i: number) => M.l + (offset + i + 0.5) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= sc.max + sc.step / 2; v += sc.step) ticks.push(v);

  // x labels: first, middle, last
  const xs = new Set<number>([0, Math.floor((data.length - 1) / 2), data.length - 1]);
  if (data.length < 3) xs.clear(), data.forEach((_, i) => xs.add(i));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - box.left) / (box.width / total)) - offset;
    setHover(i >= 0 && i < data.length ? i : null);
  }

  const active = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? cx(hover) : 0;
  const flip = tipLeft > width * 0.58;

  // line paths (one per series; a gap in the data breaks the line)
  const linePaths = kind === "line" ? colors.map((_, s) => {
    let d = "";
    let pen = false;
    data.forEach((p, i) => {
      const v = p.values[s];
      if (v === null || v === undefined) { pen = false; return; }
      d += `${pen ? "L" : "M"}${cx(i).toFixed(1)},${yOf(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }) : [];

  return (
    <div className="tchart" ref={wrap}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel} onPointerLeave={() => setHover(null)}>
        {unit && (
          <text x={M.l} y={12} className="tc-unit">
            {unit}
          </text>
        )}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={width - M.r} y1={yOf(v)} y2={yOf(v)} className={v === 0 ? "tc-base" : "tc-grid"} />
            <text x={M.l - 8} y={yOf(v) + 4} textAnchor="end" className="tc-tick">
              {yFormat(v)}
            </text>
          </g>
        ))}

        {hover !== null && kind !== "line" && (
          <rect x={M.l + (offset + hover) * step} y={M.t} width={step} height={plotH} className="tc-hl" />
        )}

        {kind !== "line" &&
          data.map((d, i) => {
            const x = cx(i) - barW / 2;
            const dim = hover !== null && hover !== i ? 0.55 : 1;
            if (kind === "bar") {
              const v = d.values[0];
              if (v === null || v === undefined) return null;
              const h = Math.max(3, plotH - (yOf(v) - M.t));
              return <path key={i} d={topRounded(x, M.t + plotH - h, barW, h, 3)} style={{ fill: d.color ?? colors[0], opacity: dim }} />;
            }
            // stacked: bottom series first
            let base = 0;
            const last = d.values.reduce<number>((a, v, k) => ((v ?? 0) > 0 ? k : a), -1);
            return (
              <g key={i} style={{ opacity: dim }}>
                {d.values.map((v, k) => {
                  const val = v ?? 0;
                  if (val <= 0) return null;
                  const y0 = yOf(base);
                  base += val;
                  const y1 = yOf(base);
                  const h = Math.max(2, y0 - y1);
                  const top = k === last;
                  return top ? (
                    <path key={k} d={topRounded(x, y0 - h, barW, h, 3)} style={{ fill: colors[k], stroke: "var(--surface)", strokeWidth: 1.5 }} />
                  ) : (
                    <rect key={k} x={x} y={y0 - h} width={barW} height={h} style={{ fill: colors[k], stroke: "var(--surface)", strokeWidth: 1.5 }} />
                  );
                })}
              </g>
            );
          })}

        {kind === "line" && (
          <>
            {hover !== null && <line x1={cx(hover)} x2={cx(hover)} y1={M.t} y2={M.t + plotH} className="tc-cross" />}
            {linePaths.map((d, s) => (
              <path key={s} d={d} fill="none" style={{ stroke: colors[s] }} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {colors.map((c, s) =>
              data.map((p, i) => {
                const v = p.values[s];
                if (v === null || v === undefined) return null;
                const on = hover === i;
                if (!on && data.length > 30) return null;
                return <circle key={`${s}-${i}`} cx={cx(i)} cy={yOf(v)} r={on ? 5 : 3} style={{ fill: c, stroke: "var(--surface)", strokeWidth: 2 }} />;
              })
            )}
          </>
        )}

        {avg && (
          <g>
            <line x1={M.l} x2={width - M.r} y1={yOf(avg.value)} y2={yOf(avg.value)} className="tc-avg" />
            <text x={width - M.r} y={yOf(avg.value) - 5} textAnchor="end" className="tc-avglabel">
              {avg.label}
            </text>
          </g>
        )}

        {data.map((d, i) =>
          xs.has(i) ? (
            <text key={i} x={cx(i)} y={height - 7} textAnchor={i === 0 && data.length > 2 ? "start" : i === data.length - 1 && data.length > 2 ? "end" : "middle"} className="tc-xlabel">
              {d.x}
            </text>
          ) : null
        )}

        <rect x={M.l} y={M.t} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} />
      </svg>

      {active && (
        <div className="tc-tip" style={{ left: tipLeft, top: M.t + 6, transform: flip ? "translateX(calc(-100% - 14px))" : "translateX(14px)" }}>
          <div className="tc-tip-title">{active.title}</div>
          {active.subtitle && <div className="tc-tip-sub">{active.subtitle}</div>}
          <div className="tc-tip-rows">
            {active.rows.map((r) => (
              <div key={r.label} className="tc-tip-row">
                {r.color && <i style={{ background: r.color }} />}
                <span>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {legend && legend.length > 0 && (
        <div className="tc-legend">
          {legend.map((l) => (
            <span key={l.name}>
              {l.dashed ? <i className="dash" /> : <i style={{ background: l.color }} />}
              {l.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

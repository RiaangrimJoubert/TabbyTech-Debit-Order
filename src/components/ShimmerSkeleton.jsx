/**
 * Shared shimmer / skeleton loading components used across all pages.
 * Import whichever variant fits the page layout.
 */

const shimmerStyle = (delay = 0, width = "100%", height = 14) => ({
  width,
  height,
  borderRadius: 6,
  background: "rgba(255,255,255,0.10)",
  animation: "tt-shimmer 1.4s ease-in-out infinite",
  animationDelay: `${delay}s`,
  display: "inline-block",
});

/** Keyframe injection — call once at top of each file */
export const ShimmerCSS = () => (
  <style>{`
    @keyframes tt-shimmer {
      0%   { opacity: 0.35; }
      50%  { opacity: 0.80; }
      100% { opacity: 0.35; }
    }
  `}</style>
);

/**
 * Table skeleton rows — renders `rows` placeholder <tr> elements
 * with `cols` shimmer cells. Use inside a <tbody>.
 */
export function ShimmerTableRows({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ pointerEvents: "none" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: "12px 16px" }}>
              <span style={shimmerStyle(i * 0.08 + j * 0.03, j === 0 ? "70%" : "85%")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Card / panel skeleton — renders stacked key-value shimmer rows.
 * Use inside any panel / card area.
 */
export function ShimmerPanel({ rows = 6 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={shimmerStyle(i * 0.1, 110, 14)} />
          <span style={{ ...shimmerStyle(i * 0.1 + 0.07, "100%", 14), flex: 1 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Full-width block skeleton — a simple stacked block shimmer.
 * Use in page-level loading states.
 */
export function ShimmerBlock({ lines = 4 }) {
  const widths = ["80%", "65%", "90%", "55%", "75%", "60%"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "32px 24px" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <span key={i} style={shimmerStyle(i * 0.1, widths[i % widths.length], 16)} />
      ))}
    </div>
  );
}

/**
 * Metric card skeleton — use inside metric card grids.
 */
export function ShimmerMetricCards({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span style={shimmerStyle(i * 0.1, "50%", 12)} />
          <span style={shimmerStyle(i * 0.1 + 0.05, "70%", 28)} />
          <span style={shimmerStyle(i * 0.1 + 0.1, "40%", 12)} />
        </div>
      ))}
    </>
  );
}

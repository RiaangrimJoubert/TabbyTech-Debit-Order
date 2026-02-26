// Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";

const LS = {
  search: "tabbytech.dashboard.search",
  range: "tabbytech.dashboard.range",
  subView: "tabbytech.dashboard.subView",
  metric: "tabbytech.dashboard.metric",
  batch: "tabbytech.dashboard.batch",
};

function useLocalStorageState(key, initialValue) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initialValue : JSON.parse(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);

  return [val, setVal];
}

function formatZAR(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(num);
}

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

// SVG Icons as components
const IconFileInvoice = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const IconRedo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>
);

const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"></path>
    <path d="M4 6v12c0 1.1.9 2 2 2h14v-4"></path>
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"></path>
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconEnvelope = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const IconArrowRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const IconExclamation = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const IconPaperPlane = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const IconAlert = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const IconArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

// SVG Line Chart Component
function LineChart({ data }) {
  const width = 600;
  const height = 250;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...data.flatMap(d => [d.successful, d.failed, d.retry]));
  const minValue = 0;

  const getX = (index) => padding + (index / (data.length - 1)) * chartWidth;
  const getY = (value) => padding + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  const createPath = (key) => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`).join(' ');
  };

  const createArea = (key) => {
    const path = createPath(key);
    const closePath = `L ${getX(data.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`;
    return (
      <path
        d={`${path} ${closePath}`}
        fill={`url(#gradient-${key})`}
        opacity="0.2"
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="gradient-successful" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gradient-failed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gradient-retry" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map(i => (
        <line
          key={i}
          x1={padding}
          y1={padding + (chartHeight * i) / 4}
          x2={width - padding}
          y2={padding + (chartHeight * i) / 4}
          stroke="rgba(139, 92, 246, 0.1)"
          strokeDasharray="3,3"
        />
      ))}

      {/* Areas */}
      {createArea('successful')}
      {createArea('failed')}
      {createArea('retry')}

      {/* Lines */}
      <path d={createPath('successful')} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={createPath('failed')} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={createPath('retry')} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Data points */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.successful)} r="4" fill="#10b981" stroke="#0a0a0f" strokeWidth="2"/>
          <circle cx={getX(i)} cy={getY(d.failed)} r="3" fill="#ef4444" stroke="#0a0a0f" strokeWidth="2"/>
          <circle cx={getX(i)} cy={getY(d.retry)} r="3" fill="#8b5cf6" stroke="#0a0a0f" strokeWidth="2"/>
        </g>
      ))}

      {/* X Axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={getX(i)}
          y={height - 10}
          textAnchor="middle"
          fill="#6b7280"
          fontSize="10"
        >
          {d.time}
        </text>
      ))}

      {/* Y Axis labels */}
      {[0, 100, 200, 300].map((val, i) => (
        <text
          key={i}
          x={padding - 10}
          y={getY(val) + 4}
          textAnchor="end"
          fill="#6b7280"
          fontSize="10"
        >
          {val}
        </text>
      ))}
    </svg>
  );
}

// SVG Donut Chart Component
function DonutChart({ data }) {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 50;
  
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;

  const createArc = (value, color, index) => {
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = [
      `M ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${center + innerRadius * Math.cos(endRad)} ${center + innerRadius * Math.sin(endRad)}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${center + innerRadius * Math.cos(startRad)} ${center + innerRadius * Math.sin(startRad)}`,
      'Z'
    ].join(' ');

    return <path key={index} d={path} fill={color} stroke="#0a0a0f" strokeWidth="2"/>;
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '12rem', height: '12rem', transform: 'rotate(-90deg)' }}>
        {data.map((item, index) => createArc(item.value, item.color, index))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white' }}>23</div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Total</div>
      </div>
    </div>
  );
}

// SVG Bar Chart Component
function BarChart({ data }) {
  const width = 400;
  const height = 150;
  const padding = 30;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / data.length / 3;
  const maxValue = Math.max(...data.flatMap(d => [d.sent, d.opened]));

  const getX = (index, offset) => padding + (index * chartWidth) / data.length + offset * barWidth + barWidth / 2;
  const getY = (value) => padding + chartHeight - (value / maxValue) * chartHeight;
  const getHeight = (value) => (value / maxValue) * chartHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
      {/* Grid lines */}
      {[0, 1, 2, 3].map(i => (
        <line
          key={i}
          x1={padding}
          y1={padding + (chartHeight * i) / 3}
          x2={width - padding}
          y2={padding + (chartHeight * i) / 3}
          stroke="rgba(139, 92, 246, 0.1)"
          strokeDasharray="3,3"
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => (
        <g key={i}>
          <rect
            x={getX(i, 0) - barWidth / 4}
            y={getY(d.sent)}
            width={barWidth / 2}
            height={getHeight(d.sent)}
            fill="rgba(139, 92, 246, 0.6)"
            rx="2"
          />
          <rect
            x={getX(i, 1) - barWidth / 4}
            y={getY(d.opened)}
            width={barWidth / 2}
            height={getHeight(d.opened)}
            fill="rgba(59, 130, 246, 0.6)"
            rx="2"
          />
        </g>
      ))}

      {/* X Axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={getX(i, 0.5)}
          y={height - 5}
          textAnchor="middle"
          fill="#6b7280"
          fontSize="10"
        >
          {d.day}
        </text>
      ))}
    </svg>
  );
}

function Card({ children, className = "", glow = false }) {
  return (
    <div className={cx("glass-panel", glow && "glow-border", className)}>
      {children}
    </div>
  );
}

function StatusBadge({ status, children }) {
  const styles = {
    running: { background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' },
    queued: { background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.2)' },
    active: { background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' },
    failed: { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' },
    draft: { background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' },
    exported: { background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)' },
    sent: { background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)' },
  };
  
  const style = styles[status] || styles.draft;
  
  return (
    <span style={{ 
      padding: '0.25rem 0.75rem', 
      borderRadius: '9999px', 
      fontSize: '0.75rem', 
      fontWeight: 600,
      ...style
    }}>
      {children}
    </span>
  );
}

function MetricCard({ title, value, subtext, trend, trendUp, icon: Icon, color = "purple" }) {
  const colorClasses = {
    purple: { gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.05))', text: '#a78bfa' },
    green: { gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.05))', text: '#4ade80' },
    orange: { gradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))', text: '#fb923c' },
    blue: { gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.05))', text: '#60a5fa' },
  };

  const colors = colorClasses[color];

  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        padding: '0.75rem', 
        borderBottomLeftRadius: '1rem',
        background: colors.gradient,
        color: colors.text
      }}>
        <Icon />
      </div>
      
      <div style={{ position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem', letterSpacing: '-0.025em' }}>{value}</h3>
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{subtext}</p>
        
        {trend && (
          <div style={{ 
            marginTop: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem', 
            fontSize: '0.75rem',
            color: trendUp ? '#4ade80' : '#f87171'
          }}>
            {trendUp ? <IconArrowUp /> : <IconArrowDown />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      
      {color === "purple" && (
        <div style={{
          position: 'absolute',
          bottom: '-2.5rem',
          right: '-2.5rem',
          width: '8rem',
          height: '8rem',
          background: 'rgba(139, 92, 246, 0.1)',
          borderRadius: '50%',
          filter: 'blur(24px)'
        }}></div>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const [search, setSearch] = useLocalStorageState(LS.search, "");
  const [range, setRange] = useLocalStorageState(LS.range, "24h");
  const [subView, setSubView] = useLocalStorageState(LS.subView, "monthly");
  const [metric, setMetric] = useLocalStorageState(LS.metric, "revenue");
  const [selectedBatch, setSelectedBatch] = useLocalStorageState(LS.batch, "FEB-03-PM");

  const data = useMemo(() => {
    return {
      top: {
        activeDebitOrders: 1284,
        successRate: 942,
        failedRetry: 23,
        collectionsMTD: 482910,
        scheduledTotal: 520000,
      },
      monthlyActive: 86,
      annualActive: 19,
      monthlyMRR: 129900,
      annualARR: 228000,
      recentBatches: [
        { batch: "FEB-05-AM", status: "draft", items: 112 },
        { batch: "FEB-03-PM", status: "exported", items: 98 },
        { batch: "JAN-29-AM", status: "sent", items: 141 },
      ],
    };
  }, []);

  const debitPerformanceData = [
    { time: "00:00", successful: 45, failed: 12, retry: 5 },
    { time: "04:00", successful: 52, failed: 8, retry: 3 },
    { time: "08:00", successful: 89, failed: 15, retry: 8 },
    { time: "12:00", successful: 134, failed: 22, retry: 12 },
    { time: "16:00", successful: 156, failed: 18, retry: 15 },
    { time: "20:00", successful: 178, failed: 14, retry: 19 },
    { time: "Now", successful: 192, failed: 11, retry: 23 },
  ];

  const retryDistributionData = [
    { name: "Immediate", value: 45, color: "#10b981" },
    { name: "24H Delay", value: 30, color: "#f59e0b" },
    { name: "48H+ Delay", value: 25, color: "#ef4444" },
  ];

  const emailData = [
    { day: "Mon", sent: 120, opened: 80 },
    { day: "Tue", sent: 190, opened: 120 },
    { day: "Wed", sent: 150, opened: 100 },
    { day: "Thu", sent: 220, opened: 140 },
    { day: "Fri", sent: 180, opened: 110 },
    { day: "Sat", sent: 90, opened: 50 },
    { day: "Sun", sent: 110, opened: 70 },
  ];

  const cronJobs = [
    { 
      id: 1, 
      name: "Debit Order Batch", 
      schedule: "*/5 * * * *", 
      status: "running", 
      lastRun: "2 mins ago",
      progress: 75 
    },
    { 
      id: 2, 
      name: "Retry Scheduler", 
      schedule: "0 8 * * *", 
      status: "queued", 
      lastRun: "Fri 08:00",
      queued: 112,
      progress: 25 
    },
    { 
      id: 3, 
      name: "Reconciliation", 
      schedule: "0 */6 * * *", 
      status: "active", 
      lastRun: "1 hour ago",
      progress: 100 
    },
    { 
      id: 4, 
      name: "Failed Payment Cleanup", 
      schedule: "0 2 * * *", 
      status: "failed", 
      lastRun: "Failed 10 mins ago",
      error: "Database connection timeout",
      progress: 0 
    },
  ];

  const filteredBatches = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return data.recentBatches;
    return data.recentBatches.filter((b) => 
      b.batch.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0f', 
      color: '#d1d5db', 
      padding: '2rem',
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        
        .glass-panel {
          background: linear-gradient(145deg, rgba(26, 26, 46, 0.6) 0%, rgba(18, 18, 31, 0.8) 100%);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
        }
        
        .glass-panel:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 40px rgba(139, 92, 246, 0.15);
        }
        
        .glow-border {
          position: relative;
        }
        
        .glow-border::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 20px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), transparent, rgba(168, 85, 247, 0.1));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        
        .cron-indicator {
          position: relative;
          overflow: hidden;
        }
        
        .cron-indicator::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          100% { left: 100%; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem', letterSpacing: '-0.025em' }}>Dashboard Overview</h2>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Real-time monitoring and analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search orders, batches..." 
              style={{
                backgroundColor: '#12121f',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.625rem 1rem 0.625rem 2.5rem',
                fontSize: '0.875rem',
                color: '#d1d5db',
                width: '16rem',
                outline: 'none'
              }}
            />
            <div style={{ position: 'absolute', left: '0.875rem', top: '0.75rem', color: '#6b7280' }}>
              <IconSearch />
            </div>
          </div>
          <button style={{
            position: 'relative',
            padding: '0.625rem',
            borderRadius: '0.75rem',
            backgroundColor: '#12121f',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: '#9ca3af',
            cursor: 'pointer'
          }}>
            <IconBell />
            <span style={{
              position: 'absolute',
              top: '0.375rem',
              right: '0.5rem',
              width: '0.5rem',
              height: '0.5rem',
              backgroundColor: '#ef4444',
              borderRadius: '50%'
            }}></span>
          </button>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#4ade80',
            fontSize: '0.875rem'
          }}>
            <span className="animate-pulse" style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
            Live
          </div>
        </div>
      </header>

      {/* Top Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <MetricCard 
          title="Active Debit Orders"
          value="1,289"
          subtext="1,180 Running"
          trend="12%"
          trendUp={true}
          icon={IconFileInvoice}
          color="purple"
        />
        
        <MetricCard 
          title="Success Rate"
          value="942"
          subtext="Successful transactions"
          trend="4.2%"
          trendUp={true}
          icon={IconCheckCircle}
          color="green"
        />
        
        <MetricCard 
          title="Failed (Retry Scheduled)"
          value="23"
          subtext="Next retry: 08:00"
          trend="Needs Attention"
          trendUp={false}
          icon={IconRedo}
          color="orange"
        />
        
        <MetricCard 
          title="Collections (MTD)"
          value="482,910"
          subtext="Scheduled Total R 520,000"
          trend="8.4%"
          trendUp={true}
          icon={IconWallet}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {/* Main Performance Chart */}
        <Card style={{ gridColumn: 'span 2', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>Debit Order Performance</h3>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Success vs Failed vs Retry Schedule</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {["24H", "7D", "30D"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r.toLowerCase())}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: range === r.toLowerCase() ? '#8b5cf6' : '#12121f',
                    color: range === r.toLowerCase() ? 'white' : '#9ca3af'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ height: '300px' }}>
            <LineChart data={debitPerformanceData} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Successful</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Failed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></div>
              <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Scheduled Retry</span>
            </div>
          </div>
        </Card>

        {/* Retry Distribution */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>Retry Distribution</h3>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1.5rem' }}>Scheduled retry timeline</p>
          
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <DonutChart data={retryDistributionData} />
          </div>
          
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {retryDistributionData.map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: item.color }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{item.name}</span>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cron & ZeptoMail Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {/* Cron Job Monitor */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.5rem', 
                borderRadius: '0.5rem', 
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                color: '#a78bfa'
              }}>
                <IconClock />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>Cron Job Monitor</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Real-time job execution status</p>
              </div>
            </div>
            <button style={{ 
              fontSize: '0.875rem', 
              color: '#a78bfa', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}>
              View All <IconArrowRight />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cronJobs.map((job) => (
              <div 
                key={job.id} 
                className="cron-indicator"
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: `1px solid ${job.status === 'failed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.1)'}`,
                  backgroundColor: job.status === 'failed' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(18, 18, 31, 0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      borderRadius: '50%',
                      backgroundColor: job.status === 'running' || job.status === 'active' ? '#22c55e' : job.status === 'queued' ? '#eab308' : '#ef4444',
                      animation: (job.status === 'running' || job.status === 'failed') ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                    }}></div>
                    <div>
                      <p style={{ fontWeight: 600, color: 'white' }}>{job.name}</p>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{job.schedule}</p>
                    </div>
                  </div>
                  <StatusBadge status={job.status}>
                    {job.status === "running" ? "Running" : 
                     job.status === "queued" ? `Queued (${job.queued})` :
                     job.status === "failed" ? "Failed" : "Active"}
                  </StatusBadge>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  <span>Last run: {job.lastRun}</span>
                  {job.status === "failed" ? (
                    <button style={{ color: '#f87171', fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer' }}>Retry Now</button>
                  ) : (
                    <span style={{ color: job.status === "running" ? '#4ade80' : '#6b7280', fontSize: '0.75rem' }}>
                      {job.status === "running" ? "Success" : ""}
                    </span>
                  )}
                </div>
                
                <div style={{ height: '0.25rem', backgroundColor: '#374151', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{
                      height: '100%',
                      borderRadius: '9999px',
                      transition: 'all 0.5s ease',
                      width: `${job.progress}%`,
                      background: job.status === 'failed' ? '#ef4444' : 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                    }}
                  ></div>
                </div>
                
                {job.error && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconExclamation />
                    {job.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ZeptoMail Tracker */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                padding: '0.5rem', 
                borderRadius: '0.5rem', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#60a5fa'
              }}>
                <IconEnvelope />
              </div>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>ZeptoMail Tracker</h3>
                <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Email delivery analytics</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="animate-pulse" style={{ width: '0.5rem', height: '0.5rem', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
              <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>Live</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'rgba(18, 18, 31, 0.5)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>1,245</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Sent</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80', marginBottom: '0.25rem' }}>98.2%</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Delivered</div>
            </div>
            <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '0.25rem' }}>42%</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Opened</div>
            </div>
          </div>

          <div style={{ height: '150px' }}>
            <BarChart data={emailData} />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(18, 18, 31, 0.3)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPaperPlane />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>Debit Order Confirmations</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sent 2 mins ago</p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>Delivered</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(18, 18, 31, 0.3)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconAlert />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>Failed Payment Alerts</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sent 15 mins ago</p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>Opened</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(18, 18, 31, 0.3)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconClose />
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>Retry Notifications</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sent 1 hour ago</p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>Bounced</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Original TabbyTech Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {/* Today's Workflow */}
        <Card style={{ gridColumn: 'span 2', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>Today's Workflow</h3>
            <select style={{
              backgroundColor: '#12121f',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.75rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              color: '#d1d5db'
            }}>
              <option>Subscription tracking</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem', 
              borderRadius: '0.75rem', 
              backgroundColor: 'rgba(18, 18, 31, 0.5)', 
              border: '1px solid rgba(139, 92, 246, 0.1)',
              transition: 'all 0.3s ease'
            }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Review exceptions</h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Prioritise failed deductions and follow ups</p>
              </div>
              <button style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#1a1a2e',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: '1px solid rgba(139, 92, 246, 0.2)',
                cursor: 'pointer'
              }}>
                Open
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem', 
              borderRadius: '0.75rem', 
              backgroundColor: 'rgba(18, 18, 31, 0.5)', 
              border: '1px solid rgba(139, 92, 246, 0.1)',
              transition: 'all 0.3s ease'
            }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Prepare next batch</h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Validate and queue debit orders for the next run</p>
              </div>
              <button style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)'
              }}>
                Start
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '1rem', 
              borderRadius: '0.75rem', 
              backgroundColor: 'rgba(18, 18, 31, 0.5)', 
              border: '1px solid rgba(139, 92, 246, 0.1)',
              transition: 'all 0.3s ease'
            }}>
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Export bank files</h4>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Generate bank ready exports from approved batches</p>
              </div>
              <button style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: '#1a1a2e',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: '1px solid rgba(139, 92, 246, 0.2)',
                cursor: 'pointer'
              }}>
                Export
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.1)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem' }}>Subscription tracking</h4>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <select style={{
                backgroundColor: '#12121f',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.625rem',
                fontSize: '0.875rem',
                color: '#d1d5db'
              }}>
                <option>Monthly only</option>
              </select>
              <select style={{
                backgroundColor: '#12121f',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.625rem',
                fontSize: '0.875rem',
                color: '#d1d5db'
              }}>
                <option>Last 30 days</option>
              </select>
              <select style={{
                backgroundColor: '#12121f',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.625rem',
                fontSize: '0.875rem',
                color: '#d1d5db'
              }}>
                <option>By revenue</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.2)' }}>New 7d: 6</span>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Churn 7d: 2</span>
              </div>
              <button style={{ fontSize: '0.75rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>
                Paystack settings
              </button>
            </div>
          </div>
        </Card>

        {/* Recent Batches */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white' }}>Recent Batches</h3>
            <select 
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              style={{
                backgroundColor: '#12121f',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.75rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                color: '#d1d5db'
              }}
            >
              {data.recentBatches.map((b) => (
                <option key={b.batch} value={b.batch}>{b.batch}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Batch</th>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500 }}>Status</th>
                  <th style={{ paddingBottom: '0.75rem', fontWeight: 500, textAlign: 'right' }}>Items</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {filteredBatches.map((b) => (
                  <tr 
                    key={b.batch} 
                    style={{
                      borderBottom: '1px solid rgba(139, 92, 246, 0.05)',
                      cursor: 'pointer',
                      backgroundColor: selectedBatch === b.batch ? 'rgba(139, 92, 246, 0.05)' : 'transparent'
                    }}
                    onClick={() => setSelectedBatch(b.batch)}
                  >
                    <td style={{ padding: '0.75rem 0', color: 'white', fontWeight: 500, fontSize: '0.75rem' }}>{b.batch}</td>
                    <td style={{ padding: '0.75rem 0' }}>
                      <StatusBadge status={b.status}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </StatusBadge>
                    </td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', color: 'white', fontWeight: 500 }}>{b.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(18, 18, 31, 0.3)', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'white', marginBottom: '0.25rem' }}>Selected: {selectedBatch}</p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>UI-only actions. Will wire to batch workflows later.</p>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Type to filter batches" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#0a0a0f',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  color: '#d1d5db'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.75rem',
                backgroundColor: '#1a1a2e',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: '1px solid rgba(139, 92, 246, 0.2)',
                cursor: 'pointer'
              }}>
                View
              </button>
              <button style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.75rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer'
              }}>
                Export
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem', 
        marginTop: '1.5rem' 
      }}>
        <Card style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Monthly MRR</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{formatZAR(data.monthlyMRR)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Active {data.monthlyActive} • Churn 7d: 2</p>
        </Card>

        <Card style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Annual ARR</p>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '0.25rem' }}>{formatZAR(data.annualARR * 12 + data.monthlyMRR * 12)}</h3>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>View monthly • 11 only</p>
        </Card>
      </div>
    </div>
  );
}

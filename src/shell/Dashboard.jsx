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

  const createArea = (key, color) => {
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
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
    <div className="relative flex items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 transform -rotate-90">
        {data.map((item, index) => createArc(item.value, item.color, index))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="text-3xl font-bold text-white">23</div>
        <div className="text-xs text-gray-400">Total</div>
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
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
    running: "bg-green-500/10 text-green-400 border-green-500/20",
    queued: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    draft: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    exported: "bg-green-500/10 text-green-400 border-green-500/20",
    sent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  
  return (
    <span className={cx("px-2.5 py-1 rounded-full text-xs font-semibold border", styles[status] || styles.draft)}>
      {children}
    </span>
  );
}

function MetricCard({ title, value, subtext, trend, trendUp, icon: Icon, color = "purple" }) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-600/5 text-purple-400",
    green: "from-green-500/20 to-green-600/5 text-green-400",
    orange: "from-orange-500/20 to-orange-600/5 text-orange-400",
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
  };

  return (
    <Card className="p-6 relative overflow-hidden group">
      <div className={cx("absolute top-0 right-0 p-3 rounded-bl-2xl bg-gradient-to-br", colorClasses[color])}>
        <Icon size={20} />
      </div>
      
      <div className="relative z-10">
        <p className="text-sm text-gray-400 mb-2">{title}</p>
        <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</h3>
        <p className="text-xs text-gray-500">{subtext}</p>
        
        {trend && (
          <div className={cx("mt-3 flex items-center gap-1 text-xs", trendUp ? "text-green-400" : "text-red-400")}>
            <i className={cx("fas", trendUp ? "fa-arrow-up" : "fa-arrow-down")}></i>
            <span>{trend}</span>
          </div>
        )}
      </div>
      
      {color === "purple" && (
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
      )}
    </Card>
  );
}

// Icons as components
const Icons = {
  FileInvoice: () => <i className="fas fa-file-invoice-dollar"></i>,
  CheckCircle: () => <i className="fas fa-check-circle"></i>,
  Redo: () => <i className="fas fa-redo-alt"></i>,
  Wallet: () => <i className="fas fa-wallet"></i>,
  Clock: () => <i className="fas fa-clock"></i>,
  Envelope: () => <i className="fas fa-envelope"></i>,
};

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
    <div className="min-h-screen bg-[#0a0a0f] text-gray-300 p-8" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap');
        @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
        
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
      `}</style>

      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-1 tracking-tight">Dashboard Overview</h2>
          <p className="text-sm text-gray-400">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search orders, batches..." 
              className="bg-[#12121f] border border-purple-500/20 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-purple-500/50 w-64 transition-all text-gray-300"
            />
            <i className="fas fa-search absolute left-3.5 top-3 text-gray-500"></i>
          </div>
          <button className="relative p-2.5 rounded-xl bg-[#12121f] border border-purple-500/20 text-gray-400 hover:text-white transition-all">
            <i className="fas fa-bell"></i>
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </div>
        </div>
      </header>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Active Debit Orders"
          value="1,289"
          subtext="1,180 Running"
          trend="12%"
          trendUp={true}
          icon={Icons.FileInvoice}
          color="purple"
        />
        
        <MetricCard 
          title="Success Rate"
          value="942"
          subtext="Successful transactions"
          trend="4.2%"
          trendUp={true}
          icon={Icons.CheckCircle}
          color="green"
        />
        
        <MetricCard 
          title="Failed (Retry Scheduled)"
          value="23"
          subtext="Next retry: 08:00"
          trend="Needs Attention"
          trendUp={false}
          icon={Icons.Redo}
          color="orange"
        />
        
        <MetricCard 
          title="Collections (MTD)"
          value="482,910"
          subtext="Scheduled Total R 520,000"
          trend="8.4%"
          trendUp={true}
          icon={Icons.Wallet}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Performance Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Debit Order Performance</h3>
              <p className="text-sm text-gray-400">Success vs Failed vs Retry Schedule</p>
            </div>
            <div className="flex gap-2">
              {["24H", "7D", "30D"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r.toLowerCase())}
                  className={cx(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    range === r.toLowerCase() 
                      ? "bg-purple-500 text-white" 
                      : "bg-[#12121f] text-gray-400 hover:text-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[300px]">
            <LineChart data={debitPerformanceData} />
          </div>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">Successful</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-400">Failed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-400">Scheduled Retry</span>
            </div>
          </div>
        </Card>

        {/* Retry Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-white mb-1">Retry Distribution</h3>
          <p className="text-sm text-gray-400 mb-6">Scheduled retry timeline</p>
          
          <div className="flex justify-center">
            <DonutChart data={retryDistributionData} />
          </div>
          
          <div className="space-y-3 mt-6">
            {retryDistributionData.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Cron & ZeptoMail Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cron Job Monitor */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Icons.Clock />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Cron Job Monitor</h3>
                <p className="text-sm text-gray-400">Real-time job execution status</p>
              </div>
            </div>
            <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1">
              View All <i className="fas fa-arrow-right"></i>
            </button>
          </div>

          <div className="space-y-4">
            {cronJobs.map((job) => (
              <div 
                key={job.id} 
                className={cx(
                  "cron-indicator p-4 rounded-xl border transition-all cursor-pointer group",
                  job.status === "failed" 
                    ? "bg-red-500/5 border-red-500/20" 
                    : "bg-[#12121f]/50 border-purple-500/10 hover:border-purple-500/30"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className={cx(
                      "w-2 h-2 rounded-full",
                      job.status === "running" && "bg-green-500 animate-pulse",
                      job.status === "queued" && "bg-yellow-500",
                      job.status === "active" && "bg-green-500",
                      job.status === "failed" && "bg-red-500 animate-pulse"
                    )}></div>
                    <div>
                      <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">{job.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{job.schedule}</p>
                    </div>
                  </div>
                  <StatusBadge status={job.status}>
                    {job.status === "running" ? "Running" : 
                     job.status === "queued" ? `Queued (${job.queued})` :
                     job.status === "failed" ? "Failed" : "Active"}
                  </StatusBadge>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                  <span>Last run: {job.lastRun}</span>
                  {job.status === "failed" ? (
                    <button className="text-red-400 hover:text-red-300 text-xs">Retry Now</button>
                  ) : (
                    <span className={cx(
                      "text-xs",
                      job.status === "running" ? "text-green-400" : "text-gray-500"
                    )}>
                      {job.status === "running" ? "Success" : ""}
                    </span>
                  )}
                </div>
                
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={cx(
                      "h-full rounded-full transition-all duration-500",
                      job.status === "failed" ? "bg-red-500" : "bg-gradient-to-r from-purple-500 to-purple-400"
                    )}
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
                
                {job.error && (
                  <p className="mt-2 text-xs text-red-400">
                    <i className="fas fa-exclamation-circle mr-1"></i>
                    {job.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* ZeptoMail Tracker */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Icons.Envelope />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">ZeptoMail Tracker</h3>
                <p className="text-sm text-gray-400">Email delivery analytics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-green-400">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-[#12121f]/50 border border-purple-500/10">
              <div className="text-2xl font-bold text-white mb-1">1,245</div>
              <div className="text-xs text-gray-400">Sent</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400 mb-1">98.2%</div>
              <div className="text-xs text-gray-400">Delivered</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400 mb-1">42%</div>
              <div className="text-xs text-gray-400">Opened</div>
            </div>
          </div>

          <div className="h-[150px]">
            <BarChart data={emailData} />
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#12121f]/30 border border-purple-500/10 hover:border-purple-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <i className="fas fa-paper-plane text-purple-400 text-xs"></i>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Debit Order Confirmations</p>
                  <p className="text-xs text-gray-500">Sent 2 mins ago</p>
                </div>
              </div>
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Delivered</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#12121f]/30 border border-purple-500/10 hover:border-purple-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-orange-400 text-xs"></i>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Failed Payment Alerts</p>
                  <p className="text-xs text-gray-500">Sent 15 mins ago</p>
                </div>
              </div>
              <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">Opened</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#12121f]/30 border border-purple-500/10 hover:border-purple-500/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <i className="fas fa-times text-red-400 text-xs"></i>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Retry Notifications</p>
                  <p className="text-xs text-gray-500">Sent 1 hour ago</p>
                </div>
              </div>
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">Bounced</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Original TabbyTech Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Workflow */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Today's Workflow</h3>
            <select className="bg-[#12121f] border border-purple-500/20 rounded-xl px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500/50">
              <option>Subscription tracking</option>
            </select>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-4 rounded-xl bg-[#12121f]/50 border border-purple-500/10 hover:border-purple-500/20 transition-all group">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">Review exceptions</h4>
                <p className="text-xs text-gray-500">Prioritise failed deductions and follow ups</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-medium hover:bg-[#252545] transition-all border border-purple-500/20">
                Open
              </button>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-[#12121f]/50 border border-purple-500/10 hover:border-purple-500/20 transition-all group">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">Prepare next batch</h4>
                <p className="text-xs text-gray-500">Validate and queue debit orders for the next run</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                Start
              </button>
            </div>

            <div className="flex justify-between items-center p-4 rounded-xl bg-[#12121f]/50 border border-purple-500/10 hover:border-purple-500/20 transition-all group">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">Export bank files</h4>
                <p className="text-xs text-gray-500">Generate bank ready exports from approved batches</p>
              </div>
              <button className="px-4 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-medium hover:bg-[#252545] transition-all border border-purple-500/20">
                Export
              </button>
            </div>
          </div>

          <div className="border-t border-purple-500/10 pt-6">
            <h4 className="text-sm font-semibold text-white mb-2">Subscription tracking</h4>
            <p className="text-xs text-gray-500 mb-4">This is a UI-only layer for now. Later we will sync this from Zoho CRM or Zoho Subscriptions and lock down edits to reduce risk.</p>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <select className="bg-[#12121f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none">
                <option>Monthly only</option>
              </select>
              <select className="bg-[#12121f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none">
                <option>Last 30 days</option>
              </select>
              <select className="bg-[#12121f] border border-purple-500/20 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none">
                <option>By revenue</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">New 7d: 6</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Churn 7d: 2</span>
              </div>
              <button className="text-xs text-gray-400 hover:text-white transition-all">
                Paystack settings
              </button>
            </div>
          </div>
        </Card>

        {/* Recent Batches */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Recent Batches</h3>
            <select 
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-[#12121f] border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
            >
              {data.recentBatches.map((b) => (
                <option key={b.batch} value={b.batch}>{b.batch}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-purple-500/10">
                  <th className="pb-3 font-medium">Batch</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Items</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredBatches.map((b) => (
                  <tr 
                    key={b.batch} 
                    className={cx(
                      "border-b border-purple-500/5 cursor-pointer transition-all",
                      selectedBatch === b.batch ? "bg-purple-500/5" : "hover:bg-[#12121f]/30"
                    )}
                    onClick={() => setSelectedBatch(b.batch)}
                  >
                    <td className="py-3 text-white font-medium text-xs">{b.batch}</td>
                    <td className="py-3">
                      <StatusBadge status={b.status}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </StatusBadge>
                    </td>
                    <td className="py-3 text-right text-white font-medium">{b.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[#12121f]/30 border border-purple-500/10">
            <p className="text-xs font-semibold text-white mb-1">Selected: {selectedBatch}</p>
            <p className="text-xs text-gray-500 mb-3">UI-only actions. Will wire to batch workflows later.</p>
            
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                placeholder="Type to filter batches" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-[#0a0a0f] border border-purple-500/20 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 py-2 rounded-xl bg-[#1a1a2e] text-white text-xs font-medium hover:bg-[#252545] transition-all border border-purple-500/20">
                View
              </button>
              <button className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 transition-all">
                Export
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-6">
          <p className="text-xs text-gray-400 mb-2">Monthly MRR</p>
          <h3 className="text-2xl font-bold text-white mb-1">{formatZAR(data.monthlyMRR)}</h3>
          <p className="text-xs text-gray-500">Active {data.monthlyActive} • Churn 7d: 2</p>
        </Card>

        <Card className="p-6">
          <p className="text-xs text-gray-400 mb-2">Annual ARR</p>
          <h3 className="text-2xl font-bold text-white mb-1">{formatZAR(data.annualARR * 12 + data.monthlyMRR * 12)}</h3>
          <p className="text-xs text-gray-500">View monthly • 11 only</p>
        </Card>
      </div>
    </div>
  );
}

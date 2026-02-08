export default function Dashboard() {
  return (
    <div className="tt-dashboard">

      {/* Top stats */}
      <div className="tt-dashboard-stats">
        <div className="tt-statcard">
          <div className="tt-stat-label">Active Debit Orders</div>
          <div className="tt-stat-value">1,284</div>
          <div className="tt-stat-meta">Currently running</div>
        </div>

        <div className="tt-statcard">
          <div className="tt-stat-label">Next Run</div>
          <div className="tt-stat-value">Fri 08:00</div>
          <div className="tt-stat-meta">112 items queued</div>
        </div>

        <div className="tt-statcard">
          <div className="tt-stat-label">Exceptions</div>
          <div className="tt-stat-value">23</div>
          <div className="tt-stat-meta">Needs attention</div>
        </div>

        <div className="tt-statcard">
          <div className="tt-stat-label">Collections (MTD)</div>
          <div className="tt-stat-value">R 482,910</div>
          <div className="tt-stat-meta">Scheduled total</div>
        </div>
      </div>

      {/* Main panels */}
      <div className="tt-dashboard-panels">
        <div className="tt-panel">
          <div className="tt-panel-title">Today’s Workflow</div>

          <div className="tt-panel-item">
            <span>Review exceptions</span>
            <button className="tt-panel-btn">Open</button>
          </div>

          <div className="tt-panel-item">
            <span>Prepare next batch</span>
            <button className="tt-panel-btn">Start</button>
          </div>

          <div className="tt-panel-item">
            <span>Export bank files</span>
            <button className="tt-panel-btn">Export</button>
          </div>
        </div>

        <div className="tt-panel">
          <div className="tt-panel-title">Recent Batches</div>

          <div className="tt-table-row tt-table-head">
            <span>Batch</span>
            <span>Status</span>
            <span>Items</span>
          </div>

          <div className="tt-table-row">
            <span>FEB-05-AM</span>
            <span className="tt-badge">Draft</span>
            <span>112</span>
          </div>

          <div className="tt-table-row">
            <span>FEB-03-PM</span>
            <span className="tt-badge">Exported</span>
            <span>98</span>
          </div>

          <div className="tt-table-row">
            <span>JAN-29-AM</span>
            <span className="tt-badge">Sent</span>
            <span>141</span>
          </div>
        </div>
      </div>

    </div>
  );
}

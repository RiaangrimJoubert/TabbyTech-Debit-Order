// src/screens/NotificationMonitoring.jsx
import React from "react";

function Card({ children }) {
  return <div className="tt-card">{children}</div>;
}

function MetricCard({ title, value, subtitle }) {
  return (
    <Card>
      <div className="tt-metric">
        <div className="tt-metric-title">{title}</div>
        <div className="tt-metric-value">{value}</div>
        <div className="tt-metric-sub">{subtitle}</div>
      </div>
    </Card>
  );
}

export default function NotificationMonitoring() {
  return (
    <div className="tt-page">
      <div className="tt-page-header">
        <h2>Notification Monitoring</h2>
        <p>Email delivery visibility for TabbyPay system notifications</p>
      </div>

      <div className="tt-grid-4">
        <MetricCard
          title="Sent Today"
          value="0"
          subtitle="Emails queued for delivery"
        />

        <MetricCard
          title="Delivered"
          value="0"
          subtitle="Successfully delivered"
        />

        <MetricCard
          title="Opened"
          value="0"
          subtitle="Client opened email"
        />

        <MetricCard
          title="Failed"
          value="0"
          subtitle="Delivery failure"
        />
      </div>

      <div className="tt-grid-2">
        <Card>
          <h3>Delivery Distribution</h3>
          <p>Sent vs delivered vs failed</p>

          <div className="tt-donut-placeholder">
            Donut Chart
          </div>
        </Card>

        <Card>
          <h3>Template Distribution</h3>
          <p>Email template usage</p>

          <div className="tt-donut-placeholder">
            Donut Chart
          </div>
        </Card>
      </div>

      <div className="tt-grid-1">
        <Card>
          <div className="tt-table-header">
            <h3>Recent Notifications</h3>
            <button className="tt-btn-primary">
              Export to Excel
            </button>
          </div>

          <table className="tt-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Client</th>
                <th>Email</th>
                <th>Template</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan="5">No notification data yet.</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

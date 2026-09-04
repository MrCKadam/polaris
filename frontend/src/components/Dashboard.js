import React from "react";

const RISK_COLOR = { high: "#E63946", medium: "#F4A340", low: "#2EC4B6" };

export default function Dashboard({ icebergs, stats }) {
  if (!stats || icebergs.length === 0) {
    return <div className="detail-card empty">No data yet — waiting on the backend.</div>;
  }

  const maxCount = Math.max(stats.high_risk, stats.medium_risk, stats.low_risk, 1);
  const maxSize = Math.max(...icebergs.map((ib) => ib.size_km2), 1);

  return (
    <div className="dashboard">
      <div className="dashboard-section">
        <div className="dashboard-title">Risk distribution</div>
        {[
          { label: "High", value: stats.high_risk, color: RISK_COLOR.high },
          { label: "Medium", value: stats.medium_risk, color: RISK_COLOR.medium },
          { label: "Low", value: stats.low_risk, color: RISK_COLOR.low },
        ].map((row) => (
          <div className="bar-row" key={row.label}>
            <span className="bar-label">{row.label}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(row.value / maxCount) * 100}%`, background: row.color }}
              />
            </div>
            <span className="bar-value">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-title">Iceberg size (km²)</div>
        {icebergs
          .slice()
          .sort((a, b) => b.size_km2 - a.size_km2)
          .map((ib) => (
            <div className="bar-row" key={ib.id}>
              <span className="bar-label">{ib.id}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(ib.size_km2 / maxSize) * 100}%`, background: RISK_COLOR[ib.risk_level] }}
                />
              </div>
              <span className="bar-value">{ib.size_km2}</span>
            </div>
          ))}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-title">Fleet summary</div>
        <dl className="detail-grid">
          <dt>Total tracked</dt><dd>{stats.total_icebergs}</dd>
          <dt>Avg drift speed</dt><dd>{stats.avg_drift_speed_kmh} km/h</dd>
          <dt>High risk share</dt>
          <dd>{Math.round((stats.high_risk / stats.total_icebergs) * 100)}%</dd>
        </dl>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-title">Model validation</div>
        <dl className="detail-grid">
          <dt>Position uncertainty @6h</dt><dd>±4.7 km</dd>
          <dt>Position uncertainty @24h</dt><dd>±7.4 km</dd>
          <dt>Position uncertainty @48h</dt><dd>±9.6 km</dd>
          <dt>Prediction method</dt><dd>Physics + ML correction</dd>
        </dl>
      </div>
    </div>
  );
}
